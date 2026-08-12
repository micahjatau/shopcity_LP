import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OutboxEventStatus, Prisma, SmsMessageStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import type { AuthContext } from '../../common/auth/session.types';

const DEFAULT_REPORT_TIME_ZONE = 'Africa/Lagos';

type ReportScope = 'TENANT' | 'BRANCH';

interface ReportQuery {
  branchId?: string;
  from?: string;
  to?: string;
  timezone?: string;
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
    return this.listRows(tenantId, context, query, async (scope, dateFilter) =>
      this.prisma.reportCustomerSnapshot.findMany({
        where: {
          tenantId,
          scope: scope.scope,
          scopeKey: scope.scopeKey,
          ...(dateFilter ? { reportDate: dateFilter } : {}),
        },
        orderBy: [{ reportDate: 'desc' }, { customerId: 'asc' }],
      }),
    );
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
      reconciliationRows,
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
      this.prisma.$queryRaw<Array<{ mismatchCount: bigint }>>(Prisma.sql`
        WITH allocation_totals AS (
          SELECT "creditLotId", COALESCE(SUM("amountKobo"), 0)::bigint AS amount
          FROM "RedemptionAllocation"
          WHERE "tenantId" = ${tenantId}
          GROUP BY "creditLotId"
        ),
        restoration_totals AS (
          SELECT ra."creditLotId", COALESCE(SUM(ar."amountKobo"), 0)::bigint AS amount
          FROM "AllocationRestoration" ar
          JOIN "RedemptionAllocation" ra
            ON ra."tenantId" = ar."tenantId"
           AND ra."id" = ar."allocationId"
          WHERE ar."tenantId" = ${tenantId}
          GROUP BY ra."creditLotId"
        ),
        expiry_totals AS (
          SELECT "creditLotId", COALESCE(SUM("amountKobo"), 0)::bigint AS amount
          FROM "CreditExpiry"
          WHERE "tenantId" = ${tenantId}
          GROUP BY "creditLotId"
        )
        SELECT COUNT(*)::bigint AS "mismatchCount"
        FROM "CreditLot" cl
        LEFT JOIN allocation_totals at ON at."creditLotId" = cl."id"
        LEFT JOIN restoration_totals rt ON rt."creditLotId" = cl."id"
        LEFT JOIN expiry_totals et ON et."creditLotId" = cl."id"
        WHERE cl."tenantId" = ${tenantId}
          AND cl."remainingAmountKobo" <> GREATEST(
            0,
            cl."originalAmountKobo" - COALESCE(at.amount, 0) + COALESCE(rt.amount, 0) - COALESCE(et.amount, 0)
          )
      `),
    ]);

    const mismatchCount = Number(reconciliationRows[0]?.mismatchCount ?? 0n);

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

    return {
      ...scope,
      items: await fetchRows(scope, dateFilter),
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
