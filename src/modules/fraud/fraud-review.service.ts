import { createHash } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  FraudFlagStatus,
  FraudSeverity,
  IdempotencyRecordStatus,
  UserRole,
} from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { DomainHttpException } from '../../common/errors/domain.exception';
import { PrismaService } from '../../database/prisma.service';
import type { AuthContext } from '../../common/auth/session.types';
import {
  decodeCursor,
  encodeCursor,
  pageMeta,
  type CursorPageRequest,
} from '../../common/pagination/cursor-pagination';

export type FraudFlagDecision = 'ACKNOWLEDGED' | 'RESOLVED';

export interface FraudFlagListItem {
  id: string;
  tenantId: string;
  ruleCode: string;
  severity: FraudSeverity;
  status: FraudFlagStatus;
  dedupeKey: string;
  subjectType: string;
  subjectId: string;
  branchId: string | null;
  cashierId: string | null;
  customerId: string | null;
  receiptId: string | null;
  ledgerEntryId: string | null;
  redemptionId: string | null;
  windowStart: Date;
  windowEnd: Date | null;
  firstDetectedAt: Date;
  lastDetectedAt: Date;
  occurrenceCount: number;
  evidence: Record<string, unknown>;
  branchName?: string | null;
  cashierName?: string | null;
  customerName?: string | null;
  receiptNumber?: string | null;
  amountKobo?: number | null;
  decisionReason: string | null;
  decisionActorId: string | null;
  decidedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface FraudFlagListQuery {
  branchId?: string;
  status?: FraudFlagStatus;
  severity?: FraudSeverity;
  ruleCode?: string;
  actorId?: string;
  customerId?: string;
  from?: string;
  to?: string;
}

export interface FraudListResult<T> {
  scope: 'TENANT' | 'BRANCH';
  scopeKey: string;
  branchId: string | null;
  items: T[];
  summary: {
    needReviewCount: number;
    highPriorityCount: number;
    underReviewCount: number;
  };
  nextCursor: string | null;
  hasMore: boolean;
}

@Injectable()
export class FraudReviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async listFraudFlags(
    tenantId: string,
    actor: AuthContext,
    query: FraudFlagListQuery = {},
    page?: CursorPageRequest,
  ): Promise<FraudListResult<FraudFlagListItem>> {
    const scope = await this.resolveScope(tenantId, actor, query.branchId);
    const decodedCursor = page?.cursor ? decodeCursor(page.cursor) : undefined;
    const where = this.buildListWhere(tenantId, scope, query, decodedCursor);

    const records = await this.prisma.fraudFlag.findMany({
      where,
      orderBy: [{ lastDetectedAt: 'desc' }, { id: 'desc' }],
      ...(page
        ? {
            take: page.limit + 1,
            ...(decodedCursor
              ? {
                  cursor: { id: decodedCursor.id },
                  skip: 1,
                }
              : {}),
          }
        : {}),
    });

    const { pageItems, hasMore } = pageMeta(
      records,
      page?.limit ?? records.length,
    );
    const [summary, items] = await Promise.all([
      this.getListSummary(tenantId, scope.branchId),
      this.enrichListItems(
        tenantId,
        scope.branchId,
        pageItems.map(toFraudFlagListItem),
      ),
    ]);
    return {
      scope: scope.scope,
      scopeKey: scope.scopeKey,
      branchId: scope.branchId,
      items,
      summary,
      nextCursor: hasMore
        ? encodeCursor(pageItems.at(-1)!.id, pageItems.at(-1)!.lastDetectedAt)
        : null,
      hasMore,
    };
  }

  async getFraudFlag(
    tenantId: string,
    actor: AuthContext,
    flagId: string,
    branchId?: string,
  ): Promise<FraudFlagListItem> {
    const scope = await this.resolveScope(tenantId, actor, branchId);
    const record = await this.prisma.fraudFlag.findFirst({
      where: {
        tenantId,
        id: flagId,
        ...(scope.branchId ? { branchId: scope.branchId } : {}),
      },
    });

    if (!record) {
      throw new NotFoundException('Fraud flag not found');
    }

    return toFraudFlagListItem(record);
  }

  async decideFraudFlag(
    tenantId: string,
    actor: AuthContext,
    flagId: string,
    decision: FraudFlagDecision,
    reason: string,
    idempotencyKey: string | undefined,
  ): Promise<FraudFlagListItem> {
    const normalizedKey = idempotencyKey?.trim() ?? '';
    if (!normalizedKey) {
      throw new BadRequestException('Idempotency-Key header is required');
    }
    const requestHash = createHash('sha256')
      .update(
        JSON.stringify({
          tenantId,
          actorId: actor.user.id,
          flagId,
          decision,
          reason,
        }),
      )
      .digest('hex');
    const existing = await this.prisma.idempotencyRecord.findUnique({
      where: {
        tenantId_actorId_endpoint_idempotencyKey: {
          tenantId,
          actorId: actor.user.id,
          endpoint: 'fraud.decide',
          idempotencyKey: normalizedKey,
        },
      },
    });
    if (existing && existing.requestHash !== requestHash) {
      throw new DomainHttpException(
        409,
        'IDEMPOTENCY_CONFLICT',
        'Idempotency key reused with different payload',
      );
    }
    if (existing?.responseJson)
      return existing.responseJson as unknown as FraudFlagListItem;
    if (existing)
      throw new ConflictException('Idempotency key is still being processed');

    const normalizedReason = reason.trim();
    if (!normalizedReason) {
      throw new BadRequestException('Decision reason is required');
    }

    const flag = await this.getFraudFlag(tenantId, actor, flagId);
    if (flag.status === decision) {
      return flag;
    }

    const decidedAt = new Date();
    const updated = await this.prisma.fraudFlag.update({
      where: { id: flag.id },
      data: {
        status: decision,
        decisionReason: normalizedReason,
        decisionActorId: actor.user.id,
        decidedAt,
      },
    });

    await this.prisma.idempotencyRecord.create({
      data: {
        tenantId,
        actorId: actor.user.id,
        endpoint: 'fraud.decide',
        idempotencyKey: normalizedKey,
        requestHash,
        status: IdempotencyRecordStatus.COMPLETED,
        responseJson: updated,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    await this.auditService.record({
      tenantId,
      actorId: actor.user.id,
      action: 'FRAUD_FLAG_DECISION_RECORDED',
      entityType: 'FRAUD_FLAG',
      entityId: flag.id,
      metadata: {
        decision,
        status: updated.status,
      },
    });

    return toFraudFlagListItem(updated);
  }

  private async getListSummary(tenantId: string, branchId: string | null) {
    const where = {
      tenantId,
      ...(branchId ? { branchId } : {}),
    };
    const [needReviewCount, highPriorityCount, underReviewCount] =
      await Promise.all([
        this.prisma.fraudFlag.count({
          where: { ...where, status: FraudFlagStatus.OPEN },
        }),
        this.prisma.fraudFlag.count({
          where: { ...where, severity: FraudSeverity.HIGH },
        }),
        this.prisma.fraudFlag.count({
          where: { ...where, status: FraudFlagStatus.ACKNOWLEDGED },
        }),
      ]);

    return { needReviewCount, highPriorityCount, underReviewCount };
  }

  private async enrichListItems(
    tenantId: string,
    branchId: string | null,
    items: FraudFlagListItem[],
  ): Promise<FraudFlagListItem[]> {
    const branchIds = uniqueIds(items.map((item) => item.branchId));
    const cashierIds = uniqueIds(
      items.map((item) =>
        item.ruleCode === 'FR-AUTH-001' ? item.subjectId : item.cashierId,
      ),
    );
    const customerIds = uniqueIds(items.map((item) => item.customerId));
    const receiptIds = uniqueIds(
      items.map((item) =>
        item.ruleCode === 'FR-REPL-001' ? null : item.receiptId,
      ),
    );

    const [branches, users, customers, receipts] = await Promise.all([
      branchIds.length
        ? this.prisma.branch.findMany({
            where: { tenantId, id: { in: branchIds } },
            select: { id: true, name: true },
          })
        : [],
      cashierIds.length
        ? this.prisma.user.findMany({
            where: {
              tenantId,
              ...(branchId ? { branchId } : {}),
              id: { in: cashierIds },
            },
            select: { id: true, username: true },
          })
        : [],
      customerIds.length
        ? this.prisma.customer.findMany({
            where: {
              tenantId,
              ...(branchId ? { branchId } : {}),
              id: { in: customerIds },
            },
            select: { id: true, fullName: true },
          })
        : [],
      receiptIds.length
        ? this.prisma.receipt.findMany({
            where: {
              tenantId,
              ...(branchId ? { branchId } : {}),
              id: { in: receiptIds },
            },
            select: {
              id: true,
              posReceiptNumber: true,
              purchaseAmountKobo: true,
            },
          })
        : [],
    ]);
    const branchNames = new Map(
      branches.map((branch) => [branch.id, branch.name]),
    );
    const cashierNames = new Map(users.map((user) => [user.id, user.username]));
    const customerNames = new Map(
      customers.map((customer) => [customer.id, customer.fullName]),
    );
    const receiptDetails = new Map(
      receipts.map((receipt) => [receipt.id, receipt]),
    );

    return items.map((item) => {
      const receipt = item.receiptId
        ? receiptDetails.get(item.receiptId)
        : undefined;
      const evidenceAmount = evidenceKoboAmount(item.evidence);
      const amountKobo =
        item.ruleCode === 'FR-HV-003' || item.ruleCode === 'FR-RED-001'
          ? evidenceAmount
          : (safeKoboNumber(receipt?.purchaseAmountKobo) ?? evidenceAmount);
      return {
        ...item,
        branchName: item.branchId
          ? (branchNames.get(item.branchId) ?? null)
          : null,
        cashierName:
          cashierNames.get(
            item.ruleCode === 'FR-AUTH-001'
              ? item.subjectId
              : (item.cashierId ?? ''),
          ) ?? null,
        customerName: item.customerId
          ? (customerNames.get(item.customerId) ?? null)
          : null,
        receiptNumber:
          receipt?.posReceiptNumber ??
          evidenceString(item.evidence, 'normalizedPosReceiptNumber'),
        amountKobo,
      };
    });
  }

  private async resolveScope(
    tenantId: string,
    actor: AuthContext,
    branchId?: string,
  ): Promise<{
    scope: 'TENANT' | 'BRANCH';
    scopeKey: string;
    branchId: string | null;
  }> {
    if (actor.user.role === UserRole.ADMIN) {
      if (!branchId) {
        return {
          scope: 'TENANT',
          scopeKey: tenantId,
          branchId: null,
        };
      }

      const branch = await this.prisma.branch.findFirst({
        where: { id: branchId, tenantId },
        select: { id: true },
      });

      if (!branch) {
        throw new NotFoundException('Fraud branch not found');
      }

      return {
        scope: 'BRANCH',
        scopeKey: branch.id,
        branchId: branch.id,
      };
    }

    if (actor.user.role !== UserRole.SUPERVISOR) {
      throw new ForbiddenException('Fraud review is restricted');
    }

    if (!actor.user.branchId) {
      throw new ForbiddenException('Fraud review requires a branch scope');
    }

    if (branchId && branchId !== actor.user.branchId) {
      throw new ForbiddenException('Fraud review is branch-scoped');
    }

    const branch = await this.prisma.branch.findFirst({
      where: { id: actor.user.branchId, tenantId },
      select: { id: true },
    });

    if (!branch) {
      throw new NotFoundException('Fraud branch not found');
    }

    return {
      scope: 'BRANCH',
      scopeKey: branch.id,
      branchId: branch.id,
    };
  }

  private buildListWhere(
    tenantId: string,
    scope: { branchId: string | null },
    query: FraudFlagListQuery,
    decodedCursor?: { id: string; timestamp: string },
  ) {
    const from = parseOptionalDate(query.from, 'from');
    const to = parseOptionalDate(query.to, 'to');

    if (from && to && from > to) {
      throw new BadRequestException('Fraud from date must be before to date');
    }

    return {
      tenantId,
      ...(scope.branchId ? { branchId: scope.branchId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.severity ? { severity: query.severity } : {}),
      ...(query.ruleCode ? { ruleCode: query.ruleCode } : {}),
      ...(query.actorId ? { cashierId: query.actorId } : {}),
      ...(query.customerId ? { customerId: query.customerId } : {}),
      ...(from || to
        ? {
            lastDetectedAt: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: to } : {}),
            },
          }
        : {}),
      ...(decodedCursor
        ? {
            OR: [
              {
                lastDetectedAt: { lt: new Date(decodedCursor.timestamp) },
              },
              {
                lastDetectedAt: new Date(decodedCursor.timestamp),
                id: { lt: decodedCursor.id },
              },
            ],
          }
        : {}),
    };
  }
}

function toFraudFlagListItem(flag: {
  id: string;
  tenantId: string;
  ruleCode: string;
  severity: FraudSeverity;
  status: FraudFlagStatus;
  dedupeKey: string;
  subjectType: string;
  subjectId: string;
  branchId: string | null;
  cashierId: string | null;
  customerId: string | null;
  receiptId: string | null;
  ledgerEntryId: string | null;
  redemptionId: string | null;
  windowStart: Date;
  windowEnd: Date | null;
  firstDetectedAt: Date;
  lastDetectedAt: Date;
  occurrenceCount: number;
  evidence: unknown;
  decisionReason: string | null;
  decisionActorId: string | null;
  decidedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): FraudFlagListItem {
  return {
    ...flag,
    evidence: flag.evidence as Record<string, unknown>,
  };
}

function evidenceString(
  evidence: Record<string, unknown>,
  key: string,
): string | null {
  const value = evidence[key];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function uniqueIds(values: Array<string | null | undefined>): string[] {
  return [
    ...new Set(values.filter((value): value is string => Boolean(value))),
  ];
}

function safeKoboNumber(
  value: bigint | number | null | undefined,
): number | null {
  if (typeof value === 'bigint') {
    if (value < 0n || value > BigInt(Number.MAX_SAFE_INTEGER)) return null;
    return Number(value);
  }

  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
    ? value
    : null;
}

function evidenceKoboAmount(evidence: Record<string, unknown>): number | null {
  const value = evidence.purchaseAmountKobo ?? evidence.requestedAmountKobo;
  if (typeof value === 'number') return safeKoboNumber(value);
  if (typeof value === 'string' && /^\d+$/.test(value)) {
    try {
      return safeKoboNumber(BigInt(value));
    } catch {
      return null;
    }
  }
  return null;
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
