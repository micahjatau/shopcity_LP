import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OutboxEventStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { OUTBOX_RETRY_ATTEMPTS } from '../../jobs/outbox.constants';
import { FraudService } from '../fraud/fraud.service';
import { OutboxWorkerRuntime } from '../../jobs/outbox-worker.runtime';

const DEFAULT_BATCH_SIZE = 10;
const MAX_BATCH_SIZE = 25;

export type OutboxBatchResult = {
  claimed: number;
  completed: number;
  retried: number;
  deadLettered: number;
};

type ClaimedOutboxEvent = {
  id: string;
  tenantId: string;
};

type ClaimedBatch = {
  events: ClaimedOutboxEvent[];
  deadLettered: number;
};

export type ScheduledOutboxEventType =
  'sms.send' | 'fraud.evaluate' | 'report.refresh';

@Injectable()
export class OutboxProcessingService {
  private readonly logger = new Logger(OutboxProcessingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly fraudService: FraudService,
    private readonly legacyHandler?: OutboxWorkerRuntime,
  ) {}

  async processBatch(
    eventType: ScheduledOutboxEventType = 'fraud.evaluate',
  ): Promise<OutboxBatchResult> {
    const now = new Date();
    const batchSize = this.batchSize(eventType);
    const staleCutoff = new Date(
      now.getTime() -
        this.config.get<number>('OUTBOX_RECOVERY_THRESHOLD_MS', 60_000),
    );
    const retryDelayMs = this.config.get<number>(
      'OUTBOX_RETRY_DELAY_MS',
      30_000,
    );
    const smsNotBefore =
      eventType === 'sms.send' ? this.smsNotBeforeCutoff() : undefined;

    const batch = await this.claimBatch(
      eventType,
      now,
      staleCutoff,
      batchSize,
      smsNotBefore,
    );
    const result: OutboxBatchResult = {
      claimed: batch.events.length + batch.deadLettered,
      completed: 0,
      retried: 0,
      deadLettered: batch.deadLettered,
    };

    for (const event of batch.events) {
      try {
        if (eventType === 'fraud.evaluate') {
          await this.fraudService.processOutboxEvent(event.tenantId, event.id);
        } else {
          if (!this.legacyHandler) {
            throw new Error(`No scheduled handler configured for ${eventType}`);
          }
          await this.legacyHandler.processOutboxEvent(event);
          const finalState = await this.prisma.outboxEvent.findUnique({
            where: { tenantId_id: { tenantId: event.tenantId, id: event.id } },
            select: { status: true, processedAt: true, deadLetteredAt: true },
          });
          if (finalState?.deadLetteredAt) {
            result.deadLettered += 1;
          } else if (
            finalState?.processedAt ||
            finalState?.status === OutboxEventStatus.COMPLETED
          ) {
            result.completed += 1;
          } else if (finalState?.status === OutboxEventStatus.FAILED) {
            result.retried += 1;
          }
          continue;
        }
        result.completed += 1;
      } catch (error) {
        const deadLettered = await this.recordFailure(
          event,
          retryDelayMs,
          eventType,
        );
        if (deadLettered) result.deadLettered += 1;
        else result.retried += 1;
        this.logger.warn(
          `Fraud outbox event ${event.id} failed (${safeErrorName(error)}).`,
        );
      }
    }

    return result;
  }

  async processAllBatches(): Promise<OutboxBatchResult> {
    this.smsNotBeforeCutoff();
    const results = await Promise.all([
      this.processBatch('sms.send'),
      this.processBatch('fraud.evaluate'),
      this.processBatch('report.refresh'),
    ]);
    return results.reduce(
      (total, result) => ({
        claimed: total.claimed + result.claimed,
        completed: total.completed + result.completed,
        retried: total.retried + result.retried,
        deadLettered: total.deadLettered + result.deadLettered,
      }),
      { claimed: 0, completed: 0, retried: 0, deadLettered: 0 },
    );
  }

  async pollDeliveryReportsOnce(): Promise<number> {
    if (!this.legacyHandler) {
      throw new Error('Delivery-report processor is not configured');
    }
    return this.legacyHandler.pollDeliveryReportsOnce();
  }

  private smsNotBeforeCutoff(): Date {
    const configured = this.config.get<string | Date>(
      'SCHEDULED_SMS_NOT_BEFORE',
    );
    const cutoff =
      configured instanceof Date ? configured : new Date(configured ?? '');
    if (!configured || Number.isNaN(cutoff.getTime())) {
      throw new Error('Scheduled SMS cutoff is not configured');
    }
    return cutoff;
  }

  private batchSize(eventType: ScheduledOutboxEventType): number {
    const configured = this.config.get<number>(
      'CRON_OUTBOX_BATCH_SIZE',
      DEFAULT_BATCH_SIZE,
    );
    const eventLimit = eventType === 'fraud.evaluate' ? MAX_BATCH_SIZE : 1;
    return Math.max(1, Math.min(eventLimit, Math.trunc(configured)));
  }

  private async claimBatch(
    eventType: ScheduledOutboxEventType,
    now: Date,
    staleCutoff: Date,
    batchSize: number,
    smsNotBefore?: Date,
  ): Promise<ClaimedBatch> {
    return this.prisma.$transaction(async (tx) => {
      const exhausted = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        WITH candidates AS (
          SELECT "id"
          FROM "OutboxEvent"
          WHERE "eventType" = ${eventType}
            AND "deadLetteredAt" IS NULL
            AND "processedAt" IS NULL
            ${eventType === 'sms.send' ? Prisma.sql`AND "createdAt" >= ${smsNotBefore}` : Prisma.empty}
            AND "attempts" >= ${OUTBOX_RETRY_ATTEMPTS}
            AND (
              ("status" IN ('PENDING', 'FAILED') AND ("nextAttemptAt" IS NULL OR "nextAttemptAt" <= ${now}))
              OR ("status" = 'QUEUED' AND "updatedAt" <= ${staleCutoff})
              OR ("status" = 'PUBLISHED' AND COALESCE("publishedAt", "updatedAt") <= ${staleCutoff})
            )
          ORDER BY "createdAt" ASC, "id" ASC
          LIMIT ${batchSize}
          FOR UPDATE SKIP LOCKED
        )
        UPDATE "OutboxEvent" AS event
        SET "status" = 'FAILED',
            "deadLetteredAt" = ${now},
            "nextAttemptAt" = NULL,
            "failureCategory" = 'retry-budget-exhausted',
            "updatedAt" = ${now}
        FROM candidates
        WHERE event."id" = candidates."id"
        RETURNING event."id"
      `);
      const remaining = Math.max(0, batchSize - exhausted.length);
      if (remaining === 0) {
        return { events: [], deadLettered: exhausted.length };
      }

      const events = await tx.$queryRaw<ClaimedOutboxEvent[]>(Prisma.sql`
        WITH candidates AS (
          SELECT "id"
          FROM "OutboxEvent"
          WHERE "eventType" = ${eventType}
            AND "deadLetteredAt" IS NULL
            AND "processedAt" IS NULL
            ${eventType === 'sms.send' ? Prisma.sql`AND "createdAt" >= ${smsNotBefore}` : Prisma.empty}
            AND "attempts" < ${OUTBOX_RETRY_ATTEMPTS}
            AND (
              ("status" IN ('PENDING', 'FAILED') AND ("nextAttemptAt" IS NULL OR "nextAttemptAt" <= ${now}))
              OR ("status" = 'QUEUED' AND "updatedAt" <= ${staleCutoff})
              OR ("status" = 'PUBLISHED' AND COALESCE("publishedAt", "updatedAt") <= ${staleCutoff})
            )
          ORDER BY "createdAt" ASC, "id" ASC
          LIMIT ${remaining}
          FOR UPDATE SKIP LOCKED
        )
        UPDATE "OutboxEvent" AS event
        SET "status" = 'QUEUED',
            "attempts" = event."attempts" + 1,
            "nextAttemptAt" = NULL,
            "updatedAt" = ${now}
        FROM candidates
        WHERE event."id" = candidates."id"
        RETURNING event."id", event."tenantId"
      `);
      return { events, deadLettered: exhausted.length };
    });
  }

  private async recordFailure(
    event: ClaimedOutboxEvent,
    retryDelayMs: number,
    eventType: ScheduledOutboxEventType,
  ): Promise<boolean> {
    const deadLetteredAt =
      (
        await this.prisma.outboxEvent.findUnique({
          where: { tenantId_id: { tenantId: event.tenantId, id: event.id } },
          select: { attempts: true },
        })
      )?.attempts ?? OUTBOX_RETRY_ATTEMPTS;
    const isDeadLetter = deadLetteredAt >= OUTBOX_RETRY_ATTEMPTS;
    const failedAt = new Date();

    const updated = await this.prisma.outboxEvent.updateMany({
      where: {
        tenantId: event.tenantId,
        id: event.id,
        processedAt: null,
        deadLetteredAt: null,
        status: {
          in: [OutboxEventStatus.QUEUED, OutboxEventStatus.PUBLISHED],
        },
      },
      data: {
        status: OutboxEventStatus.FAILED,
        nextAttemptAt: isDeadLetter
          ? null
          : new Date(failedAt.getTime() + retryDelayMs),
        deadLetteredAt: isDeadLetter ? failedAt : null,
        failureCategory: isDeadLetter
          ? 'retry-budget-exhausted'
          : eventType === 'fraud.evaluate'
            ? 'fraud-evaluation'
            : eventType.replace('.', '-'),
      },
    });

    return isDeadLetter && updated.count === 1;
  }
}

function safeErrorName(error: unknown): string {
  return error instanceof Error ? error.name : 'UnknownError';
}
