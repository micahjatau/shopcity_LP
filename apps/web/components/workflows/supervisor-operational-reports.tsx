'use client';

import {
  Activity,
  ArrowDownRight,
  BarChart3,
  Check,
  ChevronDown,
  Filter,
  Info,
  RefreshCw,
  ShoppingBasket,
  Wallet,
} from 'lucide-react';
import Link from 'next/link';
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import {
  reportsControllerListCashierActivityV1,
  reportsControllerListExecutiveSummaryV1,
  reportsControllerListRedemptionSummaryV1,
  reportsControllerListSmsOperationsV1,
} from '../../lib/api/generated-client';
import { createApiRequest } from '../../lib/api/request';
import {
  formatReportCount,
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
import { useSessionBootstrapState } from '../session-bootstrap';
import { ReportsWorkspace } from './reports-workspace';
import { ReportProblemNotice } from './report-ui';

type DataSource = 'financial' | 'cashiers' | 'redemptions' | 'sms';
type Sources = Record<DataSource, ReportRow[] | null>;
type SourceIssues = Partial<Record<DataSource, ReportProblem>>;
type ReportScope = {
  scope?: string;
  branchId?: string | null;
  branchName?: string | null;
  timezone?: string;
};
type PeriodOption = 'week' | 'month' | 'custom';
type ReportsTab = 'overview' | 'insights' | 'reports';
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

function formatReportUpdatedAt(value: string, timezone: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return value;
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: timezone,
    timeZoneName: 'short',
  })
    .format(date)
    .replace(/GMT\+1$/, 'WAT');
}

function shortDate(value: string, timezone = 'Africa/Lagos'): string {
  if (!/^\d{4}-\d{2}-\d{2}/.test(value)) return value;
  return new Intl.DateTimeFormat('en-NG', {
    month: 'short',
    day: 'numeric',
    timeZone: timezone,
  }).format(new Date(`${value.slice(0, 10)}T12:00:00Z`));
}

function dailyChartScale(maxValue: number): {
  max: number;
  ticks: number[];
} {
  const intervalCount = 4;
  const roughInterval = Math.max(1, maxValue) / intervalCount;
  const magnitude = 10 ** Math.floor(Math.log10(roughInterval));
  const normalized = roughInterval / magnitude;
  const multiplier =
    normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  const interval = Math.max(1, multiplier * magnitude);
  return {
    max: interval * intervalCount,
    ticks: Array.from(
      { length: intervalCount + 1 },
      (_, index) => interval * index,
    ),
  };
}

function dailyChartDateLabel(
  value: string,
  compactMonthLabels: boolean,
  timezone: string,
): string {
  if (!compactMonthLabels || !/^\d{4}-\d{2}-\d{2}/.test(value)) {
    return shortDate(value, timezone);
  }
  const day = Number(value.slice(8, 10));
  if (day !== 1) return String(day);
  return new Intl.DateTimeFormat('en-NG', {
    month: 'short',
    timeZone: 'UTC',
  }).format(new Date(`${value.slice(0, 10)}T12:00:00Z`));
}

type ReportFilterOption = { value: string; label: string };

function ReportFilterMenu({
  label,
  value,
  options,
  onChange,
}: Readonly<{
  label: string;
  value: string;
  options: readonly ReportFilterOption[];
  onChange: (value: string) => void;
}>) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const listboxId = useId();
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );
  const [activeIndex, setActiveIndex] = useState(selectedIndex);
  const selectedOption = options[selectedIndex];

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !rootRef.current?.contains(event.target)
      ) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (open) optionRefs.current[activeIndex]?.focus();
  }, [activeIndex, open]);

  function handleOptionKeyDown(
    event: ReactKeyboardEvent<HTMLButtonElement>,
    index: number,
  ) {
    let nextIndex: number | undefined;
    if (event.key === 'ArrowDown') nextIndex = (index + 1) % options.length;
    if (event.key === 'ArrowUp')
      nextIndex = (index - 1 + options.length) % options.length;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = options.length - 1;
    if (nextIndex !== undefined) {
      event.preventDefault();
      setActiveIndex(nextIndex);
      optionRefs.current[nextIndex]?.focus();
    }
    if (event.key === 'Tab') setOpen(false);
  }

  return (
    <div ref={rootRef} className="supervisor-reports-filter-dropdown">
      <Button
        ref={triggerRef}
        type="button"
        variant="secondary"
        className="supervisor-reports-filter-trigger"
        aria-label={`${label}: ${selectedOption.label}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        onClick={() => {
          if (!open) setActiveIndex(selectedIndex);
          setOpen((current) => !current);
        }}
      >
        <Filter aria-hidden="true" size={15} />
        <span>{selectedOption.label}</span>
        <ChevronDown aria-hidden="true" size={14} />
      </Button>
      {open ? (
        <div
          id={listboxId}
          className="supervisor-reports-filter-menu"
          role="listbox"
          aria-label={`${label} options`}
        >
          {options.map((option, index) => (
            <button
              key={option.value}
              ref={(element) => {
                optionRefs.current[index] = element;
              }}
              type="button"
              role="option"
              aria-selected={value === option.value}
              tabIndex={activeIndex === index ? 0 : -1}
              className="supervisor-reports-filter-option"
              onKeyDown={(event) => handleOptionKeyDown(event, index)}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
                triggerRef.current?.focus();
              }}
            >
              <span>{option.label}</span>
              {value === option.value ? (
                <Check aria-hidden="true" size={14} />
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
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
  const { publicConfig } = useSessionBootstrapState();
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
  const [activeTab, setActiveTab] = useState<ReportsTab>('overview');
  const [visitedReportsTab, setVisitedReportsTab] = useState(false);

  useEffect(() => {
    const readTab = () => {
      const candidate = new URLSearchParams(window.location.search).get('tab');
      const next: ReportsTab =
        candidate === 'insights' || candidate === 'reports'
          ? candidate
          : 'overview';
      setActiveTab(next);
      if (next === 'reports') setVisitedReportsTab(true);
    };
    readTab();
    window.addEventListener('popstate', readTab);
    return () => window.removeEventListener('popstate', readTab);
  }, []);

  function selectTab(tab: ReportsTab) {
    setActiveTab(tab);
    if (tab === 'reports') setVisitedReportsTab(true);
    const url = new URL(window.location.href);
    if (tab === 'overview') url.searchParams.delete('tab');
    else url.searchParams.set('tab', tab);
    window.history.pushState({}, '', `${url.pathname}${url.search}${url.hash}`);
  }

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
  const branchName =
    reportScope?.branchName ??
    (reportScope?.branchId && reportScope.branchId === publicConfig?.branch?.id
      ? publicConfig.branch.name
      : null);
  const freshLabel = materializedAt
    ? formatReportUpdatedAt(materializedAt, displayTimezone)
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
          row[trendMetric] >= 0
            ? row[trendMetric]
            : null,
      }));
  }, [sources.financial, trendMetric]);

  const maxTrend = Math.max(1, ...trendRows.map((row) => row.amount ?? 0));
  const trendScale = dailyChartScale(maxTrend);
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
        eyebrow={isAdmin ? 'ADMIN · REPORTING' : undefined}
        title="Operational reports"
        description={
          isAdmin
            ? 'Review tenant or selected-branch performance, investigate patterns, and generate detailed reports.'
            : 'Review branch performance over time, investigate patterns, and generate detailed reports.'
        }
        actions={
          isAdmin ? (
            <Link className="supervisor-reports-back" href="/admin">
              Back to admin
            </Link>
          ) : undefined
        }
      />

      <div
        className="supervisor-reports-tabs"
        role="tablist"
        aria-label="Report sections"
      >
        {(
          [
            ['overview', 'Overview'],
            ['insights', 'Insights'],
            ['reports', 'Reports'],
          ] as const
        ).map(([tab, label]) => (
          <button
            key={tab}
            id={`supervisor-reports-tab-${tab}`}
            type="button"
            role="tab"
            aria-selected={activeTab === tab}
            aria-controls={`supervisor-reports-panel-${tab}`}
            tabIndex={activeTab === tab ? 0 : -1}
            onClick={() => selectTab(tab)}
            onKeyDown={(event) => {
              if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')
                return;
              event.preventDefault();
              const tabs: ReportsTab[] = ['overview', 'insights', 'reports'];
              const index = tabs.indexOf(tab);
              const next =
                tabs[(index + (event.key === 'ArrowRight' ? 1 : 2)) % 3];
              selectTab(next);
              document
                .getElementById(`supervisor-reports-tab-${next}`)
                ?.focus();
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <ShopCityCard
        className="supervisor-reports-period"
        aria-label="Dashboard reporting filters"
      >
        <div className="supervisor-reports-period__bar">
          <strong>Reporting period</strong>
          <div
            className="supervisor-reports-period__buttons"
            role="group"
            aria-label="Reporting period presets"
          >
            {(
              [
                ['week', 'Last 7 days'],
                ['month', 'Last 30 days'],
                ['custom', 'Custom dates'],
              ] as const
            ).map(([value, label]) => (
              <Button
                key={value}
                type="button"
                variant={mode === value ? 'primary' : 'secondary'}
                aria-pressed={mode === value}
                onClick={() => {
                  if (value === 'custom') setMode('custom');
                  else selectPeriod(value);
                }}
              >
                {label}
              </Button>
            ))}
          </div>
          <Select
            className="supervisor-reports-period__responsive-select"
            aria-label="Reporting period menu"
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
          <Button
            type="button"
            variant="secondary"
            onClick={() => setRevision((revisionValue) => revisionValue + 1)}
            loading={loading}
            disabled={rateLimitSeconds > 0}
            aria-label="Refresh dashboard data"
          >
            <RefreshCw size={16} aria-hidden="true" /> Refresh
          </Button>
          <span
            className="supervisor-reports-freshness"
            data-state={freshness}
            aria-live="polite"
          >
            {freshLabel && !loading
              ? `Updated ${freshLabel} · ${displayTimezone}`
              : loading
                ? 'Updating report…'
                : 'Update time unavailable'}
          </span>
          <span className="supervisor-reports-branch-name">
            ·{' '}
            {branchName ||
              (reportScope?.scope === 'TENANT' ? 'Tenant-wide' : '')}
          </span>
        </div>
        {mode === 'custom' ? (
          <div className="supervisor-reports-period__custom">
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
          </div>
        ) : null}
        {isAdmin ? (
          <details className="supervisor-reports-admin-scope">
            <summary>Admin scope filters</summary>
            <div className="supervisor-reports-period__custom">
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
            </div>
          </details>
        ) : null}
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

      <div
        id="supervisor-reports-panel-overview"
        role="tabpanel"
        aria-labelledby="supervisor-reports-tab-overview"
        className="supervisor-reports-tabpanel"
        hidden={activeTab !== 'overview'}
      >
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
          </div>
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
                ) : title.endsWith('customers') ? (
                  formatReportCount(amount)
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

        <ShopCityCard
          className="supervisor-reports-insights"
          aria-label="Filtered operational summaries"
        >
          <div className="supervisor-reports-card-heading">
            <div>
              <h2>Operational summary</h2>
              <p>
                Summaries calculated from the selected report category and
                period.
              </p>
            </div>
            <ReportFilterMenu
              label="Summary category"
              value={focus}
              onChange={(value) => setFocus(value as ReportFocus)}
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
        </ShopCityCard>
      </div>

      <div
        id="supervisor-reports-panel-insights"
        role="tabpanel"
        aria-labelledby="supervisor-reports-tab-insights"
        className="supervisor-reports-tabpanel"
        hidden={activeTab !== 'insights'}
      >
        <div className="supervisor-reports-analysis">
          <ShopCityCard
            className="supervisor-reports-trend"
            aria-label="Daily trend chart"
          >
            <div className="supervisor-reports-card-heading">
              <div>
                <h2>Daily activity</h2>
                <p>Materialized daily figures within the selected period.</p>
              </div>
              <ReportFilterMenu
                label="Trend metric"
                value={trendMetric}
                onChange={(value) => setTrendMetric(value as TrendMetric)}
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
                  Daily figures have not been materialized for this window, or
                  no report rows are available. Try another date range or reload
                  the dashboard.
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
                <div className="supervisor-reports-chart-layout">
                  <div
                    className="supervisor-reports-chart-y-axis"
                    aria-hidden="true"
                  >
                    {[...trendScale.ticks].reverse().map((tick, index) => (
                      <span key={`${tick}-${index}`}>
                        {formatReportMoneyCompact(tick)}
                      </span>
                    ))}
                  </div>
                  <div className="supervisor-reports-chart-scroll">
                    <div
                      className="supervisor-reports-chart"
                      role="list"
                      aria-label="Daily report values"
                    >
                      {trendRows.map((row) => {
                        const exactValue = formatReportMoney(row.amount);
                        const accessibleDate = shortDate(
                          row.date,
                          displayTimezone,
                        );
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
                                    height: `${row.amount === null || row.amount === 0 ? 0 : Math.max(3, (row.amount / trendScale.max) * 100)}%`,
                                    width: `min(100%, ${Math.min(32, Math.max(4, 340 / trendRows.length))}px)`,
                                  }}
                                  aria-hidden="true"
                                />
                              </span>
                              <span
                                className="supervisor-reports-chart__label"
                                aria-hidden="true"
                              >
                                {dailyChartDateLabel(
                                  row.date,
                                  mode === 'month',
                                  displayTimezone,
                                )}
                              </span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
                <p
                  className="supervisor-reports-chart-summary"
                  aria-live="polite"
                >
                  Over {trendRows.length} days, the highest value was{' '}
                  {peakTrend
                    ? `${formatReportMoney(peakTrend.amount)} on ${shortDate(peakTrend.date, displayTimezone)}.`
                    : 'not available.'}
                  {selectedTrendDate && selectedTrend
                    ? ` You selected ${shortDate(selectedTrend.date, displayTimezone)}: ${formatReportMoney(selectedTrend.amount)}.`
                    : ''}{' '}
                  Select a day to see its exact value.
                </p>
              </>
            )}
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
      </div>

      <div
        id="supervisor-reports-panel-reports"
        role="tabpanel"
        aria-labelledby="supervisor-reports-tab-reports"
        className="supervisor-reports-tabpanel"
        hidden={activeTab !== 'reports'}
      >
        {visitedReportsTab ? (
          <section
            className="supervisor-reports-builder"
            aria-labelledby="supervisor-reports-builder-title"
          >
            <div className="supervisor-reports-section-heading">
              <div>
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
              branchName={branchName}
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
        ) : null}
        {isAdmin ? (
          <p className="supervisor-reports-footnote supervisor-reports-footer">
            Data scope and access are enforced by the authenticated Admin
            session. Audit and pilot-operations reports are tenant-wide; other
            report scope follows the server-confirmed tenant or selected branch.
            Reports may lag behind recent transactions until materialization
            completes.
          </p>
        ) : null}
      </div>
    </section>
  );
}
