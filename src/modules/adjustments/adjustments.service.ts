import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AdjustmentKind,
  CustomerStatus,
  LedgerEntryDirection,
  LedgerEntryStatus,
  LedgerEntryType,
  Prisma,
  SmsMessageStatus,
  UserRole,
} from '@prisma/client';
import { createHash } from 'node:crypto';
import { ActiveBalanceService } from '../../common/balance/active-balance.service';
import {
  FINANCIAL_SERIALIZABLE_TRANSACTION_OPTIONS,
  LotAllocationService,
} from '../../common/balance/lot-allocation.service';
import type { AuthContext } from '../../common/auth/session.types';
import { DomainHttpException } from '../../common/errors/domain.exception';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { buildBalanceAdjustedSmsPayload } from '../../jobs/sms.templates';
import { CreateAdjustmentDto } from './adjustments.dto';

const ADJUSTMENTS_ENDPOINT = 'POST /api/v1/adjustments';
const ADJUSTMENT_RETRY_ATTEMPTS = 3;
const ADJUSTMENT_RETRY_JITTER_MS = 25;

export interface AdjustmentResponse {
  id: string;
  transactionId: string;
  adjustmentId: string;
  customerId: string;
  kind: AdjustmentKind;
  amountKobo: number;
  newActiveBalanceKobo: number;
  allocations: Array<{
    creditLotId: string;
    amountKobo: number;
    allocationOrder: number;
    expiresAt: string;
  }>;
  creditLot: { id: string; expiresAt: string } | null;
  smsStatus: SmsMessageStatus | null;
  occurredAt: string;
}

@Injectable()
export class AdjustmentsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly activeBalanceService: ActiveBalanceService,
    private readonly lotAllocationService: LotAllocationService,
    private readonly auditService: AuditService,
    private readonly configService: ConfigService,
  ) {}

  async createAdjustment(
    tenantId: string,
    actor: AuthContext,
    idempotencyKey: string | undefined,
    dto: CreateAdjustmentDto,
  ): Promise<AdjustmentResponse> {
    if (actor.user.role !== UserRole.ADMIN) {
      throw new DomainHttpException(
        HttpStatus.FORBIDDEN,
        'ADJUSTMENT_FORBIDDEN',
        'Admin role is required',
      );
    }

    const normalizedKey = normalizeIdempotencyKey(idempotencyKey);
    const reason = normalizeReason(dto.reason);
    const effectiveAt = dto.effectiveAt
      ? new Date(dto.effectiveAt)
      : new Date();
    const requestHash = hashRequest({
      tenantId,
      actorId: actor.user.id,
      customerId: dto.customerId,
      kind: dto.kind,
      amountKobo: dto.amountKobo,
      reason,
      effectiveAt: effectiveAt.toISOString(),
    });

    const amountKobo = toSafePositiveBigInt(dto.amountKobo, 'amountKobo');
    const amountCeilingKobo = BigInt(
      this.configService.get<number>('ADJUSTMENT_AMOUNT_CEILING_KOBO') ??
        100_000_000,
    );

    if (amountKobo > amountCeilingKobo) {
      throw new DomainHttpException(
        HttpStatus.BAD_REQUEST,
        'VALIDATION_ERROR',
        'Adjustment amount exceeds the configured ceiling',
      );
    }

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
          endpoint: ADJUSTMENTS_ENDPOINT,
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
      return existing.responseJson as unknown as AdjustmentResponse;
    }

    if (existing) {
      const replay = await waitForAdjustmentReplay(
        this.prismaService,
        tenantId,
        actor.user.id,
        normalizedKey,
        requestHash,
      );

      if (replay) {
        return replay;
      }

      throw new DomainHttpException(
        HttpStatus.CONFLICT,
        'IDEMPOTENCY_IN_PROGRESS',
        'Idempotency key is still being processed',
      );
    }

    for (let attempt = 1; attempt <= ADJUSTMENT_RETRY_ATTEMPTS; attempt += 1) {
      try {
        return await this.prismaService.$transaction(async (prisma) => {
          await prisma.idempotencyRecord.create({
            data: {
              tenantId,
              actorId: actor.user.id,
              endpoint: ADJUSTMENTS_ENDPOINT,
              idempotencyKey: normalizedKey,
              requestHash,
              responseJson: Prisma.JsonNull,
              status: 'PENDING',
              expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
          });
          const customer = await prisma.customer.findFirst({
            where: { tenantId, id: dto.customerId },
            include: { branch: true },
          });

          if (
            !customer ||
            customer.status !== CustomerStatus.ACTIVE ||
            customer.isStaff
          ) {
            throw new DomainHttpException(
              HttpStatus.NOT_FOUND,
              'CUSTOMER_NOT_FOUND',
              'Customer not found',
            );
          }

          const expiryMonths =
            this.configService.get<number>('ADJUSTMENT_CREDIT_EXPIRY_MONTHS') ??
            12;
          const now = new Date();

          if (dto.kind === 'CREDIT') {
            const ledgerEntry = await prisma.loyaltyLedgerEntry.create({
              data: {
                tenantId,
                customerId: customer.id,
                receiptId: null,
                type: LedgerEntryType.ADJUSTMENT,
                direction: LedgerEntryDirection.CREDIT,
                amountKobo,
                status: LedgerEntryStatus.CONFIRMED,
                correlationId: requestHash,
                createdByTenantId: actor.user.tenantId,
                createdBy: actor.user.id,
                effectiveAt,
              },
            });

            const adjustment = await prisma.adjustment.create({
              data: {
                tenantId,
                customerId: customer.id,
                kind: AdjustmentKind.CREDIT,
                amountKobo,
                reason,
                createdByTenantId: actor.user.tenantId,
                createdBy: actor.user.id,
                ledgerEntryId: ledgerEntry.id,
                effectiveAt,
              },
            });

            const creditLot = await prisma.creditLot.create({
              data: {
                tenantId,
                customerId: customer.id,
                earnLedgerEntryId: ledgerEntry.id,
                originalAmountKobo: amountKobo,
                remainingAmountKobo: amountKobo,
                earnedAt: effectiveAt,
                expiresAt: addMonths(effectiveAt, expiryMonths),
              },
            });

            const remainingBalanceKobo =
              await this.activeBalanceService.getActiveBalanceKobo(
                tenantId,
                customer.id,
                now,
                prisma,
              );
            const outboxPayload = buildBalanceAdjustedSmsPayload({
              transactionId: ledgerEntry.id,
              adjustmentId: adjustment.id,
              kind: 'CREDIT',
              phoneE164: customer.phoneE164,
              amountKobo,
              remainingBalanceKobo,
            });

            const outboxEvent = await prisma.outboxEvent.create({
              data: {
                tenantId,
                aggregateType: 'adjustment',
                aggregateId: adjustment.id,
                eventType: 'sms.send',
                payload: outboxPayload,
                status: 'PENDING',
                nextAttemptAt: now,
              },
            });

            await prisma.smsMessage.create({
              data: {
                tenantId,
                outboxEventId: outboxEvent.id,
                ledgerEntryId: ledgerEntry.id,
                adjustmentId: adjustment.id,
                phoneE164: customer.phoneE164,
                template: 'balance-adjusted',
                payload: outboxPayload,
                status: SmsMessageStatus.QUEUED,
                queuedAt: now,
              },
            });

            await this.auditService.recordWithClient(prisma, {
              tenantId,
              actorId: actor.user.id,
              action: 'adjustment.credit',
              entityType: 'adjustment',
              entityId: adjustment.id,
              metadata: { reason, amountKobo: Number(amountKobo), effectiveAt },
            });

            const response: AdjustmentResponse = {
              id: adjustment.id,
              transactionId: ledgerEntry.id,
              adjustmentId: adjustment.id,
              customerId: customer.id,
              kind: AdjustmentKind.CREDIT,
              amountKobo: Number(amountKobo),
              newActiveBalanceKobo: Number(remainingBalanceKobo),
              allocations: [],
              creditLot: {
                id: creditLot.id,
                expiresAt: creditLot.expiresAt.toISOString(),
              },
              smsStatus: SmsMessageStatus.QUEUED,
              occurredAt: effectiveAt.toISOString(),
            };

            await persistAdjustmentIdempotency(
              prisma,
              tenantId,
              actor.user.id,
              normalizedKey,
              requestHash,
              response,
            );
            return response;
          }

          const ledgerEntry = await prisma.loyaltyLedgerEntry.create({
            data: {
              tenantId,
              customerId: customer.id,
              receiptId: null,
              type: LedgerEntryType.ADJUSTMENT,
              direction: LedgerEntryDirection.DEBIT,
              amountKobo,
              status: LedgerEntryStatus.CONFIRMED,
              correlationId: requestHash,
              createdByTenantId: actor.user.tenantId,
              createdBy: actor.user.id,
              effectiveAt,
            },
          });

          const adjustment = await prisma.adjustment.create({
            data: {
              tenantId,
              customerId: customer.id,
              kind: AdjustmentKind.DEBIT,
              amountKobo,
              reason,
              createdByTenantId: actor.user.tenantId,
              createdBy: actor.user.id,
              ledgerEntryId: ledgerEntry.id,
              effectiveAt,
            },
          });

          const allocations = await this.lotAllocationService.allocateDebit(
            prisma,
            {
              tenantId,
              customerId: customer.id,
              debitLedgerEntryId: ledgerEntry.id,
              amountKobo,
              adjustmentId: adjustment.id,
              now,
            },
          );

          const remainingBalanceKobo =
            await this.activeBalanceService.getActiveBalanceKobo(
              tenantId,
              customer.id,
              now,
              prisma,
            );
          const outboxPayload = buildBalanceAdjustedSmsPayload({
            transactionId: ledgerEntry.id,
            adjustmentId: adjustment.id,
            kind: 'DEBIT',
            phoneE164: customer.phoneE164,
            amountKobo,
            remainingBalanceKobo,
          });
          const outboxEvent = await prisma.outboxEvent.create({
            data: {
              tenantId,
              aggregateType: 'adjustment',
              aggregateId: adjustment.id,
              eventType: 'sms.send',
              payload: outboxPayload,
              status: 'PENDING',
              nextAttemptAt: now,
            },
          });

          await prisma.smsMessage.create({
            data: {
              tenantId,
              outboxEventId: outboxEvent.id,
              ledgerEntryId: ledgerEntry.id,
              adjustmentId: adjustment.id,
              phoneE164: customer.phoneE164,
              template: 'balance-adjusted',
              payload: outboxPayload,
              status: SmsMessageStatus.QUEUED,
              queuedAt: now,
            },
          });

          await this.auditService.recordWithClient(prisma, {
            tenantId,
            actorId: actor.user.id,
            action: 'adjustment.debit',
            entityType: 'adjustment',
            entityId: adjustment.id,
            metadata: { reason, amountKobo: Number(amountKobo), effectiveAt },
          });

          const response: AdjustmentResponse = {
            id: adjustment.id,
            transactionId: ledgerEntry.id,
            adjustmentId: adjustment.id,
            customerId: customer.id,
            kind: AdjustmentKind.DEBIT,
            amountKobo: Number(amountKobo),
            newActiveBalanceKobo: Number(remainingBalanceKobo),
            allocations: allocations.map((allocation) => ({
              creditLotId: allocation.creditLotId,
              amountKobo: Number(allocation.amountKobo),
              allocationOrder: allocation.allocationOrder,
              expiresAt: allocation.expiresAt.toISOString(),
            })),
            creditLot: null,
            smsStatus: SmsMessageStatus.QUEUED,
            occurredAt: effectiveAt.toISOString(),
          };

          await persistAdjustmentIdempotency(
            prisma,
            tenantId,
            actor.user.id,
            normalizedKey,
            requestHash,
            response,
          );
          return response;
        }, FINANCIAL_SERIALIZABLE_TRANSACTION_OPTIONS);
      } catch (error) {
        if (isTransactionConflict(error) || isIdempotencyConflict(error)) {
          const replay = await waitForAdjustmentReplay(
            this.prismaService,
            tenantId,
            actor.user.id,
            normalizedKey,
            requestHash,
          );

          if (replay) {
            return replay;
          }

          if (attempt < ADJUSTMENT_RETRY_ATTEMPTS) {
            await waitForJitter();
            continue;
          }

          throw new DomainHttpException(
            HttpStatus.SERVICE_UNAVAILABLE,
            'ADJUSTMENT_TRANSACTION_CONFLICT',
            'Adjustment transaction conflicted; retry the request',
          );
        }

        throw error;
      }
    }

    throw new DomainHttpException(
      HttpStatus.SERVICE_UNAVAILABLE,
      'ADJUSTMENT_TRANSACTION_CONFLICT',
      'Adjustment transaction conflicted; retry the request',
    );
  }
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

function normalizeReason(value: string): string {
  const normalized = value.trim();
  if (!normalized) {
    throw new DomainHttpException(
      HttpStatus.BAD_REQUEST,
      'VALIDATION_ERROR',
      'Reason is required',
    );
  }
  if (normalized.length > 500) {
    throw new DomainHttpException(
      HttpStatus.BAD_REQUEST,
      'VALIDATION_ERROR',
      'Reason must be at most 500 characters',
    );
  }
  return normalized;
}

function toSafePositiveBigInt(value: number, field: string): bigint {
  if (!Number.isInteger(value) || value <= 0) {
    throw new DomainHttpException(
      HttpStatus.BAD_REQUEST,
      'VALIDATION_ERROR',
      `${field} must be a positive integer`,
    );
  }
  return BigInt(value);
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setUTCMonth(result.getUTCMonth() + months);
  return result;
}

function hashRequest(input: Record<string, unknown>): string {
  return createHash('sha256').update(JSON.stringify(input)).digest('hex');
}

function isTransactionConflict(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2034'
  );
}

function isIdempotencyConflict(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}

async function waitForJitter(): Promise<void> {
  await new Promise((resolve) =>
    setTimeout(resolve, Math.floor(Math.random() * ADJUSTMENT_RETRY_JITTER_MS)),
  );
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

async function persistAdjustmentIdempotency(
  prisma: Prisma.TransactionClient,
  tenantId: string,
  actorId: string,
  idempotencyKey: string,
  requestHash: string,
  response: AdjustmentResponse,
) {
  await prisma.idempotencyRecord.update({
    where: {
      tenantId_actorId_endpoint_idempotencyKey: {
        tenantId,
        actorId,
        endpoint: ADJUSTMENTS_ENDPOINT,
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

async function waitForAdjustmentReplay(
  prisma: PrismaService,
  tenantId: string,
  actorId: string,
  idempotencyKey: string,
  requestHash: string,
) {
  for (let attempt = 1; attempt <= ADJUSTMENT_RETRY_ATTEMPTS; attempt += 1) {
    const record = await prisma.idempotencyRecord.findUnique({
      where: {
        tenantId_actorId_endpoint_idempotencyKey: {
          tenantId,
          actorId,
          endpoint: ADJUSTMENTS_ENDPOINT,
          idempotencyKey,
        },
      },
    });

    if (record?.requestHash !== requestHash) {
      throw new DomainHttpException(
        HttpStatus.CONFLICT,
        'IDEMPOTENCY_CONFLICT',
        'Idempotency key reused with different payload',
      );
    }

    if (record?.responseJson) {
      return record.responseJson as unknown as AdjustmentResponse;
    }

    await waitForJitter();
  }
}
