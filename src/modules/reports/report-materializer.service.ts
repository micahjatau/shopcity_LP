import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

const DEFAULT_DORMANT_CUSTOMER_DAYS = 90;
const DEFAULT_REPORT_TIME_ZONE = 'Africa/Lagos';

type ReportScope = 'TENANT' | 'BRANCH';

interface MaterializeOptions {
  asOf?: Date;
  materializedAt?: Date;
  dormantCustomerDays?: number;
}

interface BranchRecord {
  id: string;
  timezone: string;
}

interface CustomerRecord {
  id: string;
  branchId: string;
  createdAt: Date;
}

interface ReceiptRecord {
  id: string;
  branchId: string;
  customerId: string;
  capturedBy: string;
  capturedAt: Date;
  occurredAt: Date;
  purchaseAmountKobo: bigint;
  normalizedPosReceiptNumber: string;
  receiptWeekStart: Date;
}

interface LedgerEntryRecord {
  id: string;
  customerId: string;
  receiptId: string | null;
  type: string;
  direction: string;
  amountKobo: bigint;
  createdBy: string;
  createdAt: Date;
  effectiveAt: Date;
}

interface CreditLotRecord {
  id: string;
  customerId: string;
  remainingAmountKobo: bigint;
  earnedAt: Date;
  expiresAt: Date;
  earnLedgerEntryId: string;
}

interface RedemptionRecord {
  id: string;
  branchId: string;
  customerId: string;
  requestedAmountKobo: bigint;
  confirmedAmountKobo: bigint | null;
  status: string;
  requestedAt: Date;
  confirmedAt: Date | null;
  reversedAt: Date | null;
}

interface SmsMessageRecord {
  id: string;
  receiptId: string | null;
  status: string;
  queuedAt: Date;
  createdAt: Date;
}

interface ApprovalRecord {
  id: string;
  requestedBy: string;
  requestedAt: Date;
  status: string;
  receiptId: string | null;
  redemptionId: string | null;
}

interface SourceData {
  branches: BranchRecord[];
  customers: CustomerRecord[];
  receipts: ReceiptRecord[];
  ledgerEntries: LedgerEntryRecord[];
  creditLots: CreditLotRecord[];
  redemptions: RedemptionRecord[];
  smsMessages: SmsMessageRecord[];
  approvals: ApprovalRecord[];
}

type ReportMaterializationStateRow =
  Prisma.ReportMaterializationStateCreateManyInput;
type ReportDailyFinancialSummaryRow =
  Prisma.ReportDailyFinancialSummaryCreateManyInput;
type ReportCashierDailySummaryRow =
  Prisma.ReportCashierDailySummaryCreateManyInput;
type ReportCustomerSnapshotRow = Prisma.ReportCustomerSnapshotCreateManyInput;
type ReportLiabilityBucketRow = Prisma.ReportLiabilityBucketCreateManyInput;
type ReportRedemptionDailySummaryRow =
  Prisma.ReportRedemptionDailySummaryCreateManyInput;
type ReportSmsDailySummaryRow = Prisma.ReportSmsDailySummaryCreateManyInput;

interface PlanRows {
  materializationStates: ReportMaterializationStateRow[];
  dailyFinancialSummaries: ReportDailyFinancialSummaryRow[];
  cashierDailySummaries: ReportCashierDailySummaryRow[];
  customerSnapshots: ReportCustomerSnapshotRow[];
  liabilityBuckets: ReportLiabilityBucketRow[];
  redemptionDailySummaries: ReportRedemptionDailySummaryRow[];
  smsDailySummaries: ReportSmsDailySummaryRow[];
}

@Injectable()
export class ReportMaterializerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async materializeTenant(
    tenantId: string,
    options: MaterializeOptions = {},
  ): Promise<void> {
    await this.materialize(tenantId, null, options);
  }

  async materializeBranch(
    tenantId: string,
    branchId: string,
    options: MaterializeOptions = {},
  ): Promise<void> {
    await this.materialize(tenantId, branchId, options);
  }

  async rebuildTenant(
    tenantId: string,
    options: MaterializeOptions = {},
  ): Promise<void> {
    await this.materialize(tenantId, null, options);
  }

  private async materialize(
    tenantId: string,
    branchId: string | null,
    options: MaterializeOptions,
  ): Promise<void> {
    const materializedAt = options.materializedAt ?? new Date();
    const asOf = options.asOf ?? materializedAt;
    const dormantCustomerDays =
      options.dormantCustomerDays ?? DEFAULT_DORMANT_CUSTOMER_DAYS;

    await this.upsertState(tenantId, branchId, {
      asOf,
      materializedAt,
      status: 'RUNNING',
      lastError: null,
    });

    try {
      const source = await this.loadSourceData(tenantId);
      const plan = branchId
        ? buildBranchPlan(
            source,
            tenantId,
            branchId,
            asOf,
            materializedAt,
            dormantCustomerDays,
            this.reportTimeZone(),
          )
        : buildTenantPlan(
            source,
            tenantId,
            asOf,
            materializedAt,
            dormantCustomerDays,
            this.reportTimeZone(),
          );

      await this.prisma.$transaction(async (tx) => {
        if (branchId) {
          await deleteBranchRows(tx, tenantId, branchId);
        } else {
          await deleteTenantRows(tx, tenantId);
        }

        await insertRows(tx, plan);
        await upsertStates(tx, tenantId, plan.materializationStates);
      });
    } catch (error) {
      await this.upsertState(tenantId, branchId, {
        asOf,
        materializedAt: null,
        status: 'FAILED',
        lastError: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }

    await this.upsertState(tenantId, branchId, {
      asOf,
      materializedAt,
      status: 'COMPLETED',
      lastError: null,
    });
  }

  private async loadSourceData(tenantId: string): Promise<SourceData> {
    const [
      branches,
      customers,
      receipts,
      ledgerEntries,
      creditLots,
      redemptions,
      smsMessages,
      approvals,
    ] = await Promise.all([
      this.prisma.branch.findMany({
        where: { tenantId },
        select: {
          id: true,
          timezone: true,
        },
      }),
      this.prisma.customer.findMany({
        where: { tenantId },
        select: {
          id: true,
          branchId: true,
          createdAt: true,
        },
      }),
      this.prisma.receipt.findMany({
        where: { tenantId },
        select: {
          id: true,
          branchId: true,
          customerId: true,
          capturedBy: true,
          capturedAt: true,
          occurredAt: true,
          purchaseAmountKobo: true,
          normalizedPosReceiptNumber: true,
          receiptWeekStart: true,
        },
      }),
      this.prisma.loyaltyLedgerEntry.findMany({
        where: { tenantId },
        select: {
          id: true,
          customerId: true,
          receiptId: true,
          type: true,
          direction: true,
          amountKobo: true,
          createdBy: true,
          createdAt: true,
          effectiveAt: true,
        },
      }),
      this.prisma.creditLot.findMany({
        where: { tenantId },
        select: {
          id: true,
          customerId: true,
          remainingAmountKobo: true,
          earnedAt: true,
          expiresAt: true,
          earnLedgerEntryId: true,
        },
      }),
      this.prisma.redemption.findMany({
        where: { tenantId },
        select: {
          id: true,
          branchId: true,
          customerId: true,
          requestedAmountKobo: true,
          confirmedAmountKobo: true,
          status: true,
          requestedAt: true,
          confirmedAt: true,
          reversedAt: true,
        },
      }),
      this.prisma.smsMessage.findMany({
        where: { tenantId },
        select: {
          id: true,
          receiptId: true,
          status: true,
          queuedAt: true,
          createdAt: true,
        },
      }),
      this.prisma.approval.findMany({
        where: { tenantId },
        select: {
          id: true,
          requestedBy: true,
          requestedAt: true,
          status: true,
          receiptId: true,
          redemptionId: true,
        },
      }),
    ]);

    return {
      branches,
      customers,
      receipts,
      ledgerEntries,
      creditLots,
      redemptions,
      smsMessages,
      approvals,
    };
  }

  private async upsertState(
    tenantId: string,
    branchId: string | null,
    input: {
      asOf: Date;
      materializedAt: Date | null;
      status: string;
      lastError: string | null;
    },
  ): Promise<void> {
    const scope = branchId ? 'BRANCH' : 'TENANT';
    const scopeKey = branchId ?? tenantId;

    await this.prisma.reportMaterializationState.upsert({
      where: {
        tenantId_scope_scopeKey: {
          tenantId,
          scope,
          scopeKey,
        },
      },
      create: {
        tenantId,
        scope,
        scopeKey,
        branchId,
        asOf: input.asOf,
        status: input.status,
        lastError: input.lastError,
        materializedAt: input.materializedAt,
      },
      update: {
        branchId,
        asOf: input.asOf,
        status: input.status,
        lastError: input.lastError,
        materializedAt: input.materializedAt,
      },
    });
  }

  private reportTimeZone(): string {
    return (
      this.configService.get<string>('SHOPCITY_TIMEZONE') ??
      DEFAULT_REPORT_TIME_ZONE
    );
  }
}

function buildTenantPlan(
  source: SourceData,
  tenantId: string,
  asOf: Date,
  materializedAt: Date,
  dormantCustomerDays: number,
  defaultTimeZone: string,
): PlanRows {
  const plan: PlanRows = emptyPlan();
  const scope: ScopeDefinition = {
    scope: 'TENANT',
    scopeKey: tenantId,
    branchId: null,
    timezone: defaultTimeZone,
  };

  plan.materializationStates.push(
    buildStateRow(tenantId, scope, asOf, materializedAt),
  );
  plan.dailyFinancialSummaries.push(
    ...buildDailyFinancialSummaries(
      source,
      tenantId,
      scope,
      asOf,
      materializedAt,
    ),
  );
  plan.cashierDailySummaries.push(
    ...buildCashierSummaries(source, tenantId, scope, materializedAt),
  );
  plan.customerSnapshots.push(
    ...buildCustomerSnapshots(
      source,
      tenantId,
      scope,
      asOf,
      materializedAt,
      dormantCustomerDays,
    ),
  );
  plan.liabilityBuckets.push(
    ...buildLiabilityBuckets(source, tenantId, scope, asOf, materializedAt),
  );
  plan.redemptionDailySummaries.push(
    ...buildRedemptionSummaries(source, tenantId, scope, materializedAt),
  );
  plan.smsDailySummaries.push(
    ...buildSmsSummaries(source, tenantId, scope, materializedAt),
  );

  for (const branch of source.branches) {
    const branchScope: ScopeDefinition = {
      scope: 'BRANCH',
      scopeKey: branch.id,
      branchId: branch.id,
      timezone: branch.timezone,
    };

    plan.materializationStates.push(
      buildStateRow(tenantId, branchScope, asOf, materializedAt),
    );
    plan.dailyFinancialSummaries.push(
      ...buildDailyFinancialSummaries(
        source,
        tenantId,
        branchScope,
        asOf,
        materializedAt,
      ),
    );
    plan.cashierDailySummaries.push(
      ...buildCashierSummaries(source, tenantId, branchScope, materializedAt),
    );
    plan.customerSnapshots.push(
      ...buildCustomerSnapshots(
        source,
        tenantId,
        branchScope,
        asOf,
        materializedAt,
        dormantCustomerDays,
      ),
    );
    plan.liabilityBuckets.push(
      ...buildLiabilityBuckets(
        source,
        tenantId,
        branchScope,
        asOf,
        materializedAt,
      ),
    );
    plan.redemptionDailySummaries.push(
      ...buildRedemptionSummaries(
        source,
        tenantId,
        branchScope,
        materializedAt,
      ),
    );
    plan.smsDailySummaries.push(
      ...buildSmsSummaries(source, tenantId, branchScope, materializedAt),
    );
  }

  return plan;
}

function buildBranchPlan(
  source: SourceData,
  tenantId: string,
  branchId: string,
  asOf: Date,
  materializedAt: Date,
  dormantCustomerDays: number,
  defaultTimeZone: string,
): PlanRows {
  const branch = source.branches.find((item) => item.id === branchId);
  const scope: ScopeDefinition = {
    scope: 'BRANCH',
    scopeKey: branchId,
    branchId,
    timezone: branch?.timezone ?? defaultTimeZone,
  };
  const plan: PlanRows = emptyPlan();
  plan.materializationStates.push(
    buildStateRow(tenantId, scope, asOf, materializedAt),
  );
  plan.dailyFinancialSummaries.push(
    ...buildDailyFinancialSummaries(
      source,
      tenantId,
      scope,
      asOf,
      materializedAt,
    ),
  );
  plan.cashierDailySummaries.push(
    ...buildCashierSummaries(source, tenantId, scope, materializedAt),
  );
  plan.customerSnapshots.push(
    ...buildCustomerSnapshots(
      source,
      tenantId,
      scope,
      asOf,
      materializedAt,
      dormantCustomerDays,
    ),
  );
  plan.liabilityBuckets.push(
    ...buildLiabilityBuckets(source, tenantId, scope, asOf, materializedAt),
  );
  plan.redemptionDailySummaries.push(
    ...buildRedemptionSummaries(source, tenantId, scope, materializedAt),
  );
  plan.smsDailySummaries.push(
    ...buildSmsSummaries(source, tenantId, scope, materializedAt),
  );

  return plan;
}

function buildStateRow(
  tenantId: string,
  scope: ScopeDefinition,
  asOf: Date,
  materializedAt: Date,
) {
  return {
    tenantId,
    scope: scope.scope,
    scopeKey: scope.scopeKey,
    branchId: scope.branchId,
    asOf,
    status: 'COMPLETED',
    lastError: null,
    materializedAt,
  };
}

function buildDailyFinancialSummaries(
  source: SourceData,
  tenantId: string,
  scope: ScopeDefinition,
  asOf: Date,
  materializedAt: Date,
) {
  const receipts = filterReceiptsForScope(source.receipts, scope);
  const redemptions = filterRedemptionsForScope(source.redemptions, scope);
  const customers = filterCustomersForScope(source.customers, scope);
  const lots = filterLotsForScope(source.creditLots, source, scope);
  const ledgerEntries = filterLedgerEntriesForScope(
    source.ledgerEntries,
    source,
    scope,
  );

  const reportDates = new Set<string>();
  const activeCustomerByDate = new Map<string, Set<string>>();
  const purchaseByDate = new Map<string, bigint>();
  const creditIssuedByDate = new Map<string, bigint>();
  const creditRedeemedByDate = new Map<string, bigint>();
  const transactionCountByDate = new Map<string, number>();

  for (const receipt of receipts) {
    const reportDate = toReportDate(receipt.occurredAt, scope.timezone);
    reportDates.add(reportDate);
    addBigInt(purchaseByDate, reportDate, receipt.purchaseAmountKobo);
    addNumber(transactionCountByDate, reportDate, 1);
    addToSet(activeCustomerByDate, reportDate, receipt.customerId);
  }

  for (const entry of ledgerEntries) {
    if (entry.type !== 'EARN' || entry.direction !== 'CREDIT') {
      continue;
    }

    const reportDate = toReportDate(entry.effectiveAt, scope.timezone);
    reportDates.add(reportDate);
    addBigInt(creditIssuedByDate, reportDate, entry.amountKobo);
    addToSet(activeCustomerByDate, reportDate, entry.customerId);
  }

  for (const redemption of redemptions) {
    const reportDate = toReportDate(redemption.requestedAt, scope.timezone);
    reportDates.add(reportDate);
    if (redemption.status === 'CONFIRMED') {
      addBigInt(
        creditRedeemedByDate,
        reportDate,
        redemption.confirmedAmountKobo ?? redemption.requestedAmountKobo,
      );
      addNumber(transactionCountByDate, reportDate, 1);
      addToSet(activeCustomerByDate, reportDate, redemption.customerId);
    }
  }

  const registeredCustomers = customers.length;
  const outstandingLiabilityKobo = sumLots(
    lots.filter((lot) => lot.expiresAt > asOf),
  );
  const creditExpiredKobo = sumLots(
    lots.filter((lot) => lot.expiresAt <= asOf),
  );

  return Array.from(reportDates)
    .sort()
    .map((reportDate) => ({
      tenantId,
      scope: scope.scope,
      scopeKey: scope.scopeKey,
      branchId: scope.branchId,
      reportDate: toDate(reportDate),
      registeredCustomers,
      activeCustomers: activeCustomerByDate.get(reportDate)?.size ?? 0,
      transactionCount: transactionCountByDate.get(reportDate) ?? 0,
      loyaltyPurchaseValueKobo: purchaseByDate.get(reportDate) ?? 0n,
      creditIssuedKobo: creditIssuedByDate.get(reportDate) ?? 0n,
      creditRedeemedKobo: creditRedeemedByDate.get(reportDate) ?? 0n,
      creditExpiredKobo,
      outstandingLiabilityKobo,
      materializedAt,
    }));
}

function buildCashierSummaries(
  source: SourceData,
  tenantId: string,
  scope: ScopeDefinition,
  materializedAt: Date,
) {
  const receipts = filterReceiptsForScope(source.receipts, scope);
  const ledgerEntries = filterLedgerEntriesForScope(
    source.ledgerEntries,
    source,
    scope,
  );
  const approvals = filterApprovalsForScope(source.approvals, source, scope);
  const duplicateAttempts = new Map<string, number>();
  const transactionCount = new Map<string, number>();
  const purchaseValue = new Map<string, bigint>();
  const creditIssued = new Map<string, bigint>();
  const reversalCount = new Map<string, number>();
  const approvalRequests = new Map<string, number>();

  const duplicateGroups = new Map<string, number>();
  for (const receipt of receipts) {
    const key = [
      receipt.capturedBy,
      receipt.branchId,
      toReportDate(receipt.occurredAt, scope.timezone),
      receipt.normalizedPosReceiptNumber,
    ].join('|');
    duplicateGroups.set(key, (duplicateGroups.get(key) ?? 0) + 1);
  }

  for (const receipt of receipts) {
    const reportDate = toReportDate(receipt.occurredAt, scope.timezone);
    const key = cashierKey(reportDate, receipt.capturedBy);
    addNumber(transactionCount, key, 1);
    addBigInt(purchaseValue, key, receipt.purchaseAmountKobo);
    const duplicateKey = [reportDate, receipt.capturedBy].join('|');
    if (
      (duplicateGroups.get(
        [
          receipt.capturedBy,
          receipt.branchId,
          reportDate,
          receipt.normalizedPosReceiptNumber,
        ].join('|'),
      ) ?? 0) > 1
    ) {
      addNumber(duplicateAttempts, duplicateKey, 1);
    }
  }

  for (const entry of ledgerEntries) {
    const reportDate = toReportDate(entry.effectiveAt, scope.timezone);
    const key = cashierKey(reportDate, entry.createdBy);
    if (entry.type === 'EARN' && entry.direction === 'CREDIT') {
      addBigInt(creditIssued, key, entry.amountKobo);
    }
    if (entry.type === 'REVERSAL') {
      addNumber(reversalCount, key, 1);
    }
  }

  for (const approval of approvals) {
    const reportDate = toReportDate(approval.requestedAt, scope.timezone);
    const key = cashierKey(reportDate, approval.requestedBy);
    addNumber(approvalRequests, key, 1);
  }

  const keys = new Set([
    ...transactionCount.keys(),
    ...purchaseValue.keys(),
    ...creditIssued.keys(),
    ...duplicateAttempts.keys(),
    ...reversalCount.keys(),
    ...approvalRequests.keys(),
  ]);

  return Array.from(keys)
    .sort()
    .map((key) => {
      const { reportDate, cashierId } = parseCashierKey(key);
      const branchId = resolveBranchIdForCashier(cashierId, receipts);
      return {
        tenantId,
        scope: scope.scope,
        scopeKey: scope.scopeKey,
        branchId,
        cashierId,
        reportDate: toDate(reportDate),
        transactionCount: transactionCount.get(key) ?? 0,
        purchaseValueKobo: purchaseValue.get(key) ?? 0n,
        creditIssuedKobo: creditIssued.get(key) ?? 0n,
        duplicateAttempts: duplicateAttempts.get(key) ?? 0,
        reversalCount: reversalCount.get(key) ?? 0,
        approvalRequests: approvalRequests.get(key) ?? 0,
        materializedAt,
      };
    });
}

function buildCustomerSnapshots(
  source: SourceData,
  tenantId: string,
  scope: ScopeDefinition,
  asOf: Date,
  materializedAt: Date,
  dormantCustomerDays: number,
) {
  const customers = filterCustomersForScope(source.customers, scope);
  const receipts = filterReceiptsForScope(source.receipts, scope);
  const redemptions = filterRedemptionsForScope(source.redemptions, scope);
  const lots = filterLotsForScope(source.creditLots, source, scope);

  return customers
    .map((customer) => {
      const customerReceipts = receipts.filter(
        (receipt) => receipt.customerId === customer.id,
      );
      const customerRedemptions = redemptions.filter(
        (redemption) => redemption.customerId === customer.id,
      );
      const customerLots = lots.filter((lot) => lot.customerId === customer.id);

      const purchaseValueKobo = customerReceipts.reduce(
        (sum, receipt) => sum + receipt.purchaseAmountKobo,
        0n,
      );
      const currentBalanceKobo = customerLots.reduce(
        (sum, lot) => sum + lot.remainingAmountKobo,
        0n,
      );
      const visitCount = customerReceipts.length + customerRedemptions.length;
      const lastActivityAt = latestDate([
        ...customerReceipts.map((receipt) => receipt.occurredAt),
        ...customerRedemptions.map((redemption) => redemption.requestedAt),
      ]);
      const dormant =
        lastActivityAt !== null &&
        (asOf.getTime() - lastActivityAt.getTime()) / 86400000 >
          dormantCustomerDays;

      return {
        tenantId,
        scope: scope.scope,
        scopeKey: scope.scopeKey,
        branchId: customer.branchId,
        customerId: customer.id,
        reportDate: asOf,
        purchaseValueKobo,
        currentBalanceKobo,
        visitCount,
        lastActivityAt,
        dormant,
        materializedAt,
      };
    })
    .sort((left, right) => left.customerId.localeCompare(right.customerId));
}

function buildLiabilityBuckets(
  source: SourceData,
  tenantId: string,
  scope: ScopeDefinition,
  asOf: Date,
  materializedAt: Date,
) {
  const lots = filterLotsForScope(source.creditLots, source, scope).filter(
    (lot) => lot.remainingAmountKobo > 0n,
  );

  const buckets = new Map<
    string,
    {
      branchId: string | null;
      expiryMonth: string;
      ageBucket: string;
      customerIds: Set<string>;
      lotCount: number;
      outstandingKobo: bigint;
    }
  >();

  for (const lot of lots) {
    const ageBucket = resolveAgeBucket(lot.expiresAt, asOf);
    const expiryMonth = toReportMonth(lot.expiresAt, scope.timezone);
    const key = [expiryMonth, ageBucket].join('|');
    const entry = buckets.get(key) ?? {
      branchId: scope.branchId,
      expiryMonth,
      ageBucket,
      customerIds: new Set<string>(),
      lotCount: 0,
      outstandingKobo: 0n,
    };
    entry.customerIds.add(lot.customerId);
    entry.lotCount += 1;
    entry.outstandingKobo += lot.remainingAmountKobo;
    buckets.set(key, entry);
  }

  return Array.from(buckets.values())
    .sort((left, right) =>
      `${left.expiryMonth}:${left.ageBucket}`.localeCompare(
        `${right.expiryMonth}:${right.ageBucket}`,
      ),
    )
    .map((bucket) => ({
      tenantId,
      scope: scope.scope,
      scopeKey: scope.scopeKey,
      branchId: bucket.branchId,
      reportDate: asOf,
      expiryMonth: bucket.expiryMonth,
      ageBucket: bucket.ageBucket,
      customerCount: bucket.customerIds.size,
      lotCount: bucket.lotCount,
      outstandingKobo: bucket.outstandingKobo,
      materializedAt,
    }));
}

function buildRedemptionSummaries(
  source: SourceData,
  tenantId: string,
  scope: ScopeDefinition,
  materializedAt: Date,
) {
  const redemptions = filterRedemptionsForScope(source.redemptions, scope);
  const grouped = new Map<
    string,
    {
      branchId: string | null;
      redemptionCount: number;
      requestedKobo: bigint;
      confirmedKobo: bigint;
      reversedKobo: bigint;
      pendingApprovalCount: number;
    }
  >();

  for (const redemption of redemptions) {
    const reportDate = toReportDate(redemption.requestedAt, scope.timezone);
    const key = reportDate;
    const entry = grouped.get(key) ?? {
      branchId: scope.branchId,
      redemptionCount: 0,
      requestedKobo: 0n,
      confirmedKobo: 0n,
      reversedKobo: 0n,
      pendingApprovalCount: 0,
    };
    entry.redemptionCount += 1;
    entry.requestedKobo += redemption.requestedAmountKobo;
    if (redemption.status === 'CONFIRMED') {
      entry.confirmedKobo +=
        redemption.confirmedAmountKobo ?? redemption.requestedAmountKobo;
    }
    if (redemption.status === 'REVERSED') {
      entry.reversedKobo +=
        redemption.confirmedAmountKobo ?? redemption.requestedAmountKobo;
    }
    if (redemption.status === 'PENDING_APPROVAL') {
      entry.pendingApprovalCount += 1;
    }
    grouped.set(key, entry);
  }

  return Array.from(grouped.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([reportDate, entry]) => ({
      tenantId,
      scope: scope.scope,
      scopeKey: scope.scopeKey,
      branchId: entry.branchId,
      reportDate: toDate(reportDate),
      redemptionCount: entry.redemptionCount,
      requestedKobo: entry.requestedKobo,
      confirmedKobo: entry.confirmedKobo,
      reversedKobo: entry.reversedKobo,
      pendingApprovalCount: entry.pendingApprovalCount,
      materializedAt,
    }));
}

function buildSmsSummaries(
  source: SourceData,
  tenantId: string,
  scope: ScopeDefinition,
  materializedAt: Date,
) {
  const smsMessages = filterSmsForScope(source.smsMessages, source, scope);
  const grouped = new Map<
    string,
    {
      branchId: string | null;
      queuedCount: number;
      sentCount: number;
      deliveredCount: number;
      failedCount: number;
      suppressedCount: number;
    }
  >();

  for (const sms of smsMessages) {
    const reportDate = toReportDate(sms.queuedAt, scope.timezone);
    const key = reportDate;
    const entry = grouped.get(key) ?? {
      branchId: scope.branchId,
      queuedCount: 0,
      sentCount: 0,
      deliveredCount: 0,
      failedCount: 0,
      suppressedCount: 0,
    };
    entry.queuedCount += 1;
    if (sms.status === 'SENT') {
      entry.sentCount += 1;
    }
    if (sms.status === 'DELIVERED') {
      entry.deliveredCount += 1;
    }
    if (sms.status === 'FAILED') {
      entry.failedCount += 1;
    }
    if (sms.status === 'SUPPRESSED') {
      entry.suppressedCount += 1;
    }
    grouped.set(key, entry);
  }

  return Array.from(grouped.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([reportDate, entry]) => ({
      tenantId,
      scope: scope.scope,
      scopeKey: scope.scopeKey,
      branchId: entry.branchId,
      reportDate: toDate(reportDate),
      queuedCount: entry.queuedCount,
      sentCount: entry.sentCount,
      deliveredCount: entry.deliveredCount,
      failedCount: entry.failedCount,
      suppressedCount: entry.suppressedCount,
      materializedAt,
    }));
}

async function deleteTenantRows(
  tx: Prisma.TransactionClient,
  tenantId: string,
): Promise<void> {
  await Promise.all([
    tx.reportDailyFinancialSummary.deleteMany({ where: { tenantId } }),
    tx.reportCashierDailySummary.deleteMany({ where: { tenantId } }),
    tx.reportCustomerSnapshot.deleteMany({ where: { tenantId } }),
    tx.reportLiabilityBucket.deleteMany({ where: { tenantId } }),
    tx.reportRedemptionDailySummary.deleteMany({ where: { tenantId } }),
    tx.reportSmsDailySummary.deleteMany({ where: { tenantId } }),
    tx.reportMaterializationState.deleteMany({ where: { tenantId } }),
  ]);
}

async function deleteBranchRows(
  tx: Prisma.TransactionClient,
  tenantId: string,
  branchId: string,
): Promise<void> {
  await Promise.all([
    tx.reportDailyFinancialSummary.deleteMany({
      where: { tenantId, scope: 'BRANCH', scopeKey: branchId },
    }),
    tx.reportCashierDailySummary.deleteMany({
      where: { tenantId, scope: 'BRANCH', scopeKey: branchId },
    }),
    tx.reportCustomerSnapshot.deleteMany({
      where: { tenantId, scope: 'BRANCH', scopeKey: branchId },
    }),
    tx.reportLiabilityBucket.deleteMany({
      where: { tenantId, scope: 'BRANCH', scopeKey: branchId },
    }),
    tx.reportRedemptionDailySummary.deleteMany({
      where: { tenantId, scope: 'BRANCH', scopeKey: branchId },
    }),
    tx.reportSmsDailySummary.deleteMany({
      where: { tenantId, scope: 'BRANCH', scopeKey: branchId },
    }),
    tx.reportMaterializationState.deleteMany({
      where: { tenantId, scope: 'BRANCH', scopeKey: branchId },
    }),
  ]);
}

async function insertRows(
  tx: Prisma.TransactionClient,
  plan: PlanRows,
): Promise<void> {
  await Promise.all([
    createManyIfAny(
      tx.reportDailyFinancialSummary,
      plan.dailyFinancialSummaries,
    ),
    createManyIfAny(tx.reportCashierDailySummary, plan.cashierDailySummaries),
    createManyIfAny(tx.reportCustomerSnapshot, plan.customerSnapshots),
    createManyIfAny(tx.reportLiabilityBucket, plan.liabilityBuckets),
    createManyIfAny(
      tx.reportRedemptionDailySummary,
      plan.redemptionDailySummaries,
    ),
    createManyIfAny(tx.reportSmsDailySummary, plan.smsDailySummaries),
  ]);
}

async function upsertStates(
  tx: Prisma.TransactionClient,
  tenantId: string,
  states: PlanRows['materializationStates'],
): Promise<void> {
  for (const state of states) {
    await tx.reportMaterializationState.upsert({
      where: {
        tenantId_scope_scopeKey: {
          tenantId,
          scope: String(state.scope),
          scopeKey: String(state.scopeKey),
        },
      },
      create: state,
      update: {
        branchId: state.branchId,
        asOf: state.asOf,
        status: state.status,
        lastError: state.lastError,
        materializedAt: state.materializedAt,
      },
    });
  }
}

function createManyIfAny<T extends Record<string, unknown>>(
  delegate: {
    createMany: (args: { data: T[] }) => Promise<unknown>;
  },
  data: T[],
): Promise<unknown> {
  if (data.length === 0) {
    return Promise.resolve();
  }

  return delegate.createMany({ data });
}

function emptyPlan(): PlanRows {
  return {
    materializationStates: [],
    dailyFinancialSummaries: [],
    cashierDailySummaries: [],
    customerSnapshots: [],
    liabilityBuckets: [],
    redemptionDailySummaries: [],
    smsDailySummaries: [],
  };
}

interface ScopeDefinition {
  scope: ReportScope;
  scopeKey: string;
  branchId: string | null;
  timezone: string;
}

function filterReceiptsForScope(
  receipts: ReceiptRecord[],
  scope: ScopeDefinition,
): ReceiptRecord[] {
  return scope.scope === 'TENANT'
    ? receipts
    : receipts.filter((receipt) => receipt.branchId === scope.branchId);
}

function filterCustomersForScope(
  customers: CustomerRecord[],
  scope: ScopeDefinition,
): CustomerRecord[] {
  return scope.scope === 'TENANT'
    ? customers
    : customers.filter((customer) => customer.branchId === scope.branchId);
}

function filterRedemptionsForScope(
  redemptions: RedemptionRecord[],
  scope: ScopeDefinition,
): RedemptionRecord[] {
  return scope.scope === 'TENANT'
    ? redemptions
    : redemptions.filter(
        (redemption) => redemption.branchId === scope.branchId,
      );
}

function filterLotsForScope(
  lots: CreditLotRecord[],
  source: SourceData,
  scope: ScopeDefinition,
): CreditLotRecord[] {
  if (scope.scope === 'TENANT') {
    return lots;
  }

  const customerBranchIds = new Map(
    source.customers.map((customer) => [customer.id, customer.branchId]),
  );
  const receiptBranchIds = new Map(
    source.receipts.map((receipt) => [receipt.id, receipt.branchId]),
  );
  const lotReceiptIds = new Map(
    source.ledgerEntries.map((entry) => [entry.id, entry.receiptId]),
  );

  return lots.filter((lot) => {
    const receiptId = lotReceiptIds.get(lot.earnLedgerEntryId);
    const branchId =
      (receiptId ? receiptBranchIds.get(receiptId) : null) ??
      customerBranchIds.get(lot.customerId) ??
      null;
    return branchId === scope.branchId;
  });
}

function filterLedgerEntriesForScope(
  entries: LedgerEntryRecord[],
  source: SourceData,
  scope: ScopeDefinition,
): LedgerEntryRecord[] {
  if (scope.scope === 'TENANT') {
    return entries;
  }

  const receiptBranchIds = new Map(
    source.receipts.map((receipt) => [receipt.id, receipt.branchId]),
  );
  const customerBranchIds = new Map(
    source.customers.map((customer) => [customer.id, customer.branchId]),
  );

  return entries.filter((entry) => {
    const branchId =
      (entry.receiptId ? receiptBranchIds.get(entry.receiptId) : null) ??
      customerBranchIds.get(entry.customerId) ??
      null;
    return branchId === scope.branchId;
  });
}

function filterApprovalsForScope(
  approvals: ApprovalRecord[],
  source: SourceData,
  scope: ScopeDefinition,
): ApprovalRecord[] {
  if (scope.scope === 'TENANT') {
    return approvals;
  }

  const receiptBranchIds = new Map(
    source.receipts.map((receipt) => [receipt.id, receipt.branchId]),
  );
  const redemptionBranchIds = new Map(
    source.redemptions.map((redemption) => [
      redemption.id,
      redemption.branchId,
    ]),
  );

  return approvals.filter((approval) => {
    const branchId =
      (approval.receiptId ? receiptBranchIds.get(approval.receiptId) : null) ??
      (approval.redemptionId
        ? redemptionBranchIds.get(approval.redemptionId)
        : null) ??
      null;
    return branchId === scope.branchId;
  });
}

function filterSmsForScope(
  smsMessages: SmsMessageRecord[],
  source: SourceData,
  scope: ScopeDefinition,
): SmsMessageRecord[] {
  if (scope.scope === 'TENANT') {
    return smsMessages;
  }

  const receiptBranchIds = new Map(
    source.receipts.map((receipt) => [receipt.id, receipt.branchId]),
  );

  return smsMessages.filter((sms) => {
    const branchId = sms.receiptId
      ? (receiptBranchIds.get(sms.receiptId) ?? null)
      : null;
    return branchId === scope.branchId;
  });
}

function resolveBranchIdForCashier(
  cashierId: string,
  receipts: ReceiptRecord[],
): string | null {
  const receipt = receipts.find((item) => item.capturedBy === cashierId);
  if (receipt) {
    return receipt.branchId;
  }

  return null;
}

function toReportDate(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const year = Number(parts.find((part) => part.type === 'year')?.value);
  const month = Number(parts.find((part) => part.type === 'month')?.value);
  const day = Number(parts.find((part) => part.type === 'day')?.value);

  return `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
}

function toReportMonth(date: Date, timeZone: string): string {
  return toReportDate(date, timeZone).slice(0, 7);
}

function toDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function resolveAgeBucket(expiresAt: Date, asOf: Date): string {
  const days = Math.max(
    0,
    Math.floor((expiresAt.getTime() - asOf.getTime()) / 86400000),
  );
  if (days <= 30) {
    return '0-30';
  }
  if (days <= 60) {
    return '31-60';
  }
  if (days <= 90) {
    return '61-90';
  }
  return '90+';
}

function sumLots(lots: CreditLotRecord[]): bigint {
  return lots.reduce((sum, lot) => sum + lot.remainingAmountKobo, 0n);
}

function addBigInt(map: Map<string, bigint>, key: string, value: bigint): void {
  map.set(key, (map.get(key) ?? 0n) + value);
}

function addNumber(map: Map<string, number>, key: string, value: number): void {
  map.set(key, (map.get(key) ?? 0) + value);
}

function addToSet(
  map: Map<string, Set<string>>,
  key: string,
  value: string,
): void {
  const set = map.get(key) ?? new Set<string>();
  set.add(value);
  map.set(key, set);
}

function cashierKey(reportDate: string, cashierId: string): string {
  return `${reportDate}|${cashierId}`;
}

function parseCashierKey(key: string): {
  reportDate: string;
  cashierId: string;
} {
  const [reportDate, cashierId] = key.split('|');
  return {
    reportDate: reportDate ?? '',
    cashierId: cashierId ?? '',
  };
}

function latestDate(values: Date[]): Date | null {
  if (values.length === 0) {
    return null;
  }

  return new Date(Math.max(...values.map((value) => value.getTime())));
}
