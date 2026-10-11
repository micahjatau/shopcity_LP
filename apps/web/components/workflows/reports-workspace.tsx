'use client';

import { Download, Info, RefreshCw } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import {
  getReportsControllerExportReportV1Url,
  reportsControllerGetPilotOperationsSummaryV1,
  reportsControllerListAuditReportV1,
  reportsControllerListCashierActivityV1,
  reportsControllerListCustomerPerformanceV1,
  reportsControllerListExecutiveSummaryV1,
  reportsControllerListLiabilityAgeingV1,
  reportsControllerListMaterializationStateV1,
  reportsControllerListRedemptionSummaryV1,
  reportsControllerListSmsOperationsV1,
  notificationsControllerListTransactionSmsV1,
  reportsControllerRefreshReportV1,
  type ReportsControllerListExecutiveSummaryV1Params,
  type ReportsControllerRefreshReportV1Params,
  type ReportsControllerExportReportV1Params,
} from '../../lib/api/generated-client';
import { createApiRequest } from '../../lib/api/request';
import {
  reportProblemFromHttpResponse,
  reportProblemFromSettled,
  type ReportProblem,
} from '../../lib/reports/report-errors';
import { Alert, Button, Input, Select, Table } from '../ui';
import { StatusBadge } from '../shopcity';
import {
  CopyableChip,
  formatReportBusinessDate,
  formatReportTimestamp,
  formatSupervisorReportFieldLabel,
  ReportProblemNotice,
  SupervisorReportValue,
} from './report-ui';

type ReportKey =
  | 'executive-summary'
  | 'liability-ageing'
  | 'customer-performance'
  | 'cashier-activity'
  | 'redemption-summary'
  | 'sms-operations'
  | 'audit-report'
  | 'materialization-state'
  | 'pilot-operations-summary';

type ReportsWorkspaceProps = {
  canRefreshReports?: boolean;
  canExportReports?: boolean;
  canUsePilotOperationsSummary?: boolean;
  canUseAuditReport?: boolean;
  canUseMaterializationState?: boolean;
  /** Parent-selected period, shared with the supervisor KPI dashboard. */
  period?: { from: string; to: string };
  /** Supervisor branch and period are enforced outside this low-level report UI. */
  hideScopeInputs?: boolean;
  /** Selects the role-aware operational report presentation for report routes. */
  presentation?: 'default' | 'supervisor' | 'admin';
  /** Parent-applied scope used by the operational dashboard routes. */
  scopeFilters?: { branchId?: string; timezone?: string };
  /** Shared retry cooldown for report loads, materialization, and exports. */
  rateLimitSeconds?: number;
  onRateLimited?: (seconds: number) => void;
};

type ReportItem = Record<string, unknown>;

type PilotSummary = {
  release?: { version?: string; sha?: string };
  generatedAt?: string;
  outbox?: { backlogCount?: number; staleCount?: number };
  sms?: { failedCount?: number };
  offlineSync?: { failureCount?: number };
  fraud?: { openCount?: number };
  reports?: { staleCount?: number };
  reconciliation?: {
    healthy?: boolean;
    mismatchCount?: number;
    items?: unknown[];
  };
};

type SmsOperationalDrilldown = {
  queuedCount: number;
  sentCount: number;
  deliveredCount: number;
  failedCount: number;
  retryCount: number;
  deadLetterCount: number;
  unavailableCostRows: number;
};

type ReportSummary = {
  scope?: string;
  scopeKey?: string;
  branchId?: string | null;
  timezone?: string;
  items?: ReportItem[];
  materializationState?: string;
  freshCount?: number;
  staleCount?: number;
  reconciliation?: {
    healthy?: boolean;
    mismatchCount?: number;
    items?: unknown[];
  };
};

const reportOptions: Array<{ value: ReportKey; label: string }> = [
  { value: 'executive-summary', label: 'Executive summary' },
  { value: 'liability-ageing', label: 'Liability ageing' },
  { value: 'customer-performance', label: 'Customer performance' },
  { value: 'cashier-activity', label: 'Cashier activity' },
  { value: 'redemption-summary', label: 'Redemption summary' },
  { value: 'sms-operations', label: 'SMS operations' },
  { value: 'audit-report', label: 'Audit report' },
  { value: 'materialization-state', label: 'Materialization state' },
  { value: 'pilot-operations-summary', label: 'Pilot operations summary' },
];

const reportTableColumnOrder: Partial<Record<ReportKey, readonly string[]>> = {
  'executive-summary': [
    'reportDate',
    'loyaltyPurchaseValueKobo',
    'creditIssuedKobo',
    'creditRedeemedKobo',
    'outstandingLiabilityKobo',
    'transactionCount',
  ],
  'liability-ageing': [
    'reportDate',
    'expiryMonth',
    'ageBucket',
    'outstandingKobo',
    'customerCount',
    'lotCount',
  ],
  'customer-performance': [
    'customerId',
    'purchaseValueKobo',
    'currentBalanceKobo',
    'visitCount',
    'dormant',
    'lastActivityAt',
    'reportDate',
  ],
  'cashier-activity': [
    'reportDate',
    'cashierId',
    'transactionCount',
    'purchaseValueKobo',
    'creditIssuedKobo',
    'redemptionCount',
  ],
  'redemption-summary': [
    'reportDate',
    'redemptionCount',
    'confirmedKobo',
    'requestedKobo',
    'pendingApprovalCount',
    'endingBalanceKobo',
  ],
  'sms-operations': [
    'reportDate',
    'totalCount',
    'queuedCount',
    'sentCount',
    'deliveredCount',
    'failedCount',
  ],
  'materialization-state': [
    'status',
    'asOf',
    'materializedAt',
    'branchId',
    'scopeKey',
    'lastError',
  ],
};

const reportDefinitions: Record<
  ReportKey,
  { description: string; freshness: string }
> = {
  'executive-summary': {
    description: 'Period activity and the latest available liability snapshot.',
    freshness: 'Daily or on-demand',
  },
  'liability-ageing': {
    description: 'Outstanding credit grouped by age at the latest snapshot.',
    freshness: 'Daily snapshot',
  },
  'customer-performance': {
    description: 'Customer activity, visits, spend, and available balances.',
    freshness: 'Daily snapshot',
  },
  'cashier-activity': {
    description: 'Branch cashier activity and reported operational flags.',
    freshness: 'Daily snapshot',
  },
  'redemption-summary': {
    description: 'Redemption counts, confirmed value, and reported approvals.',
    freshness: 'Daily snapshot',
  },
  'sms-operations': {
    description:
      'SMS queue and delivery statuses; sent does not mean delivered.',
    freshness: 'Near real-time',
  },
  'audit-report': {
    description: 'Audited actions available to authorized Admin users.',
    freshness: 'Immediate',
  },
  'materialization-state': {
    description: 'Read-model freshness and report materialization status.',
    freshness: 'Near real-time',
  },
  'pilot-operations-summary': {
    description: 'Live operational health signals for the pilot.',
    freshness: 'Near real-time',
  },
};

export function ReportsWorkspace({
  canRefreshReports = true,
  canExportReports = true,
  canUsePilotOperationsSummary = true,
  canUseAuditReport = true,
  canUseMaterializationState = true,
  period,
  hideScopeInputs = false,
  presentation = 'default',
  scopeFilters,
  rateLimitSeconds = 0,
  onRateLimited,
}: ReportsWorkspaceProps = {}) {
  const [report, setReport] = useState<ReportKey>('executive-summary');
  const [branchId, setBranchId] = useState('');
  const [timezone, setTimezone] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [summary, setSummary] = useState<ReportSummary | PilotSummary | null>(
    null,
  );
  const [message, setMessage] = useState('Loading report summary…');
  const [actionMessage, setActionMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [problem, setProblem] = useState<ReportProblem | null>(null);
  const [problemAction, setProblemAction] = useState<
    'load' | 'refresh' | 'export' | 'sms' | null
  >(null);
  const [selectedItemIndex, setSelectedItemIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [customerSort, setCustomerSort] = useState<
    'spend' | 'balance' | 'visits' | 'recent' | 'dormant-value'
  >('spend');
  const [smsTransactionId, setSmsTransactionId] = useState('');
  const reportLoadGeneration = useRef(0);

  const availableReportOptions = useMemo(
    () =>
      reportOptions.filter((option) => {
        if (option.value === 'audit-report') return canUseAuditReport;
        if (option.value === 'materialization-state')
          return canUseMaterializationState;
        if (option.value === 'pilot-operations-summary')
          return canUsePilotOperationsSummary;
        return true;
      }),
    [
      canUseAuditReport,
      canUseMaterializationState,
      canUsePilotOperationsSummary,
    ],
  );
  const isPilotOperationsSummary = report === 'pilot-operations-summary';
  const [actionResult, setActionResult] = useState<Record<
    string,
    unknown
  > | null>(null);

  const params = useMemo<ReportsControllerListExecutiveSummaryV1Params>(
    () => ({
      branchId:
        report === 'audit-report'
          ? undefined
          : (scopeFilters?.branchId ?? branchId) || undefined,
      timezone: (scopeFilters?.timezone ?? timezone) || undefined,
      from: (period?.from ?? from) || undefined,
      to: (period?.to ?? to) || undefined,
    }),
    [
      branchId,
      from,
      report,
      scopeFilters?.branchId,
      scopeFilters?.timezone,
      timezone,
      to,
      period?.from,
      period?.to,
    ],
  );
  const refreshParams = useMemo<ReportsControllerRefreshReportV1Params>(
    () => ({
      branchId:
        report === 'audit-report'
          ? undefined
          : (scopeFilters?.branchId ?? branchId) || undefined,
      timezone: (scopeFilters?.timezone ?? timezone) || 'UTC',
    }),
    [
      branchId,
      report,
      scopeFilters?.branchId,
      scopeFilters?.timezone,
      timezone,
    ],
  );
  const exportParams = useMemo<ReportsControllerExportReportV1Params>(
    () => ({
      branchId: params.branchId,
      from: params.from,
      to: params.to,
      timezone: params.timezone,
      format: 'csv',
    }),
    [params],
  );

  const reportSummary = !isPilotOperationsSummary
    ? (summary as ReportSummary | null)
    : null;
  const pilotSummary = isPilotOperationsSummary
    ? (summary as PilotSummary | null)
    : null;
  const items = useMemo(
    () =>
      sortCustomerPerformanceItems(
        (reportSummary?.items ?? []) as ReportItem[],
        report === 'customer-performance' ? customerSort : undefined,
      ),
    [customerSort, report, reportSummary?.items],
  );
  const selectedItem = items[selectedItemIndex] ?? null;
  const reconciliationHealthy = pilotSummary?.reconciliation?.healthy === true;
  const smsOperationalDrilldown = useMemo(
    () => (report === 'sms-operations' ? summarizeSmsOperations(items) : null),
    [items, report],
  );
  const columns = useMemo(
    () =>
      [...new Set(items.flatMap((item) => Object.keys(item)))].filter((field) =>
        items.some((item) => {
          const value = item[field];
          return value !== null && value !== undefined && value !== '';
        }),
      ),
    [items],
  );
  const visibleColumns = useMemo(() => {
    const preferredOrder = reportTableColumnOrder[report] ?? [];
    const ordered = preferredOrder.filter((field) => columns.includes(field));
    return [
      ...ordered,
      ...columns.filter((field) => !ordered.includes(field)),
    ].slice(0, 6);
  }, [columns, report]);
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const visibleItems = items.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  const currentReportDefinition = reportDefinitions[report];
  const materializationState = String(
    reportSummary?.materializationState ?? '',
  ).toUpperCase();
  const freshness = loading
    ? 'Loading'
    : materializationState === 'RUNNING'
      ? 'Updating'
      : materializationState === 'FAILED' ||
          (reportSummary?.staleCount ?? 0) > 0
        ? 'Lagging'
        : (reportSummary?.freshCount ?? 0) > 0 ||
            (reportSummary?.items ?? []).some(
              (item) => typeof item.materializedAt === 'string',
            )
          ? 'Fresh'
          : 'Unknown';
  const latestMaterializedAt = (reportSummary?.items ?? [])
    .map((item) => item.materializedAt)
    .filter((value): value is string => typeof value === 'string')
    .sort()
    .at(-1);

  useEffect(() => {
    if (selectedItemIndex >= items.length) {
      setSelectedItemIndex(0);
    }
  }, [items.length, selectedItemIndex]);

  useEffect(() => {
    if (!availableReportOptions.some((option) => option.value === report)) {
      setReport(availableReportOptions[0]?.value ?? 'executive-summary');
    }
  }, [availableReportOptions, report]);

  function applyProblem(
    nextProblem: ReportProblem,
    action: 'load' | 'refresh' | 'export' | 'sms' = 'load',
  ) {
    setProblem(nextProblem);
    setProblemAction(action);
    if (presentation !== 'default') {
      setMessage('');
    } else if (action === 'load') {
      setMessage(
        nextProblem.status > 0
          ? `Reports unavailable (${nextProblem.status}).`
          : 'Reports unavailable.',
      );
    }
    if (nextProblem.status === 429) {
      onRateLimited?.(nextProblem.retryAfterSeconds ?? 60);
    }
  }

  async function refresh() {
    const generation = ++reportLoadGeneration.current;
    setLoading(true);
    setSummary(null);
    setProblem(null);
    setMessage('Loading report summary…');
    setActionMessage('');
    setActionResult(null);
    setProblemAction(null);
    setCurrentPage(1);
    try {
      const response =
        report === 'pilot-operations-summary'
          ? await reportsControllerGetPilotOperationsSummaryV1(
              createApiRequest({ csrf: true }),
            )
          : report === 'liability-ageing'
            ? await reportsControllerListLiabilityAgeingV1(
                params,
                createApiRequest({ csrf: true }),
              )
            : report === 'customer-performance'
              ? await reportsControllerListCustomerPerformanceV1(
                  params,
                  createApiRequest({ csrf: true }),
                )
              : report === 'cashier-activity'
                ? await reportsControllerListCashierActivityV1(
                    params,
                    createApiRequest({ csrf: true }),
                  )
                : report === 'redemption-summary'
                  ? await reportsControllerListRedemptionSummaryV1(
                      params,
                      createApiRequest({ csrf: true }),
                    )
                  : report === 'sms-operations'
                    ? await reportsControllerListSmsOperationsV1(
                        params,
                        createApiRequest({ csrf: true }),
                      )
                    : report === 'audit-report'
                      ? await reportsControllerListAuditReportV1(
                          params,
                          createApiRequest({ csrf: true }),
                        )
                      : report === 'materialization-state'
                        ? await reportsControllerListMaterializationStateV1(
                            params,
                            createApiRequest({ csrf: true }),
                          )
                        : await reportsControllerListExecutiveSummaryV1(
                            params,
                            createApiRequest({ csrf: true }),
                          );

      if (generation !== reportLoadGeneration.current) return;
      if (response.status === 200) {
        setSummary(response.data.data);
        setSelectedItemIndex(0);
        setProblem(null);
        setProblemAction(null);
        setMessage(
          report === 'pilot-operations-summary'
            ? 'Pilot operations summary loaded.'
            : `Report summary loaded for ${report}.`,
        );
      } else {
        applyProblem(
          reportProblemFromHttpResponse(
            response.status,
            response.data,
            response.headers,
          ),
        );
      }
    } catch (error) {
      if (generation === reportLoadGeneration.current) {
        const nextProblem = reportProblemFromSettled({
          status: 'rejected',
          reason: error,
        });
        if (nextProblem) applyProblem(nextProblem);
      }
    } finally {
      if (generation === reportLoadGeneration.current) setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    report,
    period?.from,
    period?.to,
    scopeFilters?.branchId,
    scopeFilters?.timezone,
  ]);

  async function inspectSelectedSms() {
    const transactionId =
      typeof selectedItem?.transactionId === 'string'
        ? selectedItem.transactionId
        : smsTransactionId.trim();
    if (report !== 'sms-operations' || !transactionId) {
      setActionMessage(
        'Select an SMS row with a transaction identifier first.',
      );
      return;
    }
    try {
      const response = await notificationsControllerListTransactionSmsV1(
        transactionId,
        { page: 1, limit: 50 },
        createApiRequest({ csrf: true }),
      );
      const responseData = response.data as unknown;
      setActionResult(
        responseData && typeof responseData === 'object'
          ? (responseData as Record<string, unknown>)
          : null,
      );
      if (response.status !== 200) {
        applyProblem(
          reportProblemFromHttpResponse(
            response.status,
            response.data,
            response.headers,
          ),
          'sms',
        );
      } else {
        setProblem(null);
        setProblemAction(null);
      }
      setActionMessage(
        response.status === 200
          ? 'SMS inspection loaded with masked operational fields.'
          : `SMS inspection responded with ${response.status}.`,
      );
    } catch (error) {
      const nextProblem = reportProblemFromSettled({
        status: 'rejected',
        reason: error,
      });
      if (nextProblem) applyProblem(nextProblem, 'sms');
      setActionMessage('SMS inspection unavailable.');
    }
  }

  async function refreshReport() {
    if (
      !canRefreshReports ||
      isPilotOperationsSummary ||
      rateLimitSeconds > 0
    ) {
      return;
    }
    setRefreshing(true);
    setProblem(null);
    try {
      const response = await reportsControllerRefreshReportV1(
        report,
        refreshParams,
        createApiRequest({ csrf: true }),
      );
      setActionResult(
        response.data && typeof response.data === 'object'
          ? (response.data as Record<string, unknown>)
          : null,
      );
      if (response.status !== 202) {
        applyProblem(
          reportProblemFromHttpResponse(
            response.status,
            response.data,
            response.headers,
          ),
          'refresh',
        );
        setActionMessage(`Refresh responded with ${response.status}.`);
        return;
      }
      setActionMessage('Refresh queued.');
      await refresh();
    } catch (error) {
      const nextProblem = reportProblemFromSettled({
        status: 'rejected',
        reason: error,
      });
      if (nextProblem) applyProblem(nextProblem, 'refresh');
      setActionMessage('Refresh unavailable.');
    } finally {
      setRefreshing(false);
    }
  }

  async function exportReport() {
    if (!canExportReports || isPilotOperationsSummary || rateLimitSeconds > 0) {
      return;
    }
    setExporting(true);
    setProblem(null);
    try {
      const request = createApiRequest({ csrf: true });
      const headers = new Headers(request.headers);
      headers.set('Accept', 'text/csv');
      const response = await fetch(
        getReportsControllerExportReportV1Url(report, exportParams),
        {
          ...request,
          headers,
        },
      );
      const body = await response.text();
      if (!response.ok) {
        let payload: unknown;
        try {
          payload = JSON.parse(body);
        } catch {
          payload = null;
        }
        const nextProblem = reportProblemFromHttpResponse(
          response.status,
          payload,
          response.headers,
        );
        applyProblem(nextProblem, 'export');
        setActionMessage(
          presentation === 'default'
            ? `Export unavailable (${response.status}).`
            : 'Export unavailable.',
        );
        return;
      }
      setActionMessage(
        presentation === 'default'
          ? 'Export downloaded from backend CSV response.'
          : 'CSV export downloaded.',
      );
      triggerCsvDownload(body, `${report}.csv`);
    } catch (error) {
      const nextProblem = reportProblemFromSettled({
        status: 'rejected',
        reason: error,
      });
      if (nextProblem) applyProblem(nextProblem, 'export');
      setActionMessage('Export unavailable.');
    } finally {
      setExporting(false);
    }
  }

  const selectedSummary = pilotSummary
    ? describePilotSummaryContext(pilotSummary)
    : reportSummary
      ? describeReportContext(
          reportSummary,
          report,
          branchId,
          timezone,
          params.from ?? '',
          params.to ?? '',
        )
      : 'No report loaded yet.';

  if (presentation !== 'default') {
    const reportLabel =
      reportOptions.find((option) => option.value === report)?.label ?? report;
    const branchScope = isPilotOperationsSummary
      ? 'TENANT'
      : (reportSummary?.scope ??
        (scopeFilters
          ? 'Scope pending'
          : hideScopeInputs
            ? 'BRANCH'
            : 'Scope pending'));
    const branchIdValue =
      typeof reportSummary?.branchId === 'string'
        ? reportSummary.branchId
        : null;
    const timezoneValue = isPilotOperationsSummary
      ? (scopeFilters?.timezone ?? 'Africa/Lagos')
      : (reportSummary?.timezone ??
        scopeFilters?.timezone ??
        (hideScopeInputs ? 'Africa/Lagos' : 'Timezone not provided'));
    const reportWindow = isPilotOperationsSummary
      ? 'Current operational snapshot'
      : params.from && params.to
        ? `${formatReportBusinessDate(params.from, timezoneValue)} – ${formatReportBusinessDate(params.to, timezoneValue)}`
        : 'All available dates';
    const retryProblem = () => {
      if (problemAction === 'export') void exportReport();
      else if (problemAction === 'refresh') void refreshReport();
      else if (problemAction === 'sms') void inspectSelectedSms();
      else void refresh();
    };
    const hasRows = items.length > 0;

    return (
      <section
        className="reports-workspace reports-workspace--operational"
        aria-label="Detailed report builder"
        aria-busy={loading}
      >
        <section
          className="reports-workspace__panel reports-workspace__controls"
          aria-label="Report controls"
        >
          <div className="reports-workspace__panel-heading">
            <div>
              <p className="reports-workspace__eyebrow">REPORT BUILDER</p>
              <h3>Choose a report</h3>
              <p>{currentReportDefinition.description}</p>
            </div>
            <span
              className="reports-workspace__freshness"
              data-state={freshness.toLowerCase()}
            >
              <span aria-hidden="true" />
              {freshness} · {currentReportDefinition.freshness}
            </span>
          </div>

          <div className="reports-workspace__filters">
            <div className="reports-workspace__field">
              <span>Report type</span>
              <Select
                aria-label="Report"
                value={report}
                onChange={(event) => {
                  setCurrentPage(1);
                  setReport(event.target.value as ReportKey);
                }}
                options={availableReportOptions}
              />
            </div>
            {report === 'sms-operations' ? (
              <div className="reports-workspace__field">
                <span>SMS transaction ID</span>
                <Input
                  aria-label="SMS transaction ID"
                  placeholder="Transaction ID to inspect"
                  value={smsTransactionId}
                  onChange={(event) => setSmsTransactionId(event.target.value)}
                />
              </div>
            ) : null}
            {report === 'customer-performance' ? (
              <div className="reports-workspace__field">
                <span>Rank customers by</span>
                <Select
                  aria-label="Customer performance ranking"
                  value={customerSort}
                  onChange={(event) => {
                    setCurrentPage(1);
                    setCustomerSort(
                      event.target.value as
                        | 'spend'
                        | 'balance'
                        | 'visits'
                        | 'recent'
                        | 'dormant-value',
                    );
                  }}
                  options={[
                    { value: 'spend', label: 'Top spenders' },
                    { value: 'balance', label: 'Highest balances' },
                    { value: 'visits', label: 'Most frequent visitors' },
                    { value: 'recent', label: 'Recently active' },
                    { value: 'dormant-value', label: 'Dormant high-value' },
                  ]}
                />
              </div>
            ) : null}
          </div>

          {hideScopeInputs ? (
            <p className="reports-workspace__scope-hint">
              {scopeFilters
                ? isPilotOperationsSummary || report === 'audit-report'
                  ? 'This report is tenant-wide under Admin authorization. The report window follows its server-supported period behavior.'
                  : 'Scope follows the applied Admin filter and server authorization. The report window follows the shared dashboard period.'
                : 'Branch access is determined by your Supervisor session. The report window follows the dashboard and uses Africa/Lagos business dates.'}
            </p>
          ) : (
            <div className="reports-workspace__filters">
              <div className="reports-workspace__field">
                <span>Branch ID</span>
                <Input
                  aria-label="Branch filter"
                  placeholder="Branch ID"
                  value={branchId}
                  onChange={(event) => setBranchId(event.target.value)}
                />
              </div>
              <div className="reports-workspace__field">
                <span>Timezone</span>
                <Input
                  aria-label="Timezone filter"
                  placeholder="Timezone"
                  value={timezone}
                  onChange={(event) => setTimezone(event.target.value)}
                />
              </div>
              <div className="reports-workspace__field">
                <span>From</span>
                <Input
                  aria-label="From date"
                  type="date"
                  value={from}
                  onChange={(event) => setFrom(event.target.value)}
                />
              </div>
              <div className="reports-workspace__field">
                <span>To</span>
                <Input
                  aria-label="To date"
                  type="date"
                  value={to}
                  onChange={(event) => setTo(event.target.value)}
                />
              </div>
            </div>
          )}

          <div className="reports-workspace__actions">
            <Button
              type="button"
              onClick={() => void refresh()}
              loading={loading}
              disabled={rateLimitSeconds > 0}
            >
              Load report
            </Button>
            {canRefreshReports && !isPilotOperationsSummary ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() => void refreshReport()}
                loading={refreshing}
                disabled={rateLimitSeconds > 0 || loading}
              >
                <RefreshCw size={16} aria-hidden="true" />
                Refresh materialization
              </Button>
            ) : null}
            {canExportReports && !isPilotOperationsSummary ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() => void exportReport()}
                loading={exporting}
                disabled={!hasRows || loading || rateLimitSeconds > 0}
                title={
                  !hasRows
                    ? 'Load a report with rows before exporting.'
                    : undefined
                }
              >
                <Download size={16} aria-hidden="true" />
                Export CSV
              </Button>
            ) : null}
            {report === 'sms-operations' ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() => void inspectSelectedSms()}
                disabled={
                  rateLimitSeconds > 0 ||
                  (typeof selectedItem?.transactionId !== 'string' &&
                    smsTransactionId.trim().length === 0)
                }
              >
                Inspect SMS
              </Button>
            ) : null}
          </div>
          {rateLimitSeconds > 0 ? (
            <p
              className="reports-workspace__rate-limit"
              role="status"
              aria-live="polite"
            >
              Report actions are paused for {rateLimitSeconds} seconds.
            </p>
          ) : null}
        </section>

        {problem ? (
          <ReportProblemNotice
            problem={problem}
            retryAfterSeconds={rateLimitSeconds}
            onRetry={retryProblem}
          />
        ) : null}
        {actionMessage ? (
          <div
            className="reports-workspace__toast"
            role="status"
            aria-live="polite"
          >
            {actionMessage}
          </div>
        ) : null}
        {actionResult ? (
          <section
            className="reports-workspace__panel"
            aria-label="Report action details"
          >
            <h3>Action details</h3>
            <dl className="reports-workspace__definition-list">
              {Object.entries(actionResult)
                .filter(
                  ([, value]) =>
                    value !== null && value !== undefined && value !== '',
                )
                .map(([field, value]) => (
                  <div key={field}>
                    <dt>{formatSupervisorReportFieldLabel(field)}</dt>
                    <dd>
                      <SupervisorReportValue field={field} value={value} />
                    </dd>
                  </div>
                ))}
            </dl>
          </section>
        ) : null}

        <section
          className="reports-workspace__panel reports-workspace__current"
          aria-label="Current report"
        >
          <div className="reports-workspace__panel-heading">
            <div>
              <p className="reports-workspace__eyebrow">CURRENT REPORT</p>
              <h3>{reportLabel}</h3>
              <p>{currentReportDefinition.description}</p>
            </div>
            <span
              className="reports-workspace__freshness"
              data-state={freshness.toLowerCase()}
            >
              <span aria-hidden="true" />
              {freshness}
            </span>
          </div>
          <div
            className="reports-workspace__scope"
            aria-label="Report scope and filters"
          >
            <div className="reports-workspace__scope-item">
              <span>Scope</span>
              <strong>{branchScope}</strong>
            </div>
            {branchIdValue ? (
              <CopyableChip label="Branch ID" value={branchIdValue} />
            ) : branchScope === 'TENANT' ? (
              <div className="reports-workspace__scope-item">
                <span>Branch</span>
                <strong>All branches</strong>
              </div>
            ) : hideScopeInputs && !scopeFilters ? (
              <div className="reports-workspace__scope-item">
                <span>Branch</span>
                <strong>Assigned branch</strong>
              </div>
            ) : null}
            <div className="reports-workspace__scope-item">
              <span>Timezone</span>
              <strong>{timezoneValue}</strong>
            </div>
            <div className="reports-workspace__scope-item">
              <span>Window</span>
              <strong>
                {reportWindow} · {timezoneValue}
              </strong>
            </div>
          </div>
          <div className="reports-workspace__report-meta">
            <span>
              <Info size={15} aria-hidden="true" />
              Expected freshness: {currentReportDefinition.freshness}
            </span>
            {latestMaterializedAt ? (
              <span>
                Updated{' '}
                {formatReportTimestamp(latestMaterializedAt, timezoneValue)} ·
                {timezoneValue}
              </span>
            ) : null}
            {reportSummary?.materializationState ? (
              <span>Materialization: {reportSummary.materializationState}</span>
            ) : null}
          </div>
          {loading ? (
            <p
              className="reports-workspace__loading"
              role="status"
              aria-live="polite"
            >
              Loading {reportLabel.toLowerCase()}…
            </p>
          ) : null}
          {!loading && !problem && reportSummary && !hasRows ? (
            <div className="reports-workspace__empty" role="status">
              <h4>No report rows</h4>
              <p>
                The selected report returned no rows for this window. Try a
                different date range or reload the report after materialization.
              </p>
            </div>
          ) : null}
        </section>

        {loading ? (
          <section
            className="reports-workspace__panel reports-workspace__table-panel"
            aria-label="Report summary items"
            aria-busy="true"
          >
            <div className="reports-workspace__table-heading">
              <div>
                <h3>Report results</h3>
                <p>Loading report rows…</p>
              </div>
            </div>
            <div
              className="reports-workspace__table-skeleton"
              role="status"
              aria-label="Loading report table"
            >
              {Array.from({ length: 5 }, (_, index) => (
                <span key={index} />
              ))}
            </div>
          </section>
        ) : null}

        {hasRows ? (
          <div className="reports-workspace__results">
            <section
              className="reports-workspace__panel reports-workspace__table-panel"
              aria-label="Report summary items"
              aria-busy={loading}
            >
              <div className="reports-workspace__table-heading">
                <div>
                  <h3>Report results</h3>
                  <p>
                    Key fields are shown here; select a row to inspect all
                    populated fields.
                  </p>
                </div>
                <div className="reports-workspace__field">
                  <span>Rows per page</span>
                  <Select
                    aria-label="Rows per page"
                    value={String(pageSize)}
                    onChange={(event) => {
                      setPageSize(Number(event.target.value));
                      setCurrentPage(1);
                    }}
                    options={[
                      { value: '10', label: '10 rows' },
                      { value: '25', label: '25 rows' },
                      { value: '50', label: '50 rows' },
                    ]}
                  />
                </div>
              </div>
              <div className="reports-workspace__table-scroll">
                <Table className="reports-workspace__table">
                  <caption className="report-sr-only">
                    {reportLabel} report rows
                  </caption>
                  <thead>
                    <tr>
                      {visibleColumns.map((column) => (
                        <th key={column} scope="col">
                          {formatSupervisorReportFieldLabel(column)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {visibleItems.map((item, pageIndex) => {
                      const itemIndex =
                        (currentPage - 1) * pageSize + pageIndex;
                      const primaryField = visibleColumns[0];
                      const primaryValue = primaryField
                        ? item[primaryField]
                        : null;
                      const accessibleName =
                        typeof primaryValue === 'string'
                          ? primaryField === 'reportDate'
                            ? formatReportBusinessDate(primaryValue)
                            : primaryValue
                          : typeof primaryValue === 'number'
                            ? String(primaryValue)
                            : `row ${itemIndex + 1}`;
                      return (
                        <tr
                          key={`${report}-${itemIndex}`}
                          className={
                            itemIndex === selectedItemIndex
                              ? 'is-selected'
                              : undefined
                          }
                          aria-selected={itemIndex === selectedItemIndex}
                          onClick={() => setSelectedItemIndex(itemIndex)}
                        >
                          {visibleColumns.map((column, columnIndex) => (
                            <td key={`${itemIndex}-${column}`}>
                              {columnIndex === 0 ? (
                                <button
                                  type="button"
                                  className="reports-workspace__row-select"
                                  aria-pressed={itemIndex === selectedItemIndex}
                                  aria-label={`View details for ${accessibleName}`}
                                  onClick={() =>
                                    setSelectedItemIndex(itemIndex)
                                  }
                                >
                                  <SupervisorReportValue
                                    field={column}
                                    value={item[column]}
                                  />
                                </button>
                              ) : (
                                <SupervisorReportValue
                                  field={column}
                                  value={item[column]}
                                />
                              )}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
              </div>
              <div className="reports-workspace__pagination">
                <p aria-live="polite">
                  Showing {(currentPage - 1) * pageSize + 1}–
                  {Math.min(currentPage * pageSize, items.length)} of{' '}
                  {items.length} loaded rows
                </p>
                <div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="compact"
                    onClick={() =>
                      setCurrentPage((page) => Math.max(1, page - 1))
                    }
                    disabled={currentPage <= 1}
                    aria-label="Previous report page"
                  >
                    Previous
                  </Button>
                  <span aria-live="polite">
                    Page {currentPage} of {pageCount}
                  </span>
                  <Button
                    type="button"
                    variant="secondary"
                    size="compact"
                    onClick={() =>
                      setCurrentPage((page) => Math.min(pageCount, page + 1))
                    }
                    disabled={currentPage >= pageCount}
                    aria-label="Next report page"
                  >
                    Next
                  </Button>
                </div>
              </div>
            </section>

            <section
              className="reports-workspace__panel reports-workspace__details"
              aria-label="Selected report item"
            >
              <div className="reports-workspace__table-heading">
                <div>
                  <p className="reports-workspace__eyebrow">ROW DETAILS</p>
                  <h3>Selected item</h3>
                </div>
                {selectedItem ? (
                  <span className="reports-workspace__selected-tag">
                    Selected
                  </span>
                ) : null}
              </div>
              {selectedItem ? (
                <dl className="reports-workspace__definition-list">
                  {Object.entries(selectedItem)
                    .filter(
                      ([, value]) =>
                        value !== null && value !== undefined && value !== '',
                    )
                    .map(([field, value]) => (
                      <div key={field}>
                        <dt>{formatSupervisorReportFieldLabel(field)}</dt>
                        <dd>
                          <SupervisorReportValue field={field} value={value} />
                        </dd>
                      </div>
                    ))}
                </dl>
              ) : (
                <p className="reports-workspace__empty">
                  Select a report row to see its available fields.
                </p>
              )}
            </section>
          </div>
        ) : null}

        {smsOperationalDrilldown ? (
          <section
            className="reports-workspace__panel"
            aria-label="SMS operational drilldown"
          >
            <h3>SMS delivery status</h3>
            <dl className="reports-workspace__definition-list">
              {Object.entries(smsOperationalDrilldown).map(([field, value]) => (
                <div key={field}>
                  <dt>{formatSupervisorReportFieldLabel(field)}</dt>
                  <dd>
                    <SupervisorReportValue field={field} value={value} />
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ) : null}

        {reportSummary?.reconciliation ? (
          <section
            className="reports-workspace__panel"
            aria-label="Reconciliation"
          >
            <h3>Reconciliation</h3>
            <dl className="reports-workspace__definition-list">
              <div>
                <dt>Healthy</dt>
                <dd>
                  {reportSummary.reconciliation.healthy
                    ? 'Yes'
                    : 'Needs review'}
                </dd>
              </div>
              <div>
                <dt>Mismatches</dt>
                <dd>
                  <SupervisorReportValue
                    field="mismatchCount"
                    value={reportSummary.reconciliation.mismatchCount}
                  />
                </dd>
              </div>
            </dl>
          </section>
        ) : null}
      </section>
    );
  }

  return (
    <section style={workspaceGrid}>
      <section style={cardStyle} aria-label="Report controls">
        <div style={toolbarRow}>
          <StatusBadge label={reportSummary?.scope ?? report} tone="info" />
          <StatusBadge
            label={(reportSummary?.branchId ?? branchId) || 'Tenant-wide'}
            tone="neutral"
          />
          <StatusBadge
            label={(reportSummary?.timezone ?? timezone) || 'Timezone pending'}
            tone="success"
          />
          {reportSummary?.materializationState ? (
            <StatusBadge
              label={reportSummary.materializationState}
              tone="warning"
            />
          ) : null}
          {typeof reportSummary?.freshCount === 'number' ? (
            <StatusBadge
              label={`Fresh ${reportSummary.freshCount}`}
              tone="success"
            />
          ) : null}
          {typeof reportSummary?.staleCount === 'number' ? (
            <StatusBadge
              label={`Stale ${reportSummary.staleCount}`}
              tone="warning"
            />
          ) : null}
        </div>

        <Select
          aria-label="Report"
          value={report}
          onChange={(event) => setReport(event.target.value as ReportKey)}
          options={availableReportOptions}
        />
        {report === 'sms-operations' ? (
          <Input
            aria-label="SMS transaction ID"
            placeholder="Transaction ID to inspect"
            value={smsTransactionId}
            onChange={(event) => setSmsTransactionId(event.target.value)}
          />
        ) : null}
        {report === 'customer-performance' ? (
          <Select
            aria-label="Customer performance ranking"
            value={customerSort}
            onChange={(event) =>
              setCustomerSort(
                event.target.value as
                  'spend' | 'balance' | 'visits' | 'recent' | 'dormant-value',
              )
            }
            options={[
              { value: 'spend', label: 'Top spenders' },
              { value: 'balance', label: 'Highest balances' },
              { value: 'visits', label: 'Most frequent visitors' },
              { value: 'recent', label: 'Recently active' },
              { value: 'dormant-value', label: 'Dormant high-value' },
            ]}
          />
        ) : null}
        {hideScopeInputs ? (
          <p style={mutedText}>
            Branch access is determined by your supervisor session. Report dates
            are shared with the dashboard: {params.from ?? 'start'} to{' '}
            {params.to ?? 'now'}.
          </p>
        ) : (
          <div style={filterGrid}>
            <Input
              aria-label="Branch filter"
              placeholder="Branch ID"
              value={branchId}
              onChange={(event) => setBranchId(event.target.value)}
            />
            <Input
              aria-label="Timezone filter"
              placeholder="Timezone"
              value={timezone}
              onChange={(event) => setTimezone(event.target.value)}
            />
            <Input
              aria-label="From date"
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
            />
            <Input
              aria-label="To date"
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
            />
          </div>
        )}
        <div style={toolbarRow}>
          <Button onClick={() => void refresh()}>
            {report === 'pilot-operations-summary'
              ? 'Reload summary'
              : 'Load report'}
          </Button>
          <Button
            variant="secondary"
            onClick={() => void refreshReport()}
            disabled={!canRefreshReports || isPilotOperationsSummary}
          >
            Refresh materialization
          </Button>
          <Button
            variant="ghost"
            onClick={() => void exportReport()}
            disabled={!canExportReports || isPilotOperationsSummary}
          >
            Export
          </Button>
          {report === 'sms-operations' ? (
            <Button
              variant="secondary"
              onClick={() => void inspectSelectedSms()}
              disabled={
                typeof selectedItem?.transactionId !== 'string' &&
                smsTransactionId.trim().length === 0
              }
            >
              Inspect SMS
            </Button>
          ) : null}
        </div>
      </section>

      <section style={cardStyle} aria-label="Report status">
        <h2 style={{ marginTop: 0 }}>Current report</h2>
        <p style={mutedText}>{message}</p>
        {actionMessage ? (
          <Alert tone="info" title="Report action">
            {actionMessage}
          </Alert>
        ) : null}
        <Alert tone="info" title="Current filters">
          {selectedSummary}
        </Alert>
        {report === 'sms-operations' ? (
          <Alert tone="warning" title="SMS lifecycle">
            eBulkSMS status reflects provider submission; handset delivery is
            not confirmed by this report.
          </Alert>
        ) : null}
        {actionResult ? (
          <Table>
            <tbody>
              {Object.entries(actionResult)
                .slice(0, 8)
                .map(([key, value]) => (
                  <tr key={key}>
                    <th scope="row">{key}</th>
                    <td>{renderValue(value)}</td>
                  </tr>
                ))}
            </tbody>
          </Table>
        ) : null}
      </section>

      {pilotSummary ? (
        <section style={cardStyle} aria-label="Pilot operations summary">
          <h2 style={{ marginTop: 0 }}>Pilot operations summary</h2>
          <Alert
            tone={reconciliationHealthy ? 'success' : 'danger'}
            title="Pilot summary"
          >
            {reconciliationHealthy
              ? 'Live operational signals are reconciled.'
              : 'Live operational signals require review.'}
          </Alert>
          <Table>
            <tbody>
              <tr>
                <th scope="row">Release version</th>
                <td>{renderValue(pilotSummary.release?.version)}</td>
              </tr>
              <tr>
                <th scope="row">Release SHA</th>
                <td>{renderValue(pilotSummary.release?.sha)}</td>
              </tr>
              <tr>
                <th scope="row">Generated at</th>
                <td>{renderValue(pilotSummary.generatedAt)}</td>
              </tr>
              <tr>
                <th scope="row">Outbox backlog</th>
                <td>{renderValue(pilotSummary.outbox?.backlogCount)}</td>
              </tr>
              <tr>
                <th scope="row">Outbox stale</th>
                <td>{renderValue(pilotSummary.outbox?.staleCount)}</td>
              </tr>
              <tr>
                <th scope="row">SMS failures</th>
                <td>{renderValue(pilotSummary.sms?.failedCount)}</td>
              </tr>
              <tr>
                <th scope="row">Offline sync failures</th>
                <td>{renderValue(pilotSummary.offlineSync?.failureCount)}</td>
              </tr>
              <tr>
                <th scope="row">Fraud open</th>
                <td>{renderValue(pilotSummary.fraud?.openCount)}</td>
              </tr>
              <tr>
                <th scope="row">Reports stale</th>
                <td>{renderValue(pilotSummary.reports?.staleCount)}</td>
              </tr>
              <tr>
                <th scope="row">Reconciliation mismatches</th>
                <td>
                  {renderValue(pilotSummary.reconciliation?.mismatchCount)}
                </td>
              </tr>
            </tbody>
          </Table>
        </section>
      ) : null}

      <div style={workspaceGrid}>
        <section style={cardStyle} aria-label="Report summary items">
          <h2 style={{ marginTop: 0 }}>Summary items</h2>
          {items.length > 0 ? (
            <div style={itemsGrid}>
              {items.slice(0, 6).map((item, index) => {
                const entries = Object.entries(item);
                const [label, value] = entries[0] ?? [
                  `item-${index + 1}`,
                  'Unknown',
                ];
                const selected = index === selectedItemIndex;
                return (
                  <button
                    key={`${label}-${index}`}
                    type="button"
                    onClick={() => setSelectedItemIndex(index)}
                    style={{
                      textAlign: 'left',
                      padding: 'var(--sc-spacing-4)',
                      borderRadius: 'var(--sc-radius-lg)',
                      border: `1px solid ${selected ? 'var(--sc-color-brand-600)' : 'var(--sc-color-semantic-border)'}`,
                      background: 'var(--sc-color-neutral-0)',
                    }}
                  >
                    <div style={listHeaderRow}>
                      <strong>{formatReportFieldLabel(label)}</strong>
                      <StatusBadge
                        label={selected ? 'Selected' : 'Item'}
                        tone={selected ? 'success' : 'neutral'}
                      />
                    </div>
                    <p style={listBodyText}>{renderValue(value)}</p>
                    <div style={chipRow}>
                      <StatusBadge label={report} tone="info" />
                      <StatusBadge
                        label={branchId || 'Tenant-wide'}
                        tone="neutral"
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <Alert tone="warning" title="No report rows">
              The selected report returned no rows for the current filters.
            </Alert>
          )}
        </section>

        <section style={cardStyle} aria-label="Selected report item">
          <h2 style={{ marginTop: 0 }}>Selected item</h2>
          {selectedItem ? (
            <>
              <Alert tone="info" title="Item context">
                {describeSelectedItem(selectedItem)}
              </Alert>
              <Table>
                <tbody>
                  {Object.entries(selectedItem)
                    .slice(0, 10)
                    .map(([key, value]) => (
                      <tr key={key}>
                        <th scope="row">{formatReportFieldLabel(key)}</th>
                        <td>{renderValue(value)}</td>
                      </tr>
                    ))}
                </tbody>
              </Table>
            </>
          ) : (
            <Alert tone="warning" title="No item selected">
              Select a summary row to inspect its full values.
            </Alert>
          )}
        </section>
      </div>

      {smsOperationalDrilldown ? (
        <section style={cardStyle} aria-label="SMS operational drilldown">
          <h2 style={{ marginTop: 0 }}>SMS failure drilldown</h2>
          <Alert
            tone={
              smsOperationalDrilldown.deadLetterCount > 0 ? 'danger' : 'info'
            }
            title="Retry and dead-letter status"
          >
            {smsOperationalDrilldown.deadLetterCount > 0
              ? 'Dead-lettered SMS rows require operator review before replay.'
              : 'No dead-lettered SMS rows are visible in the current filters.'}
          </Alert>
          <Table>
            <tbody>
              <tr>
                <th scope="row">Queued</th>
                <td>{renderValue(smsOperationalDrilldown.queuedCount)}</td>
              </tr>
              <tr>
                <th scope="row">Submitted to provider</th>
                <td>{renderValue(smsOperationalDrilldown.sentCount)}</td>
              </tr>
              <tr>
                <th scope="row">Delivery confirmed by DLR</th>
                <td>{renderValue(smsOperationalDrilldown.deliveredCount)}</td>
              </tr>
              <tr>
                <th scope="row">Failed</th>
                <td>{renderValue(smsOperationalDrilldown.failedCount)}</td>
              </tr>
              <tr>
                <th scope="row">Retries</th>
                <td>{renderValue(smsOperationalDrilldown.retryCount)}</td>
              </tr>
              <tr>
                <th scope="row">Dead letters</th>
                <td>{renderValue(smsOperationalDrilldown.deadLetterCount)}</td>
              </tr>
              <tr>
                <th scope="row">Rows with unavailable cost</th>
                <td>
                  {renderValue(smsOperationalDrilldown.unavailableCostRows)}
                </td>
              </tr>
            </tbody>
          </Table>
        </section>
      ) : null}

      {reportSummary?.reconciliation ? (
        <section style={cardStyle} aria-label="Reconciliation">
          <Alert
            tone={reportSummary.reconciliation.healthy ? 'success' : 'danger'}
            title="Reconciliation"
          >
            {JSON.stringify(reportSummary.reconciliation)}
          </Alert>
          {Array.isArray(reportSummary.reconciliation.items) ? (
            <Table>
              <thead>
                <tr>
                  <th>Field</th>
                  <th>Value</th>
                </tr>
              </thead>
              <tbody>
                {(reportSummary.reconciliation.items as ReportItem[])
                  .slice(0, 5)
                  .map((item: ReportItem, index: number) => {
                    const [label, value] = Object.entries(item)[0] ?? [
                      `recon-${index + 1}`,
                      'Unknown',
                    ];
                    return (
                      <tr key={`${label}-${index}`}>
                        <td>{label}</td>
                        <td>{renderValue(value)}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </Table>
          ) : null}
        </section>
      ) : null}
    </section>
  );
}

function sortCustomerPerformanceItems(
  items: ReportItem[],
  sort: 'spend' | 'balance' | 'visits' | 'recent' | 'dormant-value' | undefined,
): ReportItem[] {
  if (!sort) return items;
  const field =
    sort === 'spend'
      ? 'purchaseValueKobo'
      : sort === 'balance' || sort === 'dormant-value'
        ? 'currentBalanceKobo'
        : sort === 'visits'
          ? 'visitCount'
          : 'lastActivityAt';

  return [...items].sort((left, right) => {
    if (sort === 'dormant-value') {
      const dormantDelta =
        Number(Boolean(right.dormant)) - Number(Boolean(left.dormant));
      if (dormantDelta !== 0) return dormantDelta;
    }
    const leftValue = left[field];
    const rightValue = right[field];
    const leftTime =
      field === 'lastActivityAt' && typeof leftValue === 'string'
        ? Date.parse(leftValue)
        : Number(leftValue ?? 0);
    const rightTime =
      field === 'lastActivityAt' && typeof rightValue === 'string'
        ? Date.parse(rightValue)
        : Number(rightValue ?? 0);
    if (rightTime !== leftTime) return rightTime - leftTime;
    return String(left.customerId ?? '').localeCompare(
      String(right.customerId ?? ''),
    );
  });
}

function summarizeSmsOperations(items: ReportItem[]): SmsOperationalDrilldown {
  const summary: SmsOperationalDrilldown = {
    queuedCount: 0,
    sentCount: 0,
    deliveredCount: 0,
    failedCount: 0,
    retryCount: 0,
    deadLetterCount: 0,
    unavailableCostRows: 0,
  };
  for (const item of items) {
    summary.queuedCount += numericReportValue(item.queuedCount);
    summary.sentCount += numericReportValue(item.sentCount);
    summary.deliveredCount += numericReportValue(item.deliveredCount);
    summary.failedCount += numericReportValue(item.failedCount);
    summary.retryCount += numericReportValue(item.retryCount);
    summary.deadLetterCount += numericReportValue(item.deadLetterCount);
    summary.unavailableCostRows += item.costStatus === 'UNAVAILABLE' ? 1 : 0;
  }
  return summary;
}

function numericReportValue(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function formatReportFieldLabel(key: string): string {
  const knownLabels: Record<string, string> = {
    purchaseValueKobo: 'Purchase value (kobo)',
    creditIssuedKobo: 'Credit issued (kobo)',
    redemptionValueKobo: 'Redemption value (kobo)',
    endingBalanceKobo: 'Ending balance (kobo)',
    basketRatioBps: 'Basket ratio (basis points)',
    costStatus: 'SMS cost status',
    fraudFlagCount: 'Fraud flags',
  };
  return (
    knownLabels[key] ??
    key.replace(/([A-Z])/g, ' $1').replace(/^./, (value) => value.toUpperCase())
  );
}

function renderValue(value: unknown) {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string' || typeof value === 'boolean')
    return String(value);
  return JSON.stringify(value);
}

function describeSelectedItem(item: Record<string, unknown>) {
  const label = Object.entries(item)[0]?.[0] ?? 'item';
  const value = Object.entries(item)[0]?.[1];
  return `${label}: ${renderValue(value)}`;
}

function describeReportContext(
  summary: ReportSummary,
  report: ReportKey,
  branchId: string,
  timezone: string,
  from: string,
  to: string,
) {
  const parts = [
    `Report ${summary.scope ?? report}`,
    `branch ${(summary.branchId ?? branchId) || 'Tenant-wide'}`,
    `timezone ${(summary.timezone ?? timezone) || 'pending'}`,
    `window ${from || 'start'} → ${to || 'now'}`,
  ];
  return parts.join(' · ');
}

function describePilotSummaryContext(summary: PilotSummary) {
  const parts = [
    `Release ${summary.release?.version ?? 'pending'}`,
    `Generated ${summary.generatedAt ?? 'pending'}`,
    `Outbox ${summary.outbox?.backlogCount ?? 0} backlog`,
    `SMS ${summary.sms?.failedCount ?? 0} failed`,
    `Offline ${summary.offlineSync?.failureCount ?? 0} failed`,
    summary.reconciliation?.healthy ? 'Reconciled' : 'Mismatch',
  ];
  return parts.join(' · ');
}

function triggerCsvDownload(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noreferrer';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

const workspaceGrid: CSSProperties = {
  display: 'grid',
  gap: 'var(--sc-spacing-4)',
};

const cardStyle: CSSProperties = {
  background: 'var(--sc-color-neutral-0)',
  border: '1px solid var(--sc-color-semantic-border)',
  borderRadius: 'var(--sc-radius-lg)',
  padding: 'var(--sc-spacing-5)',
  boxShadow: 'var(--sc-shadow-level1)',
  display: 'grid',
  gap: 'var(--sc-spacing-4)',
};

const toolbarRow: CSSProperties = {
  display: 'flex',
  gap: 'var(--sc-spacing-3)',
  flexWrap: 'wrap',
};

const filterGrid: CSSProperties = {
  display: 'grid',
  gap: 'var(--sc-spacing-3)',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
};

const itemsGrid: CSSProperties = {
  display: 'grid',
  gap: 'var(--sc-spacing-3)',
};

const chipRow: CSSProperties = {
  display: 'flex',
  gap: 'var(--sc-spacing-2)',
  flexWrap: 'wrap',
  marginTop: 'var(--sc-spacing-2)',
};

const listHeaderRow: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 'var(--sc-spacing-3)',
};

const listBodyText: CSSProperties = {
  margin: 0,
  color: 'var(--sc-color-semantic-textSecondary)',
};

const mutedText: CSSProperties = {
  margin: 0,
  color: 'var(--sc-color-semantic-textSecondary)',
};
