import { Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../modules/audit/audit.service';
import {
  expireApproval,
  type ApprovalExpiryRecord,
} from '../common/approval-expiry';

const APPROVAL_EXPIRY_SWEEP_BATCH_SIZE = 50;
const APPROVAL_EXPIRY_SWEEP_INTERVAL_MS = 60_000;

type OverdueApprovalRow = ApprovalExpiryRecord;

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
      SELECT
        a."id",
        a."tenantId",
        a."targetType",
        a."receiptId",
        a."redemptionId",
        r."receiptId" AS "redemptionReceiptId"
      FROM "Approval" a
      LEFT JOIN "Redemption" r
        ON r."tenantId" = a."tenantId"
       AND r."id" = a."redemptionId"
      WHERE a."status" = 'PENDING'
        AND a."expiresAt" <= ${now}
      ORDER BY a."expiresAt" ASC, a."requestedAt" ASC, a."id" ASC
      LIMIT ${batchSize}
      FOR UPDATE OF a SKIP LOCKED
    `);

    for (const approval of overdue) {
      await expireApproval(tx, auditService, approval, now, null, {
        tenantId: approval.tenantId,
        id: 'approval-expiry-worker',
      });
    }

    return overdue.length;
  });
}
