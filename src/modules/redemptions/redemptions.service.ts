import { ConflictException, HttpStatus, Injectable } from '@nestjs/common';
import {
  BranchStatus,
  CardStatus,
  CustomerStatus,
  DeviceStatus,
  LedgerEntryDirection,
  LedgerEntryStatus,
  LedgerEntryType,
  Prisma,
  ReceiptReviewStatus,
  RedemptionStatus,
  SmsMessageStatus,
} from '@prisma/client';
import { createHash } from 'node:crypto';
import { ActiveBalanceService } from '../../common/balance/active-balance.service';
import {
  FINANCIAL_SERIALIZABLE_TRANSACTION_OPTIONS,
  LotAllocationService,
  PersistedAllocation,
} from '../../common/balance/lot-allocation.service';
import { runWithBoundedFinancialRetries } from '../../common/balance/financial-transaction-retry';
import type { AuthContext } from '../../common/auth/session.types';
import { DomainHttpException } from '../../common/errors/domain.exception';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RedemptionPolicyService } from './redemption-policy.service';
import { RedeemTransactionDto } from './redemptions.dto';

const REDEEM_ENDPOINT = 'POST /api/v1/transactions/redeem';
const IDEMPOTENCY_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;
const REDEMPTION_RETRY_ATTEMPTS = 3;

export interface RedeemConfirmedResponse {
  transactionId: string;
  redemptionId: string;
  receiptId: string;
  state: 'CONFIRMED';
  basketAmountKobo: number;
  redeemedKobo: number;
  maximumAllowedKobo: number;
  remainingBalanceKobo: number;
  allocations: Array<{
    creditLotId: string;
    amountKobo: number;
    expiresAt: string;
  }>;
  smsStatus: SmsMessageStatus;
}

@Injectable()
export class RedemptionsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly activeBalanceService: ActiveBalanceService,
    private readonly lotAllocationService: LotAllocationService,
    private readonly redemptionPolicyService: RedemptionPolicyService,
    private readonly auditService: AuditService,
  ) {}

  get dependenciesReady(): boolean {
    return Boolean(
      this.prismaService &&
      this.activeBalanceService &&
      this.lotAllocationService &&
      this.redemptionPolicyService &&
      this.auditService,
    );
  }

  async redeem(
    tenantId: string,
    actor: AuthContext,
    idempotencyKey: string | undefined,
    dto: RedeemTransactionDto,
  ): Promise<RedeemConfirmedResponse> {
    if (!this.dependenciesReady) {
      throw new DomainHttpException(
        HttpStatus.SERVICE_UNAVAILABLE,
        'DEPENDENCY_UNAVAILABLE',
        'Redemption dependencies are unavailable',
      );
    }

    const normalizedKey = normalizeIdempotencyKey(idempotencyKey);
    const posReceiptNumber = normalizeReceiptNumber(dto.posReceiptNumber);
    const normalizedPosReceiptNumber =
      normalizeReceiptIdentity(posReceiptNumber);
    const occurredAt = parseDate(dto.occurredAt, 'occurredAt');
    const sessionDeviceId = actor.session.deviceId;

    if (!sessionDeviceId) {
      throw new DomainHttpException(
        HttpStatus.BAD_REQUEST,
        'SESSION_DEVICE_REQUIRED',
        'Session device is required',
      );
    }

    const requestHash = hashRequest({
      tenantId,
      actorId: actor.user.id,
      cardSerialNumber: dto.cardSerialNumber.trim(),
      posReceiptNumber: normalizedPosReceiptNumber,
      basketAmountKobo: dto.basketAmountKobo,
      requestedRedemptionKobo: dto.requestedRedemptionKobo,
      occurredAt: occurredAt.toISOString(),
      deviceId: sessionDeviceId,
    });

    await cleanupExpiredIdempotencyRecords(
      this.prismaService,
      tenantId,
      actor.user.id,
      normalizedKey,
    );

    return runWithBoundedFinancialRetries(
      () =>
        this.prismaService.$transaction(async (prisma) => {
          const [transactionDevice, transactionCard] = await Promise.all([
            prisma.device.findFirst({
              where: { id: sessionDeviceId, tenantId },
              include: { branch: true },
            }),
            prisma.card.findFirst({
              where: { tenantId, barcodeValue: dto.cardSerialNumber.trim() },
              include: { customer: true },
            }),
          ]);

          if (
            !transactionDevice ||
            transactionDevice.status !== DeviceStatus.ACTIVE ||
            transactionDevice.branch.status !== BranchStatus.ACTIVE
          ) {
            throw new DomainHttpException(
              HttpStatus.BAD_REQUEST,
              'DEVICE_NOT_ACTIVE',
              'Device is not active',
            );
          }

          if (
            actor.user.branchId &&
            actor.user.branchId !== transactionDevice.branchId
          ) {
            throw new DomainHttpException(
              HttpStatus.BAD_REQUEST,
              'DEVICE_BRANCH_MISMATCH',
              'Device does not belong to cashier branch',
            );
          }

          if (
            !transactionCard ||
            transactionCard.status !== CardStatus.ACTIVE ||
            transactionCard.customer.status !== CustomerStatus.ACTIVE ||
            transactionCard.customer.isStaff
          ) {
            throw new DomainHttpException(
              HttpStatus.NOT_FOUND,
              'CARD_NOT_FOUND',
              'Card not found',
            );
          }

          const branchId = actor.user.branchId ?? transactionDevice.branchId;
          if (!branchId) {
            throw new DomainHttpException(
              HttpStatus.BAD_REQUEST,
              'BRANCH_CONTEXT_REQUIRED',
              'Branch context is required',
            );
          }

          const existing = await prisma.idempotencyRecord.findUnique({
            where: {
              tenantId_actorId_endpoint_idempotencyKey: {
                tenantId,
                actorId: actor.user.id,
                endpoint: REDEEM_ENDPOINT,
                idempotencyKey: normalizedKey,
              },
            },
          });

          if (existing?.expiresAt && existing.expiresAt <= new Date()) {
            await prisma.idempotencyRecord.deleteMany({
              where: {
                tenantId,
                actorId: actor.user.id,
                endpoint: REDEEM_ENDPOINT,
                idempotencyKey: normalizedKey,
              },
            });
          } else if (existing) {
            if (existing.requestHash !== requestHash) {
              throw new DomainHttpException(
                HttpStatus.CONFLICT,
                'IDEMPOTENCY_CONFLICT',
                'Idempotency key reused with different payload',
              );
            }

            if (existing.responseJson && existing.status === 'COMPLETED') {
              return existing.responseJson as unknown as RedeemConfirmedResponse;
            }

            throw new ConflictException(
              'Idempotency key is still being processed',
            );
          }

          const now = new Date();
          const receiptWeekStart = deriveReceiptWeekStart(
            occurredAt,
            transactionDevice.branch.timezone,
            transactionDevice.branch.receiptWeekStartDay,
          );
          const duplicateReceipt = await prisma.receipt.findFirst({
            where: {
              tenantId,
              branchId,
              receiptWeekStart,
              normalizedPosReceiptNumber,
            },
          });

          if (duplicateReceipt) {
            const samePurchaseCreditLot = await prisma.creditLot.findFirst({
              where: {
                tenantId,
                customerId: transactionCard.customerId,
                remainingAmountKobo: { gt: 0n },
                earnLedgerEntry: { receiptId: duplicateReceipt.id },
              },
              select: { id: true },
            });

            if (samePurchaseCreditLot) {
              throw new DomainHttpException(
                HttpStatus.UNPROCESSABLE_ENTITY,
                'SAME_PURCHASE_REDEMPTION_NOT_ALLOWED',
                'Credit earned on the same purchase cannot be redeemed for that purchase',
              );
            }

            throw new DomainHttpException(
              HttpStatus.CONFLICT,
              'RECEIPT_ALREADY_USED',
              'Physical receipt already captured',
            );
          }

          const activeBalanceKobo =
            await this.activeBalanceService.getActiveBalanceKobo(
              tenantId,
              transactionCard.customerId,
              now,
              prisma,
            );
          const requestedAmountKobo = BigInt(dto.requestedRedemptionKobo);
          const policy = this.redemptionPolicyService.evaluate({
            requestedAmountKobo,
            basketAmountKobo: BigInt(dto.basketAmountKobo),
            activeBalanceKobo,
          });

          if (policy.requiresApproval) {
            throw new DomainHttpException(
              HttpStatus.NOT_IMPLEMENTED,
              'REDEMPTION_APPROVAL_NOT_IMPLEMENTED',
              'High-value redemption approval will be added by the next redemption task',
            );
          }

          if (requestedAmountKobo < policy.minimumRedemptionKobo) {
            throw new DomainHttpException(
              HttpStatus.UNPROCESSABLE_ENTITY,
              'REDEMPTION_BELOW_MINIMUM',
              'Requested redemption is below the configured minimum amount',
              {
                minimumRedemptionKobo: this.activeBalanceService.toJsonSafeKobo(
                  policy.minimumRedemptionKobo,
                ),
              },
            );
          }

          if (requestedAmountKobo > policy.maximumAllowedKobo) {
            throw new DomainHttpException(
              HttpStatus.UNPROCESSABLE_ENTITY,
              requestedAmountKobo > policy.basketCapKobo
                ? 'REDEMPTION_EXCEEDS_BASKET_CAP'
                : 'INSUFFICIENT_BALANCE',
              'Requested redemption exceeds the current maximum allowed amount',
              {
                maximumAllowedKobo: this.activeBalanceService.toJsonSafeKobo(
                  policy.maximumAllowedKobo,
                ),
              },
            );
          }

          const receipt = await prisma.receipt.create({
            data: {
              tenantId,
              branchId,
              customerId: transactionCard.customerId,
              cardId: transactionCard.id,
              deviceId: transactionDevice.id,
              posReceiptNumber,
              normalizedPosReceiptNumber,
              receiptWeekStart,
              purchaseAmountKobo: BigInt(dto.basketAmountKobo),
              occurredAt,
              capturedByTenantId: actor.user.tenantId,
              capturedBy: actor.user.id,
              capturedAt: now,
              captureStatus: 'CAPTURED',
              reviewStatus: ReceiptReviewStatus.APPROVED,
              reviewedAt: now,
              reviewedByTenantId: actor.user.tenantId,
              reviewedBy: actor.user.id,
              approvedByTenantId: actor.user.tenantId,
              approvedBy: actor.user.id,
              approvedAt: now,
            },
          });

          const redemption = await prisma.redemption.create({
            data: {
              tenantId,
              branchId,
              customerId: transactionCard.customerId,
              cardId: transactionCard.id,
              deviceId: transactionDevice.id,
              receiptId: receipt.id,
              requestedByTenantId: actor.user.tenantId,
              requestedBy: actor.user.id,
              requestedAmountKobo,
              basketAmountKobo: BigInt(dto.basketAmountKobo),
              maximumAllowedKobo: policy.maximumAllowedKobo,
              confirmedAmountKobo: requestedAmountKobo,
              status: RedemptionStatus.CONFIRMED,
              policyVersion: policy.policyVersion,
              requestedAt: now,
              confirmedAt: now,
            },
          });

          const ledgerEntry = await prisma.loyaltyLedgerEntry.create({
            data: {
              tenantId,
              customerId: transactionCard.customerId,
              receiptId: receipt.id,
              type: LedgerEntryType.REDEEM,
              direction: LedgerEntryDirection.DEBIT,
              amountKobo: requestedAmountKobo,
              status: LedgerEntryStatus.CONFIRMED,
              correlationId: requestHash,
              createdByTenantId: actor.user.tenantId,
              createdBy: actor.user.id,
              effectiveAt: occurredAt,
            },
          });

          const allocations = await this.lotAllocationService.allocateDebit(
            prisma,
            {
              tenantId,
              customerId: transactionCard.customerId,
              debitLedgerEntryId: ledgerEntry.id,
              redemptionId: redemption.id,
              amountKobo: requestedAmountKobo,
              now,
            },
          );

          await prisma.redemption.update({
            where: { tenantId_id: { tenantId, id: redemption.id } },
            data: { ledgerEntryId: ledgerEntry.id },
          });

          const remainingBalanceKobo =
            await this.activeBalanceService.getActiveBalanceKobo(
              tenantId,
              transactionCard.customerId,
              now,
              prisma,
            );
          const outboxEvent = await prisma.outboxEvent.create({
            data: {
              tenantId,
              aggregateType: 'redemption',
              aggregateId: redemption.id,
              eventType: 'sms.send',
              payload: {
                version: 1,
                receiptId: receipt.id,
                redemptionId: redemption.id,
                transactionId: ledgerEntry.id,
                customerId: transactionCard.customerId,
                phoneE164: transactionCard.customer.phoneE164,
                template: 'redemption-confirmed',
                redeemedKobo: requestedAmountKobo.toString(),
                remainingBalanceKobo: remainingBalanceKobo.toString(),
              },
              status: 'PENDING',
              nextAttemptAt: now,
            },
          });
          const smsMessage = await prisma.smsMessage.create({
            data: {
              tenantId,
              receiptId: receipt.id,
              outboxEventId: outboxEvent.id,
              phoneE164: transactionCard.customer.phoneE164,
              template: 'redemption-confirmed',
              payload: {
                version: 1,
                receiptId: receipt.id,
                redemptionId: redemption.id,
                transactionId: ledgerEntry.id,
                customerId: transactionCard.customerId,
                phoneE164: transactionCard.customer.phoneE164,
                template: 'redemption-confirmed',
                redeemedKobo: requestedAmountKobo.toString(),
                remainingBalanceKobo: remainingBalanceKobo.toString(),
              },
              status: SmsMessageStatus.QUEUED,
              queuedAt: now,
            },
          });

          const response = toConfirmedResponse({
            transactionId: ledgerEntry.id,
            redemptionId: redemption.id,
            receiptId: receipt.id,
            basketAmountKobo: BigInt(dto.basketAmountKobo),
            redeemedKobo: requestedAmountKobo,
            maximumAllowedKobo: policy.maximumAllowedKobo,
            remainingBalanceKobo,
            allocations,
            smsStatus: smsMessage.status,
            activeBalanceService: this.activeBalanceService,
          });

          await prisma.idempotencyRecord.create({
            data: {
              tenantId,
              actorId: actor.user.id,
              endpoint: REDEEM_ENDPOINT,
              idempotencyKey: normalizedKey,
              requestHash,
              status: 'COMPLETED',
              expiresAt: new Date(now.getTime() + IDEMPOTENCY_EXPIRY_MS),
              responseJson: response as unknown as Prisma.InputJsonValue,
            },
          });

          await this.auditService.recordWithClient(prisma, {
            tenantId,
            actorId: actor.user.id,
            action: 'redemption.confirmed',
            entityType: 'redemption',
            entityId: redemption.id,
            metadata: response,
          });

          return response;
        }, FINANCIAL_SERIALIZABLE_TRANSACTION_OPTIONS),
      {
        attempts: REDEMPTION_RETRY_ATTEMPTS,
        conflictCode: 'REDEMPTION_TRANSACTION_CONFLICT',
        conflictMessage: 'Redemption transaction conflicted; retry the request',
        onConflict: () =>
          findCompletedRedeemReplay(
            this.prismaService,
            tenantId,
            actor.user.id,
            normalizedKey,
            requestHash,
          ),
      },
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

function normalizeReceiptNumber(value: string): string {
  const normalized = value.trim();

  if (!normalized) {
    throw new DomainHttpException(
      HttpStatus.BAD_REQUEST,
      'VALIDATION_ERROR',
      'Receipt number is required',
    );
  }

  return normalized;
}

function normalizeReceiptIdentity(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toUpperCase();
}

function parseDate(value: string, fieldName: string): Date {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw new DomainHttpException(
      HttpStatus.BAD_REQUEST,
      'VALIDATION_ERROR',
      `${fieldName} must be a valid ISO date-time`,
    );
  }

  return parsed;
}

function hashRequest(payload: Record<string, unknown>): string {
  return createHash('sha256')
    .update(JSON.stringify(payload, Object.keys(payload).sort()))
    .digest('hex');
}

function deriveReceiptWeekStart(
  occurredAt: Date,
  timezone: string,
  weekStartDay: number,
): Date {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(occurredAt);
  const year = Number(parts.find((part) => part.type === 'year')?.value);
  const month = Number(parts.find((part) => part.type === 'month')?.value);
  const day = Number(parts.find((part) => part.type === 'day')?.value);
  const localMidnight = new Date(Date.UTC(year, month - 1, day));
  const diff = (localMidnight.getUTCDay() - weekStartDay + 7) % 7;

  localMidnight.setUTCDate(localMidnight.getUTCDate() - diff);

  return localMidnight;
}

async function cleanupExpiredIdempotencyRecords(
  prismaService: PrismaService,
  tenantId: string,
  actorId: string,
  normalizedKey: string,
): Promise<void> {
  await prismaService.idempotencyRecord.deleteMany({
    where: {
      tenantId,
      actorId,
      endpoint: REDEEM_ENDPOINT,
      idempotencyKey: normalizedKey,
      expiresAt: { lte: new Date() },
    },
  });
}

async function findCompletedRedeemReplay(
  prismaService: PrismaService,
  tenantId: string,
  actorId: string,
  normalizedKey: string,
  requestHash: string,
): Promise<RedeemConfirmedResponse | null> {
  const replay = await prismaService.idempotencyRecord.findUnique({
    where: {
      tenantId_actorId_endpoint_idempotencyKey: {
        tenantId,
        actorId,
        endpoint: REDEEM_ENDPOINT,
        idempotencyKey: normalizedKey,
      },
    },
  });

  if (replay?.requestHash === requestHash && replay.responseJson) {
    return replay.responseJson as unknown as RedeemConfirmedResponse;
  }

  return null;
}

function toConfirmedResponse(input: {
  transactionId: string;
  redemptionId: string;
  receiptId: string;
  basketAmountKobo: bigint;
  redeemedKobo: bigint;
  maximumAllowedKobo: bigint;
  remainingBalanceKobo: bigint;
  allocations: PersistedAllocation[];
  smsStatus: SmsMessageStatus;
  activeBalanceService: ActiveBalanceService;
}): RedeemConfirmedResponse {
  return {
    transactionId: input.transactionId,
    redemptionId: input.redemptionId,
    receiptId: input.receiptId,
    state: 'CONFIRMED',
    basketAmountKobo: input.activeBalanceService.toJsonSafeKobo(
      input.basketAmountKobo,
    ),
    redeemedKobo: input.activeBalanceService.toJsonSafeKobo(input.redeemedKobo),
    maximumAllowedKobo: input.activeBalanceService.toJsonSafeKobo(
      input.maximumAllowedKobo,
    ),
    remainingBalanceKobo: input.activeBalanceService.toJsonSafeKobo(
      input.remainingBalanceKobo,
    ),
    allocations: input.allocations.map((allocation) => ({
      creditLotId: allocation.creditLotId,
      amountKobo: input.activeBalanceService.toJsonSafeKobo(
        allocation.amountKobo,
      ),
      expiresAt: allocation.expiresAt.toISOString(),
    })),
    smsStatus: input.smsStatus,
  };
}
