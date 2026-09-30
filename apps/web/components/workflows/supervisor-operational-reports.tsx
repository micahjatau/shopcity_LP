'use client';

import {
  Activity,
  ArrowDownRight,
  BarChart3,
  CalendarDays,
  RefreshCw,
  ShoppingBasket,
  Wallet,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  reportsControllerListCashierActivityV1,
  reportsControllerListExecutiveSummaryV1,
  reportsControllerListRedemptionSummaryV1,
  reportsControllerListSmsOperationsV1,
} from '../../lib/api/generated-client';
import { createApiRequest } from '../../lib/api/request';
import {
  formatReportMoney,
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
import { Alert, Button, Input, Select } from '../ui';
import { CashierPageHeader, ShopCityCard } from '../shopcity';
import { ReportsWorkspace } from './reports-workspace';

type DataSource = 'financial' | 'cashiers' | 'redemptions' | 'sms';
type Sources = Record<DataSource, ReportRow[] | null>;
type PeriodOption = 'week' | 'month' | 'custom';

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

function shortDate(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}/.test(value)) return value;
  return new Intl.DateTimeFormat('en-NG', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${value.slice(0, 10)}T12:00:00Z`));
}

export function SupervisorOperationalReports() {
  const [mode, setMode] = useState<PeriodOption>('week');
  const [period, setPeriod] = useState<ReportPeriod>(() =>
    recentReportPeriod(7),
  );
  const [draftFrom, setDraftFrom] = useState(period.from);
  const [draftTo, setDraftTo] = useState(period.to);
  const [validation, setValidation] = useState('');
  const [sources, setSources] = useState<Sources>(emptySources);
  const [loading, setLoading] = useState(true);
  const [failures, setFailures] = useState<DataSource[]>([]);
  const [revision, setRevision] = useState(0);
  const [trendMetric, setTrendMetric] = useState<TrendMetric>(
    'loyaltyPurchaseValueKobo',
  );
  const [focus, setFocus] = useState<ReportFocus>('overview');

  useEffect(() => {
    let active = true;
    setLoading(true);
    const query = { from: period.from, to: period.to };
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
      setSources(next);
      setFailures(
        (Object.keys(next) as DataSource[]).filter(
          (source) => next[source] === null,
        ),
      );
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [period.from, period.to, revision]);

  const latest = lastReportRow(sources.financial);
  const latestDate =
    typeof latest?.reportDate === 'string'
      ? latest.reportDate.slice(0, 10)
      : null;
  const materializedAt =
    typeof latest?.materializedAt === 'string'
      ? new Date(latest.materializedAt)
      : null;
  const freshLabel =
    materializedAt && !Number.isNaN(materializedAt.valueOf())
      ? materializedAt.toLocaleString('en-NG', {
          dateStyle: 'medium',
          timeStyle: 'short',
        })
      : null;

  const stats = [
    {
      title: 'Loyalty purchase value',
      amount: formatReportMoney(
        sumReportField(sources.financial, 'loyaltyPurchaseValueKobo'),
      ),
      note: 'Period total · loyalty receipts only',
      icon: ShoppingBasket,
    },
    {
      title: 'Credit issued',
      amount: formatReportMoney(
        sumReportField(sources.financial, 'creditIssuedKobo'),
      ),
      note: 'Period total · confirmed issuance',
      icon: Activity,
    },
    {
      title: 'Credit redeemed',
      amount: formatReportMoney(
        sumReportField(sources.financial, 'creditRedeemedKobo'),
      ),
      note: 'Period total · confirmed redemptions',
      icon: ArrowDownRight,
    },
    {
      title: 'Outstanding credit',
      amount: formatReportMoney(
        lastReportNumber(sources.financial, 'outstandingLiabilityKobo'),
      ),
      note: latestDate
        ? `Closing balance · as of ${shortDate(latestDate)}`
        : 'Latest available period snapshot',
      icon: Wallet,
    },
  ];

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
  const insights = useMemo(
    () => reportInsights(focus, sources),
    [focus, sources],
  );
  const focusUnavailable =
    sources[focus === 'overview' ? 'financial' : focus] === null;

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

  return (
    <section
      className="supervisor-reports-page"
      aria-label="Operational reports"
    >
      <CashierPageHeader
        className="supervisor-page__header supervisor-reports-header"
        eyebrow="SUPERVISOR · REPORTING"
        title="Operational reports"
        description="Review branch performance over time, investigate patterns, and generate detailed reports."
        actions={
          <Link className="supervisor-reports-back" href="/supervisor">
            Back to supervisor
          </Link>
        }
      />

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
              <label>
                <span>From</span>
                <Input
                  type="date"
                  aria-label="Summary from date"
                  value={draftFrom}
                  onChange={(event) => setDraftFrom(event.target.value)}
                />
              </label>
              <label>
                <span>To</span>
                <Input
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
          <Button
            type="button"
            variant="secondary"
            onClick={() => setRevision((value) => value + 1)}
            disabled={loading}
          >
            <RefreshCw size={16} aria-hidden="true" /> Refresh
          </Button>
        </div>
        <div className="supervisor-reports-period__caption">
          <span>
            {period.label}: {period.from} to {period.to} · Assigned branch only
          </span>
          <span>
            {freshLabel
              ? `Materialized ${freshLabel}`
              : 'Awaiting report freshness'}
          </span>
        </div>
        {validation ? (
          <p role="alert" className="supervisor-reports-error">
            {validation}
          </p>
        ) : null}
      </ShopCityCard>

      {failures.length > 0 && !loading ? (
        <Alert tone="warning" title="Some reporting data is unavailable">
          {failures.join(', ')} could not be loaded. Affected metrics remain
          unavailable rather than showing zero.
        </Alert>
      ) : null}

      <div className="supervisor-reports-section-heading">
        <div>
          <p className="supervisor-reports-eyebrow">PERFORMANCE SNAPSHOT</p>
          <h2>Branch at a glance</h2>
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
        {stats.map(({ title, amount, note, icon: Icon }) => (
          <ShopCityCard
            key={title}
            as="article"
            variant="metric"
            className="supervisor-reports-metric"
          >
            <div className="supervisor-reports-metric__top">
              <span>{title}</span>
              <span className="supervisor-reports-metric__icon">
                <Icon size={19} aria-hidden="true" />
              </span>
            </div>
            <strong className="supervisor-reports-metric__value">
              {loading ? 'Loading…' : amount}
            </strong>
            <p>{note}</p>
          </ShopCityCard>
        ))}
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
            <p role="status" className="supervisor-reports-empty">
              Loading daily activity…
            </p>
          ) : trendRows.length ? (
            <div className="supervisor-reports-chart-scroll">
              <div
                className="supervisor-reports-chart"
                role="list"
                aria-label="Daily report values"
              >
                {trendRows.map((row) => (
                  <div
                    key={row.date}
                    className="supervisor-reports-chart__day"
                    role="listitem"
                    aria-label={`${row.date}: ${formatReportMoney(row.amount)}`}
                    title={`${row.date} · ${formatReportMoney(row.amount)}`}
                  >
                    <div className="supervisor-reports-chart__track">
                      <span
                        className="supervisor-reports-chart__bar"
                        style={{
                          height: `${row.amount === null ? 0 : Math.max(3, (row.amount / maxTrend) * 100)}%`,
                        }}
                        aria-hidden="true"
                      />
                    </div>
                    <span
                      className="supervisor-reports-chart__label"
                      aria-hidden="true"
                    >
                      {shortDate(row.date)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="supervisor-reports-empty">
              No materialized daily financial rows for this period.
            </p>
          )}
          <p className="supervisor-reports-footnote">
            This is a report of ShopCity loyalty activity, not total POS sales.
          </p>
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
            <p className="supervisor-reports-empty">
              This report category is unavailable. Try Refresh.
            </p>
          ) : insights.every((insight) => insight.value === '—') ? (
            <p className="supervisor-reports-empty">
              No report data is available for this category and period.
            </p>
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
          <p className="supervisor-reports-footnote">
            Summaries are deterministic calculations from branch-scoped
            reporting rows; they are not AI-generated commentary.
          </p>
        </ShopCityCard>
      </div>

      <section
        className="supervisor-reports-builder"
        aria-labelledby="supervisor-reports-builder-title"
      >
        <div className="supervisor-reports-section-heading">
          <div>
            <p className="supervisor-reports-eyebrow">DETAILED REPORTING</p>
            <h2 id="supervisor-reports-builder-title">Generate reports</h2>
            <p>
              Select a report, inspect rows and export the authorized data using
              the same date range.
            </p>
          </div>
          <BarChart3 size={23} aria-hidden="true" />
        </div>
        <ReportsWorkspace
          period={{ from: period.from, to: period.to }}
          hideScopeInputs
          canRefreshReports={false}
          canUseAuditReport={false}
          canUseMaterializationState
          canUsePilotOperationsSummary={false}
        />
      </section>
      <p className="supervisor-reports-footnote supervisor-reports-footer">
        All data is limited to the authenticated supervisor’s branch. Reports
        may lag behind recent transactions until materialization completes.
      </p>
    </section>
  );
}
