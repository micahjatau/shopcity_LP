/**
 * Supervisor operational metrics are derived only from branch-scoped
 * materialized reports. Flow metrics sum across report dates; stock metrics
 * use the last available report date and must never be summed.
 */
export type ReportRow = Record<string, unknown>;
export type ReportFocus = 'overview' | 'cashiers' | 'redemptions' | 'sms';
export type TrendMetric =
  | 'loyaltyPurchaseValueKobo'
  | 'creditIssuedKobo'
  | 'creditRedeemedKobo';

export type ReportPeriod = { from: string; to: string; label: string };

function safeInteger(value: unknown): number | null {
  return typeof value === 'number' &&
    Number.isSafeInteger(value) &&
    value >= 0
    ? value
    : null;
}

export function sumReportField(
  rows: ReportRow[] | null,
  field: string,
): number | null {
  if (!rows?.length) return null;
  let sum = 0;
  for (const row of rows) {
    const value = safeInteger(row[field]);
    if (value === null) return null;
    sum += value;
    if (!Number.isSafeInteger(sum)) return null;
  }
  return sum;
}

export function lastReportRow(rows: ReportRow[] | null): ReportRow | null {
  if (!rows?.length) return null;
  return [...rows].sort((a, b) =>
    String(b.reportDate ?? '').localeCompare(String(a.reportDate ?? '')),
  )[0];
}

export function lastReportNumber(
  rows: ReportRow[] | null,
  field: string,
): number | null {
  const last = lastReportRow(rows);
  return last ? safeInteger(last[field]) : null;
}

export function formatReportMoney(kobo: number | null): string {
  if (kobo === null) return '—';
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(kobo / 100);
}

export function formatReportCount(count: number | null): string {
  return count === null ? '—' : new Intl.NumberFormat('en-NG').format(count);
}

export function businessDate(today: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Lagos',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(today);
  const extract = (name: string) =>
    parts.find((part) => part.type === name)?.value ?? '';
  return `${extract('year')}-${extract('month')}-${extract('day')}`;
}

export function shiftReportDate(day: string, delta: number): string {
  const [year, month, date] = day.split('-').map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, date + delta, 12));
  return shifted.toISOString().slice(0, 10);
}

export function recentReportPeriod(
  days: 7 | 30,
  today: Date = new Date(),
): ReportPeriod {
  const to = businessDate(today);
  return {
    from: shiftReportDate(to, 1 - days),
    to,
    label: days === 7 ? 'Last 7 days' : 'Last 30 days',
  };
}

export type Insight = {
  title: string;
  value: string;
  detail: string;
};

export function reportInsights(
  focus: ReportFocus,
  sources: {
    financial: ReportRow[] | null;
    cashiers: ReportRow[] | null;
    redemptions: ReportRow[] | null;
    sms: ReportRow[] | null;
  },
): Insight[] {
  const { financial, cashiers, redemptions, sms } = sources;
  const number = (rows: ReportRow[] | null, field: string) =>
    formatReportCount(sumReportField(rows, field));
  if (focus === 'cashiers') {
    const count = cashiers?.length
      ? new Set(
          cashiers
            .map((row) => row.cashierId)
            .filter((id): id is string => typeof id === 'string'),
        ).size
      : null;
    return [
      {
        title: 'Cashiers represented',
        value: formatReportCount(count),
        detail: 'Distinct cashier IDs in the selected period’s report rows.',
      },
      {
        title: 'Duplicate attempts',
        value: number(cashiers, 'duplicateAttempts'),
        detail: 'Sum of reported duplicate receipt attempts.',
      },
      {
        title: 'Fraud flags',
        value: number(cashiers, 'fraudFlagCount'),
        detail: 'Sum of reported cashier-related flags, not necessarily open cases.',
      },
    ];
  }
  if (focus === 'redemptions') {
    return [
      {
        title: 'Redemptions recorded',
        value: number(redemptions, 'redemptionCount'),
        detail: 'Sum of redemption counts in the selected reporting period.',
      },
      {
        title: 'Confirmed redemption value',
        value: formatReportMoney(sumReportField(redemptions, 'confirmedKobo')),
        detail: 'Confirmed value from the redemption daily summaries.',
      },
      {
        title: 'Approval requests reported',
        value: number(redemptions, 'pendingApprovalCount'),
        detail: 'Sum of daily pending-approval counts; not a live open-case total.',
      },
    ];
  }
  if (focus === 'sms') {
    return [
      {
        title: 'Messages queued',
        value: number(sms, 'queuedCount'),
        detail: 'Sum of queued SMS statuses in the reporting period.',
      },
      {
        title: 'Provider submissions',
        value: number(sms, 'sentCount'),
        detail: 'A sent status does not establish handset delivery.',
      },
      {
        title: 'Failed messages',
        value: number(sms, 'failedCount'),
        detail: 'Sum of failed delivery statuses; see SMS operations for details.',
      },
    ];
  }
  const issued = sumReportField(financial, 'creditIssuedKobo');
  const redeemed = sumReportField(financial, 'creditRedeemedKobo');
  return [
    {
      title: 'Transactions recorded',
      value: number(financial, 'transactionCount'),
      detail: 'Sum of transactions in available daily financial summaries.',
    },
    {
      title: 'Active customers',
      value: formatReportCount(lastReportNumber(financial, 'activeCustomers')),
      detail: 'Latest available snapshot within the selected period, not a sum.',
    },
    {
      title: 'Issued less redeemed',
      value:
        issued === null || redeemed === null
          ? '—'
          : formatReportMoney(issued - redeemed),
      detail: 'Period issuance minus redemption; excludes expiry and reversals and is not the wallet liability.',
    },
  ];
}
