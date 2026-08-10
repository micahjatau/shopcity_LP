import { Injectable } from '@nestjs/common';
import { FraudFlagStatus, Prisma } from '@prisma/client';
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
  ) {}

  async evaluateReceipt(input: FraudReceiptInput): Promise<number> {
    const duplicateFindings = await this.findDuplicateReceiptFindings(input);
    const ruleFindings = this.fraudRulesService.evaluateReceipt(input);

    return this.recordFindings(input.tenantId, [
      ...duplicateFindings,
      ...ruleFindings,
    ]);
  }

  async evaluateRedemption(input: FraudRedemptionInput): Promise<number> {
    return this.recordFindings(
      input.tenantId,
      this.fraudRulesService.evaluateRedemption(input),
    );
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
    });

    return findings.length;
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
}
