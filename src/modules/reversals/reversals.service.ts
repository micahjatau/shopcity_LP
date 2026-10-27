import { HttpStatus, Injectable } from '@nestjs/common';
import {
  AdjustmentKind,
  LedgerEntryDirection,
  LedgerEntryStatus,
  LedgerEntryType,
  Prisma,
  RedemptionStatus,
  SmsMessageStatus,
} from '@prisma/client';
import { createHash } from 'node:crypto';
import { ActiveBalanceService } from '../../common/balance/active-balance.service';
import {
  FINANCIAL_SERIALIZABLE_TRANSACTION_OPTIONS,
  LotAllocationService,
  type PersistedAllocation,
} from '../../common/balance/lot-allocation.service';
import type { AuthContext } from '../../common/auth/session.types';
import { DomainHttpException } from '../../common/errors/domain.exception';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { buildTransactionReversedSmsPayload } from '../../jobs/sms.templates';
import { ReverseTransactionDto } from './reversals.dto';

const REVERSE_ENDPOINT = 'POST /api/v1/transactions/{transactionId}/reverse';
const REVERSAL_RETRY_ATTEMPTS = 3;
const REVERSAL_RETRY_JITTER_MS = 25;

export interface ReversalResponse {
  receiptId?: string;
  originalRedemptionTransactionId?: string;
  originalEarnTransactionId?: string;
  redemptionReversalTransactionId?: string;
  earnReversalTransactionId?: string;
  earnRemovedAmountKobo?: number;
  redeemedRestoredAmountKobo?: number;
  id: string;
  transactionId: string;
  originalTransactionId: string;
  originalTransactionType: LedgerEntryType;
  reversedAmountKobo: number;
  newActiveBalanceKobo: number;
  allocations: Array<{
    creditLotId: string;
    amountKobo: number;
    allocationOrder: number;
    expiresAt: string;
  }>;
  restorations: Array<{
    allocationId: string;
    creditLotId: string;
    amountKobo: number;
  }>;
  smsStatus: SmsMessageStatus | null;
  occurredAt: string;
  requestedAt: string;
}

@Injectable()
export class ReversalsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly activeBalanceService: ActiveBalanceService,
    private readonly lotAllocationService: LotAllocationService,
    private readonly auditService: AuditService,
  ) {}

  async reverse(
    tenantId: string,
    actor: AuthContext,
    transactionId: string,
    idempotencyKey: string | undefined,
    dto: ReverseTransactionDto,
  ): Promise<ReversalResponse> {
    const normalizedKey = normalizeIdempotencyKey(idempotencyKey);
    const reason = normalizeReason(dto.reason);
    const selected = await this.prismaService.loyaltyLedgerEntry.findFirst({
      where: { tenantId, id: transactionId },
      select: { receiptId: true, redemption: { select: { receiptId: true } } },
    });
    const candidateReceiptId =
      selected?.receiptId ?? selected?.redemption?.receiptId;
    const receiptEffects = candidateReceiptId
      ? await this.prismaService.loyaltyLedgerEntry.findMany({
          where: { tenantId, receiptId: candidateReceiptId },
          select: { id: true, type: true },
        })
      : [];
    const pairedReceiptId =
      receiptEffects.length === 2 &&
      receiptEffects.some((entry) => entry.type === LedgerEntryType.EARN) &&
      receiptEffects.some((entry) => entry.type === LedgerEntryType.REDEEM)
        ? candidateReceiptId
        : undefined;
    const groupedRequestHash = candidateReceiptId
      ? hashRequest({
          tenantId,
          actorId: actor.user.id,
          transactionId: candidateReceiptId,
          reason,
        })
      : undefined;
    const requestHash = hashRequest({
      tenantId,
      actorId: actor.user.id,
      transactionId: pairedReceiptId ?? transactionId,
      reason,
    });

    await cleanupExpiredIdempotencyRecords(
      this.prismaService,
      tenantId,
      actor.user.id,
      normalizedKey,
    );

    const existing = await this.prismaService.idempotencyRecord.findUnique({
      where: {
        tenantId_actorId_endpoint_idempotencyKey: {
          tenantId,
          actorId: actor.user.id,
          endpoint: REVERSE_ENDPOINT,
          idempotencyKey: normalizedKey,
        },
      },
    });

    if (
      candidateReceiptId &&
      groupedRequestHash &&
      existing?.requestHash === groupedRequestHash &&
      !pairedReceiptId
    ) {
      throw reviewRequired(
        'Previously grouped receipt no longer has its exact settlement pair',
      );
    }

    if (existing && existing.requestHash !== requestHash) {
      throw new DomainHttpException(
        HttpStatus.CONFLICT,
        'IDEMPOTENCY_CONFLICT',
        'Idempotency key reused with different payload',
      );
    }

    if (
      existing?.requestHash === requestHash &&
      existing.responseJson &&
      !pairedReceiptId
    ) {
      return existing.responseJson as unknown as ReversalResponse;
    }

    return runReverseTransaction({
      prismaService: this.prismaService,
      activeBalanceService: this.activeBalanceService,
      lotAllocationService: this.lotAllocationService,
      auditService: this.auditService,
      tenantId,
      actor,
      transactionId,
      reason,
      requestHash,
      normalizedKey,
    });
  }
}

async function runReverseTransaction(input: {
  prismaService: PrismaService;
  activeBalanceService: ActiveBalanceService;
  lotAllocationService: LotAllocationService;
  auditService: AuditService;
  tenantId: string;
  actor: AuthContext;
  transactionId: string;
  reason: string;
  requestHash: string;
  normalizedKey: string;
}): Promise<ReversalResponse> {
  for (let attempt = 1; attempt <= REVERSAL_RETRY_ATTEMPTS; attempt += 1) {
    try {
      return await input.prismaService.$transaction(async (prisma) => {
        const lockKey = buildReverseIdempotencyLockKey(
          input.tenantId,
          input.actor.user.id,
          input.normalizedKey,
        );

        await prisma.$executeRaw(
          Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))`,
        );

        const existing = await prisma.idempotencyRecord.findUnique({
          where: {
            tenantId_actorId_endpoint_idempotencyKey: {
              tenantId: input.tenantId,
              actorId: input.actor.user.id,
              endpoint: REVERSE_ENDPOINT,
              idempotencyKey: input.normalizedKey,
            },
          },
        });

        if (existing && existing.requestHash !== input.requestHash) {
          throw new DomainHttpException(
            HttpStatus.CONFLICT,
            'IDEMPOTENCY_CONFLICT',
            'Idempotency key reused with different payload',
          );
        }

        if (existing && !existing.responseJson) {
          throw new DomainHttpException(
            HttpStatus.CONFLICT,
            'IDEMPOTENCY_IN_PROGRESS',
            'Idempotency key is still being processed',
          );
        }

        if (!existing) {
          await prisma.idempotencyRecord.create({
            data: {
              tenantId: input.tenantId,
              actorId: input.actor.user.id,
              endpoint: REVERSE_ENDPOINT,
              idempotencyKey: input.normalizedKey,
              requestHash: input.requestHash,
              responseJson: Prisma.JsonNull,
              status: 'PENDING',
              expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
          });
        }

        const original = await prisma.loyaltyLedgerEntry.findFirst({
          where: { tenantId: input.tenantId, id: input.transactionId },
          include: {
            customer: { include: { branch: true } },
            receipt: {
              include: {
                branch: true,
                card: true,
                device: true,
                ledgerEntries: {
                  select: { id: true, type: true, status: true },
                },
              },
            },
            creditLot: true,
            redemption: {
              include: {
                receipt: {
                  include: {
                    branch: true,
                    card: true,
                    device: true,
                    ledgerEntries: {
                      select: { id: true, type: true, status: true },
                    },
                  },
                },
                approval: true,
              },
            },
            adjustment: true,
            redemptionAllocations: {
              include: {
                creditLot: { select: { expiresAt: true } },
                restorations: true,
              },
              orderBy: { allocationOrder: 'asc' },
            },
            reversedByEntries: {
              select: { id: true },
            },
          },
        });

        if (!original) {
          throw new DomainHttpException(
            HttpStatus.NOT_FOUND,
            'TRANSACTION_NOT_FOUND',
            'Transaction not found',
          );
        }

        if (
          input.actor.user.branchId &&
          input.actor.user.branchId !== original.customer.branchId
        ) {
          throw new DomainHttpException(
            HttpStatus.NOT_FOUND,
            'TRANSACTION_NOT_FOUND',
            'Transaction not found',
          );
        }

        const receiptLedgerEntries =
          original.receipt?.ledgerEntries ??
          original.redemption?.receipt.ledgerEntries ??
          [];
        const originalReceiptId =
          original.receiptId ?? original.redemption?.receiptId;
        if (
          originalReceiptId &&
          receiptLedgerEntries.some((entry) => entry.id !== original.id)
        ) {
          return reversePairedSettlement({
            prisma,
            input,
            originalId: original.id,
            receiptId: originalReceiptId,
            receiptLedgerEntries,
            existingResponse: existing?.responseJson
              ? (existing.responseJson as unknown as ReversalResponse)
              : undefined,
            now: new Date(),
          });
        }

        if (
          existing?.responseJson &&
          existing.requestHash === input.requestHash
        ) {
          return existing.responseJson as unknown as ReversalResponse;
        }

        if (original.reversedByEntries.length > 0) {
          throw alreadyReversed();
        }

        const now = new Date();
        let reversedAmountKobo = 0n;
        let allocations: ReversalResponse['allocations'] = [];
        let restorations: ReversalResponse['restorations'] = [];

        if (
          original.type === LedgerEntryType.EARN &&
          original.direction === LedgerEntryDirection.CREDIT
        ) {
          if (!original.creditLot) {
            throw reviewRequired('Original credit lot is missing');
          }

          if (original.creditLot.expiresAt <= now) {
            throw reviewRequired('Original credit lot is expired');
          }

          if (
            original.creditLot.remainingAmountKobo !==
            original.creditLot.originalAmountKobo
          ) {
            throw reviewRequired(
              'Original credit lot has already been consumed',
            );
          }

          reversedAmountKobo = original.creditLot.originalAmountKobo;

          const reversalLedgerEntry = await prisma.loyaltyLedgerEntry.create({
            data: {
              tenantId: input.tenantId,
              customerId: original.customerId,
              receiptId: null,
              type: LedgerEntryType.ADJUSTMENT,
              direction: LedgerEntryDirection.DEBIT,
              amountKobo: reversedAmountKobo,
              status: LedgerEntryStatus.CONFIRMED,
              correlationId: input.requestHash,
              reversesEntryId: original.id,
              createdByTenantId: input.actor.user.tenantId,
              createdBy: input.actor.user.id,
              effectiveAt: now,
            },
          });

          const reversalAdjustment = await prisma.adjustment.create({
            data: {
              tenantId: input.tenantId,
              customerId: original.customerId,
              kind: AdjustmentKind.DEBIT,
              amountKobo: reversedAmountKobo,
              reason: input.reason,
              createdByTenantId: input.actor.user.tenantId,
              createdBy: input.actor.user.id,
              ledgerEntryId: reversalLedgerEntry.id,
              effectiveAt: now,
            },
          });

          allocations = toReversalAllocations(
            await input.lotAllocationService.allocateDebitFromExactLot(prisma, {
              tenantId: input.tenantId,
              customerId: original.customerId,
              creditLotId: original.creditLot.id,
              debitLedgerEntryId: reversalLedgerEntry.id,
              amountKobo: reversedAmountKobo,
              adjustmentId: reversalAdjustment.id,
              now,
            }),
          );

          const remainingBalanceKobo =
            await input.activeBalanceService.getActiveBalanceKobo(
              input.tenantId,
              original.customerId,
              now,
              prisma,
            );

          await persistReverseNotification({
            prisma,
            tenantId: input.tenantId,
            phoneE164: original.customer.phoneE164,
            reversalLedgerEntryId: reversalLedgerEntry.id,
            originalTransactionId: original.id,
            receiptId: original.receiptId ?? null,
            occurredAt: now,
          });

          await input.auditService.recordWithClient(prisma, {
            tenantId: input.tenantId,
            actorId: input.actor.user.id,
            action: 'transaction.reversed',
            entityType: 'ledger-entry',
            entityId: original.id,
            metadata: {
              reason: input.reason,
              reversalLedgerEntryId: reversalLedgerEntry.id,
              reversedAmountKobo: Number(reversedAmountKobo),
            },
          });

          const response: ReversalResponse = {
            id: reversalLedgerEntry.id,
            transactionId: reversalLedgerEntry.id,
            originalTransactionId: original.id,
            originalTransactionType: original.type,
            reversedAmountKobo: Number(reversedAmountKobo),
            newActiveBalanceKobo: Number(remainingBalanceKobo),
            allocations,
            restorations,
            smsStatus: SmsMessageStatus.QUEUED,
            occurredAt: now.toISOString(),
            requestedAt: now.toISOString(),
          };

          await persistReverseIdempotency(
            prisma,
            input.tenantId,
            input.actor.user.id,
            input.normalizedKey,
            input.requestHash,
            response,
          );

          return response;
        } else if (
          original.type === LedgerEntryType.REDEEM &&
          original.direction === LedgerEntryDirection.DEBIT
        ) {
          const plannedRestorations =
            await input.lotAllocationService.planRestorations(prisma, {
              tenantId: input.tenantId,
              debitLedgerEntryId: original.id,
              now,
            });

          reversedAmountKobo = plannedRestorations.reduce(
            (sum, restoration) => sum + restoration.amountKobo,
            0n,
          );

          const reversalLedgerEntry = await prisma.loyaltyLedgerEntry.create({
            data: {
              tenantId: input.tenantId,
              customerId: original.customerId,
              receiptId: null,
              type: LedgerEntryType.REVERSAL,
              direction: LedgerEntryDirection.CREDIT,
              amountKobo: reversedAmountKobo,
              status: LedgerEntryStatus.CONFIRMED,
              correlationId: input.requestHash,
              reversesEntryId: original.id,
              createdByTenantId: input.actor.user.tenantId,
              createdBy: input.actor.user.id,
              effectiveAt: now,
            },
          });

          for (const restoration of plannedRestorations) {
            const updated = await prisma.creditLot.updateMany({
              where: {
                tenantId: input.tenantId,
                id: restoration.creditLotId,
                customerId: original.customerId,
              },
              data: {
                remainingAmountKobo: { increment: restoration.amountKobo },
              },
            });

            if (updated.count !== 1) {
              throw reviewRequired(
                'Original credit lot changed during reversal',
              );
            }

            await prisma.allocationRestoration.create({
              data: {
                tenantId: input.tenantId,
                allocationId: restoration.allocationId,
                reversalLedgerEntryId: reversalLedgerEntry.id,
                amountKobo: restoration.amountKobo,
              },
            });
          }

          restorations = plannedRestorations.map((restoration) => ({
            allocationId: restoration.allocationId,
            creditLotId: restoration.creditLotId,
            amountKobo: Number(restoration.amountKobo),
          }));

          await prisma.redemption.updateMany({
            where: { tenantId: input.tenantId, ledgerEntryId: original.id },
            data: { status: RedemptionStatus.REVERSED, reversedAt: now },
          });

          const remainingBalanceKobo =
            await input.activeBalanceService.getActiveBalanceKobo(
              input.tenantId,
              original.customerId,
              now,
              prisma,
            );

          await persistReverseNotification({
            prisma,
            tenantId: input.tenantId,
            phoneE164: original.customer.phoneE164,
            reversalLedgerEntryId: reversalLedgerEntry.id,
            originalTransactionId: original.id,
            receiptId:
              original.receiptId ?? original.redemption?.receiptId ?? null,
            occurredAt: now,
          });

          await input.auditService.recordWithClient(prisma, {
            tenantId: input.tenantId,
            actorId: input.actor.user.id,
            action: 'transaction.reversed',
            entityType: 'ledger-entry',
            entityId: original.id,
            metadata: {
              reason: input.reason,
              reversalLedgerEntryId: reversalLedgerEntry.id,
              reversedAmountKobo: Number(reversedAmountKobo),
            },
          });

          const response: ReversalResponse = {
            id: reversalLedgerEntry.id,
            transactionId: reversalLedgerEntry.id,
            originalTransactionId: original.id,
            originalTransactionType: original.type,
            reversedAmountKobo: Number(reversedAmountKobo),
            newActiveBalanceKobo: Number(remainingBalanceKobo),
            allocations,
            restorations,
            smsStatus: SmsMessageStatus.QUEUED,
            occurredAt: now.toISOString(),
            requestedAt: now.toISOString(),
          };

          await persistReverseIdempotency(
            prisma,
            input.tenantId,
            input.actor.user.id,
            input.normalizedKey,
            input.requestHash,
            response,
          );

          return response;
        } else if (
          original.type === LedgerEntryType.ADJUSTMENT &&
          original.direction === LedgerEntryDirection.CREDIT
        ) {
          if (!original.adjustment) {
            throw reviewRequired('Original adjustment is missing');
          }

          if (!original.creditLot) {
            throw reviewRequired('Original credit lot is missing');
          }

          if (original.creditLot.expiresAt <= now) {
            throw reviewRequired('Original credit lot is expired');
          }

          if (
            original.creditLot.remainingAmountKobo !==
            original.creditLot.originalAmountKobo
          ) {
            throw reviewRequired(
              'Original credit lot has already been consumed',
            );
          }

          reversedAmountKobo = original.adjustment.amountKobo;

          const reversalLedgerEntry = await prisma.loyaltyLedgerEntry.create({
            data: {
              tenantId: input.tenantId,
              customerId: original.customerId,
              receiptId: null,
              type: LedgerEntryType.ADJUSTMENT,
              direction: LedgerEntryDirection.DEBIT,
              amountKobo: reversedAmountKobo,
              status: LedgerEntryStatus.CONFIRMED,
              correlationId: input.requestHash,
              reversesEntryId: original.id,
              createdByTenantId: input.actor.user.tenantId,
              createdBy: input.actor.user.id,
              effectiveAt: now,
            },
          });

          const reversalAdjustment = await prisma.adjustment.create({
            data: {
              tenantId: input.tenantId,
              customerId: original.customerId,
              kind: AdjustmentKind.DEBIT,
              amountKobo: reversedAmountKobo,
              reason: input.reason,
              createdByTenantId: input.actor.user.tenantId,
              createdBy: input.actor.user.id,
              ledgerEntryId: reversalLedgerEntry.id,
              effectiveAt: now,
            },
          });

          allocations = toReversalAllocations(
            await input.lotAllocationService.allocateDebitFromExactLot(prisma, {
              tenantId: input.tenantId,
              customerId: original.customerId,
              creditLotId: original.creditLot.id,
              debitLedgerEntryId: reversalLedgerEntry.id,
              amountKobo: reversedAmountKobo,
              adjustmentId: reversalAdjustment.id,
              now,
            }),
          );

          const remainingBalanceKobo =
            await input.activeBalanceService.getActiveBalanceKobo(
              input.tenantId,
              original.customerId,
              now,
              prisma,
            );

          await persistReverseNotification({
            prisma,
            tenantId: input.tenantId,
            phoneE164: original.customer.phoneE164,
            reversalLedgerEntryId: reversalLedgerEntry.id,
            originalTransactionId: original.id,
            receiptId: null,
            occurredAt: now,
          });

          await input.auditService.recordWithClient(prisma, {
            tenantId: input.tenantId,
            actorId: input.actor.user.id,
            action: 'transaction.reversed',
            entityType: 'ledger-entry',
            entityId: original.id,
            metadata: {
              reason: input.reason,
              reversalLedgerEntryId: reversalLedgerEntry.id,
              reversedAmountKobo: Number(reversedAmountKobo),
            },
          });

          const response: ReversalResponse = {
            id: reversalLedgerEntry.id,
            transactionId: reversalLedgerEntry.id,
            originalTransactionId: original.id,
            originalTransactionType: original.type,
            reversedAmountKobo: Number(reversedAmountKobo),
            newActiveBalanceKobo: Number(remainingBalanceKobo),
            allocations,
            restorations,
            smsStatus: SmsMessageStatus.QUEUED,
            occurredAt: now.toISOString(),
            requestedAt: now.toISOString(),
          };

          await persistReverseIdempotency(
            prisma,
            input.tenantId,
            input.actor.user.id,
            input.normalizedKey,
            input.requestHash,
            response,
          );

          return response;
        } else if (
          original.type === LedgerEntryType.ADJUSTMENT &&
          original.direction === LedgerEntryDirection.DEBIT
        ) {
          const plannedRestorations =
            await input.lotAllocationService.planRestorations(prisma, {
              tenantId: input.tenantId,
              debitLedgerEntryId: original.id,
              now,
            });

          reversedAmountKobo = plannedRestorations.reduce(
            (sum, restoration) => sum + restoration.amountKobo,
            0n,
          );

          const reversalLedgerEntry = await prisma.loyaltyLedgerEntry.create({
            data: {
              tenantId: input.tenantId,
              customerId: original.customerId,
              receiptId: null,
              type: LedgerEntryType.REVERSAL,
              direction: LedgerEntryDirection.CREDIT,
              amountKobo: reversedAmountKobo,
              status: LedgerEntryStatus.CONFIRMED,
              correlationId: input.requestHash,
              reversesEntryId: original.id,
              createdByTenantId: input.actor.user.tenantId,
              createdBy: input.actor.user.id,
              effectiveAt: now,
            },
          });

          for (const restoration of plannedRestorations) {
            const updated = await prisma.creditLot.updateMany({
              where: {
                tenantId: input.tenantId,
                id: restoration.creditLotId,
                customerId: original.customerId,
              },
              data: {
                remainingAmountKobo: { increment: restoration.amountKobo },
              },
            });

            if (updated.count !== 1) {
              throw reviewRequired(
                'Original credit lot changed during reversal',
              );
            }

            await prisma.allocationRestoration.create({
              data: {
                tenantId: input.tenantId,
                allocationId: restoration.allocationId,
                reversalLedgerEntryId: reversalLedgerEntry.id,
                amountKobo: restoration.amountKobo,
              },
            });
          }

          restorations = plannedRestorations.map((restoration) => ({
            allocationId: restoration.allocationId,
            creditLotId: restoration.creditLotId,
            amountKobo: Number(restoration.amountKobo),
          }));

          const remainingBalanceKobo =
            await input.activeBalanceService.getActiveBalanceKobo(
              input.tenantId,
              original.customerId,
              now,
              prisma,
            );

          await persistReverseNotification({
            prisma,
            tenantId: input.tenantId,
            phoneE164: original.customer.phoneE164,
            reversalLedgerEntryId: reversalLedgerEntry.id,
            originalTransactionId: original.id,
            receiptId: null,
            occurredAt: now,
          });

          await input.auditService.recordWithClient(prisma, {
            tenantId: input.tenantId,
            actorId: input.actor.user.id,
            action: 'transaction.reversed',
            entityType: 'ledger-entry',
            entityId: original.id,
            metadata: {
              reason: input.reason,
              reversalLedgerEntryId: reversalLedgerEntry.id,
              reversedAmountKobo: Number(reversedAmountKobo),
            },
          });

          const response: ReversalResponse = {
            id: reversalLedgerEntry.id,
            transactionId: reversalLedgerEntry.id,
            originalTransactionId: original.id,
            originalTransactionType: original.type,
            reversedAmountKobo: Number(reversedAmountKobo),
            newActiveBalanceKobo: Number(remainingBalanceKobo),
            allocations,
            restorations,
            smsStatus: SmsMessageStatus.QUEUED,
            occurredAt: now.toISOString(),
            requestedAt: now.toISOString(),
          };

          await persistReverseIdempotency(
            prisma,
            input.tenantId,
            input.actor.user.id,
            input.normalizedKey,
            input.requestHash,
            response,
          );

          return response;
        }

        throw reviewRequired(
          'Transaction type cannot be reversed automatically',
        );
      }, FINANCIAL_SERIALIZABLE_TRANSACTION_OPTIONS);
    } catch (error) {
      if (isTransactionConflict(error) || isIdempotencyConflict(error)) {
        if (attempt < REVERSAL_RETRY_ATTEMPTS) {
          await waitForJitter();
          continue;
        }

        throw new DomainHttpException(
          HttpStatus.SERVICE_UNAVAILABLE,
          'REVERSAL_TRANSACTION_CONFLICT',
          'Transaction reversal conflicted; retry the request',
        );
      }

      // The pending key is created inside this transaction, so rollback already
      // removes it. Never delete a committed record owned by a concurrent winner.
      throw error;
    }
  }

  throw new DomainHttpException(
    HttpStatus.SERVICE_UNAVAILABLE,
    'REVERSAL_TRANSACTION_CONFLICT',
    'Transaction reversal conflicted; retry the request',
  );
}

async function reversePairedSettlement(input: {
  prisma: Prisma.TransactionClient;
  input: Parameters<typeof runReverseTransaction>[0];
  originalId: string;
  receiptId: string;
  receiptLedgerEntries: Array<{
    id: string;
    type: LedgerEntryType;
    status: LedgerEntryStatus;
  }>;
  existingResponse?: ReversalResponse;
  now: Date;
}): Promise<ReversalResponse> {
  const { prisma, input: reversal, receiptId, now } = input;
  await prisma.$queryRaw(Prisma.sql`
    SELECT "id" FROM "Receipt"
    WHERE "tenantId" = ${reversal.tenantId} AND "id" = ${receiptId}
    FOR UPDATE
  `);
  await prisma.$queryRaw(Prisma.sql`
    SELECT "id" FROM "LoyaltyLedgerEntry"
    WHERE "tenantId" = ${reversal.tenantId} AND "receiptId" = ${receiptId}
    FOR UPDATE
  `);
  const earnCandidates = input.receiptLedgerEntries.filter(
    (entry) => entry.type === LedgerEntryType.EARN,
  );
  const redeemCandidates = input.receiptLedgerEntries.filter(
    (entry) => entry.type === LedgerEntryType.REDEEM,
  );
  if (
    input.receiptLedgerEntries.length !== 2 ||
    earnCandidates.length !== 1 ||
    redeemCandidates.length !== 1 ||
    input.receiptLedgerEntries.some(
      (entry) => entry.status !== LedgerEntryStatus.CONFIRMED,
    )
  ) {
    throw reviewRequired(
      'Receipt settlement effects are incomplete or inconsistent',
    );
  }

  const [earn, redeem] = await Promise.all([
    prisma.loyaltyLedgerEntry.findFirst({
      where: { tenantId: reversal.tenantId, id: earnCandidates[0].id },
      include: {
        customer: true,
        creditLot: true,
        reversedByEntries: { select: { id: true } },
      },
    }),
    prisma.loyaltyLedgerEntry.findFirst({
      where: { tenantId: reversal.tenantId, id: redeemCandidates[0].id },
      include: {
        customer: true,
        redemption: true,
        reversedByEntries: { select: { id: true } },
        redemptionAllocations: {
          include: {
            creditLot: {
              select: {
                tenantId: true,
                customerId: true,
                expiresAt: true,
                originalAmountKobo: true,
                remainingAmountKobo: true,
              },
            },
            restorations: true,
          },
          orderBy: { allocationOrder: 'asc' },
        },
      },
    }),
  ]);
  if (
    !earn ||
    !redeem ||
    earn.status !== LedgerEntryStatus.CONFIRMED ||
    redeem.status !== LedgerEntryStatus.CONFIRMED ||
    earn.direction !== LedgerEntryDirection.CREDIT ||
    redeem.direction !== LedgerEntryDirection.DEBIT ||
    earn.receiptId !== receiptId ||
    redeem.receiptId !== receiptId ||
    earn.customerId !== redeem.customerId ||
    earn.customer.tenantId !== reversal.tenantId ||
    redeem.customer.tenantId !== reversal.tenantId ||
    earn.correlationId !== `${redeem.correlationId}:earn` ||
    !redeem.redemption ||
    redeem.redemption.tenantId !== reversal.tenantId ||
    redeem.redemption.customerId !== redeem.customerId ||
    redeem.redemption.receiptId !== receiptId ||
    redeem.redemption.ledgerEntryId !== redeem.id ||
    (redeem.redemption.status !== RedemptionStatus.CONFIRMED &&
      redeem.redemption.status !== RedemptionStatus.REVERSED) ||
    redeem.redemption.confirmedAmountKobo !== redeem.amountKobo
  ) {
    throw reviewRequired(
      'Receipt settlement pair is malformed or already partially reversed',
    );
  }

  if (
    redeem.redemption.status === RedemptionStatus.REVERSED &&
    earn.reversedByEntries.length === 0 &&
    redeem.reversedByEntries.length === 0
  ) {
    throw reviewRequired(
      'Redemption status is reversed without reversal evidence',
    );
  }
  const hasReversalEvidence =
    earn.reversedByEntries.length > 0 || redeem.reversedByEntries.length > 0;
  if (input.existingResponse && !hasReversalEvidence) {
    throw reviewRequired(
      'Completed idempotency response has no matching reversal evidence',
    );
  }
  if (hasReversalEvidence) {
    if (
      earn.reversedByEntries.length !== 1 ||
      redeem.reversedByEntries.length !== 1
    ) {
      throw reviewRequired('Settlement reversal history is partial');
    }
    const completedReversals = await prisma.loyaltyLedgerEntry.findMany({
      where: {
        tenantId: reversal.tenantId,
        id: {
          in: [earn.reversedByEntries[0].id, redeem.reversedByEntries[0].id],
        },
      },
      include: {
        allocationRestorations: {
          select: { allocationId: true, amountKobo: true },
        },
        redemptionAllocations: {
          select: {
            id: true,
            tenantId: true,
            redemptionId: true,
            adjustmentId: true,
            redemptionLedgerEntryId: true,
            creditLotId: true,
            amountKobo: true,
            allocationOrder: true,
          },
        },
        adjustment: {
          include: {
            allocations: {
              select: {
                id: true,
                tenantId: true,
                adjustmentId: true,
                redemptionLedgerEntryId: true,
                creditLotId: true,
                amountKobo: true,
                allocationOrder: true,
              },
              orderBy: { allocationOrder: 'asc' },
            },
          },
        },
      },
    });
    const earnCompensation = completedReversals.find(
      (entry) => entry.reversesEntryId === earn.id,
    );
    const redeemCompensation = completedReversals.find(
      (entry) => entry.reversesEntryId === redeem.id,
    );
    const restored = redeemCompensation?.allocationRestorations ?? [];
    const groupCorrelation = earnCompensation?.correlationId.endsWith(
      ':earn-reversal',
    )
      ? earnCompensation.correlationId.slice(0, -':earn-reversal'.length)
      : '';
    if (
      completedReversals.length !== 2 ||
      !earnCompensation ||
      earnCompensation.type !== LedgerEntryType.ADJUSTMENT ||
      earnCompensation.direction !== LedgerEntryDirection.DEBIT ||
      earnCompensation.amountKobo !== earn.amountKobo ||
      earnCompensation.status !== LedgerEntryStatus.CONFIRMED ||
      earnCompensation.tenantId !== reversal.tenantId ||
      earnCompensation.customerId !== earn.customerId ||
      earnCompensation.receiptId !== null ||
      !/^[a-f0-9]{64}$/.test(groupCorrelation) ||
      earnCompensation.correlationId !== `${groupCorrelation}:earn-reversal` ||
      !earnCompensation.adjustment ||
      earnCompensation.adjustment.tenantId !== reversal.tenantId ||
      earnCompensation.adjustment.customerId !== earn.customerId ||
      earnCompensation.adjustment.kind !== AdjustmentKind.DEBIT ||
      earnCompensation.adjustment.amountKobo !== earn.amountKobo ||
      earnCompensation.adjustment.ledgerEntryId !== earnCompensation.id ||
      earnCompensation.adjustment.allocations.length !== 1 ||
      earnCompensation.adjustment.allocations[0].tenantId !==
        reversal.tenantId ||
      earnCompensation.adjustment.allocations[0].adjustmentId !==
        earnCompensation.adjustment.id ||
      earnCompensation.adjustment.allocations[0].redemptionLedgerEntryId !==
        earnCompensation.id ||
      earnCompensation.adjustment.allocations[0].creditLotId !==
        earn.creditLot?.id ||
      earnCompensation.adjustment.allocations[0].amountKobo !==
        earn.amountKobo ||
      earnCompensation.adjustment.allocations[0].allocationOrder !== 1 ||
      !redeemCompensation ||
      redeemCompensation.type !== LedgerEntryType.REVERSAL ||
      redeemCompensation.direction !== LedgerEntryDirection.CREDIT ||
      redeemCompensation.amountKobo !== redeem.amountKobo ||
      redeemCompensation.status !== LedgerEntryStatus.CONFIRMED ||
      redeemCompensation.tenantId !== reversal.tenantId ||
      redeemCompensation.customerId !== redeem.customerId ||
      redeemCompensation.receiptId !== null ||
      redeemCompensation.correlationId !==
        `${groupCorrelation}:redeem-reversal` ||
      redeemCompensation.adjustment !== null ||
      redeemCompensation.redemptionAllocations.length !== 0 ||
      redeem.redemption.status !== RedemptionStatus.REVERSED ||
      !earn.creditLot ||
      earn.creditLot.originalAmountKobo !== earn.amountKobo ||
      earn.creditLot.remainingAmountKobo !== 0n ||
      restored.length !== redeem.redemptionAllocations.length ||
      restored.some((restoration) => {
        const allocation = redeem.redemptionAllocations.find(
          (candidate) => candidate.id === restoration.allocationId,
        );
        return (
          !allocation ||
          restoration.amountKobo !== allocation.amountKobo ||
          restoration.amountKobo <= 0n
        );
      }) ||
      !redeem.redemptionAllocations.every(
        (allocation) =>
          allocation.restorations.length === 1 &&
          allocation.restorations[0].reversalLedgerEntryId ===
            redeemCompensation.id &&
          allocation.restorations[0].amountKobo === allocation.amountKobo,
      )
    ) {
      throw reviewRequired(
        'Completed settlement reversal history is inconsistent',
      );
    }
    if (input.existingResponse) {
      const replay = input.existingResponse;
      const selectedCompensation =
        replay.originalTransactionId === earn.id
          ? earnCompensation
          : replay.originalTransactionId === redeem.id
            ? redeemCompensation
            : null;
      const responseRestorations = Array.isArray(replay.restorations)
        ? replay.restorations
        : [];
      const responseAllocations = Array.isArray(replay.allocations)
        ? replay.allocations
        : [];
      const restorationsMatch =
        responseRestorations.length === redeem.redemptionAllocations.length &&
        responseRestorations.every((restoration) => {
          const allocation = redeem.redemptionAllocations.find(
            (candidate) => candidate.id === restoration.allocationId,
          );
          return (
            allocation !== undefined &&
            restoration.creditLotId === allocation.creditLotId &&
            restoration.amountKobo === Number(allocation.amountKobo)
          );
        });
      const earnAllocationsMatch =
        responseAllocations.length === 1 &&
        responseAllocations[0].creditLotId === earn.creditLot.id &&
        responseAllocations[0].amountKobo === Number(earn.amountKobo);
      if (
        replay.receiptId !== receiptId ||
        replay.originalEarnTransactionId !== earn.id ||
        replay.originalRedemptionTransactionId !== redeem.id ||
        replay.earnReversalTransactionId !== earnCompensation.id ||
        replay.redemptionReversalTransactionId !== redeemCompensation.id ||
        replay.earnRemovedAmountKobo !== Number(earn.amountKobo) ||
        replay.redeemedRestoredAmountKobo !== Number(redeem.amountKobo) ||
        replay.reversedAmountKobo !==
          Number(earn.amountKobo + redeem.amountKobo) ||
        selectedCompensation === null ||
        replay.id !== selectedCompensation.id ||
        replay.transactionId !== selectedCompensation.id ||
        replay.originalTransactionType !==
          (replay.originalTransactionId === earn.id
            ? earn.type
            : redeem.type) ||
        !restorationsMatch ||
        !earnAllocationsMatch
      ) {
        throw reviewRequired(
          'Stored grouped response does not match completed reversal history',
        );
      }
      return replay;
    }
    throw alreadyReversed();
  }

  const earnLot = earn.creditLot;
  if (
    !earnLot ||
    earnLot.tenantId !== reversal.tenantId ||
    earnLot.customerId !== earn.customerId ||
    earnLot.earnLedgerEntryId !== earn.id ||
    earnLot.originalAmountKobo !== earn.amountKobo ||
    earnLot.remainingAmountKobo !== earnLot.originalAmountKobo ||
    earnLot.expiresAt <= now
  ) {
    throw reviewRequired(
      'Settlement Earn lot is missing, consumed, or inconsistent',
    );
  }
  if (
    redeem.redemptionAllocations.length === 0 ||
    redeem.redemptionAllocations.some(
      (allocation) =>
        allocation.tenantId !== reversal.tenantId ||
        allocation.redemptionId !== redeem.redemption!.id ||
        allocation.creditLotId === earnLot.id ||
        allocation.amountKobo <= 0n ||
        allocation.creditLot.tenantId !== reversal.tenantId ||
        allocation.creditLot.customerId !== redeem.customerId ||
        allocation.creditLot.originalAmountKobo < allocation.amountKobo ||
        allocation.creditLot.remainingAmountKobo + allocation.amountKobo >
          allocation.creditLot.originalAmountKobo ||
        allocation.restorations.length > 0,
    ) ||
    redeem.redemptionAllocations.reduce(
      (sum, allocation) => sum + allocation.amountKobo,
      0n,
    ) !== redeem.amountKobo
  ) {
    throw reviewRequired(
      'Redemption allocation history is inconsistent or partially restored',
    );
  }

  await prisma.$queryRaw(Prisma.sql`
    SELECT "id" FROM "CreditLot"
    WHERE "tenantId" = ${reversal.tenantId}
      AND "id" IN (
        SELECT "creditLotId" FROM "RedemptionAllocation"
        WHERE "tenantId" = ${reversal.tenantId}
          AND "redemptionLedgerEntryId" = ${redeem.id}
      )
    FOR UPDATE
  `);
  const plannedRestorations =
    await reversal.lotAllocationService.planRestorations(prisma, {
      tenantId: reversal.tenantId,
      debitLedgerEntryId: redeem.id,
      now,
    });
  if (
    plannedRestorations.reduce(
      (sum, restoration) => sum + restoration.amountKobo,
      0n,
    ) !== redeem.amountKobo
  ) {
    throw reviewRequired('Redemption allocations are not fully restorable');
  }

  const earnReversal = await prisma.loyaltyLedgerEntry.create({
    data: {
      tenantId: reversal.tenantId,
      customerId: earn.customerId,
      receiptId: null,
      type: LedgerEntryType.ADJUSTMENT,
      direction: LedgerEntryDirection.DEBIT,
      amountKobo: earn.amountKobo,
      status: LedgerEntryStatus.CONFIRMED,
      correlationId: `${reversal.requestHash}:earn-reversal`,
      reversesEntryId: earn.id,
      createdByTenantId: reversal.actor.user.tenantId,
      createdBy: reversal.actor.user.id,
      effectiveAt: now,
    },
  });
  const earnAdjustment = await prisma.adjustment.create({
    data: {
      tenantId: reversal.tenantId,
      customerId: earn.customerId,
      kind: AdjustmentKind.DEBIT,
      amountKobo: earn.amountKobo,
      reason: reversal.reason,
      createdByTenantId: reversal.actor.user.tenantId,
      createdBy: reversal.actor.user.id,
      ledgerEntryId: earnReversal.id,
      effectiveAt: now,
    },
  });
  const allocations = toReversalAllocations(
    await reversal.lotAllocationService.allocateDebitFromExactLot(prisma, {
      tenantId: reversal.tenantId,
      customerId: earn.customerId,
      creditLotId: earnLot.id,
      debitLedgerEntryId: earnReversal.id,
      amountKobo: earn.amountKobo,
      adjustmentId: earnAdjustment.id,
      now,
    }),
  );
  if (
    allocations.length !== 1 ||
    allocations[0].creditLotId !== earnLot.id ||
    BigInt(allocations[0].amountKobo) !== earn.amountKobo
  ) {
    throw reviewRequired('Earn reversal allocation did not use the exact lot');
  }

  const redeemReversal = await prisma.loyaltyLedgerEntry.create({
    data: {
      tenantId: reversal.tenantId,
      customerId: redeem.customerId,
      receiptId: null,
      type: LedgerEntryType.REVERSAL,
      direction: LedgerEntryDirection.CREDIT,
      amountKobo: redeem.amountKobo,
      status: LedgerEntryStatus.CONFIRMED,
      correlationId: `${reversal.requestHash}:redeem-reversal`,
      reversesEntryId: redeem.id,
      createdByTenantId: reversal.actor.user.tenantId,
      createdBy: reversal.actor.user.id,
      effectiveAt: now,
    },
  });
  for (const restoration of plannedRestorations) {
    const updated = await prisma.creditLot.updateMany({
      where: {
        tenantId: reversal.tenantId,
        id: restoration.creditLotId,
        customerId: redeem.customerId,
      },
      data: { remainingAmountKobo: { increment: restoration.amountKobo } },
    });
    if (updated.count !== 1) {
      throw reviewRequired(
        'Original credit lot changed during grouped reversal',
      );
    }
    await prisma.allocationRestoration.create({
      data: {
        tenantId: reversal.tenantId,
        allocationId: restoration.allocationId,
        reversalLedgerEntryId: redeemReversal.id,
        amountKobo: restoration.amountKobo,
      },
    });
  }
  await prisma.redemption.updateMany({
    where: { tenantId: reversal.tenantId, ledgerEntryId: redeem.id },
    data: { status: RedemptionStatus.REVERSED, reversedAt: now },
  });

  const finalBalance = await reversal.activeBalanceService.getActiveBalanceKobo(
    reversal.tenantId,
    redeem.customerId,
    now,
    prisma,
  );
  await persistReverseNotification({
    prisma,
    tenantId: reversal.tenantId,
    phoneE164: redeem.customer.phoneE164,
    reversalLedgerEntryId: earnReversal.id,
    originalTransactionId: input.originalId,
    receiptId,
    occurredAt: now,
  });
  await reversal.auditService.recordWithClient(prisma, {
    tenantId: reversal.tenantId,
    actorId: reversal.actor.user.id,
    action: 'transaction.reversed',
    entityType: 'receipt',
    entityId: receiptId,
    metadata: {
      reason: reversal.reason,
      originalEarnTransactionId: earn.id,
      originalRedemptionTransactionId: redeem.id,
      earnReversalTransactionId: earnReversal.id,
      redemptionReversalTransactionId: redeemReversal.id,
      earnRemovedAmountKobo: Number(earn.amountKobo),
      redeemedRestoredAmountKobo: Number(redeem.amountKobo),
    },
  });

  const response: ReversalResponse = {
    receiptId,
    originalRedemptionTransactionId: redeem.id,
    originalEarnTransactionId: earn.id,
    redemptionReversalTransactionId: redeemReversal.id,
    earnReversalTransactionId: earnReversal.id,
    earnRemovedAmountKobo: Number(earn.amountKobo),
    redeemedRestoredAmountKobo: Number(redeem.amountKobo),
    id: input.originalId === earn.id ? earnReversal.id : redeemReversal.id,
    transactionId:
      input.originalId === earn.id ? earnReversal.id : redeemReversal.id,
    originalTransactionId: input.originalId,
    originalTransactionType:
      input.originalId === earn.id ? earn.type : redeem.type,
    reversedAmountKobo: Number(earn.amountKobo + redeem.amountKobo),
    newActiveBalanceKobo: Number(finalBalance),
    allocations,
    restorations: plannedRestorations.map((restoration) => ({
      allocationId: restoration.allocationId,
      creditLotId: restoration.creditLotId,
      amountKobo: Number(restoration.amountKobo),
    })),
    smsStatus: SmsMessageStatus.QUEUED,
    occurredAt: now.toISOString(),
    requestedAt: now.toISOString(),
  };
  await persistReverseIdempotency(
    prisma,
    reversal.tenantId,
    reversal.actor.user.id,
    reversal.normalizedKey,
    reversal.requestHash,
    response,
  );
  return response;
}

async function persistReverseNotification(input: {
  prisma: Prisma.TransactionClient;
  tenantId: string;
  phoneE164: string;
  reversalLedgerEntryId: string;
  originalTransactionId: string;
  receiptId: string | null;
  occurredAt: Date;
}) {
  await input.prisma.outboxEvent.create({
    data: {
      tenantId: input.tenantId,
      aggregateType: 'reversal',
      aggregateId: input.reversalLedgerEntryId,
      eventType: 'fraud.evaluate',
      payload: {
        kind: 'transaction.reversed',
        reversalLedgerEntryId: input.reversalLedgerEntryId,
        originalTransactionId: input.originalTransactionId,
        receiptId: input.receiptId,
        occurredAt: input.occurredAt.toISOString(),
      },
      status: 'PENDING',
      nextAttemptAt: input.occurredAt,
    },
  });

  const outboxEvent = await input.prisma.outboxEvent.create({
    data: {
      tenantId: input.tenantId,
      aggregateType: 'ledger-entry',
      aggregateId: input.reversalLedgerEntryId,
      eventType: 'sms.send',
      payload: buildTransactionReversedSmsPayload({
        transactionId: input.originalTransactionId,
        receiptId: input.receiptId,
        phoneE164: input.phoneE164,
      }),
      status: 'PENDING',
      nextAttemptAt: input.occurredAt,
    },
  });

  await input.prisma.smsMessage.create({
    data: {
      tenantId: input.tenantId,
      receiptId: input.receiptId,
      outboxEventId: outboxEvent.id,
      ledgerEntryId: input.reversalLedgerEntryId,
      phoneE164: input.phoneE164,
      template: 'transaction-reversed',
      payload: buildTransactionReversedSmsPayload({
        transactionId: input.originalTransactionId,
        receiptId: input.receiptId,
        phoneE164: input.phoneE164,
      }),
      status: SmsMessageStatus.QUEUED,
      queuedAt: input.occurredAt,
    },
  });
}

function hashRequest(input: {
  tenantId: string;
  actorId: string;
  transactionId: string;
  reason: string;
}): string {
  return createHash('sha256')
    .update(
      JSON.stringify({
        tenantId: input.tenantId,
        actorId: input.actorId,
        transactionId: input.transactionId,
        reason: input.reason,
      }),
    )
    .digest('hex');
}

async function cleanupExpiredIdempotencyRecords(
  prisma: PrismaService,
  tenantId: string,
  actorId: string,
  idempotencyKey: string,
) {
  await prisma.idempotencyRecord.deleteMany({
    where: {
      tenantId,
      actorId,
      idempotencyKey,
      expiresAt: { lte: new Date() },
    },
  });
}

async function persistReverseIdempotency(
  prisma: Prisma.TransactionClient,
  tenantId: string,
  actorId: string,
  idempotencyKey: string,
  requestHash: string,
  response: ReversalResponse,
) {
  await prisma.idempotencyRecord.update({
    where: {
      tenantId_actorId_endpoint_idempotencyKey: {
        tenantId,
        actorId,
        endpoint: REVERSE_ENDPOINT,
        idempotencyKey,
      },
    },
    data: {
      requestHash,
      responseJson: response as never,
      status: 'COMPLETED',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });
}

function toReversalAllocations(
  allocations: PersistedAllocation[],
): ReversalResponse['allocations'] {
  return allocations.map((allocation) => ({
    creditLotId: allocation.creditLotId,
    amountKobo: Number(allocation.amountKobo),
    allocationOrder: allocation.allocationOrder,
    expiresAt: allocation.expiresAt.toISOString(),
  }));
}

function reviewRequired(message: string): DomainHttpException {
  return new DomainHttpException(
    HttpStatus.UNPROCESSABLE_ENTITY,
    'REVERSAL_REVIEW_REQUIRED',
    message,
  );
}

function alreadyReversed(): DomainHttpException {
  return new DomainHttpException(
    HttpStatus.CONFLICT,
    'TRANSACTION_ALREADY_REVERSED',
    'Transaction already has a reversal',
  );
}

function isTransactionConflict(error: unknown): boolean {
  const code = getPrismaErrorCode(error);
  const errorMessage = getErrorMessage(error);

  if (
    code === 'P2034' ||
    getPrismaMetaCode(error) === '40001' ||
    /\b40001\b/.test(errorMessage)
  ) {
    return true;
  }

  return /Response from the Engine was empty|Transaction failed due to a write conflict or a deadlock|Engine is not yet connected/i.test(
    errorMessage,
  );
}

function isIdempotencyConflict(error: unknown): boolean {
  return getPrismaErrorCode(error) === 'P2002';
}

function getPrismaErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== 'object' || !('code' in error)) {
    return undefined;
  }

  const code = (error as { code?: unknown }).code;

  return typeof code === 'string' ? code : undefined;
}

function getPrismaMetaCode(error: unknown): string | undefined {
  if (!error || typeof error !== 'object' || !('meta' in error)) {
    return undefined;
  }

  const meta = (error as { meta?: unknown }).meta;
  if (!meta || typeof meta !== 'object' || !('code' in meta)) {
    return undefined;
  }

  const code = (meta as { code?: unknown }).code;
  return typeof code === 'string' ? code : undefined;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return typeof error === 'string' ? error : '';
}

async function waitForJitter(): Promise<void> {
  await new Promise((resolve) =>
    setTimeout(resolve, Math.floor(Math.random() * REVERSAL_RETRY_JITTER_MS)),
  );
}

function normalizeIdempotencyKey(value: string | undefined): string {
  const normalized = value?.trim();

  if (!normalized) {
    throw new DomainHttpException(
      HttpStatus.BAD_REQUEST,
      'VALIDATION_ERROR',
      'Idempotency-Key header is required',
    );
  }

  return normalized;
}

function buildReverseIdempotencyLockKey(
  tenantId: string,
  actorId: string,
  idempotencyKey: string,
): string {
  return `${tenantId}:${actorId}:${REVERSE_ENDPOINT}:${idempotencyKey}`;
}

function normalizeReason(value: string): string {
  const normalized = value.trim();

  if (!normalized) {
    throw new DomainHttpException(
      HttpStatus.BAD_REQUEST,
      'VALIDATION_ERROR',
      'Reversal reason is required',
    );
  }

  if (normalized.length > 500) {
    throw new DomainHttpException(
      HttpStatus.BAD_REQUEST,
      'VALIDATION_ERROR',
      'Reversal reason must be at most 500 characters',
    );
  }

  return normalized;
}
