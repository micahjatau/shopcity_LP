'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  reportsControllerGetPilotOperationsHistoryV1,
  type ReportsControllerGetPilotOperationsHistoryV1200Data,
  type ReportsControllerGetPilotOperationsHistoryV1200DataItemsItem,
} from '../../lib/api/generated-client';
import { createApiRequest } from '../../lib/api/request';
import styles from './admin-operations-health-trend.module.css';

type HistoryWindow = '24h' | '7d' | '30d';
type MetricKey =
  | 'outbox.backlogCount'
  | 'outbox.staleCount'
  | 'sms.failedCount'
  | 'offlineSync.failureCount'
  | 'fraud.openCount'
  | 'reports.staleCount'
  | 'reconciliation.mismatchCount';
type HistoryPoint =
  ReportsControllerGetPilotOperationsHistoryV1200DataItemsItem;
type HistoryData = ReportsControllerGetPilotOperationsHistoryV1200Data;
type HistoryResponse = Awaited<
  ReturnType<typeof reportsControllerGetPilotOperationsHistoryV1>
>;
type ChartPoint = {
  bucketStart: Date;
  capturedAt: string | null;
  value: number | null;
};

type MetricOption = {
  key: MetricKey;
  label: string;
  value: (point: HistoryPoint) => number;
};

const HOUR_MS = 60 * 60 * 1_000;
const WINDOW_BUCKETS: Record<HistoryWindow, number> = {
  '24h': 24,
  '7d': 24 * 7,
  '30d': 24 * 30,
};
const WINDOW_OPTIONS: Array<{ value: HistoryWindow; label: string }> = [
  { value: '24h', label: '24 hours' },
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
];
const METRICS: MetricOption[] = [
  {
    key: 'outbox.backlogCount',
    label: 'Outbox backlog',
    value: (point) => point.outbox.backlogCount,
  },
  {
    key: 'outbox.staleCount',
    label: 'Stale outbox events',
    value: (point) => point.outbox.staleCount,
  },
  {
    key: 'sms.failedCount',
    label: 'Failed SMS messages',
    value: (point) => point.sms.failedCount,
  },
  {
    key: 'offlineSync.failureCount',
    label: 'Offline sync failures',
    value: (point) => point.offlineSync.failureCount,
  },
  {
    key: 'fraud.openCount',
    label: 'Open fraud flags',
    value: (point) => point.fraud.openCount,
  },
  {
    key: 'reports.staleCount',
    label: 'Stale report materializations',
    value: (point) => point.reports.staleCount,
  },
  {
    key: 'reconciliation.mismatchCount',
    label: 'Reconciliation mismatches',
    value: (point) => point.reconciliation.mismatchCount,
  },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function isHistoryPoint(value: unknown): value is HistoryPoint {
  if (!isRecord(value)) return false;
  const outbox = value.outbox;
  const sms = value.sms;
  const offlineSync = value.offlineSync;
  const fraud = value.fraud;
  const reports = value.reports;
  const reconciliation = value.reconciliation;

  return (
    typeof value.bucketStart === 'string' &&
    !Number.isNaN(Date.parse(value.bucketStart)) &&
    typeof value.capturedAt === 'string' &&
    !Number.isNaN(Date.parse(value.capturedAt)) &&
    isRecord(outbox) &&
    isCount(outbox.backlogCount) &&
    isCount(outbox.staleCount) &&
    isRecord(sms) &&
    isCount(sms.failedCount) &&
    isRecord(offlineSync) &&
    isCount(offlineSync.failureCount) &&
    isRecord(fraud) &&
    isCount(fraud.openCount) &&
    isRecord(reports) &&
    isCount(reports.staleCount) &&
    isRecord(reconciliation) &&
    typeof reconciliation.healthy === 'boolean' &&
    isCount(reconciliation.mismatchCount)
  );
}

function isHistoryData(value: unknown): value is HistoryData {
  return (
    isRecord(value) &&
    (value.window === '24h' ||
      value.window === '7d' ||
      value.window === '30d') &&
    typeof value.generatedAt === 'string' &&
    !Number.isNaN(Date.parse(value.generatedAt)) &&
    Array.isArray(value.items) &&
    value.items.length <= 720 &&
    value.items.every(isHistoryPoint)
  );
}

function formatSampleTime(value: string): string {
  return new Intl.DateTimeFormat('en-NG', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Africa/Lagos',
  }).format(new Date(value));
}

function formatAxisTime(value: Date): string {
  return new Intl.DateTimeFormat('en-NG', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    timeZone: 'Africa/Lagos',
  }).format(value);
}

function getMetricValue(point: HistoryPoint, key: MetricKey): number | null {
  const metric = METRICS.find((candidate) => candidate.key === key);
  return metric ? metric.value(point) : null;
}

function buildChartPoints(
  data: HistoryData,
  window: HistoryWindow,
  metric: MetricKey,
): ChartPoint[] {
  const generatedAt = new Date(data.generatedAt);
  const currentBucket = Math.floor(generatedAt.getTime() / HOUR_MS) * HOUR_MS;
  const bucketCount = WINDOW_BUCKETS[window];
  const firstBucket = currentBucket - (bucketCount - 1) * HOUR_MS;
  const observedByHour = new Map<number, HistoryPoint>();

  for (const item of data.items) {
    const timestamp = Date.parse(item.bucketStart);
    if (!Number.isFinite(timestamp)) continue;
    const bucket = Math.floor(timestamp / HOUR_MS) * HOUR_MS;
    if (bucket >= firstBucket && bucket <= currentBucket) {
      observedByHour.set(bucket, item);
    }
  }

  return Array.from({ length: bucketCount }, (_, index) => {
    const timestamp = firstBucket + index * HOUR_MS;
    const observed = observedByHour.get(timestamp);
    return {
      bucketStart: new Date(timestamp),
      capturedAt: observed?.capturedAt ?? null,
      value: observed ? getMetricValue(observed, metric) : null,
    };
  });
}

function buildLinePath(points: ChartPoint[], maximum: number): string {
  const chartWidth = 720;
  const chartHeight = 150;
  let drawingSegment = false;
  let path = '';

  points.forEach((point, index) => {
    if (point.value === null) {
      drawingSegment = false;
      return;
    }

    const x =
      points.length <= 1
        ? chartWidth / 2
        : (index / (points.length - 1)) * chartWidth;
    const y = chartHeight - (point.value / maximum) * chartHeight;
    path += `${drawingSegment ? ' L' : ' M'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    drawingSegment = true;
  });

  return path.trim();
}

export function AdminOperationsHealthTrend() {
  const uniqueId = useId();
  const [window, setWindow] = useState<HistoryWindow>('7d');
  const [metric, setMetric] = useState<MetricKey>('outbox.backlogCount');
  const [retryCount, setRetryCount] = useState(0);
  const [history, setHistory] = useState<HistoryData | null>(null);
  const inFlightRequests = useRef(
    new Map<HistoryWindow, Promise<HistoryResponse>>(),
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function loadHistory() {
      setHistory(null);
      setError(null);
      setLoading(true);
      let request: Promise<HistoryResponse> | undefined;
      try {
        request = inFlightRequests.current.get(window);
        if (!request) {
          request = reportsControllerGetPilotOperationsHistoryV1(
            { window },
            createApiRequest({ csrf: true }),
          );
          inFlightRequests.current.set(window, request);
        }
        const response = await request;
        if (ignore) return;

        if (
          response.status !== 200 ||
          !isHistoryData(response.data.data) ||
          response.data.data.window !== window
        ) {
          setError(
            response.status === 200
              ? 'Operational history response was invalid.'
              : `Operational history unavailable (${response.status}).`,
          );
          return;
        }

        setHistory(response.data.data);
      } catch {
        if (!ignore) setError('Operational history unavailable.');
      } finally {
        if (request && inFlightRequests.current.get(window) === request) {
          inFlightRequests.current.delete(window);
        }
        if (!ignore) setLoading(false);
      }
    }

    void loadHistory();
    return () => {
      ignore = true;
    };
  }, [window, retryCount]);

  const selectedMetric = METRICS.find((candidate) => candidate.key === metric)!;
  const points = useMemo(
    () => (history ? buildChartPoints(history, window, metric) : []),
    [history, metric, window],
  );
  const observedPoints = points.filter((point) => point.value !== null);
  const maximum = Math.max(
    1,
    ...observedPoints.map((point) => point.value ?? 0),
  );
  const path = buildLinePath(points, maximum);
  const firstObserved = observedPoints[0];
  const lastObserved = observedPoints.at(-1);
  const chartTitleId = `pilot-operations-history-title-${uniqueId}`;
  const chartDescriptionId = `pilot-operations-history-description-${uniqueId}`;

  return (
    <section className={styles.trend} aria-labelledby={chartTitleId}>
      <div className={styles.header}>
        <div className={styles.heading}>
          <h3 id={chartTitleId}>Operational health trends</h3>
          <p>
            Hourly snapshots from live backend counts; history begins at
            rollout.
          </p>
        </div>
        <div className={styles.controls}>
          <label className={styles.control}>
            <span>Metric</span>
            <select
              aria-label="Health trend metric"
              value={metric}
              onChange={(event) => setMetric(event.target.value as MetricKey)}
            >
              {METRICS.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.control}>
            <span>Range</span>
            <select
              aria-label="Health trend range"
              value={window}
              onChange={(event) =>
                setWindow(event.target.value as HistoryWindow)
              }
            >
              {WINDOW_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {loading ? (
        <p className={styles.status} role="status">
          Loading {window} operational history…
        </p>
      ) : error ? (
        <div className={styles.error} role="alert">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setRetryCount((count) => count + 1)}
          >
            Retry
          </button>
        </div>
      ) : observedPoints.length === 0 ? (
        <p className={styles.empty} role="status">
          No {window} snapshots are available yet. Collection starts with the
          first worker sample; earlier history is not backfilled.
        </p>
      ) : (
        <>
          <div className={styles.summary}>
            <span>{selectedMetric.label}</span>
            <span>
              {observedPoints.length.toLocaleString('en-NG')} observed samples
            </span>
            {lastObserved?.capturedAt ? (
              <span>
                Last checked {formatSampleTime(lastObserved.capturedAt)}
              </span>
            ) : null}
          </div>
          <div className={styles.chart}>
            <svg
              viewBox="0 0 760 194"
              role="img"
              aria-labelledby={chartTitleId}
              aria-describedby={chartDescriptionId}
            >
              <desc id={chartDescriptionId}>
                {selectedMetric.label} over the last {window}. Missing hourly
                snapshots are shown as gaps, not zero values.
              </desc>
              {[0, 0.5, 1].map((ratio) => {
                const y = 12 + ratio * 150;
                const value = Math.round(maximum * (1 - ratio));
                return (
                  <g key={ratio} aria-hidden="true">
                    <line
                      className={styles.grid}
                      x1="34"
                      x2="746"
                      y1={y}
                      y2={y}
                    />
                    <text
                      className={styles.axisLabel}
                      x="28"
                      y={y + 4}
                      textAnchor="end"
                    >
                      {value.toLocaleString('en-NG')}
                    </text>
                  </g>
                );
              })}
              <g transform="translate(36 14)">
                <path className={styles.line} d={path} />
                {points.map((point, index) => {
                  if (point.value === null) return null;
                  const x =
                    points.length <= 1
                      ? 360
                      : (index / (points.length - 1)) * 720;
                  const y = 150 - (point.value / maximum) * 150;
                  return (
                    <circle
                      key={point.bucketStart.toISOString()}
                      className={styles.point}
                      cx={x}
                      cy={y}
                      r="2.2"
                    />
                  );
                })}
              </g>
              {[0, Math.floor((points.length - 1) / 2), points.length - 1].map(
                (index) => {
                  const point = points[index];
                  if (!point) return null;
                  const x = 36 + (index / Math.max(points.length - 1, 1)) * 720;
                  return (
                    <text
                      key={`${index}-${point.bucketStart.toISOString()}`}
                      className={styles.axisLabel}
                      x={x}
                      y="186"
                      textAnchor={
                        index === 0
                          ? 'start'
                          : index === points.length - 1
                            ? 'end'
                            : 'middle'
                      }
                    >
                      {formatAxisTime(point.bucketStart)}
                    </text>
                  );
                },
              )}
            </svg>
          </div>
          <details className={styles.details}>
            <summary>View observed values</summary>
            <div className={styles.tableWrap}>
              <table>
                <caption>
                  {selectedMetric.label} hourly observations for {window}
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Hour (Africa/Lagos)</th>
                    <th scope="col">Captured at</th>
                    <th scope="col">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {points.map((point) => (
                    <tr key={point.bucketStart.toISOString()}>
                      <td>
                        {formatSampleTime(point.bucketStart.toISOString())}
                      </td>
                      <td>
                        {point.capturedAt
                          ? formatSampleTime(point.capturedAt)
                          : 'No sample'}
                      </td>
                      <td>
                        {point.value === null
                          ? 'No sample'
                          : point.value.toLocaleString('en-NG')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
          {firstObserved ? (
            <p className={styles.note}>
              First retained sample{' '}
              {formatSampleTime(firstObserved.bucketStart.toISOString())}.
              Missing hours remain gaps.
            </p>
          ) : null}
        </>
      )}
    </section>
  );
}
