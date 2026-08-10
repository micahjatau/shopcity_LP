import { HttpStatus, Injectable } from '@nestjs/common';
import {
  ApprovalStatus,
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
import { runWithBoundedFinancialRetries } from '../../common/balance/financial-transaction-retry';
import { FINANCIAL_SERIALIZABLE_TRANSACTION_OPTIONS } from '../../common/balance/lot-allocation.service';
import { LotAllocationService } from '../../common/balance/lot-allocation.service';
import type { AuthContext } from '../../common/auth/session.types';
import { DomainHttpException } from '../../common/errors/domain.exception';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RedemptionPolicyService } from '../../common/redemption-policy.service';
import { RedeemTransactionDto } from './redemptions.dto';
import { buildRedemptionConfirmedSmsPayload } from '../../jobs/sms.templates';

const REDEEM_ENDPOINT = 'POST /api/v1/transactions/redeem';
const MAX_POS_FUTURE_SKEW_MS = 5 * 60 * 1000;
const MAX_POS_PAST_SKEW_MS = 12 * 60 * 60 * 1000;
const IDP_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;
const APPROVAL_EXPIRY_MS = 24 * 60 * 60 * 1000;
const MAX_BOUNDED_TEXT_LENGTH = 128;

export interface RedeemTransactionResponse {
  id: string;
  transactionId: string | null;
  redemptionId: string;
  receiptId: string;
  approvalId: string | null;
  state: 'CONFIRMED' | 'PENDING_APPROVAL';
  tenantId: string;
  branchId: string;
  deviceId: string;
  customerId: string;
  cardSerialNumber: string;
  posReceiptNumber: string;
  basketAmountKobo: number;
  requestedRedemptionKobo: number;
  redeemedAmountKobo: number | null;
  maximumAllowedKobo: number;
  remainingBalanceKobo: number | null;
  allocations: Array<{
    creditLotId: string;
    amountKobo: number;
    allocationOrder: number;
    expiresAt: string;
  }>;
  smsStatus: 'QUEUED' | 'SENT' | 'DELIVERED' | 'FAILED' | 'SUPPRESSED' | null;
  occurredAt: string;
  requestedAt: string;
  policyVersion: string;
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
      this.redemptionPolicyService,
    );
  }

  async redeem(
    tenantId: string,
    actor: AuthContext,
    idempotencyKey: string | undefined,
    dto: RedeemTransactionDto,
  ): Promise<RedeemTransactionResponse> {
    const normalizedKey = normalizeIdempotencyKey(idempotencyKey);
    const posReceiptNumber = normalizeBoundedText(
      dto.posReceiptNumber,
      'posReceiptNumber',
    );
    const normalizedPosReceiptNumber =
      normalizeReceiptIdentity(posReceiptNumber);
    const occurredAt = parseDate(dto.occurredAt, 'occurredAt');
    const sessionDeviceId = actor.session.deviceId;
    const requestHash = hashRequest({
      tenantId,
      actorId: actor.user.id,
      cardSerialNumber: normalizeBoundedText(
        dto.cardSerialNumber,
        'cardSerialNumber',
      ),
      posReceiptNumber: normalizedPosReceiptNumber,
      basketAmountKobo: dto.basketAmountKobo,
      requestedRedemptionKobo: dto.requestedRedemptionKobo,
      occurredAt: occurredAt.toISOString(),
      deviceId: sessionDeviceId,
    });

    if (!sessionDeviceId) {
      throw new DomainHttpException(
        HttpStatus.BAD_REQUEST,
        'SESSION_DEVICE_REQUIRED',
        'Session device is required',
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
          endpoint: REDEEM_ENDPOINT,
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
      return existing.responseJson as unknown as RedeemTransactionResponse;
    }

    if (existing) {
      throw new DomainHttpException(
        HttpStatus.CONFLICT,
        'IDEMPOTENCY_IN_PROGRESS',
        'Idempotency key is still being processed',
      );
    }

    if (!sessionDeviceId) {
      throw new DomainHttpException(
        HttpStatus.BAD_REQUEST,
        'SESSION_DEVICE_REQUIRED',
        'Session device is required',
      );
    }

    const requestedAmountKobo = toSafePositiveBigInt(
      dto.requestedRedemptionKobo,
      'requestedRedemptionKobo',
    );
    const basketAmountKobo = toSafePositiveBigInt(
      dto.basketAmountKobo,
      'basketAmountKobo',
    );

    assertRedemptionTimestampAllowed(occurredAt);

    try {
      return await runWithBoundedFinancialRetries(
        () =>
          this.prismaService.$transaction(async (prisma) => {
            const [transactionDevice, transactionCard] = await Promise.all([
              prisma.device.findFirst({
                where: { id: sessionDeviceId, tenantId },
                include: { branch: true },
              }),
              prisma.card.findFirst({
                where: {
                  tenantId,
                  barcodeValue: normalizeBoundedText(
                    dto.cardSerialNumber,
                    'cardSerialNumber',
                  ),
                },
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
              await this.auditService.recordWithClient(prisma, {
                tenantId,
                actorId: actor.user.id,
                action: 'RECEIPT_DUPLICATE_ATTEMPT_RECORDED',
                entityType: 'RECEIPT',
                entityId: duplicateReceipt.id,
                metadata: {
                  originalReceiptId: duplicateReceipt.id,
                  duplicateReceiptId: posReceiptNumber,
                  branchId,
                  cashierId: actor.user.id,
                  customerId: transactionCard.customerId,
                  deviceId: transactionDevice.id,
                  normalizedPosReceiptNumber,
                  receiptWeekStart: receiptWeekStart.toISOString(),
                  occurredAt: occurredAt.toISOString(),
                },
              });

              await prisma.outboxEvent.create({
                data: {
                  tenantId,
                  aggregateType: 'receipt',
                  aggregateId: duplicateReceipt.id,
                  eventType: 'fraud.evaluate',
                  payload: {
                    ruleCode: 'FR-DUP-001',
                    originalReceiptId: duplicateReceipt.id,
                    duplicateReceiptId: posReceiptNumber,
                    branchId,
                    cashierId: actor.user.id,
                    customerId: transactionCard.customerId,
                    deviceId: transactionDevice.id,
                    normalizedPosReceiptNumber,
                    receiptWeekStart: receiptWeekStart.toISOString(),
                    occurredAt: occurredAt.toISOString(),
                  },
                },
              });

              throw new DomainHttpException(
                HttpStatus.CONFLICT,
                'RECEIPT_ALREADY_USED',
                'Physical receipt already captured',
              );
            }

            const now = new Date();
            const activeBalanceKobo =
              await this.activeBalanceService.getActiveBalanceKobo(
                tenantId,
                transactionCard.customerId,
                now,
                prisma,
              );
            const policy = this.redemptionPolicyService.evaluate({
              requestedAmountKobo,
              basketAmountKobo,
              activeBalanceKobo,
            });

            assertRedemptionPolicyAllowsRequest(requestedAmountKobo, policy);

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
                purchaseAmountKobo: basketAmountKobo,
                occurredAt,
                capturedByTenantId: actor.user.tenantId,
                capturedBy: actor.user.id,
                capturedAt: now,
                captureStatus: policy.requiresApproval
                  ? 'PENDING_APPROVAL'
                  : 'CAPTURED',
                reviewStatus: policy.requiresApproval
                  ? ReceiptReviewStatus.PENDING
                  : ReceiptReviewStatus.APPROVED,
                reviewedAt: policy.requiresApproval ? null : now,
                reviewedByTenantId: policy.requiresApproval
                  ? null
                  : actor.user.tenantId,
                reviewedBy: policy.requiresApproval ? null : actor.user.id,
                approvedByTenantId: policy.requiresApproval
                  ? null
                  : actor.user.tenantId,
                approvedBy: policy.requiresApproval ? null : actor.user.id,
                approvedAt: policy.requiresApproval ? null : now,
                approvalReasonCode: policy.requiresApproval
                  ? 'REDEMPTION_ABOVE_APPROVAL_THRESHOLD'
                  : null,
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
                basketAmountKobo,
                maximumAllowedKobo: policy.maximumAllowedKobo,
                confirmedAmountKobo: null,
                status: RedemptionStatus.PENDING_APPROVAL,
                policyVersion: policy.policyVersion,
                requestedAt: now,
                confirmedAt: null,
              },
            });

            await this.auditService.recordWithClient(prisma, {
              tenantId,
              actorId: actor.user.id,
              action: 'redemption.requested',
              entityType: 'redemption',
              entityId: redemption.id,
              metadata: {
                requestedAmountKobo: Number(requestedAmountKobo),
                basketAmountKobo: Number(basketAmountKobo),
                maximumAllowedKobo: Number(policy.maximumAllowedKobo),
                policyVersion: policy.policyVersion,
              },
            });

            if (policy.requiresApproval) {
              const approval = await prisma.approval.create({
                data: {
                  tenantId,
                  redemptionId: redemption.id,
                  targetType: 'REDEEM',
                  status: ApprovalStatus.PENDING,
                  requestedByTenantId: actor.user.tenantId,
                  requestedBy: actor.user.id,
                  reasonCode: 'REDEMPTION_ABOVE_APPROVAL_THRESHOLD',
                  policyVersion: policy.policyVersion,
                  expiresAt: new Date(now.getTime() + APPROVAL_EXPIRY_MS),
                },
              });

              const response = buildRedeemResponse({
                tenantId,
                branchId,
                deviceId: transactionDevice.id,
                customerId: transactionCard.customerId,
                cardSerialNumber: transactionCard.barcodeValue,
                receiptId: receipt.id,
                posReceiptNumber: receipt.posReceiptNumber,
                redemptionId: redemption.id,
                approvalId: approval.id,
                state: 'PENDING_APPROVAL',
                transactionId: null,
                basketAmountKobo,
                requestedAmountKobo,
                redeemedAmountKobo: null,
                maximumAllowedKobo: policy.maximumAllowedKobo,
                remainingBalanceKobo: null,
                allocations: [],
                smsStatus: null,
                occurredAt,
                requestedAt: now,
                policyVersion: policy.policyVersion,
              });

              await persistCompletedIdempotencyResponse(
                prisma,
                tenantId,
                actor.user.id,
                normalizedKey,
                requestHash,
                response,
                now,
              );

              await this.auditService.recordWithClient(prisma, {
                tenantId,
                actorId: actor.user.id,
                action: 'redemption.approval_required',
                entityType: 'redemption',
                entityId: redemption.id,
                metadata: response,
              });

              return response;
            }

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

            await prisma.redemption.update({
              where: { tenantId_id: { tenantId, id: redemption.id } },
              data: {
                ledgerEntryId: ledgerEntry.id,
                confirmedAmountKobo: requestedAmountKobo,
                confirmedAt: now,
                status: RedemptionStatus.CONFIRMED,
              },
            });

            const allocations = await this.lotAllocationService.allocateDebit(
              prisma,
              {
                tenantId,
                customerId: transactionCard.customerId,
                debitLedgerEntryId: ledgerEntry.id,
                amountKobo: requestedAmountKobo,
                now,
                redemptionId: redemption.id,
              },
            );

            const remainingBalanceKobo =
              await this.activeBalanceService.getActiveBalanceKobo(
                tenantId,
                transactionCard.customerId,
                now,
                prisma,
              );
            const outboxPayload = buildRedemptionConfirmedSmsPayload({
              receiptId: receipt.id,
              transactionId: ledgerEntry.id,
              redemptionId: redemption.id,
              customerId: transactionCard.customerId,
              phoneE164: transactionCard.customer.phoneE164,
              redeemedKobo: requestedAmountKobo,
              remainingBalanceKobo,
            });
            const outboxEvent = await prisma.outboxEvent.create({
              data: {
                tenantId,
                aggregateType: 'redemption',
                aggregateId: redemption.id,
                eventType: 'sms.send',
                payload: outboxPayload,
                status: 'PENDING',
                nextAttemptAt: now,
              },
            });
            const smsMessage = await prisma.smsMessage.create({
              data: {
                tenantId,
                receiptId: receipt.id,
                ledgerEntryId: ledgerEntry.id,
                redemptionId: redemption.id,
                outboxEventId: outboxEvent.id,
                phoneE164: transactionCard.customer.phoneE164,
                template: 'redemption-confirmed',
                payload: outboxPayload,
                status: SmsMessageStatus.QUEUED,
                queuedAt: now,
              },
            });
            const response = buildRedeemResponse({
              tenantId,
              branchId,
              deviceId: transactionDevice.id,
              customerId: transactionCard.customerId,
              cardSerialNumber: transactionCard.barcodeValue,
              receiptId: receipt.id,
              posReceiptNumber: receipt.posReceiptNumber,
              redemptionId: redemption.id,
              approvalId: null,
              state: 'CONFIRMED',
              transactionId: ledgerEntry.id,
              basketAmountKobo,
              requestedAmountKobo,
              redeemedAmountKobo: requestedAmountKobo,
              maximumAllowedKobo: policy.maximumAllowedKobo,
              remainingBalanceKobo,
              allocations,
              smsStatus: smsMessage.status,
              occurredAt,
              requestedAt: now,
              policyVersion: policy.policyVersion,
            });

            await persistCompletedIdempotencyResponse(
              prisma,
              tenantId,
              actor.user.id,
              normalizedKey,
              requestHash,
              response,
              now,
            );

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
          attempts: 3,
          conflictCode: 'REDEMPTION_TRANSACTION_CONFLICT',
          conflictMessage:
            'Redemption transaction conflicted; retry the request',
          onConflict: async () =>
            findCompletedRedeemReplay(
              this.prismaService,
              tenantId,
              actor.user.id,
              normalizedKey,
              requestHash,
            ),
        },
      );
    } catch (error) {
      if (isUniqueIdempotencyConflict(error)) {
        const replay = await findCompletedRedeemReplay(
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
          'IDEMPOTENCY_CONFLICT',
          'Idempotency key reused with different payload',
        );
      }

      if (isUniqueReceiptConflict(error)) {
        const replay = await findCompletedRedeemReplay(
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
          'RECEIPT_ALREADY_USED',
          'Physical receipt already captured',
        );
      }

      if (isUniqueRedemptionTransactionConflict(error)) {
        const replay = await findCompletedRedeemReplay(
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
          HttpStatus.SERVICE_UNAVAILABLE,
          'REDEMPTION_TRANSACTION_CONFLICT',
          'Redemption transaction conflicted; retry the request',
        );
      }

      throw error;
    }
  }
}

function normalizeIdempotencyKey(key: string | undefined): string {
  const normalized = key?.trim();
  if (!normalized) {
    throw new DomainHttpException(
      HttpStatus.BAD_REQUEST,
      'VALIDATION_ERROR',
      'Idempotency-Key header is required',
    );
  }

  if (normalized.length > MAX_BOUNDED_TEXT_LENGTH) {
    throw new DomainHttpException(
      HttpStatus.BAD_REQUEST,
      'VALIDATION_ERROR',
      'Idempotency-Key header is too long',
    );
  }

  return normalized;
}

function normalizeBoundedText(value: string, fieldName: string): string {
  const normalized = value.trim();
  if (!normalized) {
    throw new DomainHttpException(
      HttpStatus.BAD_REQUEST,
      'VALIDATION_ERROR',
      `${fieldName} is required`,
    );
  }

  if (normalized.length > MAX_BOUNDED_TEXT_LENGTH) {
    throw new DomainHttpException(
      HttpStatus.BAD_REQUEST,
      'VALIDATION_ERROR',
      `${fieldName} is too long`,
    );
  }

  return normalized;
}

function normalizeReceiptIdentity(value: string): string {
  return value.trim().toUpperCase();
}

function parseDate(value: string, fieldName: string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new DomainHttpException(
      HttpStatus.BAD_REQUEST,
      'VALIDATION_ERROR',
      `${fieldName} must be a valid date-time`,
    );
  }

  return date;
}

function assertRedemptionTimestampAllowed(occurredAt: Date): void {
  const skewMs = occurredAt.getTime() - Date.now();
  if (skewMs > MAX_POS_FUTURE_SKEW_MS || skewMs < -MAX_POS_PAST_SKEW_MS) {
    throw new DomainHttpException(
      HttpStatus.UNPROCESSABLE_ENTITY,
      'OFFLINE_REDEMPTION_NOT_ALLOWED',
      'Redemption occurredAt is outside the allowed clock skew',
    );
  }
}

function toSafePositiveBigInt(value: number, fieldName: string): bigint {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new DomainHttpException(
      HttpStatus.BAD_REQUEST,
      'VALIDATION_ERROR',
      `${fieldName} must be a positive safe integer`,
    );
  }

  return BigInt(value);
}

function assertRedemptionPolicyAllowsRequest(
  requestedAmountKobo: bigint,
  policy: {
    minimumRedemptionKobo: bigint;
    basketCapKobo: bigint;
    maximumAllowedKobo: bigint;
  },
): void {
  if (requestedAmountKobo < policy.minimumRedemptionKobo) {
    throw new DomainHttpException(
      HttpStatus.UNPROCESSABLE_ENTITY,
      'MINIMUM_REDEMPTION_NOT_MET',
      'Requested redemption is below the minimum amount',
    );
  }

  if (policy.maximumAllowedKobo <= 0n) {
    throw new DomainHttpException(
      HttpStatus.UNPROCESSABLE_ENTITY,
      'REDEMPTION_NOT_ALLOWED',
      'No redemption amount is currently allowed',
    );
  }

  if (requestedAmountKobo > policy.basketCapKobo) {
    throw new DomainHttpException(
      HttpStatus.UNPROCESSABLE_ENTITY,
      'REDEMPTION_BASKET_CAP_EXCEEDED',
      'Requested redemption exceeds the basket cap',
    );
  }

  if (requestedAmountKobo > policy.maximumAllowedKobo) {
    throw new DomainHttpException(
      HttpStatus.UNPROCESSABLE_ENTITY,
      'INSUFFICIENT_BALANCE',
      'Active balance is lower than requested redemption amount',
    );
  }
}

function hashRequest(payload: Record<string, unknown>): string {
  return createHash('sha256').update(stableStringify(payload)).digest('hex');
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }

  const entries = Object.entries(value as Record<string, unknown>).sort(
    ([left], [right]) => left.localeCompare(right),
  );
  return `{${entries
    .map(
      ([key, entryValue]) =>
        `${JSON.stringify(key)}:${stableStringify(entryValue)}`,
    )
    .join(',')}}`;
}

function deriveReceiptWeekStart(
  occurredAt: Date,
  timeZone: string,
  receiptWeekStartDay: number,
): Date {
  if (receiptWeekStartDay < 0 || receiptWeekStartDay > 6) {
    throw new DomainHttpException(
      HttpStatus.BAD_REQUEST,
      'VALIDATION_ERROR',
      'Branch receipt week start day is invalid',
    );
  }

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(occurredAt);
  const year = Number(parts.find((part) => part.type === 'year')?.value);
  const month = Number(parts.find((part) => part.type === 'month')?.value);
  const day = Number(parts.find((part) => part.type === 'day')?.value);

  if ([year, month, day].some((part) => Number.isNaN(part))) {
    throw new DomainHttpException(
      HttpStatus.BAD_REQUEST,
      'VALIDATION_ERROR',
      'Unable to derive receipt week start',
    );
  }

  const localDate = new Date(Date.UTC(year, month - 1, day));
  const localWeekday = localDate.getUTCDay();
  const deltaDays = (7 + localWeekday - receiptWeekStartDay) % 7;

  return new Date(Date.UTC(year, month - 1, day - deltaDays));
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

async function persistCompletedIdempotencyResponse(
  prisma: Pick<Prisma.TransactionClient, 'idempotencyRecord'>,
  tenantId: string,
  actorId: string,
  idempotencyKey: string,
  requestHash: string,
  response: RedeemTransactionResponse,
  now: Date,
): Promise<void> {
  await prisma.idempotencyRecord.create({
    data: {
      tenantId,
      actorId,
      endpoint: REDEEM_ENDPOINT,
      idempotencyKey,
      requestHash,
      status: 'COMPLETED',
      expiresAt: new Date(now.getTime() + IDP_EXPIRY_MS),
      responseJson: response as unknown as Prisma.InputJsonValue,
    },
  });
}

async function findCompletedRedeemReplay(
  prismaService: PrismaService,
  tenantId: string,
  actorId: string,
  normalizedKey: string,
  requestHash: string,
): Promise<RedeemTransactionResponse | null> {
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
    return replay.responseJson as unknown as RedeemTransactionResponse;
  }

  return null;
}

function buildRedeemResponse(input: {
  tenantId: string;
  branchId: string;
  deviceId: string;
  customerId: string;
  cardSerialNumber: string;
  receiptId: string;
  posReceiptNumber: string;
  redemptionId: string;
  approvalId: string | null;
  state: 'CONFIRMED' | 'PENDING_APPROVAL';
  transactionId: string | null;
  basketAmountKobo: bigint;
  requestedAmountKobo: bigint;
  redeemedAmountKobo: bigint | null;
  maximumAllowedKobo: bigint;
  remainingBalanceKobo: bigint | null;
  allocations: Array<{
    creditLotId: string;
    amountKobo: bigint;
    allocationOrder: number;
    expiresAt: Date;
  }>;
  smsStatus: RedeemTransactionResponse['smsStatus'];
  occurredAt: Date;
  requestedAt: Date;
  policyVersion: string;
}): RedeemTransactionResponse {
  return {
    id: input.redemptionId,
    transactionId: input.transactionId,
    redemptionId: input.redemptionId,
    receiptId: input.receiptId,
    approvalId: input.approvalId,
    state: input.state,
    tenantId: input.tenantId,
    branchId: input.branchId,
    deviceId: input.deviceId,
    customerId: input.customerId,
    cardSerialNumber: input.cardSerialNumber,
    posReceiptNumber: input.posReceiptNumber,
    basketAmountKobo: Number(input.basketAmountKobo),
    requestedRedemptionKobo: Number(input.requestedAmountKobo),
    redeemedAmountKobo:
      input.redeemedAmountKobo === null
        ? null
        : Number(input.redeemedAmountKobo),
    maximumAllowedKobo: Number(input.maximumAllowedKobo),
    remainingBalanceKobo:
      input.remainingBalanceKobo === null
        ? null
        : Number(input.remainingBalanceKobo),
    allocations: input.allocations.map((allocation) => ({
      creditLotId: allocation.creditLotId,
      amountKobo: Number(allocation.amountKobo),
      allocationOrder: allocation.allocationOrder,
      expiresAt: allocation.expiresAt.toISOString(),
    })),
    smsStatus: input.smsStatus,
    occurredAt: input.occurredAt.toISOString(),
    requestedAt: input.requestedAt.toISOString(),
    policyVersion: input.policyVersion,
  };
}

function isUniqueIdempotencyConflict(error: unknown): boolean {
  return p2002Target(error, ['actorId', 'endpoint', 'idempotencyKey']);
}

function isUniqueReceiptConflict(error: unknown): boolean {
  return p2002Target(error, [
    'tenantId',
    'branchId',
    'receiptWeekStart',
    'normalizedPosReceiptNumber',
  ]);
}

function isUniqueRedemptionTransactionConflict(error: unknown): boolean {
  return (
    isUniqueRedemptionReceiptConflict(error) ||
    isUniqueRedemptionLedgerEntryConflict(error) ||
    isUniqueApprovalTargetConflict(error)
  );
}

function isUniqueRedemptionReceiptConflict(error: unknown): boolean {
  return p2002Target(error, ['receiptId']);
}

function isUniqueRedemptionLedgerEntryConflict(error: unknown): boolean {
  return p2002Target(error, ['ledgerEntryId']);
}

function isUniqueApprovalTargetConflict(error: unknown): boolean {
  return p2002Target(error, ['redemptionId']);
}

function p2002Target(error: unknown, requiredParts: string[]): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
    return false;
  }

  if (error.code !== 'P2002') {
    return false;
  }

  const target = Array.isArray(error.meta?.target)
    ? error.meta.target.join(', ')
    : typeof error.meta?.target === 'string'
      ? error.meta.target
      : '';

  return requiredParts.every((part) => target.includes(part));
}
