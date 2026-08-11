import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OutboxEventStatus, Prisma } from '@prisma/client';
import { type Job, type Queue, type Worker } from 'bullmq';
import { envValidationSchema } from '../config/env.validation';
import { PrismaService } from '../database/prisma.service';
import { FraudBehaviorService } from '../modules/fraud/fraud-behavior.service';
import { FraudRulesService } from '../modules/fraud/fraud-rules.service';
import { OUTBOX_RETRY_ATTEMPTS } from './outbox.constants';
import { createOutboxQueue, publishOutboxEvent } from './outbox.publisher';
import { createOutboxWorker, type OutboxJobPayload } from './outbox.worker';
import type { SmsProvider } from './sms.provider';
import {
  SmsPayloadError,
  validateSmsIntent,
  type SmsTemplate,
} from './sms.templates';

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

type FraudSubjectType = 'RECEIPT' | 'REDEMPTION' | 'LEDGER_ENTRY';

type FraudFinding = {
  ruleCode: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  dedupeKey: string;
  subjectType: FraudSubjectType;
  subjectId: string;
  windowStart: Date;
  windowEnd?: Date | null;
  branchId?: string | null;
  cashierId?: string | null;
  customerId?: string | null;
  receiptId?: string | null;
  ledgerEntryId?: string | null;
  redemptionId?: string | null;
  evidence: Record<string, unknown>;
};

const DEFAULT_PURCHASE_FLAG_THRESHOLD_KOBO = 10_000_000;
const DEFAULT_PURCHASE_APPROVAL_THRESHOLD_KOBO = 20_000_000;
const DEFAULT_REDEMPTION_APPROVAL_THRESHOLD_KOBO = 500_000;

export class OutboxWorkerRuntime {
  private readonly logger = new Logger(OutboxWorkerRuntime.name);
  private queue?: Queue;
  private worker?: Worker<OutboxJobPayload>;
  private publisherTimer?: NodeJS.Timeout;
  private activeRecovery?: Promise<void>;
  private started = false;
  private stopping = false;
  private readonly fraudBehaviorService: FraudBehaviorService;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: WorkerConfig,
    private readonly smsProvider: SmsProvider,
    fraudBehaviorService?: FraudBehaviorService,
  ) {
    this.fraudBehaviorService =
      fraudBehaviorService ??
      new FraudBehaviorService(
        prisma,
        new FraudRulesService(
          new ConfigService(process.env as Record<string, string | undefined>),
        ),
        new ConfigService(process.env as Record<string, string | undefined>),
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
        WHERE "eventType" IN ('sms.send', 'fraud.evaluate')
          AND "deadLetteredAt" IS NULL
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
                OR ("eventType" = 'fraud.evaluate')
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

    if (outboxEvent.eventType === 'fraud.evaluate') {
      await this.evaluateFraudForOutboxEvent(outboxEvent);
      await this.markOutboxEventCompleted(outboxEvent);
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
    const redemptionId =
      readStringField(payload, 'redemptionId').trim() || null;
    const adjustmentId =
      readStringField(payload, 'adjustmentId').trim() || null;
    const phoneE164 = readStringField(payload, 'phoneE164').trim();
    const template = readStringField(payload, 'template').trim();

    if (!transactionId || !phoneE164 || !template) {
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
        ledgerEntryId: transactionId,
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

  private async evaluateFraudForOutboxEvent(outboxEvent: {
    tenantId: string;
    aggregateType: string;
    aggregateId: string;
    eventType: string;
    payload: Prisma.JsonValue;
  }): Promise<void> {
    if (outboxEvent.eventType !== 'fraud.evaluate') {
      return;
    }

    const payload = normalizeJsonPayload(outboxEvent.payload);
    if (payload.ruleCode === 'FR-DUP-001') {
      const branchId =
        typeof payload.branchId === 'string' ? payload.branchId : '';
      const cashierId =
        typeof payload.cashierId === 'string' ? payload.cashierId : '';
      const customerId =
        typeof payload.customerId === 'string' ? payload.customerId : '';
      const normalizedPosReceiptNumber =
        typeof payload.normalizedPosReceiptNumber === 'string'
          ? payload.normalizedPosReceiptNumber
          : '';
      const receiptWeekStartRaw =
        typeof payload.receiptWeekStart === 'string'
          ? payload.receiptWeekStart
          : new Date().toISOString();
      const receiptId =
        typeof payload.originalReceiptId === 'string'
          ? payload.originalReceiptId
          : outboxEvent.aggregateId;

      await this.recordFraudFindings(outboxEvent.tenantId, [
        {
          ruleCode: 'FR-DUP-001',
          severity: 'HIGH' as const,
          dedupeKey: this.dedupeKey(
            'FR-DUP-001',
            `${branchId}:${normalizedPosReceiptNumber}:${receiptWeekStartRaw}`,
          ),
          subjectType: 'RECEIPT' as const,
          subjectId: receiptId,
          windowStart: new Date(receiptWeekStartRaw),
          branchId,
          cashierId,
          customerId,
          receiptId,
          evidence: payload,
        },
      ]);
      return;
    }

    if (outboxEvent.aggregateType === 'receipt') {
      const receipt = await this.prisma.receipt.findUnique({
        where: {
          tenantId_id: {
            tenantId: outboxEvent.tenantId,
            id: outboxEvent.aggregateId,
          },
        },
      });

      if (!receipt) {
        throw new Error(
          `Receipt ${outboxEvent.aggregateId} not found for fraud evaluation`,
        );
      }

      const findings = [
        ...(receipt.purchaseAmountKobo >
        BigInt(this.purchaseFlagThresholdKobo())
          ? [
              {
                ruleCode: 'FR-HV-001',
                severity: 'MEDIUM' as const,
                dedupeKey: this.dedupeKey('FR-HV-001', receipt.id),
                subjectType: 'RECEIPT' as const,
                subjectId: receipt.id,
                windowStart: receipt.receiptWeekStart,
                branchId: receipt.branchId,
                cashierId: receipt.capturedBy,
                customerId: receipt.customerId,
                receiptId: receipt.id,
                evidence: {
                  purchaseAmountKobo: receipt.purchaseAmountKobo.toString(),
                  thresholdKobo: this.purchaseFlagThresholdKobo(),
                  normalizedPosReceiptNumber:
                    receipt.normalizedPosReceiptNumber,
                  occurredAt: receipt.occurredAt.toISOString(),
                },
              },
            ]
          : []),
        ...(receipt.purchaseAmountKobo >
        BigInt(this.purchaseApprovalThresholdKobo())
          ? [
              {
                ruleCode: 'FR-HV-002',
                severity: 'HIGH' as const,
                dedupeKey: this.dedupeKey('FR-HV-002', receipt.id),
                subjectType: 'RECEIPT' as const,
                subjectId: receipt.id,
                windowStart: receipt.receiptWeekStart,
                branchId: receipt.branchId,
                cashierId: receipt.capturedBy,
                customerId: receipt.customerId,
                receiptId: receipt.id,
                evidence: {
                  purchaseAmountKobo: receipt.purchaseAmountKobo.toString(),
                  thresholdKobo: this.purchaseApprovalThresholdKobo(),
                  normalizedPosReceiptNumber:
                    receipt.normalizedPosReceiptNumber,
                  occurredAt: receipt.occurredAt.toISOString(),
                },
              },
            ]
          : []),
        ...(await this.fraudBehaviorService.evaluateReceiptBehavior({
          tenantId: receipt.tenantId,
          receiptId: receipt.id,
          branchId: receipt.branchId,
          customerId: receipt.customerId,
          cashierId: receipt.capturedBy,
          cardId: receipt.cardId,
          normalizedPosReceiptNumber: receipt.normalizedPosReceiptNumber,
          receiptWeekStart: receipt.receiptWeekStart,
          purchaseAmountKobo: receipt.purchaseAmountKobo,
          occurredAt: receipt.occurredAt,
        })),
      ];

      await this.recordFraudFindings(receipt.tenantId, findings);
      return;
    }

    if (outboxEvent.aggregateType === 'redemption') {
      const redemption = await this.prisma.redemption.findUnique({
        where: {
          tenantId_id: {
            tenantId: outboxEvent.tenantId,
            id: outboxEvent.aggregateId,
          },
        },
      });

      if (!redemption) {
        throw new Error(
          `Redemption ${outboxEvent.aggregateId} not found for fraud evaluation`,
        );
      }

      await this.recordFraudFindings(redemption.tenantId, [
        ...(redemption.requestedAmountKobo >
        BigInt(this.redemptionApprovalThresholdKobo())
          ? [
              {
                ruleCode: 'FR-HV-003',
                severity: 'HIGH' as const,
                dedupeKey: this.dedupeKey('FR-HV-003', redemption.id),
                subjectType: 'REDEMPTION' as const,
                subjectId: redemption.id,
                windowStart: redemption.requestedAt,
                branchId: redemption.branchId,
                cashierId: redemption.requestedBy,
                customerId: redemption.customerId,
                receiptId: redemption.receiptId,
                redemptionId: redemption.id,
                evidence: {
                  requestedAmountKobo:
                    redemption.requestedAmountKobo.toString(),
                  thresholdKobo: this.redemptionApprovalThresholdKobo(),
                  occurredAt: redemption.requestedAt.toISOString(),
                },
              },
            ]
          : []),
      ]);
      return;
    }

    if (outboxEvent.aggregateType === 'card') {
      const occurredAt = readOutboxOccurredAt(payload);
      const windowEnd = occurredAt;
      const windowStart = new Date(
        windowEnd.getTime() - 30 * 24 * 60 * 60 * 1000,
      );

      const findings =
        await this.fraudBehaviorService.evaluateCardReplacementBehavior({
          tenantId: outboxEvent.tenantId,
          branchId:
            typeof payload.branchId === 'string' ? payload.branchId : '',
          customerId:
            typeof payload.customerId === 'string' ? payload.customerId : '',
          cardId:
            typeof payload.cardId === 'string'
              ? payload.cardId
              : outboxEvent.aggregateId,
          replacementCount: 0,
          windowStart,
          windowEnd,
        });

      await this.recordFraudFindings(outboxEvent.tenantId, findings);
      return;
    }

    if (outboxEvent.aggregateType === 'reversal') {
      const occurredAt = readOutboxOccurredAt(payload);
      const windowEnd = occurredAt;
      const windowStart = new Date(windowEnd.getTime() - 24 * 60 * 60 * 1000);

      const findings = await this.fraudBehaviorService.evaluateReversalBehavior(
        {
          tenantId: outboxEvent.tenantId,
          branchId:
            typeof payload.branchId === 'string' ? payload.branchId : '',
          cashierId:
            typeof payload.actorId === 'string'
              ? payload.actorId
              : typeof payload.cashierId === 'string'
                ? payload.cashierId
                : outboxEvent.aggregateId,
          reversalCount: 0,
          windowStart,
          windowEnd,
        },
      );

      await this.recordFraudFindings(outboxEvent.tenantId, findings);
      return;
    }

    if (outboxEvent.aggregateType === 'auth-user') {
      const occurredAt = readOutboxOccurredAt(payload);
      const windowEnd = occurredAt;
      const windowStart = new Date(windowEnd.getTime() - 15 * 60 * 1000);

      const findings = await this.fraudBehaviorService.evaluateAuthFailures({
        tenantId: outboxEvent.tenantId,
        userId:
          typeof payload.userId === 'string'
            ? payload.userId
            : outboxEvent.aggregateId,
        failureCount: 0,
        windowStart,
        windowEnd,
      });

      await this.recordFraudFindings(outboxEvent.tenantId, findings);
    }
  }

  private async recordFraudFindings(
    tenantId: string,
    findings: FraudFinding[],
  ): Promise<number> {
    if (findings.length === 0) {
      return 0;
    }

    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      for (const finding of findings) {
        await tx.fraudFlag.upsert({
          where: {
            tenantId_dedupeKey: {
              tenantId,
              dedupeKey: finding.dedupeKey,
            },
          },
          create: {
            tenantId,
            ruleCode: finding.ruleCode,
            severity: finding.severity,
            status: 'OPEN',
            dedupeKey: finding.dedupeKey,
            subjectType: finding.subjectType,
            subjectId: finding.subjectId,
            branchId: finding.branchId ?? null,
            cashierId: finding.cashierId ?? null,
            customerId: finding.customerId ?? null,
            receiptId: finding.receiptId ?? null,
            ledgerEntryId: finding.ledgerEntryId ?? null,
            redemptionId: finding.redemptionId ?? null,
            windowStart: finding.windowStart,
            windowEnd: finding.windowEnd ?? null,
            firstDetectedAt: now,
            lastDetectedAt: now,
            occurrenceCount: 1,
            evidence: finding.evidence as Prisma.InputJsonValue,
          },
          update: {
            ruleCode: finding.ruleCode,
            severity: finding.severity,
            subjectType: finding.subjectType,
            subjectId: finding.subjectId,
            branchId: finding.branchId ?? null,
            cashierId: finding.cashierId ?? null,
            customerId: finding.customerId ?? null,
            receiptId: finding.receiptId ?? null,
            ledgerEntryId: finding.ledgerEntryId ?? null,
            redemptionId: finding.redemptionId ?? null,
            windowStart: finding.windowStart,
            windowEnd: finding.windowEnd ?? null,
            lastDetectedAt: now,
            occurrenceCount: { increment: 1 },
            evidence: finding.evidence as Prisma.InputJsonValue,
          },
        });
      }
    });

    return findings.length;
  }

  private purchaseFlagThresholdKobo(): number {
    return parseThresholdKobo(
      process.env.PURCHASE_FLAG_THRESHOLD_KOBO,
      DEFAULT_PURCHASE_FLAG_THRESHOLD_KOBO,
    );
  }

  private purchaseApprovalThresholdKobo(): number {
    return parseThresholdKobo(
      process.env.PURCHASE_APPROVAL_THRESHOLD_KOBO,
      DEFAULT_PURCHASE_APPROVAL_THRESHOLD_KOBO,
    );
  }

  private redemptionApprovalThresholdKobo(): number {
    return parseThresholdKobo(
      process.env.REDEMPTION_APPROVAL_THRESHOLD_KOBO,
      DEFAULT_REDEMPTION_APPROVAL_THRESHOLD_KOBO,
    );
  }

  private dedupeKey(ruleCode: string, subjectId: string): string {
    return `${ruleCode}:${subjectId}`;
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

function readOutboxOccurredAt(payload: Record<string, Prisma.JsonValue>): Date {
  const occurredAt = payload.occurredAt;
  if (typeof occurredAt === 'string') {
    const parsed = new Date(occurredAt);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return new Date();
}

function parseThresholdKobo(
  value: string | undefined,
  fallback: number,
): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
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
