'use client';

import {
  Activity,
  ArrowDownRight,
  BarChart3,
  CalendarDays,
  Info,
  RefreshCw,
  ShoppingBasket,
  Wallet,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useId, useMemo, useState } from 'react';
import {
  reportsControllerListCashierActivityV1,
  reportsControllerListExecutiveSummaryV1,
  reportsControllerListRedemptionSummaryV1,
  reportsControllerListSmsOperationsV1,
} from '../../lib/api/generated-client';
import { createApiRequest } from '../../lib/api/request';
import {
  formatReportMoney,
  formatReportMoneyCompact,
  lastReportRow,
  lastReportNumber,
  recentReportPeriod,
  reportInsights,
  sumReportField,
  type ReportFocus,
  type ReportPeriod,
  type ReportRow,
  type TrendMetric,
} from '../../lib/reports/supervisor-report-metrics';
import {
  reportProblemFromSettled,
  type ReportProblem,
} from '../../lib/reports/report-errors';
import { Button, Input, Select } from '../ui';
import { CashierPageHeader, ShopCityCard } from '../shopcity';
import { ReportsWorkspace } from './reports-workspace';
import {
  CopyableChip,
  formatReportBusinessDate,
  formatReportTimestamp,
  ReportProblemNotice,
} from './report-ui';

type DataSource = 'financial' | 'cashiers' | 'redemptions' | 'sms';
type Sources = Record<DataSource, ReportRow[] | null>;
type SourceIssues = Partial<Record<DataSource, ReportProblem>>;
type ReportScope = {
  scope?: string;
  branchId?: string | null;
  timezone?: string;
};
type PeriodOption = 'week' | 'month' | 'custom';
type OperationalReportsAudience = 'supervisor' | 'admin';

const emptySources: Sources = {
  financial: null,
  cashiers: null,
  redemptions: null,
  sms: null,
};

const trendOptions: Array<{ value: TrendMetric; label: string }> = [
  { value: 'loyaltyPurchaseValueKobo', label: 'Loyalty purchase value' },
  { value: 'creditIssuedKobo', label: 'Credit issued' },
  { value: 'creditRedeemedKobo', label: 'Credit redeemed' },
];

const focusOptions: Array<{ value: ReportFocus; label: string }> = [
  { value: 'overview', label: 'Overall activity' },
  { value: 'cashiers', label: 'Cashier performance' },
  { value: 'redemptions', label: 'Redemptions' },
  { value: 'sms', label: 'SMS operations' },
];

const dataSourceLabels: Record<DataSource, string> = {
  financial: 'Executive summary',
  cashiers: 'Cashier activity',
  redemptions: 'Redemption summary',
  sms: 'SMS operations',
};

function readRows(response: PromiseSettledResult<unknown>): ReportRow[] | null {
  if (response.status !== 'fulfilled') return null;
  const result = response.value as {
    status?: number;
    data?: { data?: { items?: unknown } };
  };
  const items = result?.data?.data?.items;
  return result.status === 200 && Array.isArray(items)
    ? items.filter(
        (item): item is ReportRow =>
          item !== null && typeof item === 'object' && !Array.isArray(item),
      )
    : null;
}

function shortDate(value: string, timezone = 'Africa/Lagos'): string {
  if (!/^\d{4}-\d{2}-\d{2}/.test(value)) return value;
  return new Intl.DateTimeFormat('en-NG', {
    month: 'short',
    day: 'numeric',
    timeZone: timezone,
  }).format(new Date(`${value.slice(0, 10)}T12:00:00Z`));
}

function isValidTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat('en', { timeZone: value }).format(0);
    return true;
  } catch {
    return false;
  }
}

function readScope(
  response: PromiseSettledResult<unknown>,
): ReportScope | null {
  if (response.status !== 'fulfilled') return null;
  const result = response.value as {
    status?: number;
    data?: { data?: ReportScope };
  };
  return result.status === 200 ? (result.data?.data ?? null) : null;
}

export function SupervisorOperationalReports() {
  return <OperationalReportsDashboard audience="supervisor" />;
}

export function OperationalReportsDashboard({
  audience,
}: {
  audience: OperationalReportsAudience;
}) {
  const isAdmin = audience === 'admin';
  const customFromId = useId();
  const customToId = useId();
  const branchFilterId = useId();
  const timezoneFilterId = useId();
  const [mode, setMode] = useState<PeriodOption>('week');
  const [period, setPeriod] = useState<ReportPeriod>(() =>
    recentReportPeriod(7),
  );
  const [draftFrom, setDraftFrom] = useState(period.from);
  const [draftTo, setDraftTo] = useState(period.to);
  const [draftBranchId, setDraftBranchId] = useState('');
  const [draftTimezone, setDraftTimezone] = useState('');
  const [appliedScope, setAppliedScope] = useState({
    branchId: '',
    timezone: '',
  });
  const [validation, setValidation] = useState('');
  const [sources, setSources] = useState<Sources>(emptySources);
  const [loading, setLoading] = useState(true);
  const [issues, setIssues] = useState<SourceIssues>({});
  const [reportScope, setReportScope] = useState<ReportScope | null>(null);
  const [rateLimitUntil, setRateLimitUntil] = useState<number | null>(null);
  const [rateLimitSeconds, setRateLimitSeconds] = useState(0);
  const [revision, setRevision] = useState(0);
  const [trendMetric, setTrendMetric] = useState<TrendMetric>(
    'loyaltyPurchaseValueKobo',
  );
  const [selectedTrendDate, setSelectedTrendDate] = useState<string | null>(
    null,
  );
  const [focus, setFocus] = useState<ReportFocus>('overview');

  useEffect(() => {
    if (rateLimitUntil === null) {
      setRateLimitSeconds(0);
      return;
    }
    const updateCountdown = () => {
      const remaining = Math.max(
        0,
        Math.ceil((rateLimitUntil - Date.now()) / 1000),
      );
      setRateLimitSeconds(remaining);
      if (remaining === 0) setRateLimitUntil(null);
    };
    updateCountdown();
    const timer = window.setInterval(updateCountdown, 1000);
    return () => window.clearInterval(timer);
  }, [rateLimitUntil]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setIssues({});
    setReportScope(null);
    const query = isAdmin
      ? {
          from: period.from,
          to: period.to,
          branchId: appliedScope.branchId || undefined,
          timezone: appliedScope.timezone || undefined,
        }
      : { from: period.from, to: period.to };
    const request = createApiRequest({ csrf: true });

    void Promise.allSettled([
      reportsControllerListExecutiveSummaryV1(query, request),
      reportsControllerListCashierActivityV1(query, request),
      reportsControllerListRedemptionSummaryV1(query, request),
      reportsControllerListSmsOperationsV1(query, request),
    ]).then((results) => {
      if (!active) return;
      const financial = readRows(results[0]);
      const cashiers = readRows(results[1]);
      const redemptions = readRows(results[2]);
      const sms = readRows(results[3]);
      const next: Sources = { financial, cashiers, redemptions, sms };
      const nextIssues: SourceIssues = {
        financial: reportProblemFromSettled(results[0]) ?? undefined,
        cashiers: reportProblemFromSettled(results[1]) ?? undefined,
        redemptions: reportProblemFromSettled(results[2]) ?? undefined,
        sms: reportProblemFromSettled(results[3]) ?? undefined,
      };
      setSources(next);
      setIssues(nextIssues);
      setReportScope(readScope(results[0]));
      const limited = Object.values(nextIssues).find(
        (issue) => issue?.status === 429,
      );
      if (limited) {
        setRateLimitUntil(
          Date.now() + Math.max(1, limited.retryAfterSeconds ?? 60) * 1000,
        );
      }
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [
    audience,
    isAdmin,
    appliedScope.branchId,
    appliedScope.timezone,
    period.from,
    period.to,
    revision,
  ]);

  const latest = lastReportRow(sources.financial);
  const latestDate =
    typeof latest?.reportDate === 'string'
      ? latest.reportDate.slice(0, 10)
      : null;
  const materializedAt =
    typeof latest?.materializedAt === 'string' ? latest.materializedAt : null;
  const displayTimezone =
    reportScope?.timezone || appliedScope.timezone || 'Africa/Lagos';
  const freshLabel = materializedAt
    ? formatReportTimestamp(materializedAt, displayTimezone)
    : null;
  const freshness = loading
    ? 'loading'
    : issues.financial
      ? 'unknown'
      : latestDate && latestDate >= period.to
        ? 'fresh'
        : latestDate
          ? 'stale'
          : 'unknown';

  const stats = [
    {
      title: 'Loyalty purchase value',
      amount: sumReportField(sources.financial, 'loyaltyPurchaseValueKobo'),
      note: 'Period total · loyalty receipts only',
      definition:
        'Sum of reported ShopCity loyalty purchase values for the authorized report scope and period. It is not total POS sales.',
      icon: ShoppingBasket,
    },
    {
      title: 'Credit issued',
      amount: sumReportField(sources.financial, 'creditIssuedKobo'),
      note: 'Period total · confirmed issuance',
      definition:
        'Sum of confirmed loyalty credit issued in the daily reports for this period.',
      icon: Activity,
    },
    {
      title: 'Credit redeemed',
      amount: sumReportField(sources.financial, 'creditRedeemedKobo'),
      note: 'Period total · confirmed redemptions',
      definition:
        'Sum of confirmed loyalty credit redemptions in the daily reports for this period.',
      icon: ArrowDownRight,
    },
    {
      title: 'Outstanding credit',
      amount: lastReportNumber(sources.financial, 'outstandingLiabilityKobo'),
      note: latestDate
        ? `Closing balance · as of ${shortDate(latestDate, displayTimezone)}`
        : 'Latest available period snapshot',
      definition:
        'The latest available outstanding-liability snapshot in the selected period. Snapshot balances are not summed across days.',
      icon: Wallet,
    },
  ];
  if (
    sources.financial?.some((row) => typeof row.creditExpiredKobo === 'number')
  ) {
    stats.push({
      title: 'Credit expired',
      amount: sumReportField(sources.financial, 'creditExpiredKobo'),
      note: 'Period total · reported expiries',
      definition:
        'Sum of credit expiry values reported for the authorized scope and period.',
      icon: ArrowDownRight,
    });
  }
  if (typeof latest?.registeredCustomers === 'number') {
    stats.push({
      title: 'Registered customers',
      amount: lastReportNumber(sources.financial, 'registeredCustomers'),
      note: latestDate
        ? `Latest snapshot · ${shortDate(latestDate, displayTimezone)}`
        : 'Latest snapshot',
      definition:
        'Registered customer count in the latest available daily snapshot.',
      icon: Activity,
    });
  }
  if (typeof latest?.activeCustomers === 'number') {
    stats.push({
      title: 'Active customers',
      amount: lastReportNumber(sources.financial, 'activeCustomers'),
      note: latestDate
        ? `Latest snapshot · ${shortDate(latestDate, displayTimezone)}`
        : 'Latest snapshot',
      definition:
        'Active customer count in the latest available daily snapshot, not a period sum.',
      icon: Activity,
    });
  }

  const trendRows = useMemo(() => {
    return [...(sources.financial ?? [])]
      .filter((row) => typeof row.reportDate === 'string')
      .sort((a, b) => String(a.reportDate).localeCompare(String(b.reportDate)))
      .map((row) => ({
        date: String(row.reportDate).slice(0, 10),
        amount:
          typeof row[trendMetric] === 'number' &&
          Number.isSafeInteger(row[trendMetric]) &&
          (row[trendMetric] as number) >= 0
            ? (row[trendMetric] as number)
            : null,
      }));
  }, [sources.financial, trendMetric]);

  const maxTrend = Math.max(1, ...trendRows.map((row) => row.amount ?? 0));
  const trendHasValues = trendRows.some((row) => row.amount !== null);
  const peakTrend = trendRows.reduce<{ date: string; amount: number } | null>(
    (peak, row) =>
      row.amount !== null && (!peak || row.amount > peak.amount)
        ? { date: row.date, amount: row.amount }
        : peak,
    null,
  );
  const selectedTrend =
    trendRows.find((row) => row.date === selectedTrendDate) ?? peakTrend;
  const focusSource = focus === 'overview' ? 'financial' : focus;
  const backgroundIssues = (
    Object.entries(issues) as Array<[DataSource, ReportProblem | undefined]>
  ).filter(
    (entry): entry is [DataSource, ReportProblem] =>
      Boolean(entry[1]) && entry[0] !== 'financial' && entry[0] !== focusSource,
  );
  const insights = useMemo(
    () => reportInsights(focus, sources),
    [focus, sources],
  );
  const focusUnavailable = sources[focusSource] === null;

  function selectPeriod(value: PeriodOption) {
    setMode(value);
    setValidation('');
    if (value === 'week' || value === 'month') {
      const next = recentReportPeriod(value === 'week' ? 7 : 30);
      setPeriod(next);
      setDraftFrom(next.from);
      setDraftTo(next.to);
    }
  }

  function applyCustomPeriod() {
    if (!draftFrom || !draftTo || draftFrom > draftTo) {
      setValidation('Choose a valid start date on or before the end date.');
      return;
    }
    setValidation('');
    setPeriod({
      from: draftFrom,
      to: draftTo,
      label: 'Custom range',
    });
  }

  function applyAdminScope() {
    const nextTimezone = draftTimezone.trim();
    if (nextTimezone && !isValidTimeZone(nextTimezone)) {
      setValidation('Enter a valid IANA timezone, such as Africa/Lagos.');
      return;
    }
    setValidation('');
    setAppliedScope({
      branchId: draftBranchId.trim(),
      timezone: nextTimezone,
    });
  }

  return (
    <section
      className="supervisor-reports-page"
      aria-label="Operational reports"
      aria-busy={loading}
    >
      <CashierPageHeader
        className="cashier-route-header supervisor-page__header supervisor-reports-header"
        eyebrow={isAdmin ? 'ADMIN · REPORTING' : 'SUPERVISOR · REPORTING'}
        title="Operational reports"
        description={
          isAdmin
            ? 'Review tenant or selected-branch performance, investigate patterns, and generate detailed reports.'
            : 'Review branch performance over time, investigate patterns, and generate detailed reports.'
        }
        actions={
          <Link
            className="supervisor-reports-back"
            href={isAdmin ? '/admin' : '/supervisor'}
          >
            {isAdmin ? 'Back to admin' : 'Back to supervisor'}
          </Link>
        }
      />

      <details className="supervisor-reports-definition-toggle">
        <summary>
          <Info size={16} aria-hidden="true" />
          How to read these figures
        </summary>
        <div>
          <ul>
            <li>
              Loyalty purchase value is ShopCity loyalty activity, not total POS
              sales.
            </li>
            <li>
              Issued and redeemed credit are period flows; outstanding credit is
              the latest available closing-balance snapshot, never a sum of
              daily balances.
            </li>
            <li>
              Customer counts use the latest available daily snapshot. Missing
              or unmaterialized values are shown as “No data yet,” not zero.
            </li>
          </ul>
        </div>
      </details>

      <ShopCityCard
        className="supervisor-reports-period"
        aria-label="Dashboard reporting filters"
      >
        <div className="supervisor-reports-period__heading">
          <CalendarDays size={20} aria-hidden="true" />
          <div>
            <strong>Reporting period</strong>
            <span>
              All overview figures and insights use the same date range.
            </span>
          </div>
        </div>
        <div className="supervisor-reports-period__controls">
          <Select
            aria-label="Reporting period"
            value={mode}
            onChange={(event) =>
              selectPeriod(event.target.value as PeriodOption)
            }
            options={[
              { value: 'week', label: 'Last 7 days' },
              { value: 'month', label: 'Last 30 days' },
              { value: 'custom', label: 'Custom dates' },
            ]}
          />
          {mode === 'custom' ? (
            <>
              <label htmlFor={customFromId}>
                <span>From</span>
                <Input
                  id={customFromId}
                  type="date"
                  aria-label="Summary from date"
                  value={draftFrom}
                  onChange={(event) => setDraftFrom(event.target.value)}
                />
              </label>
              <label htmlFor={customToId}>
                <span>To</span>
                <Input
                  id={customToId}
                  type="date"
                  aria-label="Summary to date"
                  value={draftTo}
                  onChange={(event) => setDraftTo(event.target.value)}
                />
              </label>
              <Button type="button" onClick={applyCustomPeriod}>
                Apply dates
              </Button>
            </>
          ) : null}
          {isAdmin ? (
            <>
              <label htmlFor={branchFilterId}>
                <span>Branch ID</span>
                <Input
                  id={branchFilterId}
                  aria-label="Admin branch filter"
                  placeholder="Leave blank for tenant-wide"
                  value={draftBranchId}
                  onChange={(event) => setDraftBranchId(event.target.value)}
                />
              </label>
              <label htmlFor={timezoneFilterId}>
                <span>Timezone</span>
                <Input
                  id={timezoneFilterId}
                  aria-label="Admin timezone filter"
                  placeholder="Branch or system default"
                  value={draftTimezone}
                  onChange={(event) => setDraftTimezone(event.target.value)}
                />
              </label>
              <Button
                type="button"
                variant="secondary"
                onClick={applyAdminScope}
                disabled={loading}
              >
                Apply scope
              </Button>
            </>
          ) : null}
          <Button
            type="button"
            variant="secondary"
            onClick={() => setRevision((value) => value + 1)}
            loading={loading}
            disabled={rateLimitSeconds > 0}
            aria-label="Refresh dashboard data"
          >
            <RefreshCw size={16} aria-hidden="true" /> Refresh dashboard
          </Button>
        </div>
        <div className="supervisor-reports-period__caption">
          <span>
            {period.label}:{' '}
            {formatReportBusinessDate(period.from, displayTimezone)} –{' '}
            {formatReportBusinessDate(period.to, displayTimezone)} ·{' '}
            {displayTimezone} ·{' '}
            {isAdmin
              ? reportScope?.scope === 'BRANCH'
                ? 'Selected branch'
                : reportScope?.scope === 'TENANT'
                  ? 'Tenant-wide'
                  : 'Scope pending'
              : 'Assigned branch only'}
          </span>
          <span className="supervisor-reports-freshness" data-state={freshness}>
            <span aria-hidden="true" />
            {loading
              ? 'Loading freshness…'
              : freshness === 'fresh'
                ? 'Fresh'
                : freshness === 'stale'
                  ? 'Stale / lagging'
                  : 'Freshness unknown'}
            {freshLabel && !loading
              ? ` · Updated ${freshLabel} · ${displayTimezone}`
              : ''}
          </span>
        </div>
        <div className="supervisor-reports-scope" aria-label="Report scope">
          <span className="supervisor-reports-scope__label">
            {reportScope?.scope ?? (isAdmin ? 'SCOPE PENDING' : 'BRANCH')}
          </span>
          {typeof reportScope?.branchId === 'string' ? (
            <CopyableChip label="Branch ID" value={reportScope.branchId} />
          ) : isAdmin && reportScope?.scope === 'TENANT' ? (
            <span>Tenant-wide scope</span>
          ) : isAdmin ? (
            <span>Branch scope not returned</span>
          ) : (
            <span>Assigned branch scope</span>
          )}
          <span className="supervisor-reports-scope__timezone">
            Timezone · {displayTimezone}
          </span>
        </div>
        {rateLimitSeconds > 0 ? (
          <p
            className="supervisor-reports-rate-limit"
            role="status"
            aria-live="polite"
          >
            Reporting requests are paused for {rateLimitSeconds} seconds.
          </p>
        ) : null}
        {validation ? (
          <p role="alert" className="supervisor-reports-error">
            {validation}
          </p>
        ) : null}
      </ShopCityCard>

      {issues.financial && !loading ? (
        <ReportProblemNotice
          problem={issues.financial}
          retryAfterSeconds={rateLimitSeconds}
          onRetry={() => setRevision((value) => value + 1)}
        />
      ) : null}

      <div className="supervisor-reports-section-heading">
        <div>
          <p className="supervisor-reports-eyebrow">PERFORMANCE SNAPSHOT</p>
          <h2>
            {isAdmin
              ? reportScope?.scope === 'BRANCH'
                ? 'Branch at a glance'
                : reportScope?.scope === 'TENANT'
                  ? 'Tenant at a glance'
                  : 'Authorized scope at a glance'
              : 'Branch at a glance'}
          </h2>
          <p>
            Period financial flows and the latest available closing balance.
          </p>
        </div>
        <span className="supervisor-reports-period-tag">{period.label}</span>
      </div>

      <div
        className="supervisor-reports-metrics"
        role="region"
        aria-label="Operational key performance indicators"
        aria-busy={loading}
      >
        {stats.map(({ title, amount, note, definition, icon: Icon }) => (
          <ShopCityCard
            key={title}
            as="article"
            variant="metric"
            className="supervisor-reports-metric"
          >
            <div className="supervisor-reports-metric__top">
              <div className="supervisor-reports-metric__label">
                <span>{title}</span>
                <details className="supervisor-reports-metric__info">
                  <summary aria-label={`Definition for ${title}`}>
                    <Info size={15} aria-hidden="true" />
                  </summary>
                  <div>{definition}</div>
                </details>
              </div>
              <span className="supervisor-reports-metric__icon">
                <Icon size={19} aria-hidden="true" />
              </span>
            </div>
            <strong className="supervisor-reports-metric__value">
              {loading ? (
                <span
                  className="supervisor-reports-skeleton supervisor-reports-skeleton--metric"
                  role="status"
                  aria-label={`Loading ${title}`}
                />
              ) : issues.financial ? (
                "Couldn't load"
              ) : amount === null ? (
                <span
                  className="supervisor-reports-no-data"
                  title="No report value is available for this metric and period."
                >
                  No data yet
                </span>
              ) : (
                formatReportMoney(amount)
              )}
            </strong>
            {issues.financial && !loading ? (
              <button
                type="button"
                className="supervisor-reports-inline-retry"
                onClick={() => setRevision((value) => value + 1)}
                disabled={rateLimitSeconds > 0}
              >
                Retry report data
              </button>
            ) : null}
            <p>{note}</p>
          </ShopCityCard>
        ))}
      </div>

      <div className="supervisor-reports-callout">
        <Info size={16} aria-hidden="true" />
        <p>
          Loyalty purchase value is ShopCity loyalty activity, not total POS
          sales. Period flows are summed; outstanding credit and customer counts
          use the latest available snapshot.
        </p>
      </div>

      <div className="supervisor-reports-analysis">
        <ShopCityCard
          className="supervisor-reports-trend"
          aria-label="Daily trend chart"
        >
          <div className="supervisor-reports-card-heading">
            <div>
              <p className="supervisor-reports-eyebrow">OVER TIME</p>
              <h2>Daily activity</h2>
              <p>Materialized daily figures within the selected period.</p>
            </div>
            <Select
              aria-label="Trend metric"
              value={trendMetric}
              onChange={(event) =>
                setTrendMetric(event.target.value as TrendMetric)
              }
              options={trendOptions}
            />
          </div>
          {loading ? (
            <div
              className="supervisor-reports-skeleton supervisor-reports-skeleton--wide"
              role="status"
              aria-label="Loading daily activity"
            />
          ) : issues.financial ? (
            <ReportProblemNotice
              problem={issues.financial}
              retryAfterSeconds={rateLimitSeconds}
              onRetry={() => setRevision((value) => value + 1)}
            />
          ) : !trendHasValues ? (
            <div className="supervisor-reports-empty">
              <h3>No data yet</h3>
              <p>
                Daily figures have not been materialized for this window, or no
                report rows are available. Try another date range or reload the
                dashboard.
              </p>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setRevision((value) => value + 1)}
                disabled={rateLimitSeconds > 0}
              >
                <RefreshCw size={15} aria-hidden="true" />
                Reload dashboard data
              </Button>
            </div>
          ) : (
            <>
              <div className="supervisor-reports-chart-axes" aria-hidden="true">
                <span>₦0.00</span>
                <span>{formatReportMoneyCompact(maxTrend)}</span>
              </div>
              <div className="supervisor-reports-chart-scroll">
                <div
                  className="supervisor-reports-chart"
                  role="list"
                  aria-label="Daily report values"
                >
                  {trendRows.map((row) => {
                    const exactValue = formatReportMoney(row.amount);
                    const accessibleDate = shortDate(row.date, displayTimezone);
                    return (
                      <div
                        key={row.date}
                        className="supervisor-reports-chart__day"
                        role="listitem"
                      >
                        <button
                          type="button"
                          className="supervisor-reports-chart__button"
                          aria-pressed={selectedTrendDate === row.date}
                          aria-label={`${accessibleDate}: ${row.amount === null ? 'Not provided' : exactValue}`}
                          title={`${accessibleDate} · ${row.amount === null ? 'Not provided' : exactValue}`}
                          onClick={() => setSelectedTrendDate(row.date)}
                        >
                          <span className="supervisor-reports-chart__track">
                            <span
                              className="supervisor-reports-chart__bar"
                              style={{
                                height: `${row.amount === null || row.amount === 0 ? 0 : Math.max(3, (row.amount / maxTrend) * 100)}%`,
                              }}
                              aria-hidden="true"
                            />
                          </span>
                          <span
                            className="supervisor-reports-chart__label"
                            aria-hidden="true"
                          >
                            {accessibleDate}
                          </span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
              <p
                className="supervisor-reports-chart-summary"
                aria-live="polite"
              >
                Daily trend summary: {trendRows.length} report days
                {peakTrend
                  ? ` · highest ${formatReportMoney(peakTrend.amount)} on ${shortDate(peakTrend.date, displayTimezone)}`
                  : ''}
                {selectedTrend
                  ? ` · selected ${shortDate(selectedTrend.date, displayTimezone)}: ${formatReportMoney(selectedTrend.amount)}`
                  : ''}
                . Select a bar to inspect its exact value.
              </p>
            </>
          )}
          <div className="supervisor-reports-callout">
            <Info size={16} aria-hidden="true" />
            <p>
              This chart reports ShopCity loyalty activity, not total POS sales.
            </p>
          </div>
        </ShopCityCard>

        <ShopCityCard
          className="supervisor-reports-insights"
          aria-label="Filtered operational summaries"
        >
          <div className="supervisor-reports-card-heading">
            <div>
              <p className="supervisor-reports-eyebrow">DATA-BASED INSIGHTS</p>
              <h2>Operational summary</h2>
              <p>
                Summaries calculated from the selected report category and
                period.
              </p>
            </div>
            <Select
              aria-label="Summary category"
              value={focus}
              onChange={(event) => setFocus(event.target.value as ReportFocus)}
              options={focusOptions}
            />
          </div>
          {loading ? (
            <p role="status" className="supervisor-reports-empty">
              Calculating summaries…
            </p>
          ) : focusUnavailable ? (
            issues[focusSource] ? (
              <ReportProblemNotice
                problem={issues[focusSource]}
                retryAfterSeconds={rateLimitSeconds}
                onRetry={() => setRevision((value) => value + 1)}
              />
            ) : (
              <div className="supervisor-reports-empty">
                <h3>Couldn’t load this category</h3>
                <p>
                  Report values remain unavailable rather than showing zero.
                </p>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setRevision((value) => value + 1)}
                  disabled={rateLimitSeconds > 0}
                >
                  Retry report data
                </Button>
              </div>
            )
          ) : insights.every((insight) => insight.value === '—') ? (
            <div className="supervisor-reports-empty">
              <h3>No data yet</h3>
              <p>
                No materialized values are available for this category and
                period.
              </p>
            </div>
          ) : (
            <dl className="supervisor-reports-insight-list">
              {insights.map((insight) => (
                <div key={insight.title}>
                  <dt>{insight.title}</dt>
                  <dd>{insight.value}</dd>
                  <p>{insight.detail}</p>
                </div>
              ))}
            </dl>
          )}
          <div className="supervisor-reports-callout">
            <Info size={16} aria-hidden="true" />
            <p>
              Summaries are deterministic calculations from the authorized
              report scope, not AI-generated commentary. “Active customers” uses
              the latest available snapshot, not a period sum.
            </p>
          </div>
        </ShopCityCard>
      </div>

      {backgroundIssues.map(([source, issue]) => (
        <section
          key={source}
          className="supervisor-reports-category-issue"
          aria-label={`${dataSourceLabels[source]} report error`}
        >
          <p className="supervisor-reports-eyebrow">
            {dataSourceLabels[source]}
          </p>
          <ReportProblemNotice
            problem={issue}
            retryAfterSeconds={rateLimitSeconds}
            onRetry={() => setRevision((value) => value + 1)}
          />
        </section>
      ))}

      <section
        className="supervisor-reports-builder"
        aria-labelledby="supervisor-reports-builder-title"
      >
        <div className="supervisor-reports-section-heading">
          <div>
            <p className="supervisor-reports-eyebrow">DETAILED REPORTING</p>
            <h2 id="supervisor-reports-builder-title">Generate reports</h2>
            <p>
              {isAdmin
                ? 'Select a report, inspect and export authorized data for the same period and scope. Audit and pilot operations are tenant-wide; materialization refresh is available to Admins.'
                : 'Select a report, inspect rows and export the authorized data using the same date range. Materialization refresh is Admin-only; ask an Admin to run the job if the report is lagging.'}
            </p>
          </div>
          <BarChart3 size={23} aria-hidden="true" />
        </div>
        <ReportsWorkspace
          period={{ from: period.from, to: period.to }}
          hideScopeInputs
          scopeFilters={
            isAdmin
              ? {
                  branchId: appliedScope.branchId || undefined,
                  timezone: appliedScope.timezone || undefined,
                }
              : undefined
          }
          canRefreshReports={isAdmin}
          canUseAuditReport={isAdmin}
          canUseMaterializationState
          canUsePilotOperationsSummary={isAdmin}
          presentation={isAdmin ? 'admin' : 'supervisor'}
          rateLimitSeconds={rateLimitSeconds}
          onRateLimited={(seconds) =>
            setRateLimitUntil(Date.now() + Math.max(1, seconds) * 1000)
          }
        />
      </section>
      <p className="supervisor-reports-footnote supervisor-reports-footer">
        {isAdmin
          ? 'Data scope and access are enforced by the authenticated Admin session. Audit and pilot-operations reports are tenant-wide; other report scope follows the server-confirmed tenant or selected branch. Reports may lag behind recent transactions until materialization completes.'
          : 'Data scope and access are enforced by the authenticated Supervisor session. Reports may lag behind recent transactions until materialization completes; materialization refresh is restricted to Admin users.'}
      </p>
    </section>
  );
}
