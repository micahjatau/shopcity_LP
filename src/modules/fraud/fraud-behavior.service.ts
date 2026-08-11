import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, type Receipt } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { FraudRulesService } from './fraud-rules.service';
import type {
  FraudFinding,
  FraudReceiptInput,
  CardReplacementRuleInput,
  ReversalFrequencyRuleInput,
  AuthFailureRuleInput,
} from './fraud.types';

@Injectable()
export class FraudBehaviorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fraudRulesService: FraudRulesService,
    private readonly configService: ConfigService,
  ) {}

  async evaluateReceiptBehavior(
    input: FraudReceiptInput,
  ): Promise<FraudFinding[]> {
    const receipt = await this.prisma.receipt.findUnique({
      where: {
        tenantId_id: {
          tenantId: input.tenantId,
          id: input.receiptId,
        },
      },
      include: {
        branch: true,
      },
    });

    if (!receipt) {
      return [];
    }

    const timezone = receipt.branch.timezone;
    const [countInLocalDay, cashierMetrics, roundedCounts] = await Promise.all([
      this.countReceiptFrequency(receipt, timezone),
      this.loadCashierMetrics(receipt, timezone),
      this.loadRoundedReceiptCounts(receipt, timezone),
    ]);

    const findings: FraudFinding[] = [];
    findings.push(
      ...this.fraudRulesService.evaluateCardFrequency({
        tenantId: receipt.tenantId,
        branchId: receipt.branchId,
        cardId: receipt.cardId,
        customerId: receipt.customerId,
        receiptId: receipt.id,
        countInLocalDay,
        windowStart: receipt.occurredAt,
        windowEnd: new Date(receipt.occurredAt.getTime() + 24 * 60 * 60 * 1000),
      }),
    );

    findings.push(
      ...this.fraudRulesService.evaluateCashierAnomaly({
        tenantId: receipt.tenantId,
        branchId: receipt.branchId,
        cashierId: receipt.capturedBy,
        cashierCount: cashierMetrics.cashierCount,
        cashierValueKobo: cashierMetrics.cashierValueKobo,
        peerMedianValueKobo: cashierMetrics.peerMedianValueKobo,
        sampleSize: cashierMetrics.cashierCount,
        windowStart: receipt.occurredAt,
        windowEnd: new Date(receipt.occurredAt.getTime() + 24 * 60 * 60 * 1000),
      }),
    );

    findings.push(
      ...this.fraudRulesService.evaluateRoundedValues({
        tenantId: receipt.tenantId,
        branchId: receipt.branchId,
        cashierId: receipt.capturedBy,
        receiptId: receipt.id,
        roundedCount: roundedCounts.roundedCount,
        sampleSize: roundedCounts.sampleSize,
        unitKobo: BigInt(this.roundedValueUnitKobo()),
        windowStart: receipt.occurredAt,
        windowEnd: new Date(receipt.occurredAt.getTime() + 24 * 60 * 60 * 1000),
      }),
    );

    return findings;
  }

  async evaluateCardReplacementBehavior(
    input: CardReplacementRuleInput,
  ): Promise<FraudFinding[]> {
    const card = await this.prisma.card.findUnique({
      where: {
        tenantId_id: {
          tenantId: input.tenantId,
          id: input.cardId,
        },
      },
      include: {
        customer: true,
      },
    });

    if (!card) {
      return [];
    }

    const windowStart = input.windowStart;
    const windowEnd = input.windowEnd;

    const replacementCount = await this.prisma.card.count({
      where: {
        tenantId: input.tenantId,
        customerId: card.customerId,
        replacedAt: {
          gte: windowStart,
          lt: windowEnd,
        },
      },
    });

    return this.fraudRulesService.evaluateCardReplacementFrequency({
      tenantId: input.tenantId,
      branchId: card.customer.branchId,
      customerId: card.customerId,
      cardId: card.id,
      replacementCount,
      windowStart,
      windowEnd,
    });
  }

  async evaluateReversalBehavior(
    input: ReversalFrequencyRuleInput,
  ): Promise<FraudFinding[]> {
    const reversalCount = await this.prisma.loyaltyLedgerEntry.count({
      where: {
        tenantId: input.tenantId,
        createdBy: input.cashierId,
        reversesEntryId: { not: null },
        createdAt: {
          gte: input.windowStart,
          lt: input.windowEnd,
        },
      },
    });

    return this.fraudRulesService.evaluateReversalFrequency({
      tenantId: input.tenantId,
      branchId: input.branchId,
      cashierId: input.cashierId,
      reversalCount,
      windowStart: input.windowStart,
      windowEnd: input.windowEnd,
    });
  }

  async evaluateAuthFailures(
    input: AuthFailureRuleInput,
  ): Promise<FraudFinding[]> {
    const user = await this.prisma.user.findUnique({
      where: {
        tenantId_id: {
          tenantId: input.tenantId,
          id: input.userId,
        },
      },
      include: { branch: true },
    });

    if (!user) {
      return [];
    }

    const failureCount = await this.prisma.auditLog.count({
      where: {
        tenantId: input.tenantId,
        actorId: input.userId,
        action: 'auth.login.failed',
        createdAt: {
          gte: input.windowStart,
          lt: input.windowEnd,
        },
      },
    });

    return this.fraudRulesService.evaluateAuthFailures({
      tenantId: input.tenantId,
      userId: input.userId,
      failureCount,
      windowStart: input.windowStart,
      windowEnd: input.windowEnd,
    });
  }

  private async countReceiptFrequency(
    receipt: Receipt,
    timezone: string,
  ): Promise<number> {
    const rows = await this.prisma.$queryRaw<
      Array<{ count: bigint }>
    >(Prisma.sql`
      SELECT COUNT(*)::bigint AS count
      FROM "Receipt"
      WHERE "tenantId" = ${receipt.tenantId}
        AND "cardId" = ${receipt.cardId}
        AND date_trunc('day', "occurredAt" AT TIME ZONE ${timezone}) = date_trunc('day', ${receipt.occurredAt} AT TIME ZONE ${timezone})
    `);

    return Number(rows[0]?.count ?? 0n);
  }

  private async loadCashierMetrics(
    receipt: Receipt,
    timezone: string,
  ): Promise<{
    cashierCount: number;
    cashierValueKobo: bigint;
    peerMedianValueKobo: bigint;
  }> {
    const rows = await this.prisma.$queryRaw<
      Array<{
        cashierId: string;
        receiptCount: bigint;
        cashierValueKobo: bigint;
      }>
    >(Prisma.sql`
      SELECT
        "capturedBy" AS "cashierId",
        COUNT(*)::bigint AS "receiptCount",
        COALESCE(SUM("purchaseAmountKobo"), 0)::bigint AS "cashierValueKobo"
      FROM "Receipt"
      WHERE "tenantId" = ${receipt.tenantId}
        AND "branchId" = ${receipt.branchId}
        AND date_trunc('day', "occurredAt" AT TIME ZONE ${timezone}) = date_trunc('day', ${receipt.occurredAt} AT TIME ZONE ${timezone})
      GROUP BY "capturedBy"
    `);

    const current = rows.find((row) => row.cashierId === receipt.capturedBy);
    const peerAverages = rows
      .filter((row) => row.cashierId !== receipt.capturedBy)
      .filter((row) => Number(row.receiptCount) >= this.cashierMinSampleSize())
      .map((row) => row.cashierValueKobo / row.receiptCount);

    return {
      cashierCount: Number(current?.receiptCount ?? 0n),
      cashierValueKobo:
        current && current.receiptCount > 0n
          ? current.cashierValueKobo / current.receiptCount
          : 0n,
      peerMedianValueKobo: medianBigInt(peerAverages),
    };
  }

  private async loadRoundedReceiptCounts(
    receipt: Receipt,
    timezone: string,
  ): Promise<{
    roundedCount: number;
    sampleSize: number;
  }> {
    const unitKobo = BigInt(this.roundedValueUnitKobo());
    const rows = await this.prisma.$queryRaw<
      Array<{ roundedCount: bigint; sampleSize: bigint }>
    >(Prisma.sql`
      SELECT
        COUNT(*) FILTER (WHERE MOD("purchaseAmountKobo", ${unitKobo}) = 0) ::bigint AS "roundedCount",
        COUNT(*)::bigint AS "sampleSize"
      FROM "Receipt"
      WHERE "tenantId" = ${receipt.tenantId}
        AND "branchId" = ${receipt.branchId}
        AND "capturedBy" = ${receipt.capturedBy}
        AND date_trunc('day', "occurredAt" AT TIME ZONE ${timezone}) = date_trunc('day', ${receipt.occurredAt} AT TIME ZONE ${timezone})
    `);

    return {
      roundedCount: Number(rows[0]?.roundedCount ?? 0n),
      sampleSize: Number(rows[0]?.sampleSize ?? 0n),
    };
  }

  private cashierMinSampleSize(): number {
    return this.configService.get<number>('FRAUD_CASHIER_MIN_SAMPLE_SIZE') ?? 5;
  }

  private roundedValueUnitKobo(): number {
    return (
      this.configService.get<number>('FRAUD_ROUNDED_VALUE_UNIT_KOBO') ?? 1000
    );
  }
}

function medianBigInt(values: bigint[]): bigint {
  if (values.length === 0) {
    return 0n;
  }

  const sorted = [...values].sort((a, b) => Number(a - b));
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) {
    return sorted[middle] ?? 0n;
  }

  const left = sorted[middle - 1] ?? 0n;
  const right = sorted[middle] ?? 0n;
  return (left + right) / 2n;
}
