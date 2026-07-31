import { Logger } from '@nestjs/common';
import {
  ApprovalStatus,
  ApprovalTargetType,
  Prisma,
  RedemptionStatus,
  ReceiptReviewStatus,
} from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../modules/audit/audit.service';

const APPROVAL_EXPIRY_SWEEP_BATCH_SIZE = 50;
const APPROVAL_EXPIRY_SWEEP_INTERVAL_MS = 60_000;

type OverdueApprovalRow = {
  id: string;
  tenantId: string;
  targetType: ApprovalTargetType;
  receiptId: string | null;
  redemptionId: string | null;
};

export class ApprovalExpiryWorkerRuntime {
  private readonly logger = new Logger(ApprovalExpiryWorkerRuntime.name);
  private timer?: NodeJS.Timeout;
  private activeSweep?: Promise<void>;
  private started = false;
  private stopping = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly batchSize = APPROVAL_EXPIRY_SWEEP_BATCH_SIZE,
    private readonly intervalMs = APPROVAL_EXPIRY_SWEEP_INTERVAL_MS,
  ) {}

  async start(): Promise<void> {
    if (this.started) {
      return;
    }

    await this.prisma.$connect();

    const initialSweep = this.runSweep();
    this.activeSweep = initialSweep;

    await initialSweep.finally(() => {
      if (this.activeSweep === initialSweep) {
        this.activeSweep = undefined;
      }
    });

    this.timer = setInterval(() => {
      this.scheduleSweep();
    }, this.intervalMs);
    this.timer.unref?.();
    this.started = true;
  }

  async stop(): Promise<void> {
    if (this.stopping) {
      return;
    }

    this.stopping = true;

    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }

    await this.activeSweep?.catch(() => undefined);
    await this.prisma.$disconnect();

    this.activeSweep = undefined;
    this.started = false;
    this.stopping = false;
  }

  private scheduleSweep(): void {
    if (this.stopping || this.activeSweep) {
      return;
    }

    const sweep = this.runSweep();
    this.activeSweep = sweep;

    void sweep
      .catch((error) => {
        if (this.stopping) {
          return;
        }

        this.logger.error(
          'Approval expiry sweep failed',
          error instanceof Error ? error.stack : String(error),
        );
      })
      .finally(() => {
        if (this.activeSweep === sweep) {
          this.activeSweep = undefined;
        }
      });
  }

  private async runSweep(): Promise<void> {
    if (this.stopping) {
      return;
    }

    await expireOverdueApprovals(
      this.prisma,
      this.auditService,
      this.batchSize,
    );
  }
}

export async function expireOverdueApprovals(
  prisma: PrismaService,
  auditService: AuditService,
  batchSize = APPROVAL_EXPIRY_SWEEP_BATCH_SIZE,
): Promise<number> {
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const overdue = await tx.$queryRaw<OverdueApprovalRow[]>(Prisma.sql`
      SELECT "id", "tenantId", "targetType", "receiptId", "redemptionId"
      FROM "Approval"
      WHERE "status" = 'PENDING'
        AND "expiresAt" <= ${now}
      ORDER BY "expiresAt" ASC, "requestedAt" ASC, "id" ASC
      LIMIT ${batchSize}
      FOR UPDATE SKIP LOCKED
    `);

    for (const approval of overdue) {
      const updated = await tx.approval.updateMany({
        where: {
          tenantId: approval.tenantId,
          id: approval.id,
          status: ApprovalStatus.PENDING,
        },
        data: {
          status: ApprovalStatus.EXPIRED,
          decidedAt: now,
          decisionReason: 'approval expired',
        },
      });

      if (updated.count !== 1) {
        continue;
      }

      if (approval.receiptId) {
        await tx.receipt.updateMany({
          where: {
            tenantId: approval.tenantId,
            id: approval.receiptId,
          },
          data: {
            reviewStatus: ReceiptReviewStatus.REJECTED,
            reviewedAt: now,
            reviewedByTenantId: null,
            reviewedBy: null,
            approvedAt: null,
            approvedByTenantId: null,
            approvedBy: null,
          },
        });
      }

      if (approval.redemptionId) {
        await tx.redemption.updateMany({
          where: {
            tenantId: approval.tenantId,
            id: approval.redemptionId,
            status: RedemptionStatus.PENDING_APPROVAL,
          },
          data: {
            status: RedemptionStatus.EXPIRED,
            rejectedAt: now,
          },
        });
      }

      await auditService.recordWithClient(tx, {
        tenantId: approval.tenantId,
        actorId: null,
        action: 'approval.expire',
        entityType: 'approval',
        entityId: approval.id,
        metadata: {
          expiredAt: now.toISOString(),
          targetType: approval.targetType,
          receiptId: approval.receiptId,
          redemptionId: approval.redemptionId,
        },
      });
    }

    return overdue.length;
  });
}
