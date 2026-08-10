import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FraudFlagStatus, FraudSeverity, UserRole } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
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
    return {
      scope: scope.scope,
      scopeKey: scope.scopeKey,
      branchId: scope.branchId,
      items: pageItems.map(toFraudFlagListItem),
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
  ): Promise<FraudFlagListItem> {
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
