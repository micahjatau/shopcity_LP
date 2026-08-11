import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, type Receipt } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

type FraudSeverity = 'LOW' | 'MEDIUM' | 'HIGH';

type FraudSubjectType = 'RECEIPT' | 'REDEMPTION' | 'LEDGER_ENTRY';

type FraudFinding = {
  ruleCode: string;
  severity: FraudSeverity;
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

type FraudReceiptInput = {
  tenantId: string;
  receiptId: string;
  branchId: string;
  customerId: string;
  cashierId: string;
  cardId: string;
  normalizedPosReceiptNumber: string;
  receiptWeekStart: Date;
  purchaseAmountKobo: bigint;
  occurredAt: Date;
};

type CardReplacementRuleInput = {
  tenantId: string;
  branchId: string;
  customerId: string;
  cardId: string;
  replacementCount: number;
  windowStart: Date;
  windowEnd: Date;
};

type ReversalFrequencyRuleInput = {
  tenantId: string;
  branchId: string;
  cashierId: string;
  reversalCount: number;
  windowStart: Date;
  windowEnd: Date;
};

type AuthFailureRuleInput = {
  tenantId: string;
  userId: string;
  failureCount: number;
  windowStart: Date;
  windowEnd: Date;
};

@Injectable()
export class FraudBehaviorRuntime {
  constructor(
    private readonly prisma: PrismaService,
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
    const dayWindow = this.localDayWindow(receipt.occurredAt, timezone);
    const [countInLocalDay, cashierMetrics, roundedCounts] = await Promise.all([
      this.countReceiptFrequency(receipt, timezone),
      this.loadCashierMetrics(receipt, timezone),
      this.loadRoundedReceiptCounts(receipt, timezone),
    ]);

    const findings: FraudFinding[] = [];
    findings.push(
      ...this.evaluateCardFrequency({
        tenantId: receipt.tenantId,
        branchId: receipt.branchId,
        cardId: receipt.cardId,
        customerId: receipt.customerId,
        receiptId: receipt.id,
        countInLocalDay,
        windowStart: dayWindow.windowStart,
        windowEnd: dayWindow.windowEnd,
      }),
    );

    findings.push(
      ...this.evaluateCashierAnomaly({
        tenantId: receipt.tenantId,
        branchId: receipt.branchId,
        cashierId: receipt.capturedBy,
        cashierCount: cashierMetrics.cashierCount,
        cashierValueKobo: cashierMetrics.cashierValueKobo,
        peerMedianValueKobo: cashierMetrics.peerMedianValueKobo,
        sampleSize: cashierMetrics.cashierCount,
        windowStart: dayWindow.windowStart,
        windowEnd: dayWindow.windowEnd,
      }),
    );

    findings.push(
      ...this.evaluateRoundedValues({
        tenantId: receipt.tenantId,
        branchId: receipt.branchId,
        cashierId: receipt.capturedBy,
        receiptId: receipt.id,
        roundedCount: roundedCounts.roundedCount,
        sampleSize: roundedCounts.sampleSize,
        unitKobo: BigInt(this.roundedValueUnitKobo()),
        windowStart: dayWindow.windowStart,
        windowEnd: dayWindow.windowEnd,
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

    const replacementCount = await this.prisma.card.count({
      where: {
        tenantId: input.tenantId,
        customerId: card.customerId,
        replacedAt: {
          gte: input.windowStart,
          lt: input.windowEnd,
        },
      },
    });

    return this.evaluateCardReplacementFrequency({
      tenantId: input.tenantId,
      branchId: card.customer.branchId,
      customerId: card.customerId,
      cardId: card.id,
      replacementCount,
      windowStart: input.windowStart,
      windowEnd: input.windowEnd,
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

    return this.evaluateReversalFrequency({
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

    return this.evaluateAuthFailuresRule({
      tenantId: input.tenantId,
      userId: input.userId,
      failureCount,
      windowStart: input.windowStart,
      windowEnd: input.windowEnd,
    });
  }

  private evaluateCardFrequency(input: {
    tenantId: string;
    branchId: string;
    cardId: string;
    customerId: string;
    receiptId: string;
    countInLocalDay: number;
    windowStart: Date;
    windowEnd: Date;
  }): FraudFinding[] {
    const threshold = this.cardDailyCountThreshold();
    if (input.countInLocalDay < threshold) {
      return [];
    }

    return [
      {
        ruleCode: 'FR-CARD-001',
        severity: 'MEDIUM',
        dedupeKey: this.dedupeKey(
          'FR-CARD-001',
          `${input.cardId}:${this.dayKey(input.windowStart)}`,
        ),
        subjectType: 'RECEIPT',
        subjectId: input.cardId,
        windowStart: input.windowStart,
        windowEnd: input.windowEnd,
        branchId: input.branchId,
        customerId: input.customerId,
        receiptId: input.receiptId,
        evidence: {
          countInLocalDay: input.countInLocalDay,
          threshold,
          windowStart: input.windowStart.toISOString(),
          windowEnd: input.windowEnd.toISOString(),
        },
      },
    ];
  }

  private evaluateCashierAnomaly(input: {
    tenantId: string;
    branchId: string;
    cashierId: string;
    cashierCount: number;
    cashierValueKobo: bigint;
    peerMedianValueKobo: bigint;
    sampleSize: number;
    windowStart: Date;
    windowEnd: Date;
  }): FraudFinding[] {
    const minSampleSize = this.cashierMinSampleSize();
    if (input.sampleSize < minSampleSize) {
      return [];
    }

    const ratioBps =
      input.peerMedianValueKobo === 0n
        ? 0n
        : (input.cashierValueKobo * 10_000n) / input.peerMedianValueKobo;

    if (ratioBps <= BigInt(this.cashierValueRatioThresholdBps())) {
      return [];
    }

    return [
      {
        ruleCode: 'FR-CASH-001',
        severity: 'MEDIUM',
        dedupeKey: this.dedupeKey(
          'FR-CASH-001',
          `${input.branchId}:${input.cashierId}:${this.dayKey(input.windowStart)}`,
        ),
        subjectType: 'RECEIPT',
        subjectId: input.cashierId,
        windowStart: input.windowStart,
        windowEnd: input.windowEnd,
        branchId: input.branchId,
        cashierId: input.cashierId,
        evidence: {
          sampleSize: input.sampleSize,
          cashierCount: input.cashierCount,
          cashierValueKobo: input.cashierValueKobo.toString(),
          peerMedianValueKobo: input.peerMedianValueKobo.toString(),
          ratioBps: ratioBps.toString(),
          thresholdBps: this.cashierValueRatioThresholdBps(),
          windowStart: input.windowStart.toISOString(),
          windowEnd: input.windowEnd.toISOString(),
        },
      },
    ];
  }

  private evaluateRoundedValues(input: {
    tenantId: string;
    branchId: string;
    cashierId: string;
    receiptId: string;
    roundedCount: number;
    sampleSize: number;
    unitKobo: bigint;
    windowStart: Date;
    windowEnd: Date;
  }): FraudFinding[] {
    const minSampleSize = this.roundedValueMinSample();
    if (
      input.sampleSize < minSampleSize ||
      input.roundedCount < minSampleSize
    ) {
      return [];
    }

    return [
      {
        ruleCode: 'FR-ROUND-001',
        severity: 'LOW',
        dedupeKey: this.dedupeKey(
          'FR-ROUND-001',
          `${input.branchId}:${input.cashierId}:${this.dayKey(input.windowStart)}`,
        ),
        subjectType: 'RECEIPT',
        subjectId: input.receiptId,
        windowStart: input.windowStart,
        windowEnd: input.windowEnd,
        branchId: input.branchId,
        cashierId: input.cashierId,
        receiptId: input.receiptId,
        evidence: {
          roundedCount: input.roundedCount,
          sampleSize: input.sampleSize,
          unitKobo: input.unitKobo.toString(),
          windowStart: input.windowStart.toISOString(),
          windowEnd: input.windowEnd.toISOString(),
        },
      },
    ];
  }

  private evaluateReversalFrequency(input: {
    tenantId: string;
    branchId: string;
    cashierId: string;
    reversalCount: number;
    windowStart: Date;
    windowEnd: Date;
  }): FraudFinding[] {
    const threshold = this.reversalCountThreshold();
    if (input.reversalCount < threshold) {
      return [];
    }

    return [
      {
        ruleCode: 'FR-REV-001',
        severity: 'MEDIUM',
        dedupeKey: this.dedupeKey(
          'FR-REV-001',
          `${input.branchId}:${input.cashierId}:${this.dayKey(input.windowStart)}`,
        ),
        subjectType: 'LEDGER_ENTRY',
        subjectId: input.cashierId,
        windowStart: input.windowStart,
        windowEnd: input.windowEnd,
        branchId: input.branchId,
        cashierId: input.cashierId,
        evidence: {
          reversalCount: input.reversalCount,
          threshold,
          windowStart: input.windowStart.toISOString(),
          windowEnd: input.windowEnd.toISOString(),
        },
      },
    ];
  }

  private evaluateCardReplacementFrequency(input: {
    tenantId: string;
    branchId: string;
    customerId: string;
    cardId: string;
    replacementCount: number;
    windowStart: Date;
    windowEnd: Date;
  }): FraudFinding[] {
    const threshold = this.cardReplacementCountThreshold();
    if (input.replacementCount < threshold) {
      return [];
    }

    return [
      {
        ruleCode: 'FR-REPL-001',
        severity: 'MEDIUM',
        dedupeKey: this.dedupeKey(
          'FR-REPL-001',
          `${input.customerId}:${this.dayKey(input.windowStart)}`,
        ),
        subjectType: 'RECEIPT',
        subjectId: input.cardId,
        windowStart: input.windowStart,
        windowEnd: input.windowEnd,
        branchId: input.branchId,
        customerId: input.customerId,
        receiptId: input.cardId,
        evidence: {
          replacementCount: input.replacementCount,
          threshold,
          windowStart: input.windowStart.toISOString(),
          windowEnd: input.windowEnd.toISOString(),
        },
      },
    ];
  }

  private evaluateAuthFailuresRule(input: {
    tenantId: string;
    userId: string;
    failureCount: number;
    windowStart: Date;
    windowEnd: Date;
  }): FraudFinding[] {
    const threshold = this.authFailureCountThreshold();
    if (input.failureCount < threshold) {
      return [];
    }

    return [
      {
        ruleCode: 'FR-AUTH-001',
        severity: 'HIGH',
        dedupeKey: this.dedupeKey(
          'FR-AUTH-001',
          `${input.userId}:${this.dayKey(input.windowStart)}`,
        ),
        subjectType: 'RECEIPT',
        subjectId: input.userId,
        windowStart: input.windowStart,
        windowEnd: input.windowEnd,
        evidence: {
          failureCount: input.failureCount,
          threshold,
          windowStart: input.windowStart.toISOString(),
          windowEnd: input.windowEnd.toISOString(),
        },
      },
    ];
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

  private cardDailyCountThreshold(): number {
    return (
      this.configService.get<number>('FRAUD_CARD_DAILY_COUNT_THRESHOLD') ?? 5
    );
  }

  private cashierMinSampleSize(): number {
    return this.configService.get<number>('FRAUD_CASHIER_MIN_SAMPLE_SIZE') ?? 5;
  }

  private cashierValueRatioThresholdBps(): number {
    return (
      this.configService.get<number>(
        'FRAUD_CASHIER_VALUE_RATIO_THRESHOLD_BPS',
      ) ?? 15000
    );
  }

  private roundedValueMinSample(): number {
    return (
      this.configService.get<number>('FRAUD_ROUNDED_VALUE_MIN_SAMPLE') ?? 5
    );
  }

  private roundedValueUnitKobo(): number {
    return (
      this.configService.get<number>('FRAUD_ROUNDED_VALUE_UNIT_KOBO') ?? 1000
    );
  }

  private reversalCountThreshold(): number {
    return (
      this.configService.get<number>('FRAUD_REVERSAL_COUNT_THRESHOLD') ?? 3
    );
  }

  private cardReplacementCountThreshold(): number {
    return (
      this.configService.get<number>(
        'FRAUD_CARD_REPLACEMENT_COUNT_THRESHOLD',
      ) ?? 3
    );
  }

  private authFailureCountThreshold(): number {
    return (
      this.configService.get<number>('FRAUD_AUTH_FAILURE_COUNT_THRESHOLD') ?? 5
    );
  }

  private dedupeKey(ruleCode: string, subjectId: string): string {
    return `${ruleCode}:${subjectId}`;
  }

  private dayKey(date: Date): string {
    return date.toISOString().slice(0, 10);
  }

  private localDayWindow(date: Date, timezone: string): {
    windowStart: Date;
    windowEnd: Date;
  } {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);
    const year = parts.find((part) => part.type === 'year')?.value ?? '1970';
    const month = parts.find((part) => part.type === 'month')?.value ?? '01';
    const day = parts.find((part) => part.type === 'day')?.value ?? '01';
    const windowStart = new Date(`${year}-${month}-${day}T00:00:00.000Z`);
    return {
      windowStart,
      windowEnd: new Date(windowStart.getTime() + 24 * 60 * 60 * 1000),
    };
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
