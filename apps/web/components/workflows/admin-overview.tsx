'use client';

import { useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import {
  formatReportCount,
  formatReportMoney,
  formatReportMoneyCompact,
  lastReportNumber,
  lastReportRow,
  sumReportField,
  shiftReportDate,
  type ReportRow,
} from '../../lib/reports/supervisor-report-metrics';
import {
  OverviewApiError,
  type AdminOverviewAuditEvent,
  type AdminOverviewMaterialization,
} from '../../lib/admin-overview/api';
import { useAdminOverviewData } from '../../lib/admin-overview/use-admin-overview-data';
import styles from './admin-overview.module.css';

const DISPLAYED_ACTIVITY_COUNT = 5;
const CHART_WIDTH = 560;
const CHART_HEIGHT = 160;
const PLOT_LEFT = 8;
const PLOT_RIGHT = 552;
const PLOT_TOP = 8;
const PLOT_BOTTOM = 140;
const LAGOS_TIME_ZONE = 'Africa/Lagos';

const actionLabels: Record<string, string> = {
  'user.create': 'User created',
  'user.role': 'User role changed',
  'user.status': 'User status changed',
  'customer.create': 'Customer registered',
  'customer.update': 'Customer updated',
  'customer.status': 'Customer status changed',
  'card.create': 'Virtual card created',
  'card.replace': 'Virtual card replaced',
  'card.status': 'Virtual card status changed',
  'redemption.requested': 'Redemption requested',
  'redemption.confirmed': 'Redemption confirmed',
  'approval.execute': 'Approval completed',
  'approval.reject': 'Approval rejected',
  'transaction.reversed': 'Transaction reversed',
  'configuration.policy.updated': 'Policy settings updated',
  'branch.create': 'Branch created',
  'branch.update': 'Branch updated',
  'device.token.pair': 'Device paired',
  'device.token.reset': 'Device token reset',
  REPORT_REFRESH_REQUESTED: 'Report refresh requested',
  REPORT_EXPORTED_CSV: 'Report exported',
};

const entityLabels: Record<string, string> = {
  customer: 'Customer',
  card: 'Virtual card',
  receipt: 'Transaction',
  redemption: 'Redemption',
  approval: 'Approval',
  user: 'User',
  branch: 'Branch',
  device: 'Device',
  configuration: 'Settings',
  report: 'Report',
  'ledger-entry': 'Ledger entry',
};

const EMPTY_REPORT_ROWS: ReportRow[] = [];

type ReportPoint = {
  date: string;
  label: string;
  issued: number | null;
  redeemed: number | null;
  registrations: number | null;
};

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function readableLabel(
  value: string | undefined,
  labels: Record<string, string>,
  fallback: string,
) {
  if (!value) return fallback;
  return (
    labels[value] ??
    value
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/[._-]+/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (letter) => letter.toUpperCase())
  );
}

function formatDateLabel(value: string) {
  const date = new Date(`${value.slice(0, 10)}T12:00:00Z`);
  if (Number.isNaN(date.valueOf())) return '—';
  return new Intl.DateTimeFormat('en-NG', {
    timeZone: LAGOS_TIME_ZONE,
    day: 'numeric',
    month: 'short',
  }).format(date);
}

function reportDateKey(value: unknown): string | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(value)) {
    return null;
  }
  return value.slice(0, 10);
}

function makeReportPoints(rows: ReportRow[], dates: string[]): ReportPoint[] {
  const rowsByDate = new Map<string, ReportRow>();
  for (const row of rows) {
    const date = reportDateKey(row.reportDate);
    if (date) rowsByDate.set(date, row);
  }

  return dates.map((date) => {
    const row = rowsByDate.get(date);
    return {
      date,
      label: formatDateLabel(date),
      issued: isNonNegativeInteger(row?.creditIssuedKobo)
        ? row.creditIssuedKobo
        : null,
      redeemed: isNonNegativeInteger(row?.creditRedeemedKobo)
        ? row.creditRedeemedKobo
        : null,
      registrations: isNonNegativeInteger(row?.registeredCustomers)
        ? row.registeredCustomers
        : null,
    };
  });
}

function pointX(index: number) {
  return PLOT_LEFT + (index * (PLOT_RIGHT - PLOT_LEFT)) / 6;
}

function yValue(value: number, max: number) {
  return PLOT_BOTTOM - (value / max) * (PLOT_BOTTOM - PLOT_TOP);
}

function linePath(
  points: ReportPoint[],
  key: 'issued' | 'redeemed',
  max: number,
) {
  let path = '';
  let openSegment = false;
  points.forEach((point, index) => {
    const value = point[key];
    if (value === null) {
      openSegment = false;
      return;
    }
    path += `${openSegment ? 'L' : 'M'} ${pointX(index)} ${yValue(value, max)} `;
    openSegment = true;
  });
  return path.trim();
}

function useChartKeyboardPoints(tooltipId: string) {
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  function pointProps(index: number, label: string) {
    return {
      ref: (element: HTMLButtonElement | null) => {
        buttons.current[index] = element;
      },
      onFocus: () => setActiveIndex(index),
      onMouseEnter: () => setActiveIndex(index),
      onMouseLeave: () => setActiveIndex(null),
      onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => {
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
        event.preventDefault();
        const direction = event.key === 'ArrowRight' ? 1 : -1;
        const next = index + direction;
        if (next >= 0 && next < buttons.current.length) {
          buttons.current[next]?.focus();
        }
      },
      'aria-label': label,
      'aria-describedby': activeIndex === index ? tooltipId : undefined,
      'aria-pressed': activeIndex === index,
    };
  }

  return { activeIndex, pointProps };
}

function EmptyState({ message }: { message: string }) {
  return (
    <p className={styles.empty} role="status">
      {message}
    </p>
  );
}

function LoadingState({ label }: { label: string }) {
  return (
    <div
      className={styles.skeleton}
      role="status"
      aria-label={`Loading ${label}`}
    >
      <span />
      <span />
      <span />
    </div>
  );
}

function sectionErrorText(error: OverviewApiError) {
  if (error.status === 429) return 'This section is temporarily rate-limited.';
  if (error.status === 401) return 'Your session may have expired. Try again.';
  if (error.status === 403) return 'You do not have access to this section.';
  if (error.status === 0)
    return 'This section could not be reached. Check your connection.';
  return error.title;
}

function retrySeconds(error: OverviewApiError | null, now: number) {
  if (!error?.retryAt) return 0;
  return Math.max(
    0,
    Math.ceil((error.retryAt - Math.max(now, Date.now())) / 1_000),
  );
}

function ErrorState({
  error,
  now,
  onRetry,
}: {
  error: OverviewApiError;
  now: number;
  onRetry: () => void;
}) {
  const remaining = retrySeconds(error, now);
  return (
    <div className={styles.error} role="alert">
      <div>
        <strong>{sectionErrorText(error)}</strong>
        {error.requestId ? <p>Reference: {error.requestId}</p> : null}
        {remaining > 0 ? <p>Try again in {remaining}s.</p> : null}
      </div>
      <button type="button" disabled={remaining > 0} onClick={onRetry}>
        {remaining > 0 ? `Retry in ${remaining}s` : 'Try again'}
      </button>
    </div>
  );
}

function ReportLineChart({ points }: { points: ReportPoint[] }) {
  const chartId = useId().replace(/:/g, '');
  const tooltipId = `${chartId}-tooltip`;
  const { activeIndex, pointProps } = useChartKeyboardPoints(tooltipId);
  const values = points.flatMap((point) => [point.issued, point.redeemed]);
  const available = values.filter((value): value is number => value !== null);
  if (!available.length) {
    return (
      <EmptyState message="No credit report values are available for these dates." />
    );
  }
  const max = Math.max(...available, 1);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((portion) => max * portion);
  const selected = activeIndex === null ? null : points[activeIndex];

  return (
    <div className={styles.lineChartWrap}>
      <div className={styles.lineChartLayout}>
        <div className={styles.yAxisLabels} aria-hidden="true">
          {[...ticks].reverse().map((tick, index) => (
            <span key={index}>
              {formatReportMoneyCompact(Math.round(tick))}
            </span>
          ))}
        </div>
        <div className={styles.chartPlotColumn}>
          <div className={styles.lineChartStage}>
            <svg
              className={styles.chart}
              viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
              preserveAspectRatio="none"
              role="img"
              aria-labelledby={`${chartId}-title ${chartId}-description`}
            >
              <title id={`${chartId}-title`}>Credit issued vs redeemed</title>
              <desc id={`${chartId}-description`}>
                Daily report values for the last seven Lagos business dates, in
                kobo. Missing report dates are shown as gaps, not zeroes.
              </desc>
              {ticks.map((tick, index) => {
                const y = PLOT_BOTTOM - (index * (PLOT_BOTTOM - PLOT_TOP)) / 4;
                return (
                  <line
                    key={index}
                    x1={PLOT_LEFT}
                    x2={PLOT_RIGHT}
                    y1={y}
                    y2={y}
                    className={styles.gridLine}
                  />
                );
              })}
              <line
                x1={PLOT_LEFT}
                x2={PLOT_RIGHT}
                y1={PLOT_BOTTOM}
                y2={PLOT_BOTTOM}
                className={styles.axisLine}
              />
              <path
                d={linePath(points, 'issued', max)}
                className={styles.issuedLine}
              />
              <path
                d={linePath(points, 'redeemed', max)}
                className={styles.redeemedLine}
              />
              {points.map((point, index) => (
                <g key={point.date}>
                  {point.issued !== null ? (
                    <circle
                      cx={pointX(index)}
                      cy={yValue(point.issued, max)}
                      r="2.5"
                      className={styles.issuedPoint}
                    />
                  ) : null}
                  {point.redeemed !== null ? (
                    <circle
                      cx={pointX(index)}
                      cy={yValue(point.redeemed, max)}
                      r="2.5"
                      className={styles.redeemedPoint}
                    />
                  ) : null}
                </g>
              ))}
            </svg>
            {points.map((point, index) => {
              const issued =
                point.issued === null
                  ? 'no report value'
                  : formatReportMoney(point.issued);
              const redeemed =
                point.redeemed === null
                  ? 'no report value'
                  : formatReportMoney(point.redeemed);
              const accessibleLabel = `${point.label}: issued ${issued}; redeemed ${redeemed}`;
              const topValue = [point.issued, point.redeemed]
                .filter((value): value is number => value !== null)
                .reduce<number | null>(
                  (top, value) => (top === null ? value : Math.max(top, value)),
                  null,
                );
              const y = topValue === null ? PLOT_BOTTOM : yValue(topValue, max);
              return (
                <button
                  className={styles.chartPointTarget}
                  type="button"
                  key={point.date}
                  style={{
                    left: `${(pointX(index) / CHART_WIDTH) * 100}%`,
                    top: `${(y / CHART_HEIGHT) * 100}%`,
                  }}
                  {...pointProps(index, accessibleLabel)}
                >
                  <span className={styles.visuallyHidden}>
                    {accessibleLabel}
                  </span>
                </button>
              );
            })}
          </div>
          <div className={styles.xAxisLabels} aria-hidden="true">
            {points.map((point) => (
              <span key={point.date}>{point.label}</span>
            ))}
          </div>
        </div>
      </div>
      <p
        className={styles.chartTooltip}
        id={tooltipId}
        role="tooltip"
        aria-live="polite"
      >
        {selected
          ? `${selected.label} · Issued ${selected.issued === null ? 'no report value' : formatReportMoney(selected.issued)} · Redeemed ${selected.redeemed === null ? 'no report value' : formatReportMoney(selected.redeemed)}`
          : 'Focus or point to a date to inspect exact values.'}
      </p>
      <div className={styles.legend} aria-hidden="true">
        <span>
          <i className={styles.issuedKey} />
          Issued
        </span>
        <span>
          <i className={styles.redeemedKey} />
          Redeemed
        </span>
      </div>
      <table className={styles.visuallyHidden}>
        <caption>Daily credit issued and redeemed, integer kobo</caption>
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Issued</th>
            <th scope="col">Redeemed</th>
          </tr>
        </thead>
        <tbody>
          {points.map((point) => (
            <tr key={point.date}>
              <th scope="row">{point.label}</th>
              <td>
                {point.issued === null ? 'No report value' : point.issued}
              </td>
              <td>
                {point.redeemed === null ? 'No report value' : point.redeemed}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RegistrationChart({ points }: { points: ReportPoint[] }) {
  const tooltipId = `${useId().replace(/:/g, '')}-tooltip`;
  const { activeIndex, pointProps } = useChartKeyboardPoints(tooltipId);
  const values = points.flatMap((point) =>
    point.registrations === null ? [] : [point.registrations],
  );
  if (!values.length) {
    return (
      <EmptyState message="No cumulative customer snapshots are available for these dates." />
    );
  }
  const max = Math.max(...values, 1);
  const selected = activeIndex === null ? null : points[activeIndex];

  return (
    <div className={styles.registrationChartWrap}>
      <div
        className={styles.registrationChart}
        role="group"
        aria-label="Cumulative registered-customer snapshots by date"
      >
        {points.map((point, index) => {
          const value = point.registrations;
          const accessibleLabel = `${point.label}: ${value === null ? 'no report value' : `${formatReportCount(value)} cumulative registered customers`}`;
          return (
            <button
              className={styles.registrationDay}
              type="button"
              key={point.date}
              {...pointProps(index, accessibleLabel)}
            >
              <span className={styles.barValue}>
                {value === null ? '—' : formatReportCount(value)}
              </span>
              <span className={styles.barTrack} aria-hidden="true">
                <span
                  className={value === null ? styles.barMissing : styles.bar}
                  style={{
                    height:
                      value === null
                        ? '0%'
                        : `${Math.max(value === 0 ? 2 : 3, (value / max) * 100)}%`,
                  }}
                />
              </span>
              <span className={styles.barLabel}>{point.label}</span>
            </button>
          );
        })}
      </div>
      <p
        className={styles.chartTooltip}
        id={tooltipId}
        role="tooltip"
        aria-live="polite"
      >
        {selected
          ? `${selected.label} · ${selected.registrations === null ? 'No report value' : `${formatReportCount(selected.registrations)} cumulative registered customers`}`
          : 'Focus or point to a date to inspect the cumulative snapshot.'}
      </p>
      <table className={styles.visuallyHidden}>
        <caption>Cumulative registered-customer snapshots</caption>
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Cumulative registrations</th>
          </tr>
        </thead>
        <tbody>
          {points.map((point) => (
            <tr key={point.date}>
              <th scope="row">{point.label}</th>
              <td>
                {point.registrations === null
                  ? 'No report value'
                  : point.registrations}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function relativeActivityTime(value: string | undefined, now: number) {
  if (!value) return { relative: 'Time unavailable', absolute: undefined };
  const date = new Date(value);
  if (Number.isNaN(date.valueOf()))
    return { relative: 'Time unavailable', absolute: undefined };
  const deltaSeconds = Math.round((date.getTime() - now) / 1_000);
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ['year', 31_536_000],
    ['month', 2_592_000],
    ['day', 86_400],
    ['hour', 3_600],
    ['minute', 60],
    ['second', 1],
  ];
  const selectedUnit = units.find(
    ([, seconds]) => Math.abs(deltaSeconds) >= seconds,
  );
  const unit: Intl.RelativeTimeFormatUnit = selectedUnit?.[0] ?? 'second';
  const divisor = selectedUnit?.[1] ?? 1;
  const relative = new Intl.RelativeTimeFormat('en', {
    numeric: 'auto',
  }).format(Math.round(deltaSeconds / divisor), unit);
  const absolute = `${new Intl.DateTimeFormat('en-NG', {
    timeZone: LAGOS_TIME_ZONE,
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)} WAT`;
  return { relative, absolute };
}

function activityReason(event: AdminOverviewAuditEvent) {
  const reasonCode = event.metadata?.reasonCode;
  if (typeof reasonCode !== 'string' || reasonCode.length > 80) return null;
  return readableLabel(reasonCode, {}, '');
}

function ActivityList({
  items,
  now,
}: {
  items: AdminOverviewAuditEvent[];
  now: number;
}) {
  const visible = items.slice(0, DISPLAYED_ACTIVITY_COUNT);
  if (!visible.length)
    return <EmptyState message="No recent activity is available." />;
  return (
    <ol className={styles.activityList}>
      {visible.map((event, index) => {
        const timestamp = relativeActivityTime(event.createdAt, now);
        const entity = readableLabel(event.entityType, entityLabels, 'Record');
        const actor = event.actorDisplayName
          ? event.actorDisplayName
          : event.actorId === null
            ? 'System'
            : event.actorId
              ? 'Staff member'
              : 'Actor unavailable';
        const reason = activityReason(event);
        const reference = event.entityId
          ? `${entity} reference: ${event.entityId}`
          : null;
        return (
          <li
            className={styles.activityItem}
            key={event.id ?? `${event.action}-${event.createdAt}-${index}`}
          >
            <div className={styles.activityCopy}>
              <h3>
                {readableLabel(event.action, actionLabels, 'Activity recorded')}
              </h3>
              <p>{entity}</p>
              {reference ? (
                <details className={styles.activityReference}>
                  <summary>Record details</summary>
                  <span>{reference}</span>
                </details>
              ) : null}
              {reason ? (
                <p className={styles.activityReason}>Reason: {reason}</p>
              ) : null}
            </div>
            <div className={styles.activityMeta}>
              <span>{actor}</span>
              {event.createdAt ? (
                <time dateTime={event.createdAt} title={timestamp.absolute}>
                  {timestamp.relative}
                </time>
              ) : (
                <span>Time unavailable</span>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function StaleReportNotice({
  error,
  now,
  onRetry,
}: {
  error: OverviewApiError;
  now: number;
  onRetry: () => void;
}) {
  const remaining = retrySeconds(error, now);
  return (
    <div className={styles.inlineError} role="status">
      <span>Refresh failed; showing the last available report snapshot.</span>
      {error.requestId ? <span>Reference: {error.requestId}</span> : null}
      <button type="button" disabled={remaining > 0} onClick={onRetry}>
        {remaining > 0 ? `Retry in ${remaining}s` : 'Retry'}
      </button>
    </div>
  );
}

function FreshnessNotice({
  state,
  reportsMeta,
  error,
  now,
  onRetry,
}: {
  state: AdminOverviewMaterialization | null;
  reportsMeta: { timestamp: string } | null;
  error: OverviewApiError | null;
  now: number;
  onRetry: () => void;
}) {
  if (error) {
    return (
      <div className={styles.freshnessError}>
        <span>Report freshness is unavailable.</span>
        <button
          type="button"
          disabled={retrySeconds(error, now) > 0}
          onClick={onRetry}
        >
          {retrySeconds(error, now) > 0
            ? `Retry in ${retrySeconds(error, now)}s`
            : 'Retry'}
        </button>
      </div>
    );
  }
  if (!state)
    return <p className={styles.freshness}>Checking report freshness…</p>;

  const materializedAt = state.materializedAt ?? state.updatedAt;
  const timestamp =
    materializedAt ?? reportsMeta?.timestamp ?? state.metaTimestamp;
  const formatted = timestamp
    ? relativeActivityTime(timestamp, now).absolute
    : undefined;
  const incomplete = state.status !== 'COMPLETED';
  return (
    <div
      className={incomplete ? styles.freshnessWarning : styles.freshness}
      role={incomplete ? 'status' : undefined}
    >
      <span>
        {incomplete
          ? 'Report materialization is incomplete; the latest available snapshot may be older.'
          : materializedAt
            ? 'Report materialized'
            : 'Response received'}
      </span>
      <span>{formatted ?? 'Materialization time unavailable'}</span>
    </div>
  );
}

export function AdminOverview() {
  const data = useAdminOverviewData();
  const rows = data.reports.data?.items ?? EMPTY_REPORT_ROWS;
  const points = useMemo(
    () =>
      makeReportPoints(
        rows,
        Array.from({ length: 7 }, (_, index) =>
          shiftReportDate(data.period.to, index - 6),
        ),
      ),
    [data.period.to, rows],
  );
  const latest = lastReportRow(rows);
  const latestDate = reportDateKey(latest?.reportDate);
  const reportLoading = data.reports.status === 'loading' && !data.reports.data;
  const approvalLoading =
    data.approvals.status === 'loading' && !data.approvals.data;
  const hasLoading = [
    data.reports,
    data.activeCards,
    data.materialization,
    data.approvals,
    data.activity,
  ].some((section) => section.status === 'loading');
  const metrics: Array<{
    label: string;
    value: string | null;
    detail: string;
    loading?: boolean;
    unavailable?: boolean;
    error?: OverviewApiError | null;
    retry?: () => Promise<void>;
  }> = [
    {
      label: 'Active customers',
      value: data.reports.data
        ? formatReportCount(lastReportNumber(rows, 'activeCustomers'))
        : null,
      detail: latestDate
        ? `Latest snapshot · ${formatDateLabel(latestDate)}`
        : 'Latest available report snapshot',
      loading: reportLoading,
      error: data.reports.error,
      retry: data.loadReports,
    },
    {
      label: 'Active virtual cards',
      value: data.activeCards.data
        ? formatReportCount(data.activeCards.data.activeVirtualCardCount)
        : null,
      detail: data.activeCards.error
        ? 'Active-card count could not be loaded'
        : 'Current tenant total',
      loading: data.activeCards.status === 'loading' && !data.activeCards.data,
      error: data.activeCards.error,
      retry: data.loadActiveCards,
    },
    {
      label: 'Credit issued',
      value: data.reports.data
        ? formatReportMoneyCompact(sumReportField(rows, 'creditIssuedKobo'))
        : null,
      detail: `${data.period.label} · daily report values`,
      loading: reportLoading,
      error: data.reports.error,
      retry: data.loadReports,
    },
    {
      label: 'Credit redeemed',
      value: data.reports.data
        ? formatReportMoneyCompact(sumReportField(rows, 'creditRedeemedKobo'))
        : null,
      detail: `${data.period.label} · daily report values`,
      loading: reportLoading,
      error: data.reports.error,
      retry: data.loadReports,
    },
    {
      label: 'Outstanding liability',
      value: data.reports.data
        ? formatReportMoneyCompact(
            lastReportNumber(rows, 'outstandingLiabilityKobo'),
          )
        : null,
      detail: latestDate
        ? `As of ${formatDateLabel(latestDate)}`
        : 'Latest available report snapshot',
      loading: reportLoading,
      error: data.reports.error,
      retry: data.loadReports,
    },
    {
      label: 'Pending approvals',
      value:
        data.approvals.data?.totalCount === null || !data.approvals.data
          ? null
          : formatReportCount(data.approvals.data.totalCount),
      detail: data.approvals.error
        ? 'Pending count could not be loaded'
        : 'Current pending queue',
      loading: approvalLoading,
      error: data.approvals.error,
      retry: data.loadApprovals,
    },
  ];

  return (
    <section className={styles.overview} aria-labelledby="admin-overview-title">
      <header className={styles.pageHeader}>
        <div>
          <h1 id="admin-overview-title">Overview</h1>
          <p>Latest activity across the loyalty portal</p>
        </div>
        <button
          className={styles.refresh}
          type="button"
          disabled={hasLoading || data.cooldownActive}
          onClick={() => void data.refreshAll()}
        >
          Refresh overview
        </button>
      </header>

      <FreshnessNotice
        state={data.materialization.data}
        reportsMeta={data.reports.data?.meta ?? null}
        error={data.materialization.error}
        now={data.now}
        onRetry={() => void data.loadMaterialization()}
      />

      <section className={styles.metrics} aria-label="Key metrics">
        {metrics.map((metric) => (
          <article className={styles.metric} key={metric.label}>
            <h2>{metric.label}</h2>
            {metric.loading ? (
              <LoadingState label={metric.label} />
            ) : (
              <p
                className={
                  metric.value === null || metric.unavailable
                    ? styles.metricUnavailable
                    : styles.metricValue
                }
                title={
                  metric.unavailable
                    ? 'A tenant-wide active virtual-card count is not available from the current API.'
                    : undefined
                }
              >
                {metric.value ?? '—'}
              </p>
            )}
            <span>{metric.detail}</span>
            {metric.error &&
            (metric.label === 'Pending approvals' ||
              metric.label === 'Active virtual cards') ? (
              <ErrorState
                error={metric.error}
                now={data.now}
                onRetry={() => void metric.retry?.()}
              />
            ) : null}
          </article>
        ))}
      </section>

      <section
        className={styles.chartGrid}
        aria-label="Seven-day activity charts"
      >
        <article className={styles.panel}>
          <header className={styles.panelHeader}>
            <h2>Credit issued vs redeemed</h2>
            <p>{data.period.label}</p>
          </header>
          {data.reports.status === 'loading' && !data.reports.data ? (
            <LoadingState label="credit trend" />
          ) : null}
          {data.reports.error && !data.reports.data ? (
            <ErrorState
              error={data.reports.error}
              now={data.now}
              onRetry={() => void data.loadReports()}
            />
          ) : null}
          {data.reports.error && data.reports.data ? (
            <StaleReportNotice
              error={data.reports.error}
              now={data.now}
              onRetry={() => void data.loadReports()}
            />
          ) : null}
          {data.reports.data ? <ReportLineChart points={points} /> : null}
        </article>
        <article className={styles.panel}>
          <header className={styles.panelHeader}>
            <h2>Customer registrations</h2>
            <p>{data.period.label} · cumulative snapshots</p>
          </header>
          {data.reports.status === 'loading' && !data.reports.data ? (
            <LoadingState label="registration trend" />
          ) : null}
          {data.reports.error && !data.reports.data ? (
            <ErrorState
              error={data.reports.error}
              now={data.now}
              onRetry={() => void data.loadReports()}
            />
          ) : null}
          {data.reports.data ? <RegistrationChart points={points} /> : null}
        </article>
      </section>

      <section className={styles.panel} aria-labelledby="recent-activity-title">
        <header className={styles.panelHeader}>
          <div>
            <h2 id="recent-activity-title">Recent activity</h2>
            <p>Latest activities on the loyalty portal</p>
          </div>
          <a className={styles.viewAll} href="/admin/audit">
            View all
          </a>
        </header>
        {data.activity.status === 'loading' && !data.activity.data ? (
          <LoadingState label="recent activity" />
        ) : null}
        {data.activity.error && !data.activity.data ? (
          <ErrorState
            error={data.activity.error}
            now={data.now}
            onRetry={() => void data.loadActivity()}
          />
        ) : null}
        {data.activity.data ? (
          <ActivityList items={data.activity.data.items} now={data.now} />
        ) : null}
        {data.activity.status === 'empty' ? (
          <EmptyState message="No recent activity is available." />
        ) : null}
      </section>
    </section>
  );
}
