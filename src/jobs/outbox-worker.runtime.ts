import { Logger } from '@nestjs/common';
import { OutboxEventStatus, Prisma } from '@prisma/client';
import { type Job, type Queue, type Worker } from 'bullmq';
import { envValidationSchema } from '../config/env.validation';
import { PrismaService } from '../database/prisma.service';
import { OUTBOX_RETRY_ATTEMPTS } from './outbox.constants';
import { createOutboxQueue, publishOutboxEvent } from './outbox.publisher';
import { createOutboxWorker, type OutboxJobPayload } from './outbox.worker';
import type { SmsProvider } from './sms.provider';

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
  private activeRecovery?: Promise<void>;
  private started = false;
  private stopping = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: WorkerConfig,
    private readonly smsProvider: SmsProvider,
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

    const initialRecovery = this.runRecoveryCycle();
    this.activeRecovery = initialRecovery;

    await initialRecovery.finally(() => {
      if (this.activeRecovery === initialRecovery) {
        this.activeRecovery = undefined;
      }
    });

    this.publisherTimer = setInterval(() => {
      this.scheduleRecoveryCycle();
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

    await this.activeRecovery?.catch(() => undefined);

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
    this.queue = undefined;
    this.worker = undefined;
    this.activeRecovery = undefined;
    this.started = false;
    this.stopping = false;
  }

  private scheduleRecoveryCycle(): void {
    if (this.stopping || !this.queue || this.activeRecovery) {
      return;
    }

    const recovery = this.runRecoveryCycle();
    this.activeRecovery = recovery;

    void recovery
      .catch((error) => {
        if (this.stopping) {
          return;
        }

        this.logger.error(
          'Outbox recovery loop failed',
          error instanceof Error ? error.stack : String(error),
        );
      })
      .finally(() => {
        if (this.activeRecovery === recovery) {
          this.activeRecovery = undefined;
        }
      });
  }

  private async runRecoveryCycle(): Promise<void> {
    if (this.stopping) {
      return;
    }

    await this.recoverAndPublishOnce();
  }

  private async recoverAndPublishOnce(): Promise<void> {
    if (this.stopping || !this.queue) {
      return;
    }

    const now = new Date();
    const staleCutoff = new Date(
      now.getTime() - this.config.recoveryThresholdMs,
    );

    const outboxRows = await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.$queryRaw<OutboxClaimRow[]>`
        SELECT id
        FROM "OutboxEvent"
        WHERE "eventType" = 'sms.send'
          AND "deadLetteredAt" IS NULL
          AND (
            ("status" IN ('PENDING', 'FAILED') AND ("nextAttemptAt" IS NULL OR "nextAttemptAt" <= ${now}))
            OR ("status" = 'QUEUED' AND "updatedAt" <= ${staleCutoff})
            OR (
              "status" = 'PUBLISHED'
              AND "publishedAt" <= ${staleCutoff}
              AND EXISTS (
                SELECT 1
                FROM "SmsMessage" sm
                WHERE sm."tenantId" = "OutboxEvent"."tenantId"
                  AND sm."outboxEventId" = "OutboxEvent"."id"
                  AND sm."status" IN ('QUEUED', 'FAILED')
                  AND sm."deadLetteredAt" IS NULL
              )
            )
            OR (
              "status" = 'PUBLISHED'
              AND "publishedAt" <= ${staleCutoff}
              AND NOT EXISTS (
                SELECT 1
                FROM "SmsMessage" sm
                WHERE sm."tenantId" = "OutboxEvent"."tenantId"
                  AND sm."outboxEventId" = "OutboxEvent"."id"
              )
            )
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

    if (outboxEvent.deadLetteredAt) {
      job.discard();
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

    if (outboxEvent.eventType !== 'sms.send') {
      await this.markOutboxEventDeadLettered(outboxEvent, 'unsupported-event');
      job.discard();
      return;
    }

    let resolvedSmsMessage: NonNullable<typeof outboxEvent.smsMessage>;

    try {
      resolvedSmsMessage =
        outboxEvent.smsMessage ??
        (await this.createSmsMessageFromOutboxEvent(outboxEvent));
    } catch (error) {
      await this.markOutboxEventDeadLettered(
        outboxEvent,
        'invalid-payload',
        error instanceof Error ? error.message : 'SMS payload is invalid',
      );
      job.discard();
      return;
    }

    if (
      resolvedSmsMessage.deadLetteredAt ||
      resolvedSmsMessage.attempts >= OUTBOX_RETRY_ATTEMPTS
    ) {
      await this.markOutboxEventDeadLettered(
        outboxEvent,
        'dead-lettered',
        'SMS retry budget exhausted',
      );
      job.discard();
      return;
    }

    if (
      resolvedSmsMessage.status === 'SENT' ||
      resolvedSmsMessage.status === 'DELIVERED' ||
      resolvedSmsMessage.status === 'SUPPRESSED'
    ) {
      return;
    }

    const now = new Date();
    try {
      const result = await this.smsProvider.send({
        tenantId: outboxEvent.tenantId,
        receiptId: resolvedSmsMessage.receiptId,
        outboxEventId: outboxEvent.id,
        phoneE164: resolvedSmsMessage.phoneE164,
        template: resolvedSmsMessage.template,
        payload: normalizeJsonPayload(resolvedSmsMessage.payload),
      });

      if (result.status === 'FAILED') {
        const deadLetteredAt =
          result.failureCategory === 'terminal' ||
          resolvedSmsMessage.attempts + 1 >= OUTBOX_RETRY_ATTEMPTS
            ? now
            : null;

        await this.prisma.smsMessage.update({
          where: {
            tenantId_receiptId: {
              tenantId: resolvedSmsMessage.tenantId,
              receiptId: resolvedSmsMessage.receiptId,
            },
          },
          data: {
            status: 'FAILED',
            attempts: { increment: 1 },
            failedAt: now,
            lastAttemptAt: now,
            nextAttemptAt:
              deadLetteredAt === null
                ? new Date(now.getTime() + this.config.retryDelayMs)
                : null,
            deadLetteredAt,
            failureCategory: deadLetteredAt
              ? 'dead-lettered'
              : result.failureCategory === 'terminal'
                ? 'terminal-failure'
                : 'retryable-failure',
            lastError: result.errorMessage ?? 'SMS delivery failed',
          },
        });

        await this.markOutboxEventFailure(
          outboxEvent,
          deadLetteredAt ? 'dead-lettered' : 'retryable-failure',
          deadLetteredAt === null
            ? new Date(now.getTime() + this.config.retryDelayMs)
            : null,
        );

        if (deadLetteredAt) {
          job.discard();
          return;
        }

        return;
      }

      await this.prisma.smsMessage.update({
        where: {
          tenantId_receiptId: {
            tenantId: resolvedSmsMessage.tenantId,
            receiptId: resolvedSmsMessage.receiptId,
          },
        },
        data: mapSmsDispatchResult(result, now),
      });
    } catch (error) {
      const deadLetteredAt =
        resolvedSmsMessage.attempts + 1 >= OUTBOX_RETRY_ATTEMPTS ? now : null;

      await this.prisma.smsMessage.update({
        where: {
          tenantId_receiptId: {
            tenantId: resolvedSmsMessage.tenantId,
            receiptId: resolvedSmsMessage.receiptId,
          },
        },
        data: {
          status: 'FAILED',
          attempts: { increment: 1 },
          failedAt: now,
          lastAttemptAt: now,
          nextAttemptAt:
            deadLetteredAt === null
              ? new Date(now.getTime() + this.config.retryDelayMs)
              : null,
          deadLetteredAt,
          failureCategory: deadLetteredAt
            ? 'dead-lettered'
            : 'retryable-failure',
          lastError:
            error instanceof Error ? error.message : 'SMS delivery failed',
        },
      });

      await this.markOutboxEventFailure(
        outboxEvent,
        deadLetteredAt ? 'dead-lettered' : 'retryable-failure',
        deadLetteredAt === null
          ? new Date(now.getTime() + this.config.retryDelayMs)
          : null,
      );

      if (deadLetteredAt) {
        job.discard();
      }

      throw error;
    }
  }

  private async createSmsMessageFromOutboxEvent(outboxEvent: {
    id: string;
    tenantId: string;
    eventType: string;
    payload: Prisma.JsonValue;
  }) {
    if (outboxEvent.eventType !== 'sms.send') {
      throw new Error(`Unsupported outbox event type ${outboxEvent.eventType}`);
    }

    const payload = normalizeJsonPayload(outboxEvent.payload);
    const version = readNumberField(payload, 'version', 1);

    if (version !== 1) {
      throw new Error(`Unsupported SMS payload version for ${outboxEvent.id}`);
    }

    const receiptId = readStringField(payload, 'receiptId').trim();
    const phoneE164 = readStringField(payload, 'phoneE164').trim();
    const template = readStringField(payload, 'template').trim();

    if (!receiptId || !phoneE164 || !template) {
      throw new Error(
        `SmsMessage payload missing required fields for ${outboxEvent.id}`,
      );
    }

    return this.prisma.smsMessage.upsert({
      where: {
        tenantId_outboxEventId: {
          tenantId: outboxEvent.tenantId,
          outboxEventId: outboxEvent.id,
        },
      },
      create: {
        tenantId: outboxEvent.tenantId,
        receiptId,
        outboxEventId: outboxEvent.id,
        phoneE164,
        template,
        payload,
        status: 'QUEUED',
        queuedAt: new Date(),
        lastAttemptAt: null,
        nextAttemptAt: null,
        deadLetteredAt: null,
        failureCategory: null,
      },
      update: {},
    });
  }

  private async markOutboxEventDeadLettered(
    outboxEvent: { tenantId: string; id: string },
    failureCategory: string,
    lastError?: string,
  ): Promise<void> {
    await this.prisma.outboxEvent.update({
      where: {
        tenantId_id: { tenantId: outboxEvent.tenantId, id: outboxEvent.id },
      },
      data: {
        status: OutboxEventStatus.FAILED,
        nextAttemptAt: null,
        deadLetteredAt: new Date(),
        failureCategory,
      },
    });

    if (lastError) {
      this.logger.warn(
        `Dead-lettered outbox event ${outboxEvent.id}: ${lastError}`,
      );
    }
  }

  private async markOutboxEventFailure(
    outboxEvent: { tenantId: string; id: string },
    failureCategory: string,
    nextAttemptAt: Date | null,
  ): Promise<void> {
    await this.prisma.outboxEvent.update({
      where: {
        tenantId_id: { tenantId: outboxEvent.tenantId, id: outboxEvent.id },
      },
      data: {
        status: OutboxEventStatus.FAILED,
        nextAttemptAt,
        failureCategory,
        deadLetteredAt: nextAttemptAt === null ? new Date() : null,
      },
    });
  }
}

function normalizeJsonPayload(
  payload: Prisma.JsonValue,
): Record<string, Prisma.JsonValue> {
  if (isJsonObject(payload)) {
    return payload;
  }

  return { value: payload };
}

function isJsonObject(
  payload: Prisma.JsonValue,
): payload is Record<string, Prisma.JsonValue> {
  return (
    Boolean(payload) && typeof payload === 'object' && !Array.isArray(payload)
  );
}

function readStringField(
  payload: Record<string, Prisma.JsonValue>,
  key: string,
  fallback = '',
): string {
  const value = payload[key];

  return typeof value === 'string' ? value : fallback;
}

function readNumberField(
  payload: Record<string, Prisma.JsonValue>,
  key: string,
  fallback = 0,
): number {
  const value = payload[key];

  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
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
        lastAttemptAt: now,
        nextAttemptAt: null,
        deadLetteredAt: null,
        failureCategory: null,
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
        lastAttemptAt: now,
        nextAttemptAt: null,
        deadLetteredAt: null,
        failureCategory: null,
      };
    case 'SUPPRESSED':
      return {
        status: 'SUPPRESSED',
        attempts: { increment: 1 },
        providerMessageId: result.providerMessageId ?? null,
        suppressedAt: now,
        failedAt: null,
        lastError: result.errorMessage ?? null,
        lastAttemptAt: now,
        nextAttemptAt: null,
        deadLetteredAt: null,
        failureCategory: null,
      };
    case 'FAILED':
    default:
      return {
        status: 'FAILED',
        attempts: { increment: 1 },
        providerMessageId: result.providerMessageId ?? null,
        failedAt: now,
        lastError: result.errorMessage ?? 'SMS delivery failed',
        lastAttemptAt: now,
        nextAttemptAt: null,
      };
  }
}
