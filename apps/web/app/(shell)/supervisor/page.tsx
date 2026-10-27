'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, RefreshCw, Search } from 'lucide-react';
import {
  approvalsControllerListApprovalsV1,
  reportsControllerGetExecutiveSnapshotV1,
} from '../../../lib/api/generated-client';
import { createApiRequest } from '../../../lib/api/request';
import {
  formatReportCount,
  formatReportMoney,
  type ReportRow,
} from '../../../lib/reports/supervisor-report-metrics';
import { isReportForBusinessDate } from '../../../lib/reports/supervisor-overview-data';
import { ScannerContextScope } from '../../../components/scanner-context-scope';
import { CashierPageHeader } from '../../../components/shopcity';

/* eslint-disable jsx-a11y/no-noninteractive-tabindex -- the table region is focusable to support keyboard scrolling */

type OverviewSnapshot = {
  timezone: string;
  row: ReportRow | null;
  latestReportDate: string | null;
  fetchedAt: string;
};

type ApprovalRecord = {
  id: string;
  targetType?: string;
  reasonCode?: string | null;
  requestedAmountKobo?: number | null;
  requestedAt?: string;
  receiptId?: string | null;
  customer?: { id?: string; fullName?: string | null };
  requester?: { username?: string; role?: string } | null;
  receipt?: { posReceiptNumber?: string } | null;
};

type OverviewApprovals = {
  cursor: string;
  search: string;
  items: ApprovalRecord[];
  totalCount: number | null;
  scopeTotalCount: number | null;
  nextCursor: string | null;
  hasMore: boolean;
  fetchedAt: string;
};

const reportMetricFields = [
  { label: 'Transactions today', field: 'transactionCount' },
  { label: 'Credit issued', field: 'creditIssuedKobo' },
  { label: 'Credit redeemed', field: 'creditRedeemedKobo' },
] as const;

function safeNonNegativeInteger(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
    ? value
    : null;
}

function reportDatePart(value: unknown): string | null {
  return typeof value === 'string'
    ? (/^\d{4}-\d{2}-\d{2}/.exec(value)?.[0] ?? null)
    : null;
}

function formatBranchTime(value: unknown, timeZone: string): string | null {
  if (typeof value !== 'string') return null;
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return null;
  try {
    return new Intl.DateTimeFormat('en-NG', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone,
    }).format(date);
  } catch {
    return null;
  }
}

function formatReportDate(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(`${value}T12:00:00Z`);
  if (Number.isNaN(date.valueOf())) return null;
  return new Intl.DateTimeFormat('en-NG', {
    dateStyle: 'medium',
    timeZone: 'UTC',
  }).format(date);
}

function customerLabel(approval: ApprovalRecord): string {
  return (
    approval.customer?.fullName ??
    (approval.customer?.id
      ? `Customer ${approval.customer.id.slice(0, 8)}`
      : 'Customer')
  );
}

function reasonLabel(approval: ApprovalRecord): string {
  const reason = approval.reasonCode?.replaceAll('_', ' ').toLocaleLowerCase();
  if (reason) return reason.charAt(0).toLocaleUpperCase() + reason.slice(1);
  return approval.targetType === 'REDEEM'
    ? 'Redemption request'
    : 'Purchase request';
}

export default function SupervisorPage() {
  const [query, setQuery] = useState('');
  const [snapshot, setSnapshot] = useState<OverviewSnapshot | null>(null);
  const [approvals, setApprovals] = useState<OverviewApprovals | null>(null);
  const [snapshotLoading, setSnapshotLoading] = useState(true);
  const [approvalsLoading, setApprovalsLoading] = useState(true);
  const [snapshotError, setSnapshotError] = useState('');
  const [approvalsError, setApprovalsError] = useState('');
  const [refreshRevision, setRefreshRevision] = useState(0);
  const [activeSearch, setActiveSearch] = useState('');
  const [cursorHistory, setCursorHistory] = useState(['']);
  const currentCursor = cursorHistory[cursorHistory.length - 1] ?? '';
  const normalizedQuery = query.trim();
  const searchPending = normalizedQuery !== activeSearch;

  useEffect(() => {
    if (!searchPending) return;
    const timeout = window.setTimeout(() => {
      setActiveSearch(normalizedQuery);
      setCursorHistory(['']);
      setApprovalsError('');
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [normalizedQuery, searchPending]);

  useEffect(() => {
    let active = true;
    setSnapshotLoading(true);
    setSnapshotError('');

    void reportsControllerGetExecutiveSnapshotV1(
      {},
      createApiRequest({ csrf: true }),
    )
      .then((response) => {
        if (!active) return;
        if (response.status !== 200) {
          setSnapshotError(
            `Daily reporting is unavailable (${response.status}). Try refreshing.`,
          );
          return;
        }

        const data = response.data.data;
        const latest = data.items[0] as ReportRow | undefined;
        const latestReportDate = reportDatePart(latest?.reportDate);
        const isToday = isReportForBusinessDate(
          latest?.reportDate,
          data.timezone,
        );
        setSnapshot({
          timezone: data.timezone,
          row: isToday ? (latest ?? null) : null,
          latestReportDate,
          fetchedAt: new Date().toISOString(),
        });
      })
      .catch(() => {
        if (active) {
          setSnapshotError(
            'Daily reporting could not be refreshed. Any displayed values retain their original materialization time.',
          );
        }
      })
      .finally(() => {
        if (active) setSnapshotLoading(false);
      });

    return () => {
      active = false;
    };
  }, [refreshRevision]);

  useEffect(() => {
    let active = true;
    setApprovalsLoading(true);
    setApprovalsError('');

    void approvalsControllerListApprovalsV1(
      {
        limit: '5',
        cursor: currentCursor,
        status: 'PENDING',
        includeTotalCount: true,
        ...(activeSearch ? { search: activeSearch } : {}),
      },
      createApiRequest({ csrf: true }),
    )
      .then((response) => {
        if (!active) return;
        if (response.status !== 200) {
          setApprovalsError(
            `Pending approvals are unavailable (${response.status}). Try refreshing.`,
          );
          return;
        }
        setApprovals({
          cursor: currentCursor,
          search: activeSearch,
          items: response.data.data.items as ApprovalRecord[],
          totalCount: safeNonNegativeInteger(response.data.data.totalCount),
          scopeTotalCount: safeNonNegativeInteger(
            response.data.data.scopeTotalCount,
          ),
          nextCursor: response.data.data.nextCursor ?? null,
          hasMore: response.data.data.hasMore,
          fetchedAt: new Date().toISOString(),
        });
      })
      .catch(() => {
        if (active) {
          setApprovalsError(
            'Pending approvals could not be refreshed. Any displayed rows are from the last successful load.',
          );
        }
      })
      .finally(() => {
        if (active) setApprovalsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [activeSearch, currentCursor, refreshRevision]);

  const currentApprovals =
    !searchPending &&
    approvals?.cursor === currentCursor &&
    approvals.search === activeSearch
      ? approvals
      : null;
  const approvalPageLoading =
    approvalsLoading || searchPending || (!currentApprovals && !approvalsError);
  const loadedApprovals = currentApprovals?.items ?? [];
  const visibleApprovals = loadedApprovals;
  const pendingCount = activeSearch
    ? (approvals?.scopeTotalCount ?? null)
    : (approvals?.scopeTotalCount ?? approvals?.totalCount ?? null);
  const matchingCount = currentApprovals?.totalCount ?? null;
  const metricValues = [
    {
      label: reportMetricFields[0].label,
      value:
        snapshotLoading && !snapshot
          ? 'Loading…'
          : formatReportCount(
              safeNonNegativeInteger(
                snapshot?.row?.[reportMetricFields[0].field],
              ),
            ),
      loading: snapshotLoading,
    },
    {
      label: 'Pending approvals',
      value:
        approvalsLoading && !approvals
          ? 'Loading…'
          : formatReportCount(pendingCount),
      loading: approvalsLoading,
    },
    {
      label: reportMetricFields[1].label,
      value:
        snapshotLoading && !snapshot
          ? 'Loading…'
          : formatReportMoney(
              safeNonNegativeInteger(
                snapshot?.row?.[reportMetricFields[1].field],
              ),
            ),
      loading: snapshotLoading,
    },
    {
      label: reportMetricFields[2].label,
      value:
        snapshotLoading && !snapshot
          ? 'Loading…'
          : formatReportMoney(
              safeNonNegativeInteger(
                snapshot?.row?.[reportMetricFields[2].field],
              ),
            ),
      loading: snapshotLoading,
    },
  ];
  const reportMaterializedAt = formatBranchTime(
    snapshot?.row?.materializedAt,
    snapshot?.timezone ?? 'Africa/Lagos',
  );
  const snapshotCheckedAt = formatBranchTime(
    snapshot?.fetchedAt,
    snapshot?.timezone ?? 'Africa/Lagos',
  );
  const isLoading = snapshotLoading || approvalPageLoading;
  const branchTimeZone = snapshot?.timezone ?? null;
  const loadedLatestDate = formatReportDate(snapshot?.latestReportDate ?? null);
  const pageNumber = cursorHistory.length;
  const rowCountLabel = `${loadedApprovals.length} ${loadedApprovals.length === 1 ? 'approval' : 'approvals'}`;
  const matchingCountLabel =
    matchingCount === null
      ? 'the exact match count is unavailable'
      : `${formatReportCount(matchingCount)} ${matchingCount === 1 ? 'match' : 'matches'} across all open approvals`;

  const goToNextApprovalsPage = () => {
    const nextCursor = currentApprovals?.nextCursor;
    if (!nextCursor || approvalPageLoading) return;
    setCursorHistory((history) => [...history, nextCursor]);
  };

  const goToPreviousApprovalsPage = () => {
    if (cursorHistory.length <= 1 || approvalPageLoading) return;
    setCursorHistory((history) => history.slice(0, -1));
  };

  return (
    <section
      className="supervisor-page supervisor-overview"
      data-od-id="overview-main"
    >
      <ScannerContextScope context="lookup" />
      <CashierPageHeader
        className="cashier-route-header supervisor-page__header supervisor-overview__header"
        title="Hi, Supervisor!"
        description="Welcome back to your dashboard"
        actions={
          <Link
            className="supervisor-overview__action"
            href="/supervisor/approvals"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 16 16"
              fill="none"
              focusable="false"
            >
              <circle cx="8" cy="8" r="6.1" stroke="currentColor" />
              <path
                d="m5.4 8 1.7 1.7 3.6-3.8"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Open Approvals
          </Link>
        }
        dataOdId="overview-heading"
      />

      <section
        className="supervisor-overview__activity"
        aria-label="Supervisor activity metrics"
        aria-busy={snapshotLoading || approvalsLoading}
      >
        <div className="supervisor-overview__section-heading">
          <h2 id="supervisor-overview-activity-title">Today&apos;s Activity</h2>
          <button
            className="supervisor-overview__refresh"
            type="button"
            onClick={() => setRefreshRevision((revision) => revision + 1)}
            disabled={isLoading}
            aria-label="Refresh overview data"
          >
            <RefreshCw aria-hidden="true" size={14} />
            {isLoading ? 'Refreshing' : 'Refresh'}
          </button>
        </div>
        <div className="supervisor-overview__metrics">
          {metricValues.map((metric) => (
            <article
              className="supervisor-overview__metric"
              key={metric.label}
              data-metric-card
              aria-busy={metric.loading}
            >
              <h3>{metric.label}</h3>
              <p aria-live="polite">{metric.value}</p>
            </article>
          ))}
        </div>

        {snapshotError ? (
          <p className="supervisor-overview__report-status" role="alert">
            {snapshotError}
          </p>
        ) : snapshot && !snapshot.row ? (
          <p className="supervisor-overview__report-status" role="status">
            No report for today&apos;s branch date.
            {loadedLatestDate
              ? ` The latest report is from ${loadedLatestDate}.`
              : ''}
            {snapshotCheckedAt ? ` Checked ${snapshotCheckedAt}.` : ''}
          </p>
        ) : null}
        {snapshot?.row ? (
          <p className="supervisor-overview__freshness">
            {reportMaterializedAt
              ? `Daily report materialized ${reportMaterializedAt}; these values may lag new activity.`
              : 'Daily report is available, but its materialization time is missing.'}
          </p>
        ) : null}
      </section>

      <section
        className="supervisor-overview__approvals"
        aria-labelledby="supervisor-overview-approvals-title"
        aria-busy={approvalPageLoading}
      >
        <div className="supervisor-overview__approvals-heading">
          <div>
            <h2 id="supervisor-overview-approvals-title">
              Approvals requiring attention
            </h2>
            <p>Search every open request in your authorized branch scope.</p>
          </div>
          <label className="supervisor-overview__search">
            <Search aria-hidden="true" size={14} />
            <span className="sr-only">Search all open approvals</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.currentTarget.value)}
              placeholder="Search open approvals"
              aria-label="Search all open approvals"
              maxLength={100}
            />
          </label>
        </div>
        {approvalsError ? (
          <p className="supervisor-overview__report-status" role="alert">
            {approvalsError}
          </p>
        ) : null}

        <div
          className="supervisor-overview__table-scroll"
          role="region"
          aria-label={`Open approvals results, page ${pageNumber}`}
          tabIndex={0}
        >
          <table className="supervisor-overview__table">
            <caption className="sr-only">
              Page {pageNumber} of pending approvals matching the search across
              the caller&apos;s authorized scope, with up to five rows per page.
            </caption>
            <thead>
              <tr>
                <th scope="col">Customer</th>
                <th scope="col">Amount</th>
                <th scope="col">Submitted by</th>
                <th scope="col">Action</th>
              </tr>
            </thead>
            <tbody>
              {searchPending ? (
                <tr>
                  <td className="supervisor-overview__empty" colSpan={4}>
                    Searching all open approvals…
                  </td>
                </tr>
              ) : approvalPageLoading && !currentApprovals ? (
                <tr>
                  <td className="supervisor-overview__empty" colSpan={4}>
                    Loading approvals page {pageNumber}…
                  </td>
                </tr>
              ) : approvalsError && !currentApprovals ? (
                <tr>
                  <td className="supervisor-overview__empty" colSpan={4}>
                    This approvals page is unavailable. Refresh or return to the
                    previous page.
                  </td>
                </tr>
              ) : visibleApprovals.length > 0 ? (
                visibleApprovals.map((approval) => {
                  const customer = customerLabel(approval);
                  const type =
                    approval.targetType === 'REDEEM'
                      ? 'Redemption'
                      : 'Purchase';
                  const reference =
                    approval.receipt?.posReceiptNumber ??
                    approval.receiptId ??
                    approval.id;
                  return (
                    <tr key={approval.id}>
                      <td>
                        <span className="supervisor-overview__reason">
                          {reasonLabel(approval)}
                        </span>
                        <span className="supervisor-overview__customer">
                          {customer}
                        </span>
                        <span className="supervisor-overview__detail">
                          {type} · {reference}
                        </span>
                      </td>
                      <td className="supervisor-overview__amount">
                        {formatReportMoney(
                          safeNonNegativeInteger(approval.requestedAmountKobo),
                        )}
                      </td>
                      <td className="supervisor-overview__requester">
                        <span>
                          {approval.requester?.username
                            ? `By ${approval.requester.username}`
                            : 'Requester unavailable'}
                        </span>
                        <small>
                          {branchTimeZone
                            ? (formatBranchTime(
                                approval.requestedAt,
                                branchTimeZone,
                              ) ?? 'Request time unavailable')
                            : 'Branch timezone unavailable'}
                        </small>
                      </td>
                      <td>
                        <Link
                          className="supervisor-overview__review"
                          href="/supervisor/approvals"
                          aria-label={`Review approval for ${customer}`}
                        >
                          Review
                        </Link>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td className="supervisor-overview__empty" colSpan={4}>
                    {activeSearch
                      ? `No open approvals match “${activeSearch}”. Clear the search to see all pending approvals.`
                      : pendingCount === 0
                        ? 'No pending approvals right now.'
                        : currentApprovals?.items.length === 0 && pageNumber > 1
                          ? 'No pending approvals are available on this page. Refresh the queue or return to the previous page.'
                          : pendingCount === null
                            ? 'Pending count unavailable. Refresh to check again.'
                            : 'No pending approval rows are available on this page. Refresh to check the queue again.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="supervisor-overview__table-count" aria-live="polite">
          {searchPending
            ? 'Searching all open approvals in your authorized scope.'
            : currentApprovals
              ? loadedApprovals.length === 0
                ? `Showing ${rowCountLabel}`
                : `Showing ${rowCountLabel} on page ${pageNumber}${activeSearch ? `; ${matchingCountLabel}` : ''}; ${pendingCount === null ? 'pending total unavailable' : `${formatReportCount(pendingCount)} pending overall`}. Search covers all authorized open approvals.`
              : approvalPageLoading
                ? `Loading approvals page ${pageNumber}.`
                : `Approvals page ${pageNumber} is not available.`}
        </p>
        <nav
          className="supervisor-overview__pagination"
          aria-label="Pending approvals pagination"
        >
          <button
            className="supervisor-overview__pagination-button"
            type="button"
            onClick={goToPreviousApprovalsPage}
            disabled={cursorHistory.length <= 1 || approvalPageLoading}
            aria-label="Previous approvals page"
          >
            <ChevronLeft aria-hidden="true" size={16} />
          </button>
          <p className="supervisor-overview__pagination-status">
            {searchPending
              ? 'Searching…'
              : `Page ${pageNumber}${activeSearch ? (matchingCount === null ? '' : ` · ${formatReportCount(matchingCount)} ${matchingCount === 1 ? 'match' : 'matches'}`) : pendingCount === null ? '' : ` · ${formatReportCount(pendingCount)} pending overall`}`}
          </p>
          <button
            className="supervisor-overview__pagination-button"
            type="button"
            onClick={goToNextApprovalsPage}
            disabled={
              !currentApprovals?.hasMore ||
              !currentApprovals.nextCursor ||
              approvalPageLoading
            }
            aria-label="Next approvals page"
          >
            <ChevronRight aria-hidden="true" size={16} />
          </button>
        </nav>
      </section>
    </section>
  );
}
