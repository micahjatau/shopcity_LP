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
    const requestHash = hashRequest({
      tenantId,
      actorId: actor.user.id,
      transactionId,
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

    if (existing && existing.requestHash !== requestHash) {
      throw new DomainHttpException(
        HttpStatus.CONFLICT,
        'IDEMPOTENCY_CONFLICT',
        'Idempotency key reused with different payload',
      );
    }

    if (existing?.requestHash === requestHash && existing.responseJson) {
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

        if (
          existing?.requestHash === input.requestHash &&
          existing.responseJson
        ) {
          return existing.responseJson as unknown as ReversalResponse;
        }

        if (existing) {
          throw new DomainHttpException(
            HttpStatus.CONFLICT,
            'IDEMPOTENCY_IN_PROGRESS',
            'Idempotency key is still being processed',
          );
        }

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

        const original = await prisma.loyaltyLedgerEntry.findFirst({
          where: { tenantId: input.tenantId, id: input.transactionId },
          include: {
            customer: { include: { branch: true } },
            receipt: {
              include: {
                branch: true,
                card: true,
                device: true,
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
            await input.lotAllocationService.allocateDebit(prisma, {
              tenantId: input.tenantId,
              customerId: original.customerId,
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
            await input.lotAllocationService.allocateDebit(prisma, {
              tenantId: input.tenantId,
              customerId: original.customerId,
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

      await input.prismaService.idempotencyRecord.deleteMany({
        where: {
          tenantId: input.tenantId,
          actorId: input.actor.user.id,
          endpoint: REVERSE_ENDPOINT,
          idempotencyKey: input.normalizedKey,
        },
      });

      throw error;
    }
  }

  throw new DomainHttpException(
    HttpStatus.SERVICE_UNAVAILABLE,
    'REVERSAL_TRANSACTION_CONFLICT',
    'Transaction reversal conflicted; retry the request',
  );
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

  if (code === 'P2034') {
    return true;
  }

  return /Response from the Engine was empty|Transaction failed due to a write conflict or a deadlock|Engine is not yet connected/i.test(
    getErrorMessage(error),
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
