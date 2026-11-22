import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OutboxEventStatus, Prisma } from '@prisma/client';
import { type Job, type Queue, type Worker } from 'bullmq';
import { workerEnvValidationSchema } from '../config/env.validation';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../modules/audit/audit.service';
import { FraudRulesService } from '../modules/fraud/fraud-rules.service';
import { FraudService } from '../modules/fraud/fraud.service';
import { ReportMaterializerService } from '../modules/reports/report-materializer.service';
import { OUTBOX_RETRY_ATTEMPTS } from './outbox.constants';
import { createOutboxQueue, publishOutboxEvent } from './outbox.publisher';
import { createOutboxWorker, type OutboxJobPayload } from './outbox.worker';
import type { SmsDeliveryReport, SmsProvider } from './sms.provider';
import {
  SmsPayloadError,
  validateSmsIntent,
  type SmsTemplate,
} from './sms.templates';

export interface WorkerConfig {
  redisUrl: string;
  publishBatchSize: number;
  publishIntervalMs: number;
  deliveryReportPollIntervalMs: number;
  deliveryReportPollBatchSize: number;
  retryDelayMs: number;
  recoveryThresholdMs: number;
}

export function loadWorkerConfig(env = process.env): WorkerConfig {
  const result = workerEnvValidationSchema.validate(env, {
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
    deliveryReportPollIntervalMs: Number(values.SMS_DLR_POLL_INTERVAL_MS),
    deliveryReportPollBatchSize: Number(values.SMS_DLR_POLL_BATCH_SIZE),
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
  private deliveryReportTimer?: NodeJS.Timeout;
  private activeRecovery?: Promise<void>;
  private activeDeliveryReportPoll?: Promise<void>;
  private started = false;
  private stopping = false;
  private readonly fraudService: FraudService;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: WorkerConfig,
    private readonly smsProvider: SmsProvider,
    _legacyFraudBehaviorService?: unknown,
    private readonly reportMaterializerService?: ReportMaterializerService,
    fraudService?: FraudService,
  ) {
    this.fraudService =
      fraudService ??
      new FraudService(
        prisma,
        new FraudRulesService(
          new ConfigService(process.env as Record<string, string | undefined>),
        ),
        new AuditService(prisma),
      );
  }

  async start(): Promise<void> {
    if (this.started) {
      return;
    }

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
    this.deliveryReportTimer = setInterval(() => {
      this.scheduleDeliveryReportPoll();
    }, this.config.deliveryReportPollIntervalMs);
    this.deliveryReportTimer.unref?.();
    this.started = true;
    this.scheduleDeliveryReportPoll();
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
    if (this.deliveryReportTimer) {
      clearInterval(this.deliveryReportTimer);
      this.deliveryReportTimer = undefined;
    }

    await Promise.all([
      this.activeRecovery?.catch(() => undefined),
      this.activeDeliveryReportPoll?.catch(() => undefined),
    ]);

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

    this.queue = undefined;
    this.worker = undefined;
    this.activeRecovery = undefined;
    this.activeDeliveryReportPoll = undefined;
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

  private scheduleDeliveryReportPoll(): void {
    if (
      this.stopping ||
      !this.smsProvider.getDeliveryReport ||
      this.activeDeliveryReportPoll
    ) {
      return;
    }

    const poll = this.pollDeliveryReports().then(() => undefined);
    this.activeDeliveryReportPoll = poll;
    void poll
      .catch(() => {
        if (!this.stopping) {
          this.logger.warn('SMS delivery-report poll cycle failed');
        }
      })
      .finally(() => {
        if (this.activeDeliveryReportPoll === poll) {
          this.activeDeliveryReportPoll = undefined;
        }
      });
  }

  async pollDeliveryReportsOnce(): Promise<number> {
    return this.pollDeliveryReports();
  }

  async processOutboxEvent(data: {
    id: string;
    tenantId: string;
  }): Promise<void> {
    const job = {
      data,
      discard: () => undefined,
    } as unknown as Job<OutboxJobPayload>;
    await this.handleJob(job);
  }

  private async pollDeliveryReports(): Promise<number> {
    if (
      !this.smsProvider.getDeliveryReport ||
      this.smsProvider.supportsDeliveryReports === false ||
      this.stopping
    ) {
      return 0;
    }

    const now = new Date();
    const messages = await this.prisma.smsMessage.findMany({
      where: {
        providerMessageId: { not: null },
        status: 'SENT',
        deliveredAt: null,
        failedAt: null,
        deadLetteredAt: null,
        OR: [
          { nextDeliveryReportPollAt: null },
          { nextDeliveryReportPollAt: { lte: now } },
        ],
      },
      select: {
        id: true,
        providerMessageId: true,
        nextDeliveryReportPollAt: true,
      },
      orderBy: [
        { nextDeliveryReportPollAt: { sort: 'asc', nulls: 'first' } },
        { sentAt: 'asc' },
        { id: 'asc' },
      ],
      take: this.config.deliveryReportPollBatchSize,
    });

    let polled = 0;
    for (const message of messages) {
      if (this.stopping || !message.providerMessageId) continue;

      const nextPollAt = new Date(
        Date.now() + this.config.deliveryReportPollIntervalMs,
      );
      const eligibleWhere = {
        id: message.id,
        providerMessageId: message.providerMessageId,
        status: 'SENT' as const,
        deliveredAt: null,
        failedAt: null,
        deadLetteredAt: null,
      };
      const claim = await this.prisma.smsMessage.updateMany({
        where: {
          ...eligibleWhere,
          nextDeliveryReportPollAt: message.nextDeliveryReportPollAt,
        },
        data: { nextDeliveryReportPollAt: nextPollAt },
      });
      if (claim.count !== 1) continue;
      polled += 1;

      let report: SmsDeliveryReport | null = null;
      try {
        report = await this.smsProvider.getDeliveryReport(
          message.providerMessageId,
        );
      } catch {
        // The persisted next poll time bounds retries without exposing provider errors.
      }

      const claimedWhere = {
        ...eligibleWhere,
        nextDeliveryReportPollAt: nextPollAt,
      };
      if (!report || report.providerMessageId !== message.providerMessageId) {
        continue;
      }

      if (report.status === 'DELIVERED') {
        await this.prisma.smsMessage.updateMany({
          where: claimedWhere,
          data: {
            status: 'DELIVERED',
            deliveredAt: report.occurredAt ?? new Date(),
            nextDeliveryReportPollAt: null,
          },
        });
      } else if (report.status === 'FAILED') {
        await this.prisma.smsMessage.updateMany({
          where: claimedWhere,
          data: {
            status: 'FAILED',
            failedAt: report.occurredAt ?? new Date(),
            failureCategory: 'terminal',
            lastError: 'Provider delivery report marked message failed',
            nextDeliveryReportPollAt: null,
          },
        });
      }
    }
    return polled;
  }

  private async recoverAndPublishOnce(): Promise<void> {
    if (this.stopping || !this.queue) {
      return;
    }

    const now = new Date();
    if (typeof this.prisma.$executeRaw === 'function') {
      await this.prisma.$executeRaw`
        UPDATE "OutboxEvent" AS oe
        SET "status" = 'COMPLETED',
            "processedAt" = COALESCE("processedAt", ${now}),
            "nextAttemptAt" = NULL
        WHERE oe."processedAt" IS NOT NULL
          AND oe."status" <> 'COMPLETED'
          AND oe."deadLetteredAt" IS NULL
      `;
      await this.prisma.$executeRaw`
        UPDATE "OutboxEvent" AS oe
        SET "status" = 'COMPLETED',
            "processedAt" = ${now},
            "nextAttemptAt" = NULL
        WHERE oe."eventType" = 'sms.send'
          AND oe."status" = 'PUBLISHED'
          AND oe."processedAt" IS NULL
          AND oe."deadLetteredAt" IS NULL
          AND EXISTS (
            SELECT 1
            FROM "SmsMessage" AS sm
            WHERE sm."tenantId" = oe."tenantId"
              AND sm."outboxEventId" = oe."id"
              AND sm."status" IN ('SENT', 'DELIVERED', 'SUPPRESSED')
              AND sm."deadLetteredAt" IS NULL
          )
      `;
    }
    const staleCutoff = new Date(
      now.getTime() - this.config.recoveryThresholdMs,
    );

    const outboxRows = await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.$queryRaw<OutboxClaimRow[]>`
        SELECT id
        FROM "OutboxEvent"
        WHERE "eventType" IN ('sms.send', 'fraud.evaluate', 'report.refresh')
          AND "deadLetteredAt" IS NULL
          AND "processedAt" IS NULL
          AND (
            ("status" IN ('PENDING', 'FAILED') AND ("nextAttemptAt" IS NULL OR "nextAttemptAt" <= ${now}))
            OR ("status" = 'QUEUED' AND "updatedAt" <= ${staleCutoff})
            OR (
              "status" = 'PUBLISHED'
              AND "publishedAt" <= ${staleCutoff}
              AND (
                ("eventType" = 'sms.send' AND EXISTS (
                  SELECT 1
                  FROM "SmsMessage" sm
                  WHERE sm."tenantId" = "OutboxEvent"."tenantId"
                    AND sm."outboxEventId" = "OutboxEvent"."id"
                    AND sm."status" IN ('QUEUED', 'FAILED')
                    AND sm."deadLetteredAt" IS NULL
                ))
                OR ("eventType" IN ('fraud.evaluate', 'report.refresh'))
                OR (
                  "eventType" = 'sms.send'
                  AND NOT EXISTS (
                    SELECT 1
                    FROM "SmsMessage" sm
                    WHERE sm."tenantId" = "OutboxEvent"."tenantId"
                      AND sm."outboxEventId" = "OutboxEvent"."id"
                  )
                )
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

        await this.prisma.outboxEvent.updateMany({
          where: {
            tenantId: outboxEvent.tenantId,
            id: outboxEvent.id,
            status: OutboxEventStatus.QUEUED,
            processedAt: null,
            deadLetteredAt: null,
          },
          data: {
            status: OutboxEventStatus.PUBLISHED,
            publishedAt: now,
            nextAttemptAt: null,
          },
        });
      } catch (error) {
        await this.prisma.outboxEvent.updateMany({
          where: {
            tenantId: outboxEvent.tenantId,
            id: outboxEvent.id,
            status: OutboxEventStatus.QUEUED,
            processedAt: null,
            deadLetteredAt: null,
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

    if (outboxEvent.deadLetteredAt || outboxEvent.processedAt) {
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

    if (outboxEvent.eventType === 'fraud.evaluate') {
      await this.processFraudEvaluationEvent(outboxEvent);
      return;
    }

    if (outboxEvent.eventType === 'report.refresh') {
      await this.processReportRefreshEvent(outboxEvent);
      return;
    }

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
      resolvedSmsMessage.status === 'SENT' ||
      resolvedSmsMessage.status === 'DELIVERED' ||
      resolvedSmsMessage.status === 'SUPPRESSED'
    ) {
      await this.markOutboxEventCompleted(outboxEvent);
      return;
    }

    if (
      this.smsProvider.requiresLocalSubmissionReservation &&
      resolvedSmsMessage.failureCategory === 'provider-submission-in-progress'
    ) {
      const reservationAgeMs = resolvedSmsMessage.lastAttemptAt
        ? Date.now() - resolvedSmsMessage.lastAttemptAt.getTime()
        : Number.POSITIVE_INFINITY;
      const reservationWindowMs = Math.max(
        this.config.recoveryThresholdMs,
        this.smsProvider.submissionReservationWindowMs ?? 0,
      );
      if (reservationAgeMs < reservationWindowMs) {
        job.discard();
        return;
      }

      await this.markSmsSubmissionOutcomeUnknown(
        resolvedSmsMessage,
        outboxEvent,
        new Date(),
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

    const now = new Date();
    let payload: Record<string, Prisma.JsonValue>;

    try {
      payload = normalizeJsonPayload(resolvedSmsMessage.payload);
      validateSmsIntent(resolvedSmsMessage.template as SmsTemplate, payload);
    } catch (error) {
      if (error instanceof SmsPayloadError) {
        await this.markSmsMessageInvalidPayload(resolvedSmsMessage, now, error);
        await this.markOutboxEventDeadLettered(
          outboxEvent,
          'invalid-payload',
          error.message,
        );
        job.discard();
        return;
      }

      throw error;
    }

    const reservationClaimed =
      this.smsProvider.requiresLocalSubmissionReservation === true;
    if (reservationClaimed) {
      const claim = await this.prisma.smsMessage.updateMany({
        where: {
          tenantId: resolvedSmsMessage.tenantId,
          outboxEventId: resolvedSmsMessage.outboxEventId,
          status: resolvedSmsMessage.status,
          attempts: resolvedSmsMessage.attempts,
          deadLetteredAt: null,
          failureCategory: resolvedSmsMessage.failureCategory ?? null,
        },
        data: {
          failureCategory: 'provider-submission-in-progress',
          lastAttemptAt: now,
        },
      });
      if (claim.count !== 1) {
        job.discard();
        return;
      }
    }

    try {
      const result = await this.smsProvider.send({
        tenantId: outboxEvent.tenantId,
        receiptId: resolvedSmsMessage.receiptId,
        outboxEventId: outboxEvent.id,
        phoneE164: resolvedSmsMessage.phoneE164,
        template: resolvedSmsMessage.template as SmsTemplate,
        payload,
      });

      if (result.status === 'FAILED') {
        if (reservationClaimed && result.outcomeUnknown) {
          await this.markSmsSubmissionOutcomeUnknown(
            resolvedSmsMessage,
            outboxEvent,
            now,
          );
          job.discard();
          return;
        }

        const deadLetteredAt =
          result.failureCategory === 'terminal' ||
          resolvedSmsMessage.attempts + 1 >= OUTBOX_RETRY_ATTEMPTS
            ? now
            : null;

        await this.prisma.smsMessage.update({
          where: {
            tenantId_outboxEventId: {
              tenantId: resolvedSmsMessage.tenantId,
              outboxEventId: resolvedSmsMessage.outboxEventId,
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
          tenantId_outboxEventId: {
            tenantId: resolvedSmsMessage.tenantId,
            outboxEventId: resolvedSmsMessage.outboxEventId,
          },
        },
        data: mapSmsDispatchResult(result, now),
      });
    } catch (error) {
      if (reservationClaimed) {
        await this.markSmsSubmissionOutcomeUnknown(
          resolvedSmsMessage,
          outboxEvent,
          now,
        );
        job.discard();
        return;
      }

      const deadLetteredAt =
        resolvedSmsMessage.attempts + 1 >= OUTBOX_RETRY_ATTEMPTS ? now : null;

      await this.prisma.smsMessage.update({
        where: {
          tenantId_outboxEventId: {
            tenantId: resolvedSmsMessage.tenantId,
            outboxEventId: resolvedSmsMessage.outboxEventId,
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

  private async markSmsSubmissionOutcomeUnknown(
    smsMessage: { tenantId: string; outboxEventId: string },
    outboxEvent: { tenantId: string; id: string },
    now: Date,
  ): Promise<void> {
    const diagnostic =
      'SMS provider submission outcome is unknown; verify provider history before manual replay';
    await this.prisma.smsMessage.update({
      where: {
        tenantId_outboxEventId: {
          tenantId: smsMessage.tenantId,
          outboxEventId: smsMessage.outboxEventId,
        },
      },
      data: {
        status: 'FAILED',
        attempts: { increment: 1 },
        failedAt: now,
        lastAttemptAt: now,
        nextAttemptAt: null,
        deadLetteredAt: now,
        failureCategory: 'dead-lettered',
        lastError: diagnostic,
      },
    });
    await this.markOutboxEventDeadLettered(
      outboxEvent,
      'provider-outcome-unknown',
      diagnostic,
    );
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
    const version = readNumberField(payload, 'version', 0);

    if (version !== 1) {
      throw new Error(`Unsupported SMS payload version for ${outboxEvent.id}`);
    }

    const receiptId = readStringField(payload, 'receiptId').trim() || null;
    const transactionId = readStringField(payload, 'transactionId').trim();
    const cardId = readStringField(payload, 'replacementCardId').trim() || null;
    const customerId = readStringField(payload, 'customerId').trim() || null;
    const redemptionId =
      readStringField(payload, 'redemptionId').trim() || null;
    const adjustmentId =
      readStringField(payload, 'adjustmentId').trim() || null;
    const phoneE164 = readStringField(payload, 'phoneE164').trim();
    const template = readStringField(payload, 'template').trim();

    const requiresTransaction = ![
      'credit-expiry-reminder-v1',
      'card-replaced',
    ].includes(template);
    if (
      (!transactionId && requiresTransaction) ||
      (template === 'credit-expiry-reminder-v1' && !customerId) ||
      (template === 'card-replaced' && !cardId) ||
      !phoneE164 ||
      !template
    ) {
      throw new Error(
        `SmsMessage payload missing required fields for ${outboxEvent.id}`,
      );
    }

    validateSmsIntent(template as SmsTemplate, payload);

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
        ledgerEntryId: transactionId || null,
        cardId,
        redemptionId,
        adjustmentId,
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

  private async processFraudEvaluationEvent(outboxEvent: {
    tenantId: string;
    id: string;
  }): Promise<void> {
    await this.fraudService.processOutboxEvent(
      outboxEvent.tenantId,
      outboxEvent.id,
    );
  }

  private async processReportRefreshEvent(outboxEvent: {
    tenantId: string;
    id: string;
    payload: Prisma.JsonValue;
  }): Promise<void> {
    if (!this.reportMaterializerService) {
      throw new Error('Report materializer is not configured');
    }

    const payload = normalizeJsonPayload(outboxEvent.payload);
    const report = typeof payload.report === 'string' ? payload.report : '';
    const branchId =
      typeof payload.branchId === 'string' && payload.branchId.trim()
        ? payload.branchId.trim()
        : null;

    if (!report) {
      throw new Error(`Invalid report refresh payload for ${outboxEvent.id}`);
    }

    const materializedAt = new Date();
    if (branchId) {
      await this.reportMaterializerService.materializeBranch(
        outboxEvent.tenantId,
        branchId,
        { materializedAt },
      );
      await this.markOutboxEventCompleted(outboxEvent);
      return;
    }

    await this.reportMaterializerService.rebuildTenant(outboxEvent.tenantId, {
      materializedAt,
    });
    await this.markOutboxEventCompleted(outboxEvent);
  }

  private async markOutboxEventCompleted(outboxEvent: {
    tenantId: string;
    id: string;
  }): Promise<void> {
    await this.prisma.outboxEvent.update({
      where: {
        tenantId_id: { tenantId: outboxEvent.tenantId, id: outboxEvent.id },
      },
      data: {
        status: OutboxEventStatus.COMPLETED,
        processedAt: new Date(),
        nextAttemptAt: null,
      },
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

  private async markSmsMessageInvalidPayload(
    smsMessage: {
      tenantId: string;
      outboxEventId: string;
    },
    now: Date,
    error: SmsPayloadError,
  ): Promise<void> {
    await this.prisma.smsMessage.update({
      where: {
        tenantId_outboxEventId: {
          tenantId: smsMessage.tenantId,
          outboxEventId: smsMessage.outboxEventId,
        },
      },
      data: {
        status: 'FAILED',
        attempts: { increment: 1 },
        failedAt: now,
        lastAttemptAt: now,
        nextAttemptAt: null,
        deadLetteredAt: now,
        failureCategory: 'invalid-payload',
        lastError: error.message,
      },
    });
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
