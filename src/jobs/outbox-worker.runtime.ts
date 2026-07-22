import { Logger } from '@nestjs/common';
import { OutboxEventStatus, Prisma } from '@prisma/client';
import { type Job, type Queue, type Worker } from 'bullmq';
import { envValidationSchema } from '../config/env.validation';
import { PrismaService } from '../database/prisma.service';
import { createOutboxQueue, publishOutboxEvent } from './outbox.publisher';
import { createOutboxWorker, type OutboxJobPayload } from './outbox.worker';
import {
  DeterministicSmsProvider,
  type SmsProvider,
} from './sms.provider';

export interface WorkerConfig {
  redisUrl: string;
  publishBatchSize: number;
  publishIntervalMs: number;
  retryDelayMs: number;
  recoveryThresholdMs: number;
}

export function loadWorkerConfig(env = process.env): WorkerConfig {
  const result = envValidationSchema.validate(env, {
    allowUnknown: true,
    abortEarly: false,
  });

  if (result.error) {
    throw new Error(`Invalid worker environment: ${result.error.message}`);
  }

  const values = result.value as Record<string, unknown>;

  return {
    redisUrl: String(values.REDIS_URL),
    publishBatchSize: Number(values.OUTBOX_PUBLISH_BATCH_SIZE),
    publishIntervalMs: Number(values.OUTBOX_PUBLISH_INTERVAL_MS),
    retryDelayMs: Number(values.OUTBOX_RETRY_DELAY_MS),
    recoveryThresholdMs: Number(values.OUTBOX_RECOVERY_THRESHOLD_MS),
  };
}

type OutboxClaimRow = {
  id: string;
};

export class OutboxWorkerRuntime {
  private readonly logger = new Logger(OutboxWorkerRuntime.name);
  private queue?: Queue;
  private worker?: Worker<OutboxJobPayload>;
  private publisherTimer?: NodeJS.Timeout;
  private started = false;
  private stopping = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: WorkerConfig,
    private readonly smsProvider: SmsProvider = new DeterministicSmsProvider(),
  ) {}

  async start(): Promise<void> {
    if (this.started) {
      return;
    }

    await this.prisma.$connect();

    this.queue = createOutboxQueue(this.config.redisUrl);
    this.worker = createOutboxWorker(this.config.redisUrl, (job) =>
      this.handleJob(job),
    );

    this.worker.on('failed', (job, error) => {
      this.logger.warn(
        `Outbox job ${job?.id ?? '<unknown>'} failed: ${error.message}`,
      );
    });

    this.worker.on('error', (error) => {
      this.logger.error(
        'Outbox worker error',
        error instanceof Error ? error.stack : String(error),
      );
    });

    await this.recoverAndPublishOnce();

    this.publisherTimer = setInterval(() => {
      void this.recoverAndPublishOnce().catch((error) => {
        this.logger.error(
          'Outbox recovery loop failed',
          error instanceof Error ? error.stack : String(error),
        );
      });
    }, this.config.publishIntervalMs);

    this.publisherTimer.unref?.();
    this.started = true;
  }

  async stop(): Promise<void> {
    if (this.stopping) {
      return;
    }

    this.stopping = true;
    if (this.publisherTimer) {
      clearInterval(this.publisherTimer);
      this.publisherTimer = undefined;
    }

    if (this.worker) {
      await this.worker.close().catch((error) => {
        this.logger.warn(
          `Outbox worker close failed: ${error instanceof Error ? error.message : String(error)}`,
        );
      });
    }

    if (this.queue) {
      await this.queue.close().catch((error) => {
        this.logger.warn(
          `Outbox queue close failed: ${error instanceof Error ? error.message : String(error)}`,
        );
      });
    }

    await this.prisma.$disconnect();
    this.started = false;
  }

  private async recoverAndPublishOnce(): Promise<void> {
    if (this.stopping || !this.queue) {
      return;
    }

    const now = new Date();
    const staleCutoff = new Date(now.getTime() - this.config.recoveryThresholdMs);

    const outboxRows = await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.$queryRaw<OutboxClaimRow[]>`
        SELECT id
        FROM "OutboxEvent"
        WHERE (
          ("status" IN ('PENDING', 'FAILED') AND ("nextAttemptAt" IS NULL OR "nextAttemptAt" <= ${now}))
          OR ("status" = 'QUEUED' AND "updatedAt" <= ${staleCutoff})
        )
        ORDER BY "createdAt" ASC
        LIMIT ${this.config.publishBatchSize}
        FOR UPDATE SKIP LOCKED
      `;

      if (claimed.length === 0) {
        return [] as Awaited<ReturnType<typeof tx.outboxEvent.findMany>>;
      }

      const ids = claimed.map((row) => row.id);

      await tx.outboxEvent.updateMany({
        where: { id: { in: ids } },
        data: {
          status: OutboxEventStatus.QUEUED,
          attempts: { increment: 1 },
          nextAttemptAt: null,
        },
      });

      return tx.outboxEvent.findMany({
        where: { id: { in: ids } },
        include: { smsMessage: true },
        orderBy: { createdAt: 'asc' },
      });
    });

    for (const outboxEvent of outboxRows) {
      try {
        await publishOutboxEvent(this.queue, {
          id: outboxEvent.id,
          tenantId: outboxEvent.tenantId,
          aggregateType: outboxEvent.aggregateType,
          aggregateId: outboxEvent.aggregateId,
          eventType: outboxEvent.eventType,
          payload: outboxEvent.payload,
        });

        await this.prisma.outboxEvent.update({
          where: {
            tenantId_id: { tenantId: outboxEvent.tenantId, id: outboxEvent.id },
          },
          data: {
            status: OutboxEventStatus.PUBLISHED,
            publishedAt: now,
            nextAttemptAt: null,
          },
        });
      } catch (error) {
        await this.prisma.outboxEvent.update({
          where: {
            tenantId_id: { tenantId: outboxEvent.tenantId, id: outboxEvent.id },
          },
          data: {
            status: OutboxEventStatus.FAILED,
            nextAttemptAt: new Date(now.getTime() + this.config.retryDelayMs),
          },
        });

        this.logger.warn(
          `Failed to publish outbox event ${outboxEvent.id}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }

  private async handleJob(job: Job<OutboxJobPayload>): Promise<void> {
    const outboxEvent = await this.prisma.outboxEvent.findUnique({
      where: {
        tenantId_id: { tenantId: job.data.tenantId, id: job.data.id },
      },
      include: { smsMessage: true },
    });

    if (!outboxEvent) {
      this.logger.warn(`Outbox event ${job.data.id} was not found`);
      return;
    }

    await this.prisma.outboxEvent.update({
      where: {
        tenantId_id: { tenantId: outboxEvent.tenantId, id: outboxEvent.id },
      },
      data: {
        status: OutboxEventStatus.PUBLISHED,
        publishedAt: outboxEvent.publishedAt ?? new Date(),
      },
    });

    const smsMessage = outboxEvent.smsMessage;
    if (!smsMessage) {
      throw new Error(`SmsMessage not found for outbox event ${outboxEvent.id}`);
    }

    if (
      smsMessage.status === 'DELIVERED' ||
      smsMessage.status === 'SUPPRESSED'
    ) {
      return;
    }

    const now = new Date();
    try {
      const result = await this.smsProvider.send({
        tenantId: outboxEvent.tenantId,
        receiptId: smsMessage.receiptId,
        outboxEventId: outboxEvent.id,
        phoneE164: smsMessage.phoneE164,
        template: smsMessage.template,
        payload: normalizeJsonPayload(smsMessage.payload),
      });

      if (result.status === 'FAILED') {
        throw new Error(result.errorMessage ?? 'SMS delivery failed');
      }

      await this.prisma.smsMessage.update({
        where: {
          tenantId_receiptId: {
            tenantId: smsMessage.tenantId,
            receiptId: smsMessage.receiptId,
          },
        },
        data: mapSmsDispatchResult(result, now),
      });
    } catch (error) {
      await this.prisma.smsMessage.update({
        where: {
          tenantId_receiptId: {
            tenantId: smsMessage.tenantId,
            receiptId: smsMessage.receiptId,
          },
        },
        data: {
          status: 'FAILED',
          attempts: { increment: 1 },
          failedAt: now,
          lastError:
            error instanceof Error ? error.message : 'SMS delivery failed',
        },
      });

      throw error;
    }
  }
}

function normalizeJsonPayload(payload: Prisma.JsonValue): Record<string, unknown> {
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    return payload as Record<string, unknown>;
  }

  return { value: payload as unknown as Record<string, unknown> };
}

function mapSmsDispatchResult(
  result: { status: string; providerMessageId?: string; errorMessage?: string },
  now: Date,
): Prisma.SmsMessageUpdateInput {
  switch (result.status) {
    case 'DELIVERED':
      return {
        status: 'DELIVERED',
        attempts: { increment: 1 },
        providerMessageId: result.providerMessageId ?? null,
        sentAt: now,
        deliveredAt: now,
        failedAt: null,
        suppressedAt: null,
        lastError: null,
      };
    case 'SENT':
      return {
        status: 'SENT',
        attempts: { increment: 1 },
        providerMessageId: result.providerMessageId ?? null,
        sentAt: now,
        failedAt: null,
        suppressedAt: null,
        lastError: null,
      };
    case 'SUPPRESSED':
      return {
        status: 'SUPPRESSED',
        attempts: { increment: 1 },
        providerMessageId: result.providerMessageId ?? null,
        suppressedAt: now,
        failedAt: null,
        lastError: result.errorMessage ?? null,
      };
    case 'FAILED':
    default:
      return {
        status: 'FAILED',
        attempts: { increment: 1 },
        providerMessageId: result.providerMessageId ?? null,
        failedAt: now,
        lastError: result.errorMessage ?? 'SMS delivery failed',
      };
  }
}
