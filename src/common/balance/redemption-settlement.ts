import {
  LedgerEntryDirection,
  LedgerEntryStatus,
  LedgerEntryType,
  Prisma,
  RedemptionStatus,
  SmsMessageStatus,
} from '@prisma/client';
import { ActiveBalanceService } from './active-balance.service';
import { LotAllocationService } from './lot-allocation.service';
import { addUtcMonthsClamped, calculateEarnAmountKobo } from './earn-policy';
import { buildRedemptionConfirmedSmsPayload } from '../../jobs/sms.templates';

export interface RedemptionSettlementInput {
  tenantId: string;
  customerId: string;
  receiptId: string;
  redemptionId: string;
  basketAmountKobo: bigint;
  redeemedAmountKobo: bigint;
  occurredAt: Date;
  now: Date;
  actorTenantId: string;
  actorId: string;
  correlationId: string;
  phoneE164: string;
  earnRateBps: bigint;
}

export interface RedemptionSettlementResult {
  redemptionLedgerEntryId: string;
  earnLedgerEntryId: string | null;
  earnedKobo: bigint;
  netPaidAmountKobo: bigint;
  remainingBalanceKobo: bigint;
  allocations: Array<{
    creditLotId: string;
    amountKobo: bigint;
    allocationOrder: number;
    expiresAt: Date;
  }>;
  smsStatus: SmsMessageStatus;
}

export async function executeRedemptionSettlement(
  tx: Prisma.TransactionClient,
  services: {
    activeBalanceService: ActiveBalanceService;
    lotAllocationService: LotAllocationService;
  },
  input: RedemptionSettlementInput,
): Promise<RedemptionSettlementResult> {
  if (input.basketAmountKobo < 0n || input.redeemedAmountKobo < 0n) {
    throw new Error('Settlement amounts cannot be negative');
  }

  const netPaidAmountKobo = input.basketAmountKobo - input.redeemedAmountKobo;
  if (netPaidAmountKobo < 0n) {
    throw new Error('Redemption amount cannot exceed the basket amount');
  }

  const redemptionLedgerEntry = await tx.loyaltyLedgerEntry.create({
    data: {
      tenantId: input.tenantId,
      customerId: input.customerId,
      receiptId: input.receiptId,
      type: LedgerEntryType.REDEEM,
      direction: LedgerEntryDirection.DEBIT,
      amountKobo: input.redeemedAmountKobo,
      status: LedgerEntryStatus.CONFIRMED,
      correlationId: input.correlationId,
      createdByTenantId: input.actorTenantId,
      createdBy: input.actorId,
      effectiveAt: input.occurredAt,
    },
  });

  await tx.redemption.update({
    where: {
      tenantId_id: { tenantId: input.tenantId, id: input.redemptionId },
    },
    data: {
      ledgerEntryId: redemptionLedgerEntry.id,
      confirmedAmountKobo: input.redeemedAmountKobo,
      confirmedAt: input.now,
      status: RedemptionStatus.CONFIRMED,
    },
  });

  const allocations = await services.lotAllocationService.allocateDebit(tx, {
    tenantId: input.tenantId,
    customerId: input.customerId,
    debitLedgerEntryId: redemptionLedgerEntry.id,
    amountKobo: input.redeemedAmountKobo,
    now: input.now,
    redemptionId: input.redemptionId,
  });
  const allocatedAmountKobo = allocations.reduce(
    (total, allocation) => total + allocation.amountKobo,
    0n,
  );
  if (allocatedAmountKobo !== input.redeemedAmountKobo) {
    throw new Error('Redemption allocations do not match the debit amount');
  }

  const earnedKobo = calculateEarnAmountKobo(
    netPaidAmountKobo,
    input.earnRateBps,
  );
  let earnLedgerEntryId: string | null = null;

  if (earnedKobo > 0n) {
    const earnLedgerEntry = await tx.loyaltyLedgerEntry.create({
      data: {
        tenantId: input.tenantId,
        customerId: input.customerId,
        receiptId: input.receiptId,
        type: LedgerEntryType.EARN,
        direction: LedgerEntryDirection.CREDIT,
        amountKobo: earnedKobo,
        status: LedgerEntryStatus.CONFIRMED,
        correlationId: `${input.correlationId}:earn`,
        createdByTenantId: input.actorTenantId,
        createdBy: input.actorId,
        effectiveAt: input.occurredAt,
      },
    });
    earnLedgerEntryId = earnLedgerEntry.id;

    await tx.creditLot.create({
      data: {
        tenantId: input.tenantId,
        customerId: input.customerId,
        earnLedgerEntryId: earnLedgerEntry.id,
        originalAmountKobo: earnedKobo,
        remainingAmountKobo: earnedKobo,
        earnedAt: input.occurredAt,
        expiresAt: addUtcMonthsClamped(input.occurredAt, 12),
      },
    });
  }

  const remainingBalanceKobo =
    await services.activeBalanceService.getActiveBalanceKobo(
      input.tenantId,
      input.customerId,
      input.now,
      tx,
    );
  const payload = buildRedemptionConfirmedSmsPayload({
    receiptId: input.receiptId,
    transactionId: redemptionLedgerEntry.id,
    redemptionId: input.redemptionId,
    customerId: input.customerId,
    phoneE164: input.phoneE164,
    redeemedKobo: input.redeemedAmountKobo,
    netPaidKobo: netPaidAmountKobo,
    earnedKobo,
    earnTransactionId: earnLedgerEntryId,
    remainingBalanceKobo,
  });
  const outboxEvent = await tx.outboxEvent.create({
    data: {
      tenantId: input.tenantId,
      aggregateType: 'redemption',
      aggregateId: input.redemptionId,
      eventType: 'sms.send',
      payload,
      status: 'PENDING',
      nextAttemptAt: input.now,
    },
  });
  const smsMessage = await tx.smsMessage.create({
    data: {
      tenantId: input.tenantId,
      receiptId: input.receiptId,
      ledgerEntryId: redemptionLedgerEntry.id,
      redemptionId: input.redemptionId,
      outboxEventId: outboxEvent.id,
      phoneE164: input.phoneE164,
      template: 'redemption-confirmed',
      payload,
      status: SmsMessageStatus.QUEUED,
      queuedAt: input.now,
    },
  });

  return {
    redemptionLedgerEntryId: redemptionLedgerEntry.id,
    earnLedgerEntryId,
    earnedKobo,
    netPaidAmountKobo,
    remainingBalanceKobo,
    allocations,
    smsStatus: smsMessage.status,
  };
}
