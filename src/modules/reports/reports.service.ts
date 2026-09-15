import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OutboxEventStatus, SmsMessageStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import type { AuthContext } from '../../common/auth/session.types';
import { branchDayWindow } from '../../jobs/branch-day-window';

const DEFAULT_REPORT_TIME_ZONE = 'Africa/Lagos';

type ReportScope = 'TENANT' | 'BRANCH';

type CustomerPerformanceSort =
  'spend' | 'balance' | 'visits' | 'recent' | 'dormant-value';

interface ReportQuery {
  branchId?: string;
  from?: string;
  to?: string;
  timezone?: string;
  sort?: CustomerPerformanceSort;
  limit?: number;
}

interface ReportScopeResolution {
  scope: ReportScope;
  scopeKey: string;
  branchId: string | null;
  timezone: string;
}

export interface PilotOperationsSummary {
  release: {
    version: string;
    sha: string;
    sentryConfigured: boolean;
  };
  generatedAt: string;
  outbox: {
    backlogCount: number;
    staleCount: number;
  };
  sms: {
    failedCount: number;
  };
  offlineSync: {
    failureCount: number;
  };
  fraud: {
    openCount: number;
  };
  reports: {
    staleCount: number;
  };
  reconciliation: {
    healthy: boolean;
    mismatchCount: number;
  };
}

export interface ReportCollection<T> {
  scope: ReportScope;
  scopeKey: string;
  branchId: string | null;
  timezone: string;
  items: T[];
}

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async listExecutiveSummary(
    tenantId: string,
    context: AuthContext,
    query: ReportQuery = {},
  ): Promise<ReportCollection<Record<string, unknown>>> {
    return this.listRows(tenantId, context, query, async (scope, dateFilter) =>
      this.prisma.reportDailyFinancialSummary.findMany({
        where: {
          tenantId,
          scope: scope.scope,
          scopeKey: scope.scopeKey,
          ...(dateFilter ? { reportDate: dateFilter } : {}),
        },
        orderBy: [{ reportDate: 'desc' }, { scopeKey: 'asc' }],
      }),
    );
  }

  async getExecutiveSnapshot(
    tenantId: string,
    context: AuthContext,
    query: Pick<ReportQuery, 'branchId' | 'timezone'> = {},
  ): Promise<ReportCollection<Record<string, unknown>>> {
    const scope = await this.resolveScope(
      tenantId,
      context,
      query.branchId,
      query.timezone,
    );
    const row = await this.prisma.reportDailyFinancialSummary.findFirst({
      where: {
        tenantId,
        scope: scope.scope,
        scopeKey: scope.scopeKey,
      },
      orderBy: { reportDate: 'desc' },
    });
    return {
      ...scope,
      items: row ? [serializeReportValue(row)] : [],
    };
  }

  async listLiabilityAgeing(
    tenantId: string,
    context: AuthContext,
    query: ReportQuery = {},
  ): Promise<ReportCollection<Record<string, unknown>>> {
    return this.listRows(tenantId, context, query, async (scope, dateFilter) =>
      this.prisma.reportLiabilityBucket.findMany({
        where: {
          tenantId,
          scope: scope.scope,
          scopeKey: scope.scopeKey,
          ...(dateFilter ? { reportDate: dateFilter } : {}),
        },
        orderBy: [
          { reportDate: 'desc' },
          { expiryMonth: 'asc' },
          { ageBucket: 'asc' },
        ],
      }),
    );
  }

  async listCustomerPerformance(
    tenantId: string,
    context: AuthContext,
    query: ReportQuery = {},
  ): Promise<ReportCollection<Record<string, unknown>>> {
    const sort = normalizeCustomerPerformanceSort(query.sort);
    const limit = normalizeReportLimit(query.limit);
    return this.listRows(tenantId, context, query, async (scope, dateFilter) =>
      this.prisma.reportCustomerSnapshot.findMany({
        where: {
          tenantId,
          scope: scope.scope,
          scopeKey: scope.scopeKey,
          ...(dateFilter ? { reportDate: dateFilter } : {}),
        },
        orderBy: customerPerformanceOrderBy(sort),
        take: limit,
      }),
    );
  }

  async listCashierToday(
    tenantId: string,
    context: AuthContext,
  ): Promise<{
    branchId: string;
    timezone: string;
    items: Array<{
      id: string;
      occurredAt: string;
      operation: 'EARN' | 'REDEEM';
      loyaltyAmountKobo: number | null;
      receiptNumber: string;
      status: string;
    }>;
  }> {
    if (context.user.role !== UserRole.CASHIER) {
      throw new ForbiddenException('Cashier activity access is restricted');
    }

    const branchId = context.user.branchId;
    if (!branchId) {
      throw new ForbiddenException('Cashier activity requires a branch scope');
    }

    const branch = await this.prisma.branch.findFirst({
      where: { id: branchId, tenantId },
      select: { id: true, timezone: true },
    });
    if (!branch) {
      throw new NotFoundException('Cashier activity branch not found');
    }

    const { windowStart, windowEnd } = branchDayWindow(
      new Date(),
      branch.timezone ?? DEFAULT_REPORT_TIME_ZONE,
    );
    const receipts = await this.prisma.receipt.findMany({
      where: {
        tenantId,
        branchId: branch.id,
        capturedByTenantId: tenantId,
        capturedBy: context.user.id,
        occurredAt: { gte: windowStart, lt: windowEnd },
      },
      orderBy: { occurredAt: 'desc' },
      take: 10,
      include: {
        redemption: {
          select: {
            requestedAmountKobo: true,
            confirmedAmountKobo: true,
            status: true,
          },
        },
        ledgerEntries: {
          select: {
            type: true,
            amountKobo: true,
            status: true,
          },
          orderBy: { effectiveAt: 'desc' },
          take: 1,
        },
      },
    });

    return {
      branchId: branch.id,
      timezone: branch.timezone ?? DEFAULT_REPORT_TIME_ZONE,
      items: receipts.map((receipt) => {
        const redemption = receipt.redemption;
        const ledger = receipt.ledgerEntries[0];
        const isRedeem = Boolean(redemption);
        return {
          id: receipt.id,
          occurredAt: receipt.occurredAt.toISOString(),
          operation: isRedeem ? 'REDEEM' : 'EARN',
          loyaltyAmountKobo: isRedeem
            ? Number(
                redemption?.confirmedAmountKobo ??
                  redemption?.requestedAmountKobo ??
                  0n,
              )
            : ledger
              ? Number(ledger.amountKobo)
              : null,
          receiptNumber: receipt.posReceiptNumber,
          status: isRedeem
            ? (redemption?.status ?? receipt.reviewStatus)
            : (ledger?.status ?? receipt.reviewStatus),
        };
      }),
    };
  }

  async listCashierActivity(
    tenantId: string,
    context: AuthContext,
    query: ReportQuery = {},
  ): Promise<ReportCollection<Record<string, unknown>>> {
    return this.listRows(tenantId, context, query, async (scope, dateFilter) =>
      this.prisma.reportCashierDailySummary.findMany({
        where: {
          tenantId,
          scope: scope.scope,
          scopeKey: scope.scopeKey,
          ...(dateFilter ? { reportDate: dateFilter } : {}),
        },
        orderBy: [{ reportDate: 'desc' }, { cashierId: 'asc' }],
      }),
    );
  }

  async listRedemptionSummary(
    tenantId: string,
    context: AuthContext,
    query: ReportQuery = {},
  ): Promise<ReportCollection<Record<string, unknown>>> {
    return this.listRows(tenantId, context, query, async (scope, dateFilter) =>
      this.prisma.reportRedemptionDailySummary.findMany({
        where: {
          tenantId,
          scope: scope.scope,
          scopeKey: scope.scopeKey,
          ...(dateFilter ? { reportDate: dateFilter } : {}),
        },
        orderBy: [{ reportDate: 'desc' }],
      }),
    );
  }

  async getRedemptionDrilldown(
    tenantId: string,
    context: AuthContext,
    redemptionId: string,
  ): Promise<Record<string, unknown>> {
    if (
      context.user.role !== UserRole.SUPERVISOR &&
      context.user.role !== UserRole.ADMIN
    ) {
      throw new ForbiddenException('Redemption drilldown is restricted');
    }

    const redemption = await this.prisma.redemption.findFirst({
      where: { tenantId, id: redemptionId.trim() },
      select: {
        id: true,
        branchId: true,
        customerId: true,
        requestedAmountKobo: true,
        basketAmountKobo: true,
        maximumAllowedKobo: true,
        confirmedAmountKobo: true,
        status: true,
        requestedAt: true,
        confirmedAt: true,
        rejectedAt: true,
        reversedAt: true,
        allocations: {
          orderBy: { allocationOrder: 'asc' },
          select: {
            id: true,
            creditLotId: true,
            amountKobo: true,
            allocationOrder: true,
            restorations: { select: { amountKobo: true } },
          },
        },
        approval: {
          select: {
            status: true,
            reasonCode: true,
            decisionReason: true,
            requestedAt: true,
            decidedAt: true,
            executedAt: true,
          },
        },
      },
    });
    if (!redemption) throw new NotFoundException('Redemption not found');
    if (
      context.user.role === UserRole.SUPERVISOR &&
      context.user.branchId !== redemption.branchId
    ) {
      throw new NotFoundException('Redemption not found');
    }

    const allocations = redemption.allocations.map((allocation) => ({
      id: allocation.id,
      creditLotId: allocation.creditLotId,
      amountKobo: Number(allocation.amountKobo),
      allocationOrder: allocation.allocationOrder,
      restoredAmountKobo: allocation.restorations.reduce(
        (total, restoration) => total + Number(restoration.amountKobo),
        0,
      ),
    }));
    return {
      id: redemption.id,
      branchId: redemption.branchId,
      customerId: redemption.customerId,
      requestedAmountKobo: Number(redemption.requestedAmountKobo),
      basketAmountKobo: Number(redemption.basketAmountKobo),
      maximumAllowedKobo: Number(redemption.maximumAllowedKobo),
      confirmedAmountKobo:
        redemption.confirmedAmountKobo === null
          ? null
          : Number(redemption.confirmedAmountKobo),
      status: redemption.status,
      requestedAt: redemption.requestedAt.toISOString(),
      confirmedAt: redemption.confirmedAt?.toISOString() ?? null,
      rejectedAt: redemption.rejectedAt?.toISOString() ?? null,
      reversedAt: redemption.reversedAt?.toISOString() ?? null,
      allocations,
      approval: redemption.approval
        ? {
            ...redemption.approval,
            requestedAt: redemption.approval.requestedAt.toISOString(),
            decidedAt: redemption.approval.decidedAt?.toISOString() ?? null,
            executedAt: redemption.approval.executedAt?.toISOString() ?? null,
          }
        : null,
    };
  }

  async listSmsOperations(
    tenantId: string,
    context: AuthContext,
    query: ReportQuery = {},
  ): Promise<ReportCollection<Record<string, unknown>>> {
    return this.listRows(tenantId, context, query, async (scope, dateFilter) =>
      this.prisma.reportSmsDailySummary.findMany({
        where: {
          tenantId,
          scope: scope.scope,
          scopeKey: scope.scopeKey,
          ...(dateFilter ? { reportDate: dateFilter } : {}),
        },
        orderBy: [{ reportDate: 'desc' }],
      }),
    );
  }

  async listTransactionSms(
    tenantId: string,
    context: AuthContext,
    transactionId: string,
    query: { page?: number; limit?: number } = {},
  ): Promise<{
    transactionId: string;
    page: number;
    limit: number;
    hasMore: boolean;
    items: Array<Record<string, unknown>>;
  }> {
    if (
      context.user.role !== UserRole.SUPERVISOR &&
      context.user.role !== UserRole.ADMIN
    ) {
      throw new ForbiddenException('SMS inspection is restricted');
    }
    const normalizedTransactionId = transactionId.trim();
    if (!normalizedTransactionId) {
      throw new BadRequestException('transactionId is required');
    }
    const page = normalizePage(query.page);
    const limit = normalizePageLimit(query.limit);

    const messages = await this.prisma.smsMessage.findMany({
      where: {
        tenantId,
        OR: [
          { receiptId: normalizedTransactionId },
          { ledgerEntryId: normalizedTransactionId },
          { redemptionId: normalizedTransactionId },
          { adjustmentId: normalizedTransactionId },
        ],
      },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      skip: (page - 1) * limit,
      take: limit + 1,
    });
    if (messages.length === 0) {
      throw new NotFoundException('Transaction SMS notification not found');
    }

    if (context.user.role === UserRole.SUPERVISOR) {
      const [receipts, redemptions] = await Promise.all([
        this.prisma.receipt.findMany({
          where: {
            tenantId,
            id: {
              in: messages
                .map((message) => message.receiptId)
                .filter(Boolean) as string[],
            },
          },
          select: { branchId: true },
        }),
        this.prisma.redemption.findMany({
          where: {
            tenantId,
            id: {
              in: messages
                .map((message) => message.redemptionId)
                .filter(Boolean) as string[],
            },
          },
          select: { branchId: true },
        }),
      ]);
      const branchIds = new Set([
        ...receipts.map((receipt) => receipt.branchId),
        ...redemptions.map((redemption) => redemption.branchId),
      ]);
      if (branchIds.size !== 1 || !branchIds.has(context.user.branchId ?? '')) {
        throw new NotFoundException('Transaction SMS notification not found');
      }
    }

    const hasMore = messages.length > limit;
    const pageMessages = hasMore ? messages.slice(0, limit) : messages;

    return {
      transactionId: normalizedTransactionId,
      page,
      limit,
      hasMore,
      items: pageMessages.map((message) => ({
        id: message.id,
        receiptId: message.receiptId,
        template: message.template,
        phoneE164: maskReportPhone(message.phoneE164),
        status: message.status,
        attempts: message.attempts,
        lastAttemptAt: message.lastAttemptAt,
        nextAttemptAt: message.nextAttemptAt,
        providerMessageId: message.providerMessageId,
        failureCategory: message.failureCategory,
        lastError: redactSmsError(message.lastError),
        queuedAt: message.queuedAt,
        sentAt: message.sentAt,
        deliveredAt: message.deliveredAt,
        failedAt: message.failedAt,
        suppressedAt: message.suppressedAt,
        deadLetteredAt: message.deadLetteredAt,
      })),
    };
  }

  async listAuditReport(
    tenantId: string,
    context: AuthContext,
    query: Pick<ReportQuery, 'from' | 'to' | 'timezone'> = {},
  ): Promise<ReportCollection<Record<string, unknown>>> {
    if (context.user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Audit report is admin-only');
    }

    const dateFilter = buildDateFilter(query.from, query.to);
    return {
      scope: 'TENANT',
      scopeKey: tenantId,
      branchId: null,
      timezone:
        query.timezone ??
        this.configService.get<string>('SHOPCITY_TIMEZONE') ??
        DEFAULT_REPORT_TIME_ZONE,
      items: await this.prisma.auditLog.findMany({
        where: {
          tenantId,
          ...(dateFilter ? { createdAt: dateFilter } : {}),
        },
        orderBy: { createdAt: 'desc' },
      }),
    };
  }

  async getPilotOperationsSummary(
    tenantId: string,
    context: AuthContext,
  ): Promise<PilotOperationsSummary> {
    if (context.user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Pilot operations summary is admin-only');
    }

    const now = new Date();
    const outboxStaleThresholdMinutes =
      this.configService.get<number>('OUTBOX_STALE_THRESHOLD_MINUTES') ?? 30;
    const reportStalenessThresholdMinutes =
      this.configService.get<number>('REPORT_STALENESS_THRESHOLD_MINUTES') ??
      180;
    const staleOutboxBefore = new Date(
      now.getTime() - outboxStaleThresholdMinutes * 60_000,
    );
    const staleReportsBefore = new Date(
      now.getTime() - reportStalenessThresholdMinutes * 60_000,
    );

    const [
      backlogCount,
      staleCount,
      failedSmsCount,
      offlineFailureCount,
      fraudOpenCount,
      staleReportCount,
      mismatchCount,
    ] = await Promise.all([
      this.prisma.outboxEvent.count({
        where: {
          tenantId,
          status: {
            in: [
              OutboxEventStatus.PENDING,
              OutboxEventStatus.QUEUED,
              OutboxEventStatus.PUBLISHED,
            ],
          },
        },
      }),
      this.prisma.outboxEvent.count({
        where: {
          tenantId,
          status: {
            in: [
              OutboxEventStatus.PENDING,
              OutboxEventStatus.QUEUED,
              OutboxEventStatus.PUBLISHED,
            ],
          },
          updatedAt: { lt: staleOutboxBefore },
        },
      }),
      this.prisma.smsMessage.count({
        where: {
          tenantId,
          status: SmsMessageStatus.FAILED,
        },
      }),
      this.prisma.offlineSyncAttempt.count({
        where: {
          tenantId,
          status: { in: ['REJECTED', 'RETRYABLE'] },
        },
      }),
      this.prisma.fraudFlag.count({
        where: {
          tenantId,
          status: 'OPEN',
        },
      }),
      this.prisma.reportMaterializationState.count({
        where: {
          tenantId,
          OR: [
            { status: { not: 'COMPLETED' } },
            { updatedAt: { lt: staleReportsBefore } },
          ],
        },
      }),
      this.countCreditLotMismatches(tenantId),
    ]);

    return {
      release: {
        version:
          this.configService.get<string>('RELEASE_VERSION') ?? '0.0.0-dev',
        sha: this.configService.get<string>('RELEASE_SHA') ?? 'dev',
        sentryConfigured: Boolean(this.configService.get<string>('SENTRY_DSN')),
      },
      generatedAt: now.toISOString(),
      outbox: {
        backlogCount,
        staleCount,
      },
      sms: {
        failedCount: failedSmsCount,
      },
      offlineSync: {
        failureCount: offlineFailureCount,
      },
      fraud: {
        openCount: fraudOpenCount,
      },
      reports: {
        staleCount: staleReportCount,
      },
      reconciliation: {
        healthy: mismatchCount === 0,
        mismatchCount,
      },
    };
  }

  private async countCreditLotMismatches(tenantId: string): Promise<number> {
    const [creditLots, allocationTotals, expiryTotals, restorations] =
      await Promise.all([
        this.prisma.creditLot.findMany({
          where: { tenantId },
          select: {
            id: true,
            originalAmountKobo: true,
            remainingAmountKobo: true,
          },
        }),
        this.prisma.redemptionAllocation.groupBy({
          by: ['creditLotId'],
          where: { tenantId },
          _sum: { amountKobo: true },
        }),
        this.prisma.creditExpiry.groupBy({
          by: ['creditLotId'],
          where: { tenantId },
          _sum: { amountKobo: true },
        }),
        this.prisma.allocationRestoration.findMany({
          where: { tenantId },
          select: {
            amountKobo: true,
            allocation: { select: { creditLotId: true } },
          },
        }),
      ]);

    const allocatedByLot = new Map(
      allocationTotals.map((row) => [
        row.creditLotId,
        row._sum.amountKobo ?? 0n,
      ]),
    );
    const expiredByLot = new Map(
      expiryTotals.map((row) => [row.creditLotId, row._sum.amountKobo ?? 0n]),
    );
    const restoredByLot = new Map<string, bigint>();

    for (const restoration of restorations) {
      const creditLotId = restoration.allocation.creditLotId;
      restoredByLot.set(
        creditLotId,
        (restoredByLot.get(creditLotId) ?? 0n) + restoration.amountKobo,
      );
    }

    return creditLots.filter((creditLot) => {
      const expected = maxBigInt(
        0n,
        creditLot.originalAmountKobo -
          (allocatedByLot.get(creditLot.id) ?? 0n) +
          (restoredByLot.get(creditLot.id) ?? 0n) -
          (expiredByLot.get(creditLot.id) ?? 0n),
      );

      return creditLot.remainingAmountKobo !== expected;
    }).length;
  }

  async listMaterializationState(
    tenantId: string,
    context: AuthContext,
    query: Pick<ReportQuery, 'branchId' | 'timezone'> = {},
  ): Promise<ReportCollection<Record<string, unknown>>> {
    const scope = await this.resolveScope(
      tenantId,
      context,
      query.branchId,
      query.timezone,
    );

    return {
      ...scope,
      items: await this.prisma.reportMaterializationState.findMany({
        where: {
          tenantId,
          scope: scope.scope,
          scopeKey: scope.scopeKey,
        },
        orderBy: { updatedAt: 'desc' },
      }),
    };
  }

  private async listRows<T>(
    tenantId: string,
    context: AuthContext,
    query: ReportQuery,
    fetchRows: (
      scope: ReportScopeResolution,
      dateFilter?: { gte?: Date; lte?: Date },
    ) => Promise<T[]>,
  ): Promise<ReportCollection<T>> {
    const scope = await this.resolveScope(
      tenantId,
      context,
      query.branchId,
      query.timezone,
    );
    const dateFilter = buildDateFilter(query.from, query.to);

    const rows = await fetchRows(scope, dateFilter);

    return {
      ...scope,
      items: rows.map((row) => serializeReportValue(row)),
    };
  }

  private async resolveScope(
    tenantId: string,
    context: AuthContext,
    branchId?: string,
    timezoneHint?: string,
  ): Promise<ReportScopeResolution> {
    if (context.user.role === UserRole.ADMIN) {
      if (!branchId) {
        return {
          scope: 'TENANT',
          scopeKey: tenantId,
          branchId: null,
          timezone:
            timezoneHint ??
            this.configService.get<string>('SHOPCITY_TIMEZONE') ??
            DEFAULT_REPORT_TIME_ZONE,
        };
      }

      const branch = await this.prisma.branch.findFirst({
        where: { id: branchId, tenantId },
        select: { id: true, timezone: true },
      });

      if (!branch) {
        throw new NotFoundException('Report branch not found');
      }

      return {
        scope: 'BRANCH',
        scopeKey: branch.id,
        branchId: branch.id,
        timezone: timezoneHint ?? branch.timezone ?? DEFAULT_REPORT_TIME_ZONE,
      };
    }

    if (context.user.role !== UserRole.SUPERVISOR) {
      throw new ForbiddenException('Report access is restricted');
    }

    const resolvedBranchId = context.user.branchId;
    if (!resolvedBranchId) {
      throw new ForbiddenException('Report access requires a branch scope');
    }

    if (branchId && branchId !== resolvedBranchId) {
      throw new ForbiddenException('Report access is branch-scoped');
    }

    const branch = await this.prisma.branch.findFirst({
      where: { id: resolvedBranchId, tenantId },
      select: { id: true, timezone: true },
    });

    if (!branch) {
      throw new NotFoundException('Report branch not found');
    }

    return {
      scope: 'BRANCH',
      scopeKey: branch.id,
      branchId: branch.id,
      timezone: timezoneHint ?? branch.timezone ?? DEFAULT_REPORT_TIME_ZONE,
    };
  }
}

const MAX_SMS_INSPECTION_PAGE_SIZE = 100;
const MAX_REPORT_RESULT_SIZE = 500;

function normalizeCustomerPerformanceSort(
  value: CustomerPerformanceSort | undefined,
): CustomerPerformanceSort {
  if (value === undefined || value === 'spend') return 'spend';
  if (
    value === 'balance' ||
    value === 'visits' ||
    value === 'recent' ||
    value === 'dormant-value'
  ) {
    return value;
  }
  throw new BadRequestException('Invalid customer performance sort');
}

function normalizeReportLimit(value: number | undefined): number {
  if (value === undefined) return MAX_REPORT_RESULT_SIZE;
  if (!Number.isInteger(value) || value < 1 || value > MAX_REPORT_RESULT_SIZE) {
    throw new BadRequestException(
      `limit must be an integer between 1 and ${MAX_REPORT_RESULT_SIZE}`,
    );
  }
  return value;
}

function customerPerformanceOrderBy(sort: CustomerPerformanceSort) {
  switch (sort) {
    case 'balance':
      return [
        { currentBalanceKobo: 'desc' as const },
        { customerId: 'asc' as const },
      ];
    case 'visits':
      return [{ visitCount: 'desc' as const }, { customerId: 'asc' as const }];
    case 'recent':
      return [
        { lastActivityAt: 'desc' as const },
        { customerId: 'asc' as const },
      ];
    case 'dormant-value':
      return [
        { dormant: 'desc' as const },
        { currentBalanceKobo: 'desc' as const },
        { customerId: 'asc' as const },
      ];
    case 'spend':
    default:
      return [
        { purchaseValueKobo: 'desc' as const },
        { customerId: 'asc' as const },
      ];
  }
}

function normalizePage(value: number | undefined): number {
  if (value === undefined) return 1;
  if (!Number.isInteger(value) || value < 1) {
    throw new BadRequestException('page must be a positive integer');
  }
  return value;
}

function normalizePageLimit(value: number | undefined): number {
  if (value === undefined) return 50;
  if (
    !Number.isInteger(value) ||
    value < 1 ||
    value > MAX_SMS_INSPECTION_PAGE_SIZE
  ) {
    throw new BadRequestException(
      `limit must be an integer between 1 and ${MAX_SMS_INSPECTION_PAGE_SIZE}`,
    );
  }
  return value;
}

function maskReportPhone(value: string): string {
  const normalized = value.trim();
  if (normalized.length <= 6) return '***';
  return `${normalized.slice(0, 3)}*****${normalized.slice(-2)}`;
}

function redactSmsError(value: string | null): string | null {
  if (!value) return null;
  return value.replace(/[\r\n\t]+/g, ' ').slice(0, 240);
}

function maxBigInt(left: bigint, right: bigint): bigint {
  return left > right ? left : right;
}

function serializeReportValue<T>(value: T): T {
  if (typeof value === 'bigint') {
    return Number(value) as T;
  }

  if (Array.isArray(value)) {
    const items: unknown[] = value;
    return items.map((item) => serializeReportValue(item)) as T;
  }

  if (value instanceof Date || value === null || typeof value !== 'object') {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      serializeReportValue(item),
    ]),
  ) as T;
}

function buildDateFilter(from?: string, to?: string) {
  const start = parseOptionalDate(from, 'from');
  const end = parseOptionalDate(to, 'to');

  if (start && end && start > end) {
    throw new BadRequestException('Report from date must be before to date');
  }

  if (!start && !end) {
    return undefined;
  }

  return {
    ...(start ? { gte: start } : {}),
    ...(end ? { lte: end } : {}),
  };
}

function parseOptionalDate(value: string | undefined, label: string) {
  if (!value) {
    return undefined;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new BadRequestException(`Invalid ${label} date`);
  }

  return parsed;
}
