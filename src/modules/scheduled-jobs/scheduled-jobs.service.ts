import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, type ScheduledJobRun } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { expireOverdueApprovals } from '../../jobs/approval-expiry.worker';
import { CreditExpiryService } from '../credit-expiry/credit-expiry.service';
import { ExpiryReminderService } from '../credit-expiry/expiry-reminder.service';
import { OutboxProcessingService } from '../outbox-processing/outbox-processing.service';
import { ReportsService } from '../reports/reports.service';
import { ReportMaterializerService } from '../reports/report-materializer.service';

const MAX_JOB_BATCH = 25;
const REPORT_BATCH_SIZE = 1;
const PILOT_HISTORY_BATCH_SIZE = 10;
const PILOT_HISTORY_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
const SCHEDULED_CURSOR_LEASE_MS = 7 * 60_000;
const F7_DEFAULT_EXECUTION_BUDGET_MS = 240_000;
const F7_MAX_EXECUTION_BUDGET_MS = 240_000;
const F7_MINIMUM_SAFE_WORK_MS = 35_000; // 30s transaction + 5s finalization reserve
const F7_FINALIZATION_RESERVE_MS = 5_000;
const FLOW_IDS = [
  'F0',
  'F1',
  'F2',
  'F3',
  'F4',
  'F5',
  'F6',
  'F7',
  'F8',
  'F9',
  'F10',
] as const;
export type ScheduledFlowId = (typeof FLOW_IDS)[number];

export interface ScheduledFlowResult {
  flow: ScheduledFlowId;
  counters: Record<string, number | string | boolean | null>;
}

class ScheduledJobExecutionFailure extends Error {
  constructor(readonly safeResult: Prisma.InputJsonObject) {
    super('Scheduled job execution failed.');
    this.name = 'ScheduledJobExecutionFailure';
  }
}

class ScheduledJobDeadlineExceeded extends ScheduledJobExecutionFailure {
  constructor(safeResult: Prisma.InputJsonObject) {
    super(safeResult);
    this.name = 'ScheduledJobDeadlineExceeded';
  }
}

@Injectable()
export class ScheduledJobsService {
  private readonly logger = new Logger(ScheduledJobsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
    private readonly creditExpiry: CreditExpiryService,
    private readonly expiryReminder: ExpiryReminderService,
    private readonly outbox: OutboxProcessingService,
    private readonly reports: ReportsService,
    private readonly reportMaterializer: ReportMaterializerService,
  ) {}

  isFlow(value: string): value is ScheduledFlowId {
    return FLOW_IDS.includes(value as ScheduledFlowId);
  }

  async run(
    flow: ScheduledFlowId,
    idempotencyKey: string,
    requestStartedAt = performance.now(),
  ): Promise<ScheduledJobRun> {
    const environment = this.config
      .get<string>('SCHEDULER_ENVIRONMENT')
      ?.trim();
    if (!environment)
      throw new Error('SCHEDULER_ENVIRONMENT is not configured');

    const existing = await this.prisma.scheduledJobRun.findUnique({
      where: {
        environment_flow_idempotencyKey: { environment, flow, idempotencyKey },
      },
    });
    if (existing?.status === 'COMPLETED' || existing?.status === 'FAILED') {
      return existing;
    }
    const staleRunCutoff = new Date(Date.now() - 10 * 60_000);
    if (existing?.status === 'RUNNING' && existing.startedAt > staleRunCutoff)
      return existing;

    let run: ScheduledJobRun;
    if (existing) {
      const reclaimed = await this.prisma.scheduledJobRun.updateMany({
        where: {
          id: existing.id,
          status: 'RUNNING',
          startedAt: { lte: staleRunCutoff },
        },
        data: {
          status: 'RUNNING',
          startedAt: new Date(),
          finishedAt: null,
          failureCategory: null,
          result: Prisma.JsonNull,
        },
      });
      if (reclaimed.count !== 1)
        return await this.prisma.scheduledJobRun.findUniqueOrThrow({
          where: { id: existing.id },
        });
      run = await this.prisma.scheduledJobRun.findUniqueOrThrow({
        where: { id: existing.id },
      });
    } else {
      try {
        run = await this.prisma.scheduledJobRun.create({
          data: { environment, flow, idempotencyKey, status: 'RUNNING' },
        });
      } catch (error) {
        if (!isUniqueConflict(error)) throw error;
        return this.prisma.scheduledJobRun.findUniqueOrThrow({
          where: {
            environment_flow_idempotencyKey: {
              environment,
              flow,
              idempotencyKey,
            },
          },
        });
      }
    }

    try {
      const result = await this.execute(flow, requestStartedAt);
      return await this.prisma.scheduledJobRun.update({
        where: { id: run.id },
        data: {
          status: 'COMPLETED',
          finishedAt: new Date(),
          result: result as unknown as Prisma.InputJsonValue,
          failureCategory: null,
        },
      });
    } catch (error) {
      this.logger.error(
        `Scheduled flow ${flow} failed (${safeErrorName(error)}).`,
      );
      return this.prisma.scheduledJobRun.update({
        where: { id: run.id },
        data: {
          status: 'FAILED',
          finishedAt: new Date(),
          failureCategory: safeErrorName(error),
          result:
            error instanceof ScheduledJobExecutionFailure
              ? error.safeResult
              : Prisma.JsonNull,
        },
      });
    }
  }

  private async execute(
    flow: ScheduledFlowId,
    requestStartedAt: number,
  ): Promise<ScheduledFlowResult> {
    const now = new Date();
    const batchSize = this.batchSize();
    switch (flow) {
      case 'F0': {
        const expired = await expireOverdueApprovals(
          this.prisma,
          this.audit,
          batchSize,
        );
        return { flow, counters: { expired } };
      }
      case 'F1': {
        const result = await this.creditExpiry.expireDueCredit({
          now,
          batchSize,
        });
        return {
          flow,
          counters: {
            examined: result.examined,
            expiredLots: result.expiredLots,
            expiredAmountKobo: result.expiredAmountKobo.toString(),
          },
        };
      }
      case 'F2': {
        const result = await this.expiryReminder.enqueueDueReminders({
          now,
          reminderDays: this.positiveConfig('CREDIT_EXPIRY_REMINDER_DAYS', 7),
          batchSize,
        });
        return {
          flow,
          counters: {
            customers: result.customers,
            amountKobo: result.amountKobo.toString(),
          },
        };
      }
      case 'F3': {
        const result = await this.outbox.processBatch('sms.send');
        return { flow, counters: { ...result } };
      }
      case 'F4': {
        const result = await this.outbox.processBatch('fraud.evaluate');
        return { flow, counters: { ...result } };
      }
      case 'F7': {
        const executionBudgetMs = this.f7ExecutionBudgetMs();
        return this.materializeNextTenant(
          flow,
          now,
          requestStartedAt,
          requestStartedAt + executionBudgetMs,
          executionBudgetMs,
        );
      }
      case 'F8':
        return this.captureNextPilotSnapshot(flow, now);
      case 'F9': {
        const cutoff = new Date(now.getTime() - PILOT_HISTORY_RETENTION_MS);
        const pruned = await this.prisma.$executeRaw(Prisma.sql`
          WITH stale AS (
            SELECT "id"
            FROM "PilotOperationsSnapshot"
            WHERE "capturedAt" < ${cutoff}
            ORDER BY "capturedAt" ASC, "id" ASC
            LIMIT ${batchSize}
            FOR UPDATE SKIP LOCKED
          )
          DELETE FROM "PilotOperationsSnapshot" AS snapshot
          USING stale
          WHERE snapshot."id" = stale."id"
        `);
        return { flow, counters: { pruned } };
      }
      case 'F5': {
        const result = await this.outbox.processBatch('report.refresh');
        return { flow, counters: { ...result } };
      }
      case 'F6': {
        const polled = await this.outbox.pollDeliveryReportsOnce();
        return { flow, counters: { polled } };
      }
      case 'F10': {
        const result = await this.outbox.processAllBatches();
        return { flow, counters: { ...result } };
      }
    }
  }

  private async materializeNextTenant(
    flow: ScheduledFlowId,
    now: Date,
    requestStartedAt: number,
    deadlineAt: number,
    executionBudgetMs: number,
  ): Promise<ScheduledFlowResult> {
    const deadlineSkipped = (cursor: string | null) => ({
      flow,
      counters: {
        skipped: true,
        reason: 'execution-deadline',
        cursor,
        executionBudgetMs,
        elapsedMs: this.elapsedF7Ms(requestStartedAt),
      },
    });
    if (this.remainingF7BudgetMs(deadlineAt) < F7_MINIMUM_SAFE_WORK_MS)
      return deadlineSkipped(null);

    const cursor = await this.acquireCursor('report-materialization');
    if (!cursor)
      return {
        flow,
        counters: {
          skipped: true,
          reason: 'lease-held',
          executionBudgetMs,
          elapsedMs: this.elapsedF7Ms(requestStartedAt),
        },
      };
    try {
      if (this.remainingF7BudgetMs(deadlineAt) < F7_MINIMUM_SAFE_WORK_MS)
        return deadlineSkipped(cursor.cursor);

      const rows = await this.prisma.tenant.findMany({
        ...(cursor.cursor ? { where: { id: { gt: cursor.cursor } } } : {}),
        orderBy: { id: 'asc' },
        take: REPORT_BATCH_SIZE,
        select: { id: true },
      });
      const tenant =
        rows[0] ??
        (cursor.cursor
          ? (
              await this.prisma.tenant.findMany({
                orderBy: { id: 'asc' },
                take: 1,
                select: { id: true },
              })
            )[0]
          : undefined);
      if (!tenant)
        return {
          flow,
          counters: {
            tenantCount: 0,
            cursor: cursor.cursor,
            executionBudgetMs,
            elapsedMs: this.elapsedF7Ms(requestStartedAt),
          },
        };
      if (this.remainingF7BudgetMs(deadlineAt) < F7_MINIMUM_SAFE_WORK_MS)
        return deadlineSkipped(cursor.cursor);

      try {
        await this.reportMaterializer.rebuildTenant(tenant.id, {
          materializedAt: now,
          asOf: now,
        });
      } catch (error) {
        throw new ScheduledJobExecutionFailure({
          flow,
          failedTenantId: tenant.id,
          failureCategory: safeErrorName(error),
        });
      }
      if (this.remainingF7BudgetMs(deadlineAt) <= F7_FINALIZATION_RESERVE_MS) {
        throw new ScheduledJobDeadlineExceeded({
          flow,
          failedTenantId: tenant.id,
          failureCategory: 'ExecutionDeadlineExceeded',
        });
      }
      await this.prisma.scheduledJobCursor.updateMany({
        where: { jobKey: 'report-materialization', leaseToken: cursor.token },
        data: { cursor: tenant.id },
      });
      return {
        flow,
        counters: {
          tenantCount: 1,
          cursor: tenant.id,
          executionBudgetMs,
          elapsedMs: this.elapsedF7Ms(requestStartedAt),
        },
      };
    } finally {
      await this.releaseCursor('report-materialization', cursor.token);
    }
  }

  private async captureNextPilotSnapshot(
    flow: ScheduledFlowId,
    now: Date,
  ): Promise<ScheduledFlowResult> {
    const cursor = await this.acquireCursor('pilot-operations-history');
    if (!cursor)
      return { flow, counters: { skipped: true, reason: 'lease-held' } };
    try {
      const tenants = await this.prisma.tenant.findMany({
        ...(cursor.cursor ? { where: { id: { gt: cursor.cursor } } } : {}),
        orderBy: { id: 'asc' },
        take: PILOT_HISTORY_BATCH_SIZE,
        select: { id: true },
      });
      const selected =
        tenants.length > 0
          ? tenants
          : cursor.cursor
            ? await this.prisma.tenant.findMany({
                orderBy: { id: 'asc' },
                take: PILOT_HISTORY_BATCH_SIZE,
                select: { id: true },
              })
            : [];
      let captured = 0;
      let failures = 0;
      for (const tenant of selected) {
        try {
          await this.reports.recordPilotOperationsSnapshot(tenant.id, now);
          captured += 1;
        } catch {
          failures += 1;
        }
      }
      if (selected.length > 0) {
        await this.prisma.scheduledJobCursor.updateMany({
          where: {
            jobKey: 'pilot-operations-history',
            leaseToken: cursor.token,
          },
          data: { cursor: selected.at(-1)?.id ?? cursor.cursor },
        });
      }
      return {
        flow,
        counters: {
          tenantCount: selected.length,
          captured,
          failures,
          cursor: selected.at(-1)?.id ?? cursor.cursor,
        },
      };
    } finally {
      await this.releaseCursor('pilot-operations-history', cursor.token);
    }
  }

  private async acquireCursor(
    jobKey: string,
  ): Promise<{ cursor: string | null; token: string } | null> {
    const now = new Date();
    const token = randomUUID();
    try {
      await this.prisma.scheduledJobCursor.create({
        data: {
          jobKey,
          cursor: null,
          leaseToken: token,
          leaseExpiresAt: new Date(now.getTime() + SCHEDULED_CURSOR_LEASE_MS),
        },
      });
      return { cursor: null, token };
    } catch (error) {
      if (!isUniqueConflict(error)) throw error;
    }
    const acquired = await this.prisma.scheduledJobCursor.updateMany({
      where: {
        jobKey,
        OR: [{ leaseExpiresAt: null }, { leaseExpiresAt: { lte: now } }],
      },
      data: {
        leaseToken: token,
        leaseExpiresAt: new Date(now.getTime() + SCHEDULED_CURSOR_LEASE_MS),
      },
    });
    if (acquired.count !== 1) return null;
    const state = await this.prisma.scheduledJobCursor.findUniqueOrThrow({
      where: { jobKey },
    });
    return { cursor: state.cursor, token };
  }

  private releaseCursor(jobKey: string, token: string) {
    return this.prisma.scheduledJobCursor.updateMany({
      where: { jobKey, leaseToken: token },
      data: { leaseToken: null, leaseExpiresAt: null },
    });
  }

  private batchSize(): number {
    return Math.max(
      1,
      Math.min(
        MAX_JOB_BATCH,
        this.positiveConfig('SCHEDULED_JOB_BATCH_SIZE', 10),
      ),
    );
  }

  private positiveConfig(key: string, fallback: number): number {
    const value = Number(this.config.get(key, fallback));
    return Number.isInteger(value) && value > 0 ? value : fallback;
  }

  private f7ExecutionBudgetMs(): number {
    const value = Number(
      this.config.get(
        'SCHEDULED_F7_EXECUTION_BUDGET_MS',
        F7_DEFAULT_EXECUTION_BUDGET_MS,
      ),
    );
    return Number.isInteger(value) &&
      value >= 1_000 &&
      value <= F7_MAX_EXECUTION_BUDGET_MS
      ? value
      : F7_DEFAULT_EXECUTION_BUDGET_MS;
  }

  private remainingF7BudgetMs(deadlineAt: number): number {
    return deadlineAt - performance.now();
  }

  private elapsedF7Ms(requestStartedAt: number): number {
    return Math.max(0, Math.round(performance.now() - requestStartedAt));
  }
}

function isUniqueConflict(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}

function safeErrorName(error: unknown): string {
  return error instanceof Error ? error.name : 'UnknownError';
}
