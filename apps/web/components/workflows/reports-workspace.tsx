'use client';

import {
  ChevronLeft,
  ChevronRight,
  Download,
  Info,
  RefreshCw,
} from 'lucide-react';
import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { CSSProperties, ReactNode } from 'react';
import {
  branchesControllerListBranchesV1,
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
import { Alert, Button, Dialog, Input, Select, Table } from '../ui';
import { StatusBadge } from '../shopcity';
import {
  CopyableChip,
  formatReportBusinessDate,
  formatReportTimestamp,
  formatSupervisorReportFieldLabel,
  ReportProblemNotice,
  SupervisorReportValue,
} from './report-ui';

type OperationsDatePreset = 'all' | 'week' | 'month' | 'custom';

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
  /** Load tenant branches and replace manual branch/timezone filters with a selector. */
  loadTenantBranchOptions?: boolean;
  /** Parent-selected period, shared with the supervisor KPI dashboard. */
  period?: { from: string; to: string };
  /** Supervisor branch and period are enforced outside this low-level report UI. */
  hideScopeInputs?: boolean;
  /** Selects the role-aware operational report presentation for report routes. */
  presentation?: 'default' | 'supervisor' | 'admin';
  /** Hides visual status pills for callers that already provide status context. */
  showStatusBadges?: boolean;
  /** Opts into a combined results surface with selected-item details in a dialog. */
  summaryItemsPresentation?: 'cards' | 'table-dialog';
  /** Parent-applied scope used by the operational dashboard routes. */
  scopeFilters?: { branchId?: string; timezone?: string };
  /** Display name for the active branch; branch IDs remain the API scope key. */
  branchName?: string | null;
  /** Shared retry cooldown for report loads, materialization, and exports. */
  rateLimitSeconds?: number;
  onRateLimited?: (seconds: number) => void;
};

type ReportItem = Record<string, unknown>;

type ReportBranchOption = { id: string; name: string; timezone: string };

function isReportBranchOption(value: unknown): value is ReportBranchOption {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const branch = value as Record<string, unknown>;
  return (
    typeof branch.id === 'string' &&
    branch.id.trim().length > 0 &&
    typeof branch.name === 'string' &&
    branch.name.trim().length > 0 &&
    typeof branch.timezone === 'string' &&
    branch.timezone.trim().length > 0
  );
}

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

const operationsDatePresetOptions: Array<{
  value: OperationsDatePreset;
  label: string;
}> = [
  { value: 'all', label: 'All dates' },
  { value: 'week', label: 'Last 7 days' },
  { value: 'month', label: 'Last 30 days' },
  { value: 'custom', label: 'Custom dates' },
];

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
    'customerName',
    'purchaseValueKobo',
    'currentBalanceKobo',
    'visitCount',
    'dormant',
    'lastActivityAt',
    'reportDate',
  ],
  'cashier-activity': [
    'reportDate',
    'cashierEmail',
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

const reportDefinitions: Record<ReportKey, { description: string }> = {
  'executive-summary': {
    description: 'Period activity and the latest available liability snapshot.',
  },
  'liability-ageing': {
    description: 'Outstanding credit grouped by age at the latest snapshot.',
  },
  'customer-performance': {
    description: 'Customer activity, visits, spend, and available balances.',
  },
  'cashier-activity': {
    description: 'Branch cashier activity and reported operational flags.',
  },
  'redemption-summary': {
    description: 'Redemption counts, confirmed value, and reported approvals.',
  },
  'sms-operations': {
    description:
      'SMS queue and delivery statuses; sent does not mean delivered.',
  },
  'audit-report': {
    description: 'Audited actions available to authorized Admin users.',
  },
  'materialization-state': {
    description: 'Read-model freshness and report materialization status.',
  },
  'pilot-operations-summary': {
    description: 'Live operational health signals for the pilot.',
  },
};

function ReportPopup({
  title,
  description,
  buttonLabel,
  buttonAriaLabel,
  children,
}: Readonly<{
  title: string;
  description?: string;
  buttonLabel?: string;
  buttonAriaLabel?: string;
  children?: ReactNode;
}>) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{
    left: number;
    top: number;
  } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const popupId = useId();
  const titleId = useId();
  const descriptionId = useId();

  function closePopup() {
    setOpen(false);
    setPosition(null);
    triggerRef.current?.focus();
  }

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !rootRef.current?.contains(event.target)
      ) {
        setOpen(false);
        setPosition(null);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closePopup();
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  useLayoutEffect(() => {
    if (!open) return;
    const positionPopup = () => {
      const trigger = triggerRef.current?.getBoundingClientRect();
      const popup = popupRef.current?.getBoundingClientRect();
      if (!trigger || !popup) return;
      const gap = 8;
      const margin = 12;
      let left = trigger.right + gap;
      if (left + popup.width > window.innerWidth - margin) {
        left = Math.max(margin, trigger.left - popup.width - gap);
      }
      const top = Math.max(
        margin,
        Math.min(trigger.top, window.innerHeight - popup.height - margin),
      );
      setPosition({ left, top });
    };
    positionPopup();
    window.addEventListener('resize', positionPopup);
    window.addEventListener('scroll', positionPopup, true);
    return () => {
      window.removeEventListener('resize', positionPopup);
      window.removeEventListener('scroll', positionPopup, true);
    };
  }, [open, title, description]);

  const triggerName = buttonLabel ?? `About ${title}`;

  return (
    <div ref={rootRef} className="reports-workspace__popup-anchor">
      {buttonLabel ? (
        <Button
          ref={triggerRef}
          type="button"
          variant="secondary"
          size="compact"
          className="reports-workspace__more-details-trigger"
          aria-label={buttonAriaLabel ?? buttonLabel}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={popupId}
          onClick={() => {
            if (open) closePopup();
            else setOpen(true);
          }}
        >
          {buttonLabel}
        </Button>
      ) : (
        <button
          ref={triggerRef}
          type="button"
          className="reports-workspace__title-info-trigger"
          aria-label={triggerName}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={popupId}
          onClick={() => {
            if (open) closePopup();
            else setOpen(true);
          }}
        >
          <Info size={15} aria-hidden="true" />
        </button>
      )}
      {open ? (
        <div
          ref={popupRef}
          id={popupId}
          role="dialog"
          aria-labelledby={titleId}
          aria-describedby={description ? descriptionId : undefined}
          className="reports-workspace__info-popup"
          style={{
            left: position?.left ?? 0,
            top: position?.top ?? 0,
            visibility: position ? 'visible' : 'hidden',
          }}
        >
          <h2 id={titleId}>{title}</h2>
          {description ? <p id={descriptionId}>{description}</p> : null}
          {children}
        </div>
      ) : null}
    </div>
  );
}

export function ReportsWorkspace({
  canRefreshReports = true,
  canExportReports = true,
  canUsePilotOperationsSummary = true,
  canUseAuditReport = true,
  canUseMaterializationState = true,
  period,
  loadTenantBranchOptions = false,
  hideScopeInputs = false,
  presentation = 'default',
  showStatusBadges = true,
  summaryItemsPresentation = 'cards',
  scopeFilters,
  branchName,
  rateLimitSeconds = 0,
  onRateLimited,
}: ReportsWorkspaceProps = {}) {
  const [report, setReport] = useState<ReportKey>('executive-summary');
  const [branchId, setBranchId] = useState('');
  const [timezone, setTimezone] = useState('');
  const [branches, setBranches] = useState<ReportBranchOption[]>([]);
  const [branchesLoading, setBranchesLoading] = useState(
    loadTenantBranchOptions,
  );
  const [branchesUnavailable, setBranchesUnavailable] = useState(false);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [operationsDatePreset, setOperationsDatePreset] =
    useState<OperationsDatePreset>('all');
  const [draftFrom, setDraftFrom] = useState('');
  const [draftTo, setDraftTo] = useState('');
  const [dateValidation, setDateValidation] = useState('');
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
  const [selectedItemDialogOpen, setSelectedItemDialogOpen] = useState(false);
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [customerSort, setCustomerSort] = useState<
    'spend' | 'balance' | 'visits' | 'recent' | 'dormant-value'
  >('spend');
  const [smsTransactionId, setSmsTransactionId] = useState('');
  const reportLoadGeneration = useRef(0);
  const customFromId = useId();
  const customToId = useId();

  useEffect(() => {
    if (!loadTenantBranchOptions) return;

    let active = true;
    setBranchesLoading(true);
    setBranchesUnavailable(false);

    void branchesControllerListBranchesV1(createApiRequest({ csrf: true }))
      .then((response) => {
        if (!active) return;
        if (response.status !== 200) {
          setBranches([]);
          setBranchesUnavailable(true);
          return;
        }

        const branchData = response.data.data;
        if (
          !Array.isArray(branchData) ||
          !branchData.every(isReportBranchOption)
        ) {
          setBranches([]);
          setBranchesUnavailable(true);
          return;
        }

        setBranches(branchData);
      })
      .catch(() => {
        if (active) {
          setBranches([]);
          setBranchesUnavailable(true);
        }
      })
      .finally(() => {
        if (active) setBranchesLoading(false);
      });

    return () => {
      active = false;
    };
  }, [loadTenantBranchOptions]);

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
  const reportTimezone = loadTenantBranchOptions
    ? (branches.find((branch) => branch.id === branchId)?.timezone ?? '')
    : timezone;

  useEffect(() => {
    if (
      !loadTenantBranchOptions ||
      (operationsDatePreset !== 'week' && operationsDatePreset !== 'month')
    ) {
      return;
    }
    const range = operationsReportDateRange(
      operationsDatePreset === 'week' ? 7 : 30,
      reportTimezone || 'Africa/Lagos',
    );
    setFrom(range.from);
    setTo(range.to);
    setDraftFrom(range.from);
    setDraftTo(range.to);
    setCurrentPage(1);
  }, [loadTenantBranchOptions, operationsDatePreset, reportTimezone]);

  const branchFilterOptions = [
    {
      value: '',
      label: branchesLoading
        ? 'Loading branches…'
        : branchesUnavailable
          ? 'Branch list unavailable'
          : 'All branches',
    },
    ...branches.map((branch) => ({ value: branch.id, label: branch.name })),
  ];

  const params = useMemo<ReportsControllerListExecutiveSummaryV1Params>(
    () => ({
      branchId:
        report === 'audit-report'
          ? undefined
          : (scopeFilters?.branchId ?? branchId) || undefined,
      timezone: (scopeFilters?.timezone ?? reportTimezone) || undefined,
      from: (period?.from ?? from) || undefined,
      to: (period?.to ?? to) || undefined,
    }),
    [
      branchId,
      from,
      report,
      scopeFilters?.branchId,
      scopeFilters?.timezone,
      reportTimezone,
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
      timezone: (scopeFilters?.timezone ?? reportTimezone) || 'UTC',
    }),
    [
      branchId,
      report,
      scopeFilters?.branchId,
      scopeFilters?.timezone,
      reportTimezone,
    ],
  );
  function selectOperationsDatePreset(preset: OperationsDatePreset) {
    setOperationsDatePreset(preset);
    setDateValidation('');
    setCurrentPage(1);

    if (preset === 'all') {
      setFrom('');
      setTo('');
      setDraftFrom('');
      setDraftTo('');
    } else if (preset === 'week' || preset === 'month') {
      const range = operationsReportDateRange(
        preset === 'week' ? 7 : 30,
        reportTimezone || 'Africa/Lagos',
      );
      setFrom(range.from);
      setTo(range.to);
      setDraftFrom(range.from);
      setDraftTo(range.to);
    } else {
      setDraftFrom(from);
      setDraftTo(to);
    }
  }

  function applyOperationsCustomDateRange() {
    if (!draftFrom || !draftTo || draftFrom > draftTo) {
      setDateValidation('Choose a valid start date on or before the end date.');
      return;
    }
    setDateValidation('');
    setOperationsDatePreset('custom');
    setFrom(draftFrom);
    setTo(draftTo);
    setCurrentPage(1);
  }

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
    const displayColumns = columns.filter((field) => {
      if (field === 'customerId' && columns.includes('customerName')) {
        return false;
      }
      if (field === 'cashierId' && columns.includes('cashierEmail')) {
        return false;
      }
      return true;
    });
    const ordered = preferredOrder.filter((field) =>
      displayColumns.includes(field),
    );
    return [
      ...ordered,
      ...displayColumns.filter((field) => !ordered.includes(field)),
    ].slice(0, 6);
  }, [columns, report]);
  const summaryTableColumns = visibleColumns.length
    ? visibleColumns
    : columns.slice(0, 6);
  const numericReportColumns = new Set(
    summaryTableColumns.filter((field) =>
      items.some((item) => typeof item[field] === 'number'),
    ),
  );
  const summaryDisplayTimezone =
    reportTimezone || reportSummary?.timezone || 'Africa/Lagos';
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const visibleItems = items.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  const currentReportDefinition = reportDefinitions[report];
  const latestMaterializedAt = (reportSummary?.items ?? [])
    .map((item) => item.materializedAt)
    .filter((value): value is string => typeof value === 'string')
    .sort()
    .at(-1);

  useEffect(() => {
    if (selectedItemIndex >= items.length) {
      setSelectedItemIndex(0);
      setSelectedItemDialogOpen(false);
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
          reportTimezone,
          params.from ?? '',
          params.to ?? '',
        )
      : 'No report loaded yet.';
  const operationsFilterSubtext = describeOperationsReportFilters({
    report,
    summary: reportSummary,
    branchId,
    branchName,
    branches,
    timezone: reportTimezone,
    from: params.from ?? '',
    to: params.to ?? '',
  });
  const operationsStatusMessage = humanizeOperationsReportMessage(message);

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
    const displayBranchName =
      branchScope === 'TENANT' ? null : branchName?.trim() || null;
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
        <div className="reports-workspace__report-suite">
          <section
            className="reports-workspace__panel reports-workspace__controls"
            aria-label="Report controls"
          >
            <div className="reports-workspace__panel-heading">
              <div>
                <h3>Choose a report</h3>
              </div>
            </div>

            <div className="reports-workspace__report-type-row">
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
              </div>
              <div className="reports-workspace__report-type-actions">
                <Button
                  type="button"
                  onClick={() => void refresh()}
                  loading={loading}
                  disabled={rateLimitSeconds > 0}
                >
                  Load report
                </Button>
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
              </div>
            </div>

            {report === 'sms-operations' ? (
              <div className="reports-workspace__filters">
                <div className="reports-workspace__field">
                  <span>SMS transaction ID</span>
                  <Input
                    aria-label="SMS transaction ID"
                    placeholder="Transaction ID to inspect"
                    value={smsTransactionId}
                    onChange={(event) =>
                      setSmsTransactionId(event.target.value)
                    }
                  />
                </div>
              </div>
            ) : null}
            {report === 'customer-performance' ? (
              <div className="reports-workspace__filters">
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
              </div>
            ) : null}

            {hideScopeInputs && scopeFilters ? (
              <p className="reports-workspace__scope-hint">
                {isPilotOperationsSummary || report === 'audit-report'
                  ? 'This report is tenant-wide under Admin authorization. The report window follows its server-supported period behavior.'
                  : 'Scope follows the applied Admin filter and server authorization. The report window follows the shared dashboard period.'}
              </p>
            ) : hideScopeInputs ? null : (
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

            {(canRefreshReports && !isPilotOperationsSummary) ||
            report === 'sms-operations' ? (
              <div className="reports-workspace__actions">
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
            ) : null}
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
                <div className="reports-workspace__report-title">
                  <h3>{reportLabel}</h3>
                  {currentReportDefinition.description ? (
                    <ReportPopup
                      title={reportLabel}
                      description={currentReportDefinition.description}
                    />
                  ) : null}
                </div>
              </div>
            </div>
            <div
              className="reports-workspace__scope"
              aria-label="Report scope and filters"
            >
              <div className="reports-workspace__scope-item">
                <span>Scope</span>
                <strong>{branchScope}</strong>
              </div>
              {displayBranchName ? (
                <div className="reports-workspace__scope-item">
                  <span>Branch</span>
                  <strong>{displayBranchName}</strong>
                </div>
              ) : branchIdValue ? (
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
              {latestMaterializedAt ? (
                <span>
                  Updated{' '}
                  {formatReportTimestamp(latestMaterializedAt, timezoneValue)} ·
                  {timezoneValue}
                </span>
              ) : null}
              {reportSummary?.materializationState ? (
                <span>
                  Materialization: {reportSummary.materializationState}
                </span>
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
                  different date range or reload the report after
                  materialization.
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
                  <div className="reports-workspace__report-title">
                    <h3>Report results</h3>
                    <ReportPopup
                      title="Report results"
                      description="Key fields are shown here; select a row to inspect all populated fields."
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
                        <th scope="col">Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleItems.map((item, pageIndex) => {
                        const itemIndex =
                          (currentPage - 1) * pageSize + pageIndex;
                        const primaryField = visibleColumns[0];
                        const primaryValue = primaryField
                          ? item[primaryField] ||
                            (primaryField === 'customerName'
                              ? item.customerId
                              : primaryField === 'cashierEmail'
                                ? item.cashierId
                                : null)
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
                                    aria-pressed={
                                      itemIndex === selectedItemIndex
                                    }
                                    aria-label={`View details for ${accessibleName}`}
                                    onClick={() =>
                                      setSelectedItemIndex(itemIndex)
                                    }
                                  >
                                    <SupervisorReportValue
                                      field={column}
                                      value={primaryValue}
                                    />
                                  </button>
                                ) : (
                                  <SupervisorReportValue
                                    field={column}
                                    value={
                                      column === 'customerName' &&
                                      !item.customerName
                                        ? item.customerId
                                        : column === 'cashierEmail' &&
                                            !item.cashierEmail
                                          ? item.cashierId
                                          : item[column]
                                    }
                                  />
                                )}
                              </td>
                            ))}
                            <td>
                              <ReportPopup
                                title={`Details for ${accessibleName}`}
                                buttonLabel="More details"
                                buttonAriaLabel={`More details for ${accessibleName}`}
                              >
                                <dl className="reports-workspace__definition-list">
                                  {Object.entries(item)
                                    .filter(
                                      ([field, value]) =>
                                        value !== null &&
                                        value !== undefined &&
                                        value !== '' &&
                                        !(
                                          field === 'customerId' &&
                                          typeof item.customerName ===
                                            'string' &&
                                          item.customerName.trim().length > 0
                                        ) &&
                                        !(
                                          field === 'cashierId' &&
                                          typeof item.cashierEmail ===
                                            'string' &&
                                          item.cashierEmail.trim().length > 0
                                        ),
                                    )
                                    .map(([field, value]) => (
                                      <div key={field}>
                                        <dt>
                                          {formatSupervisorReportFieldLabel(
                                            field,
                                          )}
                                        </dt>
                                        <dd>
                                          <SupervisorReportValue
                                            field={field}
                                            value={value}
                                          />
                                        </dd>
                                      </div>
                                    ))}
                                </dl>
                              </ReportPopup>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </Table>
                </div>
                <div className="reports-workspace__pagination">
                  <div className="reports-workspace__pagination-summary">
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
                    <p aria-live="polite">
                      Showing {(currentPage - 1) * pageSize + 1}–
                      {Math.min(currentPage * pageSize, items.length)} of{' '}
                      {items.length} loaded rows
                    </p>
                  </div>
                  <div className="reports-workspace__pagination-controls">
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
                      <ChevronLeft size={16} aria-hidden="true" />
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
                      <ChevronRight size={16} aria-hidden="true" />
                    </Button>
                  </div>
                </div>
              </section>
            </div>
          ) : null}
        </div>

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

  const currentReportContext = (
    <>
      {summaryItemsPresentation === 'table-dialog' ? (
        <div className="reports-workspace__summary-context">
          <p className="reports-workspace__summary-subtext">
            {operationsFilterSubtext}
          </p>
          <p
            className="reports-workspace__summary-status"
            role="status"
            aria-live="polite"
          >
            {operationsStatusMessage}
          </p>
        </div>
      ) : (
        <>
          <p style={mutedText}>{message}</p>
          <Alert tone="info" title="Current filters">
            {selectedSummary}
          </Alert>
        </>
      )}
      {actionMessage ? (
        <Alert tone="info" title="Report action">
          {actionMessage}
        </Alert>
      ) : null}
      {report === 'sms-operations' ? (
        <Alert tone="warning" title="SMS lifecycle">
          eBulkSMS status reflects provider submission; handset delivery is not
          confirmed by this report.
        </Alert>
      ) : null}
      {actionResult ? (
        <Table className="reports-workspace__action-result-table">
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
    </>
  );

  return (
    <section style={workspaceGrid}>
      <section style={cardStyle} aria-label="Report controls">
        {showStatusBadges ? (
          <div style={toolbarRow}>
            <StatusBadge label={reportSummary?.scope ?? report} tone="info" />
            <StatusBadge
              label={(reportSummary?.branchId ?? branchId) || 'Tenant-wide'}
              tone="neutral"
            />
            <StatusBadge
              label={
                (reportSummary?.timezone ?? reportTimezone) ||
                'Timezone pending'
              }
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
        ) : null}

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
            {loadTenantBranchOptions ? (
              <div className="reports-workspace__field">
                <span>Branch</span>
                <Select
                  aria-label="Branch filter"
                  value={branchId}
                  onChange={(event) => {
                    setBranchId(event.target.value);
                    setCurrentPage(1);
                  }}
                  options={branchFilterOptions}
                  disabled={branchesLoading || branchesUnavailable}
                />
              </div>
            ) : (
              <Input
                aria-label="Branch filter"
                placeholder="Branch ID"
                value={branchId}
                onChange={(event) => setBranchId(event.target.value)}
              />
            )}
            {!loadTenantBranchOptions ? (
              <Input
                aria-label="Timezone filter"
                placeholder="Timezone"
                value={timezone}
                onChange={(event) => setTimezone(event.target.value)}
              />
            ) : null}
            {summaryItemsPresentation !== 'table-dialog' || period ? (
              <>
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
              </>
            ) : null}
          </div>
        )}
        {summaryItemsPresentation === 'table-dialog' && !period ? (
          <>
            <div className="supervisor-reports-period__bar reports-workspace__date-preset-bar">
              <strong>Date range</strong>
              <div
                className="supervisor-reports-period__buttons"
                role="group"
                aria-label="Reporting period presets"
              >
                {operationsDatePresetOptions.map(({ value, label }) => (
                  <Button
                    key={value}
                    type="button"
                    variant={
                      operationsDatePreset === value ? 'primary' : 'secondary'
                    }
                    aria-pressed={operationsDatePreset === value}
                    onClick={() => selectOperationsDatePreset(value)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
              <Select
                className="supervisor-reports-period__responsive-select"
                aria-label="Reporting period menu"
                value={operationsDatePreset}
                onChange={(event) =>
                  selectOperationsDatePreset(
                    event.target.value as OperationsDatePreset,
                  )
                }
                options={operationsDatePresetOptions}
              />
            </div>
            {operationsDatePreset === 'custom' ? (
              <div className="supervisor-reports-period__custom">
                <label htmlFor={customFromId}>
                  <span>From</span>
                  <Input
                    id={customFromId}
                    type="date"
                    aria-label="From date"
                    value={draftFrom}
                    onChange={(event) => {
                      setDraftFrom(event.target.value);
                      setDateValidation('');
                    }}
                  />
                </label>
                <label htmlFor={customToId}>
                  <span>To</span>
                  <Input
                    id={customToId}
                    type="date"
                    aria-label="To date"
                    value={draftTo}
                    onChange={(event) => {
                      setDraftTo(event.target.value);
                      setDateValidation('');
                    }}
                  />
                </label>
                <Button type="button" onClick={applyOperationsCustomDateRange}>
                  Apply dates
                </Button>
                {dateValidation ? (
                  <p
                    className="reports-workspace__date-validation"
                    role="alert"
                  >
                    {dateValidation}
                  </p>
                ) : null}
              </div>
            ) : null}
          </>
        ) : null}
        {loadTenantBranchOptions &&
        !branchesLoading &&
        (branchesUnavailable || branches.length === 0) ? (
          <p style={mutedText} role="status" aria-live="polite">
            {branchesUnavailable
              ? 'Branch options are unavailable. The report scope remains all branches.'
              : 'No branches are available. The report scope remains all branches.'}
          </p>
        ) : null}
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

      {summaryItemsPresentation === 'cards' ? (
        <section style={cardStyle} aria-label="Report status">
          <h2 style={{ marginTop: 0 }}>Current report</h2>
          {currentReportContext}
        </section>
      ) : null}

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
        <section
          style={cardStyle}
          aria-label={
            summaryItemsPresentation === 'table-dialog'
              ? 'Report results'
              : 'Report summary items'
          }
        >
          <h2 style={{ marginTop: 0 }}>Summary items</h2>
          {summaryItemsPresentation === 'table-dialog'
            ? currentReportContext
            : null}
          {items.length > 0 ? (
            summaryItemsPresentation === 'table-dialog' ? (
              <>
                <div className="reports-workspace__table-scroll">
                  <Table
                    className="reports-workspace__summary-table"
                    aria-label="Summary items"
                  >
                    <caption className="report-sr-only">
                      {reportOptions.find((option) => option.value === report)
                        ?.label ?? report}{' '}
                      report rows
                    </caption>
                    <thead>
                      <tr>
                        {summaryTableColumns.length ? (
                          summaryTableColumns.map((field) => (
                            <th
                              key={field}
                              scope="col"
                              data-numeric={
                                numericReportColumns.has(field)
                                  ? 'true'
                                  : undefined
                              }
                            >
                              {formatOperationsReportFieldLabel(field)}
                            </th>
                          ))
                        ) : (
                          <th scope="col">Report item</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {visibleItems.map((item, pageIndex) => {
                        const itemIndex =
                          (currentPage - 1) * pageSize + pageIndex;
                        const selected =
                          selectedItemDialogOpen &&
                          itemIndex === selectedItemIndex;
                        if (!summaryTableColumns.length) {
                          const itemLabel = `Report item ${itemIndex + 1}`;
                          return (
                            <tr
                              key={`${report}-${itemIndex}`}
                              data-selected={selected || undefined}
                            >
                              <th scope="row">
                                <Button
                                  type="button"
                                  variant="link"
                                  className="reports-workspace__summary-row-trigger"
                                  aria-label={`View details for ${itemLabel}`}
                                  aria-haspopup="dialog"
                                  aria-expanded={selected}
                                  onClick={() => {
                                    setSelectedItemIndex(itemIndex);
                                    setSelectedItemDialogOpen(true);
                                  }}
                                >
                                  {itemLabel}
                                </Button>
                              </th>
                            </tr>
                          );
                        }

                        return (
                          <tr
                            key={`${report}-${itemIndex}`}
                            data-selected={selected || undefined}
                          >
                            {summaryTableColumns.map((field, columnIndex) => {
                              const value =
                                field === 'customerName' && !item.customerName
                                  ? item.customerId
                                  : field === 'cashierEmail' &&
                                      !item.cashierEmail
                                    ? item.cashierId
                                    : item[field];
                              const label =
                                formatOperationsReportFieldLabel(field);
                              const numeric = numericReportColumns.has(field);
                              const valueContent = (
                                <OperationsReportValue
                                  field={field}
                                  value={value}
                                  timezone={summaryDisplayTimezone}
                                />
                              );
                              return columnIndex === 0 ? (
                                <th
                                  key={field}
                                  scope="row"
                                  data-numeric={numeric ? 'true' : undefined}
                                >
                                  <Button
                                    type="button"
                                    variant="link"
                                    className={`reports-workspace__summary-row-trigger${numeric ? ' is-numeric' : ''}`}
                                    aria-label={`View details for ${label}: ${renderValue(value)}`}
                                    aria-haspopup="dialog"
                                    aria-expanded={selected}
                                    onClick={() => {
                                      setSelectedItemIndex(itemIndex);
                                      setSelectedItemDialogOpen(true);
                                    }}
                                  >
                                    {valueContent}
                                  </Button>
                                </th>
                              ) : (
                                <td
                                  key={field}
                                  data-numeric={numeric ? 'true' : undefined}
                                >
                                  {valueContent}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </Table>
                </div>
                <div className="reports-workspace__pagination">
                  <div className="reports-workspace__pagination-summary">
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
                    <p aria-live="polite">
                      Showing {(currentPage - 1) * pageSize + 1}–
                      {Math.min(currentPage * pageSize, items.length)} of{' '}
                      {items.length} loaded rows
                    </p>
                  </div>
                  <div className="reports-workspace__pagination-controls">
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
                      <ChevronLeft size={16} aria-hidden="true" />
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
                      <ChevronRight size={16} aria-hidden="true" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
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
                      aria-pressed={selected}
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
                        {showStatusBadges ? (
                          <StatusBadge
                            label={selected ? 'Selected' : 'Item'}
                            tone={selected ? 'success' : 'neutral'}
                          />
                        ) : null}
                      </div>
                      <p style={listBodyText}>{renderValue(value)}</p>
                      {showStatusBadges ? (
                        <div style={chipRow}>
                          <StatusBadge label={report} tone="info" />
                          <StatusBadge
                            label={branchId || 'Tenant-wide'}
                            tone="neutral"
                          />
                        </div>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            )
          ) : (
            <Alert tone="warning" title="No report rows">
              The selected report returned no rows for the current filters.
            </Alert>
          )}
        </section>

        {summaryItemsPresentation === 'cards' ? (
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
        ) : null}
      </div>

      {summaryItemsPresentation === 'table-dialog' ? (
        <Dialog
          open={selectedItemDialogOpen && selectedItem !== null}
          title="Selected item"
          onClose={() => setSelectedItemDialogOpen(false)}
        >
          <Button
            type="button"
            variant="ghost"
            className="reports-workspace__dialog-close"
            aria-label="Close selected item details"
            onClick={() => setSelectedItemDialogOpen(false)}
          >
            Close
          </Button>
          {selectedItem ? (
            <>
              <Alert tone="info" title="Item context">
                <OperationsSelectedItemContext
                  item={selectedItem}
                  timezone={summaryDisplayTimezone}
                />
              </Alert>
              <Table
                className="reports-workspace__selected-item-table"
                aria-label="Selected item details"
              >
                <tbody>
                  {Object.entries(selectedItem)
                    .slice(0, 10)
                    .map(([key, value]) => (
                      <tr key={key}>
                        <th scope="row">
                          {formatOperationsReportFieldLabel(key)}
                        </th>
                        <td>
                          <OperationsReportValue
                            field={key}
                            value={value}
                            timezone={summaryDisplayTimezone}
                          />
                        </td>
                      </tr>
                    ))}
                </tbody>
              </Table>
            </>
          ) : null}
        </Dialog>
      ) : null}

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

function describeOperationsReportFilters({
  report,
  summary,
  branchId,
  branchName,
  branches,
  timezone,
  from,
  to,
}: {
  report: ReportKey;
  summary: ReportSummary | null;
  branchId: string;
  branchName?: string | null;
  branches: readonly ReportBranchOption[];
  timezone: string;
  from: string;
  to: string;
}) {
  const dateRange =
    from && to
      ? `${from} to ${to}`
      : from
        ? `From ${from}`
        : to
          ? `Through ${to}`
          : 'Default report window';

  if (report === 'pilot-operations-summary') {
    return 'Tenant-wide summary · Branch and date filters do not apply.';
  }
  if (report === 'audit-report') {
    return `Tenant-wide audit · Branch selection does not apply · Date range: ${dateRange}`;
  }

  const selectedBranchId = branchId || summary?.branchId || '';
  const selectedBranch = branches.find(
    (branch) => branch.id === selectedBranchId,
  );
  const branchLabel = selectedBranchId
    ? (selectedBranch?.name ?? branchName?.trim() ?? 'Selected branch')
    : summary?.scope === 'BRANCH'
      ? 'Assigned branch'
      : 'All branches';
  const selectedTimezone = timezone || summary?.timezone;
  const timezoneLabel = selectedTimezone
    ? `Time zone: ${selectedTimezone}`
    : 'Time zone not provided';

  return `Selected filters: ${branchLabel} · ${timezoneLabel} · Date range: ${dateRange}`;
}

function humanizeOperationsReportMessage(message: string) {
  if (message === 'Loading report summary…') return 'Loading report…';

  const loadedReport = /^Report summary loaded for (.+)\.$/.exec(message)?.[1];
  if (!loadedReport) return message;

  const reportLabel = reportOptions.find(
    (option) => option.value === loadedReport,
  )?.label;
  return reportLabel ? `${reportLabel} loaded.` : 'Report loaded.';
}

function operationsReportDateRange(days: 7 | 30, timezone: string) {
  const today = businessDateInTimezone(new Date(), timezone);
  return {
    from: shiftOperationsDate(today, 1 - days),
    to: today,
  };
}

function businessDateInTimezone(date: Date, timezone: string) {
  const formatForTimezone = (timeZone: string) => {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);
    const value = (type: string) =>
      parts.find((part) => part.type === type)?.value ?? '';
    return `${value('year')}-${value('month')}-${value('day')}`;
  };

  try {
    return formatForTimezone(timezone || 'Africa/Lagos');
  } catch {
    return formatForTimezone('Africa/Lagos');
  }
}

function shiftOperationsDate(day: string, delta: number) {
  const [year, month, date] = day.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, date + delta, 12))
    .toISOString()
    .slice(0, 10);
}

function formatOperationsReportFieldLabel(field: string) {
  if (field === 'salesValueKobo') return 'Sales value';
  if (field === 'outstandingKobo') return 'Outstanding value';
  return formatSupervisorReportFieldLabel(field).replace(/\\s+Kobo$/i, '');
}

function OperationsReportValue({
  field,
  value,
  timezone,
}: Readonly<{ field: string; value: unknown; timezone: string }>) {
  if (
    typeof value === 'string' &&
    /(?:Date$|^from$|^to$|^asOf$)/i.test(field)
  ) {
    return <>{formatReportBusinessDate(value, timezone)}</>;
  }
  if (
    typeof value === 'string' &&
    /(?:At|Timestamp|GeneratedAt|OccurredAt)$/i.test(field)
  ) {
    return <>{formatReportTimestamp(value, timezone)}</>;
  }
  return <SupervisorReportValue field={field} value={value} />;
}

function OperationsSelectedItemContext({
  item,
  timezone,
}: Readonly<{ item: ReportItem; timezone: string }>) {
  const firstEntry = Object.entries(item)[0];
  if (!firstEntry) return <>No item fields were returned.</>;

  const [field, value] = firstEntry;
  return (
    <>
      <strong>{formatOperationsReportFieldLabel(field)}:</strong>{' '}
      <OperationsReportValue field={field} value={value} timezone={timezone} />
    </>
  );
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
