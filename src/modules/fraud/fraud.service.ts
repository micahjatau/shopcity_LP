import { Injectable } from '@nestjs/common';
import { FraudFlagStatus, OutboxEventStatus, Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../../database/prisma.service';
import { FraudRulesService } from './fraud-rules.service';
import type {
  FraudFinding,
  FraudReceiptInput,
  FraudRedemptionInput,
} from './fraud.types';

@Injectable()
export class FraudService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly fraudRulesService: FraudRulesService,
    private readonly auditService: AuditService,
  ) {}

  async evaluateReceipt(input: FraudReceiptInput): Promise<number> {
    const duplicateFindings = await this.findDuplicateReceiptFindings(input);
    const ruleFindings = this.fraudRulesService.evaluateReceipt(
      input,
      await this.getConfiguredPolicy(input.tenantId, input.branchId),
    );

    return this.recordFindings(input.tenantId, [
      ...duplicateFindings,
      ...ruleFindings,
    ]);
  }

  async processOutboxEvent(tenantId: string, eventId: string): Promise<number> {
    return this.prismaService.$transaction(async (tx) => {
      await tx.$queryRaw`
        SELECT 1
        FROM "OutboxEvent"
        WHERE "tenantId" = ${tenantId} AND "id" = ${eventId}
        FOR UPDATE
      `;

      const event = await tx.outboxEvent.findUnique({
        where: { tenantId_id: { tenantId, id: eventId } },
      });
      if (!event || event.eventType !== 'fraud.evaluate') return 0;
      if (event.processedAt || event.status === OutboxEventStatus.COMPLETED) {
        return 0;
      }

      const findings = await this.evaluateOutboxEvent(tx, event);
      if (findings.length > 0) {
        await this.upsertFindings(tx, tenantId, findings, new Date());
      }
      await tx.outboxEvent.update({
        where: { tenantId_id: { tenantId, id: eventId } },
        data: {
          status: OutboxEventStatus.COMPLETED,
          processedAt: new Date(),
          nextAttemptAt: null,
        },
      });
      return findings.length;
    });
  }

  async evaluateRedemption(input: FraudRedemptionInput): Promise<number> {
    return this.recordFindings(
      input.tenantId,
      this.fraudRulesService.evaluateRedemption(
        input,
        await this.getConfiguredPolicy(input.tenantId, input.branchId),
      ),
    );
  }

  private async getConfiguredPolicy(
    tenantId: string,
    branchId: string,
    client: Pick<Prisma.TransactionClient, 'policyConfiguration'> = this
      .prismaService,
  ) {
    if (!client.policyConfiguration) return undefined;
    const policy = await client.policyConfiguration.findUnique({
      where: { tenantId_branchId: { tenantId, branchId } },
      select: {
        purchaseFlagThresholdKobo: true,
        purchaseApprovalThresholdKobo: true,
        redemptionApprovalThresholdKobo: true,
      },
    });

    return policy ?? undefined;
  }

  async recordFindings(
    tenantId: string,
    findings: FraudFinding[],
  ): Promise<number> {
    if (findings.length === 0) {
      return 0;
    }

    const now = new Date();

    await this.prismaService.$transaction(async (tx) => {
      await this.upsertFindings(tx, tenantId, findings, now);
    });

    return findings.length;
  }

  async recordDuplicateReceiptAttempt(input: {
    tenantId: string;
    receiptId: string;
    originalReceiptId: string;
    branchId: string;
    cashierId: string;
    customerId: string;
    deviceId: string;
    normalizedPosReceiptNumber: string;
    receiptWeekStart: Date;
    occurredAt: Date;
  }): Promise<number> {
    await this.prismaService.$transaction(async (tx) => {
      await this.auditService.recordWithClient(tx, {
        tenantId: input.tenantId,
        actorId: input.cashierId,
        action: 'RECEIPT_DUPLICATE_ATTEMPT_RECORDED',
        entityType: 'RECEIPT',
        entityId: input.originalReceiptId,
        metadata: {
          originalReceiptId: input.originalReceiptId,
          duplicateReceiptId: input.receiptId,
          branchId: input.branchId,
          cashierId: input.cashierId,
          customerId: input.customerId,
          deviceId: input.deviceId,
          normalizedPosReceiptNumber: input.normalizedPosReceiptNumber,
          receiptWeekStart: input.receiptWeekStart.toISOString(),
          occurredAt: input.occurredAt.toISOString(),
        },
      });

      await tx.outboxEvent.create({
        data: {
          tenantId: input.tenantId,
          aggregateType: 'receipt',
          aggregateId: input.originalReceiptId,
          eventType: 'fraud.evaluate',
          payload: {
            ruleCode: 'FR-DUP-001',
            originalReceiptId: input.originalReceiptId,
            duplicateReceiptId: input.receiptId,
            branchId: input.branchId,
            cashierId: input.cashierId,
            customerId: input.customerId,
            deviceId: input.deviceId,
            normalizedPosReceiptNumber: input.normalizedPosReceiptNumber,
            receiptWeekStart: input.receiptWeekStart.toISOString(),
            occurredAt: input.occurredAt.toISOString(),
          },
        },
      });
    });

    return 1;
  }

  private async findDuplicateReceiptFindings(
    input: FraudReceiptInput,
  ): Promise<FraudFinding[]> {
    const duplicateCount = await this.prismaService.receipt.count({
      where: {
        tenantId: input.tenantId,
        branchId: input.branchId,
        receiptWeekStart: input.receiptWeekStart,
        normalizedPosReceiptNumber: input.normalizedPosReceiptNumber,
      },
    });

    if (duplicateCount <= 1) {
      return [];
    }

    return [
      {
        ruleCode: 'FR-DUP-001',
        severity: 'HIGH',
        dedupeKey: `FR-DUP-001:${input.branchId}:${input.normalizedPosReceiptNumber}:${input.receiptWeekStart.toISOString()}`,
        subjectType: 'RECEIPT',
        subjectId: input.receiptId,
        windowStart: input.receiptWeekStart,
        branchId: input.branchId,
        cashierId: input.cashierId,
        customerId: input.customerId,
        receiptId: input.receiptId,
        evidence: {
          duplicateCount,
          normalizedPosReceiptNumber: input.normalizedPosReceiptNumber,
          receiptWeekStart: input.receiptWeekStart.toISOString(),
          occurredAt: input.occurredAt.toISOString(),
        },
      },
    ];
  }

  private async evaluateOutboxEvent(
    tx: Prisma.TransactionClient,
    event: {
      tenantId: string;
      aggregateType: string;
      aggregateId: string;
      payload: Prisma.JsonValue;
    },
  ): Promise<FraudFinding[]> {
    const payload = readObject(event.payload);
    if (payload.ruleCode === 'FR-DUP-001') {
      const branchId = readString(payload, 'branchId');
      const normalizedReceipt = readString(
        payload,
        'normalizedPosReceiptNumber',
      );
      const weekStart = readDate(payload.receiptWeekStart);
      if (!branchId || !normalizedReceipt || !weekStart) {
        throw new Error('Invalid duplicate-receipt fraud event payload');
      }
      const cashierId = readString(payload, 'cashierId');
      const customerId = readString(payload, 'customerId');
      const receiptId =
        readString(payload, 'originalReceiptId') || event.aggregateId;
      return [
        {
          ruleCode: 'FR-DUP-001',
          severity: 'HIGH',
          dedupeKey: `FR-DUP-001:${branchId}:${normalizedReceipt}:${weekStart.toISOString()}`,
          subjectType: 'RECEIPT',
          subjectId: receiptId,
          windowStart: weekStart,
          branchId,
          cashierId: cashierId || null,
          customerId: customerId || null,
          receiptId,
          evidence: payload,
        },
      ];
    }

    if (event.aggregateType === 'receipt') {
      const receipt = await tx.receipt.findUnique({
        where: {
          tenantId_id: { tenantId: event.tenantId, id: event.aggregateId },
        },
      });
      if (!receipt) throw new Error(`Receipt ${event.aggregateId} not found`);
      const policy = await this.getConfiguredPolicy(
        receipt.tenantId,
        receipt.branchId,
        tx,
      );
      return this.fraudRulesService.evaluateReceipt(
        {
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
        },
        policy,
      );
    }

    if (event.aggregateType === 'redemption') {
      const redemption = await tx.redemption.findUnique({
        where: {
          tenantId_id: { tenantId: event.tenantId, id: event.aggregateId },
        },
      });
      if (!redemption) {
        throw new Error(`Redemption ${event.aggregateId} not found`);
      }
      const policy = await this.getConfiguredPolicy(
        redemption.tenantId,
        redemption.branchId,
        tx,
      );
      return this.fraudRulesService.evaluateRedemption(
        {
          tenantId: redemption.tenantId,
          redemptionId: redemption.id,
          receiptId: redemption.receiptId,
          branchId: redemption.branchId,
          customerId: redemption.customerId,
          cashierId: redemption.requestedBy,
          cardId: redemption.cardId,
          requestedAmountKobo: redemption.requestedAmountKobo,
          occurredAt: redemption.requestedAt,
        },
        policy,
      );
    }

    if (event.aggregateType === 'reversal') {
      const reversal = await tx.loyaltyLedgerEntry.findUnique({
        where: {
          tenantId_id: { tenantId: event.tenantId, id: event.aggregateId },
        },
        select: {
          createdBy: true,
          createdAt: true,
          effectiveAt: true,
          receipt: { select: { branchId: true } },
        },
      });
      if (!reversal) {
        throw new Error(`Reversal ${event.aggregateId} not found`);
      }
      const occurredAt = readDate(payload.occurredAt) ?? reversal.effectiveAt;
      const cashierId = readString(payload, 'actorId') || reversal.createdBy;
      const branchId =
        readString(payload, 'branchId') || reversal.receipt?.branchId || '';
      const windowStart = new Date(occurredAt.getTime() - 24 * 60 * 60 * 1000);
      const reversalCount = await tx.loyaltyLedgerEntry.count({
        where: {
          tenantId: event.tenantId,
          createdBy: cashierId,
          reversesEntryId: { not: null },
          createdAt: { gte: windowStart, lte: reversal.createdAt },
        },
      });
      return this.fraudRulesService.evaluateReversalFrequency({
        tenantId: event.tenantId,
        branchId,
        cashierId,
        reversalCount,
        windowStart,
        windowEnd: occurredAt,
      });
    }

    // Historical card/auth behavior events are terminally consumed but no
    // longer emit deferred low-confidence findings.
    if (event.aggregateType === 'card' || event.aggregateType === 'auth-user') {
      return [];
    }
    throw new Error(
      `Unsupported fraud outbox aggregate: ${event.aggregateType}`,
    );
  }

  private async upsertFindings(
    tx: {
      fraudFlag: {
        upsert: (args: unknown) => Promise<unknown>;
      };
    },
    tenantId: string,
    findings: FraudFinding[],
    now: Date,
  ) {
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
          status: FraudFlagStatus.OPEN,
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
  }
}

function readObject(value: Prisma.JsonValue): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value;
  }
  throw new Error('Fraud outbox payload must be an object');
}

function readString(value: Record<string, unknown>, key: string): string {
  const field = value[key];
  return typeof field === 'string' ? field.trim() : '';
}

function readDate(value: unknown): Date | null {
  if (typeof value !== 'string') return null;
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? null : date;
}
