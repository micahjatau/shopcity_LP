import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
  SmsMessageStatus,
  UserRole,
} from '@prisma/client';
import { createHash } from 'node:crypto';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../../database/prisma.service';
import { AuthContext } from '../../common/auth/session.types';
import { DomainHttpException } from '../../common/errors/domain.exception';
import {
  CursorPageRequest,
  decodeCursor,
  encodeCursor,
  pageMeta,
} from '../../common/pagination/cursor-pagination';
import { EarnTransactionDto } from './loyalty.dto';

const EARN_ENDPOINT = 'POST /api/v1/transactions/earn';
const APPROVAL_REASON_CODE = 'PURCHASE_ABOVE_APPROVAL_THRESHOLD';
const MAX_POS_FUTURE_SKEW_MS = 5 * 60 * 1000;
const MAX_POS_PAST_SKEW_MS = 12 * 60 * 60 * 1000;
const IDP_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;
const APPROVAL_EXPIRY_MS = 24 * 60 * 60 * 1000;
const LEGACY_APPROVAL_POLICY_VERSION = 'legacy';
const EARN_SERIALIZATION_RETRY_ATTEMPTS = 3;
const EARN_SERIALIZATION_RETRY_JITTER_MS = 25;

export interface EarnTransactionResponse {
  id: string;
  transactionId: string | null;
  state: 'CONFIRMED' | 'PENDING_APPROVAL';
  receiptId: string;
  approvalId?: string | null;
  ledgerEntryId?: string | null;
  tenantId: string;
  branchId: string;
  deviceId: string;
  customerId: string;
  cardSerialNumber: string;
  posReceiptNumber: string;
  purchaseAmountKobo: number;
  creditKobo: number | null;
  captureStatus: 'CAPTURED' | 'FLAGGED' | 'PENDING_APPROVAL';
  availableBalanceKobo: number | null;
  expiresAt: string | null;
  smsStatus: 'QUEUED' | 'SENT' | 'DELIVERED' | 'FAILED' | 'SUPPRESSED' | null;
  occurredAt: string;
  capturedAt: string;
  reviewStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
}

export interface ApprovalDecisionResponse {
  id: string;
  status: ApprovalStatus;
  receiptId: string;
  ledgerEntryId?: string | null;
  creditKobo?: number | null;
  reason?: string | null;
  decidedAt: string;
  executedAt?: string | null;
}

export interface TransactionLedgerItem {
  id: string;
  receiptId: string;
  type: LedgerEntryType;
  direction: LedgerEntryDirection;
  amountKobo: number;
  status: LedgerEntryStatus;
  effectiveAt: string;
  creditLot?: {
    id: string;
    originalAmountKobo: number;
    remainingAmountKobo: number;
    earnedAt: string;
    expiresAt: string;
  } | null;
}

export interface TransactionResponse {
  id: string;
  transactionId: string;
  tenantId: string;
  branchId: string;
  customerId: string;
  deviceId: string | null;
  cardSerialNumber: string;
  posReceiptNumber: string;
  purchaseAmountKobo: number;
  occurredAt: string;
  capturedAt: string;
  state: 'CONFIRMED' | 'PENDING_APPROVAL' | 'REJECTED' | 'INVALID';
  captureStatus: 'CAPTURED' | 'FLAGGED' | 'PENDING_APPROVAL';
  reviewStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  approvalId: string | null;
  approvalStatus: ApprovalStatus | null;
  ledgerEntryId: string | null;
  creditKobo: number;
  availableBalanceKobo: number | null;
  expiresAt: string | null;
  smsStatus: 'QUEUED' | 'SENT' | 'DELIVERED' | 'FAILED' | 'SUPPRESSED' | null;
  ledger: TransactionLedgerItem | null;
}

export interface ApprovalListItem {
  id: string;
  receiptId: string;
  status: ApprovalStatus;
  reasonCode: string | null;
  requestedAt: string;
  expiresAt: string;
  decidedAt: string | null;
  executedAt: string | null;
  receipt: {
    id: string;
    posReceiptNumber: string;
    purchaseAmountKobo: number;
    captureStatus: string;
    reviewStatus: string;
  };
}

@Injectable()
export class LoyaltyService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly auditService: AuditService,
    private readonly configService: ConfigService,
  ) {}

  async earn(
    tenantId: string,
    actor: AuthContext,
    idempotencyKey: string | undefined,
    data: EarnTransactionDto,
  ): Promise<EarnTransactionResponse> {
    const normalizedKey = normalizeIdempotencyKey(idempotencyKey);
    const posReceiptNumber = normalizeReceiptNumber(data.posReceiptNumber);
    const normalizedPosReceiptNumber =
      normalizeReceiptIdentity(posReceiptNumber);
    const occurredAt = parseDate(data.occurredAt, 'occurredAt');
    const overrideReason = data.overrideReason?.trim();
    const sessionDeviceId = actor.session.deviceId;
    const requestHash = hashRequest({
      tenantId,
      actorId: actor.user.id,
      cardSerialNumber: data.cardSerialNumber.trim(),
      posReceiptNumber: normalizedPosReceiptNumber,
      purchaseAmountKobo: data.purchaseAmountKobo,
      occurredAt: occurredAt.toISOString(),
      deviceId: sessionDeviceId,
      overrideReason,
    });

    assertPurchaseAmountAllowed(data.purchaseAmountKobo, this.configService);

    if (!sessionDeviceId) {
      throw new DomainHttpException(
        400,
        'SESSION_DEVICE_REQUIRED',
        'Session device is required',
      );
    }

    const overrideApplied = assertReceiptTimestampAllowed(
      actor.user.role,
      occurredAt,
      overrideReason,
    );

    await cleanupExpiredIdempotencyRecords(
      this.prismaService,
      tenantId,
      actor.user.id,
      normalizedKey,
    );

    for (
      let attempt = 1;
      attempt <= EARN_SERIALIZATION_RETRY_ATTEMPTS;
      attempt++
    ) {
      try {
        return await this.prismaService.$transaction(
          async (prisma) => {
            const [transactionDevice, transactionCard] = await Promise.all([
              prisma.device.findFirst({
                where: { id: sessionDeviceId, tenantId },
                include: { branch: true },
              }),
              prisma.card.findFirst({
                where: { tenantId, barcodeValue: data.cardSerialNumber.trim() },
                include: { customer: true },
              }),
            ]);

            if (
              !transactionDevice ||
              transactionDevice.status !== DeviceStatus.ACTIVE ||
              transactionDevice.branch.status !== BranchStatus.ACTIVE
            ) {
              throw new DomainHttpException(
                400,
                'DEVICE_NOT_ACTIVE',
                'Device is not active',
              );
            }

            if (
              actor.user.branchId &&
              actor.user.branchId !== transactionDevice.branchId
            ) {
              throw new DomainHttpException(
                400,
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
                404,
                'CARD_NOT_FOUND',
                'Card not found',
              );
            }

            const branchId = actor.user.branchId ?? transactionDevice.branchId;
            if (!branchId) {
              throw new DomainHttpException(
                400,
                'BRANCH_CONTEXT_REQUIRED',
                'Branch context is required',
              );
            }

            const receiptWeekStart = deriveReceiptWeekStart(
              occurredAt,
              transactionDevice.branch.timezone,
              transactionDevice.branch.receiptWeekStartDay,
            );

            const existing = await prisma.idempotencyRecord.findUnique({
              where: {
                tenantId_actorId_endpoint_idempotencyKey: {
                  tenantId,
                  actorId: actor.user.id,
                  endpoint: EARN_ENDPOINT,
                  idempotencyKey: normalizedKey,
                },
              },
            });

            if (existing?.expiresAt && existing.expiresAt <= new Date()) {
              await prisma.idempotencyRecord.deleteMany({
                where: {
                  tenantId,
                  actorId: actor.user.id,
                  endpoint: EARN_ENDPOINT,
                  idempotencyKey: normalizedKey,
                },
              });
            } else if (existing) {
              if (existing.requestHash !== requestHash) {
                throw new DomainHttpException(
                  409,
                  'IDEMPOTENCY_CONFLICT',
                  'Idempotency key reused with different payload',
                );
              }

              if (existing.responseJson && existing.status === 'COMPLETED') {
                return existing.responseJson as unknown as EarnTransactionResponse;
              }

              throw new ConflictException(
                'Idempotency key is still being processed',
              );
            }

            const duplicateReceipt = await prisma.receipt.findFirst({
              where: {
                tenantId,
                branchId,
                receiptWeekStart,
                normalizedPosReceiptNumber,
              },
            });

            if (duplicateReceipt) {
              throw new DomainHttpException(
                409,
                'RECEIPT_ALREADY_USED',
                'Physical receipt already captured',
              );
            }

            const captureStatus = resolveCaptureStatus(
              data.purchaseAmountKobo,
              this.configService,
            );
            const now = new Date();
            const reviewStatus: ReceiptReviewStatus =
              captureStatus === 'PENDING_APPROVAL'
                ? ReceiptReviewStatus.PENDING
                : ReceiptReviewStatus.APPROVED;

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
                purchaseAmountKobo: BigInt(data.purchaseAmountKobo),
                occurredAt,
                capturedByTenantId: actor.user.tenantId,
                capturedBy: actor.user.id,
                capturedAt: now,
                captureStatus,
                reviewStatus,
                reviewedAt:
                  reviewStatus === ReceiptReviewStatus.PENDING ? null : now,
                reviewedByTenantId:
                  reviewStatus === ReceiptReviewStatus.PENDING
                    ? null
                    : actor.user.tenantId,
                reviewedBy:
                  reviewStatus === ReceiptReviewStatus.PENDING
                    ? null
                    : actor.user.id,
                approvedByTenantId:
                  reviewStatus === ReceiptReviewStatus.PENDING
                    ? null
                    : actor.user.tenantId,
                approvedBy:
                  reviewStatus === ReceiptReviewStatus.PENDING
                    ? null
                    : actor.user.id,
                approvedAt:
                  reviewStatus === ReceiptReviewStatus.PENDING ? null : now,
                approvalReasonCode:
                  captureStatus === 'PENDING_APPROVAL'
                    ? APPROVAL_REASON_CODE
                    : null,
              },
            });

            if (captureStatus === 'PENDING_APPROVAL') {
              const approval = await prisma.approval.create({
                data: {
                  tenantId,
                  receiptId: receipt.id,
                  status: ApprovalStatus.PENDING,
                  requestedByTenantId: actor.user.tenantId,
                  requestedBy: actor.user.id,
                  reasonCode: APPROVAL_REASON_CODE,
                  policyVersion: getApprovalPolicyVersion(this.configService),
                  expiresAt: new Date(now.getTime() + APPROVAL_EXPIRY_MS),
                },
              });

              const response = {
                id: receipt.id,
                transactionId: null,
                state: 'PENDING_APPROVAL' as const,
                receiptId: receipt.id,
                approvalId: approval.id,
                tenantId,
                branchId,
                deviceId: transactionDevice.id,
                customerId: transactionCard.customerId,
                cardSerialNumber: transactionCard.barcodeValue,
                posReceiptNumber: receipt.posReceiptNumber,
                purchaseAmountKobo: data.purchaseAmountKobo,
                creditKobo: null,
                captureStatus,
                availableBalanceKobo: null,
                expiresAt: null,
                smsStatus: null,
                occurredAt: occurredAt.toISOString(),
                capturedAt: now.toISOString(),
                reviewStatus: 'PENDING' as const,
              } satisfies EarnTransactionResponse;

              await prisma.idempotencyRecord.create({
                data: {
                  tenantId,
                  actorId: actor.user.id,
                  endpoint: EARN_ENDPOINT,
                  idempotencyKey: normalizedKey,
                  requestHash,
                  status: 'COMPLETED',
                  expiresAt: new Date(now.getTime() + IDP_EXPIRY_MS),
                  responseJson: response,
                },
              });

              await this.auditService.recordWithClient(prisma, {
                tenantId,
                actorId: actor.user.id,
                action: 'earn.request.approval_required',
                entityType: 'receipt',
                entityId: receipt.id,
                metadata: response,
              });

              return response;
            }

            const creditKobo = calculateCreditKobo(
              data.purchaseAmountKobo,
              this.configService,
            );

            const ledgerEntry = await prisma.loyaltyLedgerEntry.create({
              data: {
                tenantId,
                customerId: transactionCard.customerId,
                receiptId: receipt.id,
                type: LedgerEntryType.EARN,
                direction: LedgerEntryDirection.CREDIT,
                amountKobo: creditKobo,
                status: LedgerEntryStatus.CONFIRMED,
                correlationId: requestHash,
                createdByTenantId: actor.user.tenantId,
                createdBy: actor.user.id,
                effectiveAt: occurredAt,
              },
            });

            const creditLot = await prisma.creditLot.create({
              data: {
                tenantId,
                customerId: transactionCard.customerId,
                earnLedgerEntryId: ledgerEntry.id,
                originalAmountKobo: creditKobo,
                remainingAmountKobo: creditKobo,
                earnedAt: occurredAt,
                expiresAt: addMonths(occurredAt, 12),
              },
            });

            const outboxEvent = await prisma.outboxEvent.create({
              data: {
                tenantId,
                aggregateType: 'receipt',
                aggregateId: receipt.id,
                eventType: 'sms.send',
                payload: {
                  receiptId: receipt.id,
                  transactionId: ledgerEntry.id,
                  customerId: transactionCard.customerId,
                  phoneE164: transactionCard.customer.phoneE164,
                  template: 'earn-confirmed',
                  creditKobo: creditKobo.toString(),
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
                template: 'earn-confirmed',
                payload: {
                  receiptId: receipt.id,
                  transactionId: ledgerEntry.id,
                  customerId: transactionCard.customerId,
                  phoneE164: transactionCard.customer.phoneE164,
                  template: 'earn-confirmed',
                  creditKobo: creditKobo.toString(),
                },
                status: SmsMessageStatus.QUEUED,
                queuedAt: now,
              },
            });

            const response = {
              id: receipt.id,
              transactionId: ledgerEntry.id,
              state: 'CONFIRMED' as const,
              receiptId: receipt.id,
              ledgerEntryId: ledgerEntry.id,
              tenantId,
              branchId,
              deviceId: transactionDevice.id,
              customerId: transactionCard.customerId,
              cardSerialNumber: transactionCard.barcodeValue,
              posReceiptNumber: receipt.posReceiptNumber,
              purchaseAmountKobo: data.purchaseAmountKobo,
              creditKobo: Number(creditKobo),
              captureStatus,
              availableBalanceKobo: Number(
                await calculateAvailableBalanceKobo(
                  prisma,
                  tenantId,
                  transactionCard.customerId,
                ),
              ),
              expiresAt: creditLot.expiresAt.toISOString(),
              smsStatus: smsMessage.status,
              occurredAt: occurredAt.toISOString(),
              capturedAt: now.toISOString(),
              reviewStatus: 'APPROVED' as const,
            } satisfies EarnTransactionResponse;

            await prisma.idempotencyRecord.create({
              data: {
                tenantId,
                actorId: actor.user.id,
                endpoint: EARN_ENDPOINT,
                idempotencyKey: normalizedKey,
                requestHash,
                status: 'COMPLETED',
                expiresAt: new Date(now.getTime() + IDP_EXPIRY_MS),
                responseJson: response,
              },
            });

            await this.auditService.recordWithClient(prisma, {
              tenantId,
              actorId: actor.user.id,
              action: 'earn.confirmed',
              entityType: 'receipt',
              entityId: receipt.id,
              metadata: {
                ...response,
                creditLotId: creditLot.id,
              },
            });

            if (overrideApplied) {
              await this.auditService.recordWithClient(prisma, {
                tenantId,
                actorId: actor.user.id,
                action: 'earn.timestamp_override',
                entityType: 'receipt',
                entityId: receipt.id,
                metadata: {
                  overrideReason,
                  occurredAt: occurredAt.toISOString(),
                },
              });
            }

            return response;
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
      } catch (error) {
        if (isUniqueIdempotencyConflict(error)) {
          const replay = await findCompletedEarnReplay(
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
            409,
            'IDEMPOTENCY_CONFLICT',
            'Idempotency key reused with different payload',
          );
        }

        if (isUniqueReceiptConflict(error)) {
          const replay = await findCompletedEarnReplay(
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
            409,
            'RECEIPT_ALREADY_USED',
            'Physical receipt already captured',
          );
        }

        if (isTransactionConflict(error)) {
          const replay = await findCompletedEarnReplay(
            this.prismaService,
            tenantId,
            actor.user.id,
            normalizedKey,
            requestHash,
          );

          if (replay) {
            return replay;
          }

          if (attempt < EARN_SERIALIZATION_RETRY_ATTEMPTS) {
            await waitForSerializationRetryJitter();
            continue;
          }

          throw new DomainHttpException(
            503,
            'EARN_TRANSACTION_CONFLICT',
            'Earn transaction conflicted; retry the request',
          );
        }

        throw error;
      }
    }

    throw new DomainHttpException(
      503,
      'EARN_TRANSACTION_CONFLICT',
      'Earn transaction conflicted; retry the request',
    );
  }

  async getTransaction(
    tenantId: string,
    transactionId: string,
  ): Promise<TransactionResponse> {
    const ledgerEntry = await this.prismaService.loyaltyLedgerEntry.findFirst({
      where: { tenantId, id: transactionId },
      include: {
        creditLot: true,
        receipt: {
          include: {
            card: true,
            customer: true,
            device: true,
            approvals: true,
          },
        },
      },
    });

    if (!ledgerEntry) {
      throw new DomainHttpException(
        404,
        'TRANSACTION_NOT_FOUND',
        'Transaction not found',
      );
    }

    const receipt = ledgerEntry.receipt;
    const approval = receipt.approvals[0] ?? null;
    const smsMessage = await this.prismaService.smsMessage.findFirst({
      where: {
        tenantId,
        receiptId: receipt.id,
      },
      orderBy: { createdAt: 'desc' },
    });
    const availableBalanceKobo = await calculateAvailableBalanceKobo(
      this.prismaService,
      tenantId,
      receipt.customerId,
    );

    return {
      id: receipt.id,
      transactionId: ledgerEntry.id,
      tenantId: receipt.tenantId,
      branchId: receipt.branchId,
      customerId: receipt.customerId,
      deviceId: receipt.deviceId,
      cardSerialNumber: receipt.card.barcodeValue,
      posReceiptNumber: receipt.posReceiptNumber,
      purchaseAmountKobo: Number(receipt.purchaseAmountKobo),
      occurredAt: receipt.occurredAt.toISOString(),
      capturedAt: receipt.capturedAt.toISOString(),
      state: 'CONFIRMED',
      captureStatus: receipt.captureStatus,
      reviewStatus: receipt.reviewStatus,
      approvalId: approval?.id ?? null,
      approvalStatus: approval?.status ?? null,
      ledgerEntryId: ledgerEntry.id,
      creditKobo: Number(ledgerEntry.amountKobo),
      availableBalanceKobo: Number(availableBalanceKobo),
      expiresAt: ledgerEntry.creditLot?.expiresAt.toISOString() ?? null,
      smsStatus: smsMessage?.status ?? null,
      ledger: {
        id: ledgerEntry.id,
        receiptId: ledgerEntry.receiptId,
        type: ledgerEntry.type,
        direction: ledgerEntry.direction,
        amountKobo: Number(ledgerEntry.amountKobo),
        status: ledgerEntry.status,
        effectiveAt: ledgerEntry.effectiveAt.toISOString(),
        creditLot: ledgerEntry.creditLot
          ? {
              id: ledgerEntry.creditLot.id,
              originalAmountKobo: Number(
                ledgerEntry.creditLot.originalAmountKobo,
              ),
              remainingAmountKobo: Number(
                ledgerEntry.creditLot.remainingAmountKobo,
              ),
              earnedAt: ledgerEntry.creditLot.earnedAt.toISOString(),
              expiresAt: ledgerEntry.creditLot.expiresAt.toISOString(),
            }
          : null,
      },
    };
  }

  async listCustomerLedger(
    tenantId: string,
    customerId: string,
    page?: CursorPageRequest,
  ) {
    const decodedCursor = page?.cursor ? decodeCursor(page.cursor) : undefined;
    const entries = await this.prismaService.loyaltyLedgerEntry.findMany({
      where: { tenantId, customerId },
      orderBy: [{ effectiveAt: 'desc' }, { id: 'desc' }],
      include: { creditLot: true },
      ...(page
        ? {
            take: page.limit + 1,
            ...(decodedCursor
              ? { cursor: { id: decodedCursor.id }, skip: 1 }
              : {}),
          }
        : {}),
    });
    const { pageItems, hasMore } = pageMeta(
      entries,
      page?.limit ?? entries.length,
    );

    return {
      customerId,
      items: pageItems.map((entry) => ({
        id: entry.id,
        receiptId: entry.receiptId,
        type: entry.type,
        direction: entry.direction,
        amountKobo: Number(entry.amountKobo),
        status: entry.status,
        effectiveAt: entry.effectiveAt.toISOString(),
        creditLot: entry.creditLot
          ? {
              id: entry.creditLot.id,
              originalAmountKobo: Number(entry.creditLot.originalAmountKobo),
              remainingAmountKobo: Number(entry.creditLot.remainingAmountKobo),
              earnedAt: entry.creditLot.earnedAt.toISOString(),
              expiresAt: entry.creditLot.expiresAt.toISOString(),
            }
          : null,
      })),
      nextCursor: hasMore
        ? encodeCursor(pageItems.at(-1)!.id, pageItems.at(-1)!.effectiveAt)
        : null,
      hasMore,
    };
  }

  async listApprovals(tenantId: string, page?: CursorPageRequest) {
    const decodedCursor = page?.cursor ? decodeCursor(page.cursor) : undefined;
    const approvals = await this.prismaService.approval.findMany({
      where: { tenantId },
      orderBy: [{ requestedAt: 'desc' }, { id: 'desc' }],
      include: {
        receipt: {
          select: {
            id: true,
            posReceiptNumber: true,
            purchaseAmountKobo: true,
            captureStatus: true,
            reviewStatus: true,
          },
        },
      },
      ...(page
        ? {
            take: page.limit + 1,
            ...(decodedCursor
              ? { cursor: { id: decodedCursor.id }, skip: 1 }
              : {}),
          }
        : {}),
    });
    const { pageItems, hasMore } = pageMeta(
      approvals,
      page?.limit ?? approvals.length,
    );

    return {
      items: pageItems.map((approval) => ({
        id: approval.id,
        receiptId: approval.receiptId,
        status: approval.status,
        reasonCode: approval.reasonCode,
        requestedAt: approval.requestedAt.toISOString(),
        expiresAt: approval.expiresAt.toISOString(),
        decidedAt: approval.decidedAt?.toISOString() ?? null,
        executedAt: approval.executedAt?.toISOString() ?? null,
        receipt: {
          id: approval.receipt.id,
          posReceiptNumber: approval.receipt.posReceiptNumber,
          purchaseAmountKobo: Number(approval.receipt.purchaseAmountKobo),
          captureStatus: approval.receipt.captureStatus,
          reviewStatus: approval.receipt.reviewStatus,
        },
      })),
      nextCursor: hasMore
        ? encodeCursor(pageItems.at(-1)!.id, pageItems.at(-1)!.requestedAt)
        : null,
      hasMore,
    };
  }

  async findApprovalByReceiptId(tenantId: string, receiptId: string) {
    return this.prismaService.approval.findFirst({
      where: { tenantId, receiptId },
    });
  }

  async decideApproval(
    tenantId: string,
    actor: AuthContext,
    approvalId: string,
    decision: 'APPROVED' | 'REJECTED',
    reason: string,
  ): Promise<ApprovalDecisionResponse> {
    const normalizedReason = reason.trim();
    if (!normalizedReason) {
      throw new BadRequestException('Decision reason is required');
    }

    const decisionResult = await this.prismaService.$transaction(
      async (prisma) => {
        const approval = await prisma.approval.findFirst({
          where: { tenantId, id: approvalId },
          include: {
            receipt: {
              include: {
                branch: true,
                card: { include: { customer: true } },
                customer: true,
                device: true,
              },
            },
          },
        });

        if (!approval) {
          throw new DomainHttpException(
            404,
            'APPROVAL_NOT_FOUND',
            'Approval not found',
          );
        }

        if (
          approval.requestedByTenantId === actor.user.tenantId &&
          approval.requestedBy === actor.user.id
        ) {
          throw new DomainHttpException(
            400,
            'APPROVAL_SELF_DECISION_FORBIDDEN',
            'Requester cannot decide own approval',
          );
        }

        if (approval.status !== ApprovalStatus.PENDING) {
          throw new DomainHttpException(
            409,
            'APPROVAL_ALREADY_DECIDED',
            'Approval has already been decided',
          );
        }

        const receipt = approval.receipt;

        const now = new Date();

        if (approval.expiresAt <= now) {
          const expired = await prisma.approval.updateMany({
            where: { tenantId, id: approvalId, status: ApprovalStatus.PENDING },
            data: {
              status: ApprovalStatus.EXPIRED,
              decidedAt: now,
              decisionByTenantId: actor.user.tenantId,
              decisionBy: actor.user.id,
              decisionReason: 'approval expired',
            },
          });

          if (expired.count !== 1) {
            throw new DomainHttpException(
              409,
              'APPROVAL_ALREADY_DECIDED',
              'Approval has already been decided',
            );
          }

          return { expired: true } as const;
        }

        if (decision === 'REJECTED') {
          const updated = await prisma.approval.updateMany({
            where: { tenantId, id: approvalId, status: ApprovalStatus.PENDING },
            data: {
              status: ApprovalStatus.REJECTED,
              decidedAt: now,
              decisionByTenantId: actor.user.tenantId,
              decisionBy: actor.user.id,
              decisionReason: normalizedReason,
            },
          });

          if (updated.count !== 1) {
            throw new DomainHttpException(
              409,
              'APPROVAL_ALREADY_DECIDED',
              'Approval has already been decided',
            );
          }

          await prisma.receipt.update({
            where: { tenantId_id: { tenantId, id: approval.receiptId } },
            data: {
              reviewStatus: ReceiptReviewStatus.REJECTED,
              reviewedAt: now,
              reviewedByTenantId: actor.user.tenantId,
              reviewedBy: actor.user.id,
              approvedAt: null,
              approvedByTenantId: null,
              approvedBy: null,
            },
          });

          await this.auditService.recordWithClient(prisma, {
            tenantId,
            actorId: actor.user.id,
            action: 'approval.reject',
            entityType: 'approval',
            entityId: approvalId,
            metadata: { decision, reason: normalizedReason, decidedAt: now },
          });

          return {
            id: approvalId,
            status: ApprovalStatus.REJECTED,
            receiptId: approval.receiptId,
            reason: normalizedReason,
            decidedAt: now.toISOString(),
            executedAt: null,
          };
        }

        if (
          receipt.captureStatus !== 'PENDING_APPROVAL' ||
          receipt.reviewStatus !== ReceiptReviewStatus.PENDING
        ) {
          throw new DomainHttpException(
            400,
            'RECEIPT_NOT_ELIGIBLE',
            'Receipt does not require review',
          );
        }

        if (
          receipt.capturedByTenantId === actor.user.tenantId &&
          receipt.capturedBy === actor.user.id
        ) {
          throw new DomainHttpException(
            400,
            'REVIEW_SELF_DECISION_FORBIDDEN',
            'Capturing cashier cannot review the same receipt',
          );
        }

        if (
          receipt.branch.status !== BranchStatus.ACTIVE ||
          receipt.device?.status !== DeviceStatus.ACTIVE ||
          receipt.card.status !== CardStatus.ACTIVE ||
          receipt.customer.status !== CustomerStatus.ACTIVE ||
          receipt.customer.isStaff
        ) {
          throw new DomainHttpException(
            422,
            'RECEIPT_NO_LONGER_ELIGIBLE',
            'Receipt is no longer eligible',
          );
        }

        assertApprovalPolicyStillPermitsExecution(
          Number(receipt.purchaseAmountKobo),
          this.configService,
          approval.policyVersion,
        );

        const approved = await prisma.approval.updateMany({
          where: { tenantId, id: approvalId, status: ApprovalStatus.PENDING },
          data: {
            status: ApprovalStatus.APPROVED,
            decidedAt: now,
            decisionByTenantId: actor.user.tenantId,
            decisionBy: actor.user.id,
            decisionReason: normalizedReason,
          },
        });

        if (approved.count !== 1) {
          throw new DomainHttpException(
            409,
            'APPROVAL_ALREADY_DECIDED',
            'Approval has already been decided',
          );
        }

        const creditKobo = calculateCreditKobo(
          Number(receipt.purchaseAmountKobo),
          this.configService,
        );

        const existingLedger = await prisma.loyaltyLedgerEntry.findUnique({
          where: { receiptId: approval.receiptId },
        });

        if (existingLedger) {
          throw new DomainHttpException(
            409,
            'LEDGER_ENTRY_ALREADY_EXISTS',
            'Ledger entry already exists',
          );
        }

        const ledgerEntry = await prisma.loyaltyLedgerEntry.create({
          data: {
            tenantId,
            customerId: receipt.customerId,
            receiptId: receipt.id,
            type: LedgerEntryType.EARN,
            direction: LedgerEntryDirection.CREDIT,
            amountKobo: creditKobo,
            status: LedgerEntryStatus.CONFIRMED,
            correlationId: `approval:${approval.id}`,
            createdByTenantId: actor.user.tenantId,
            createdBy: actor.user.id,
            effectiveAt: receipt.occurredAt,
          },
        });

        await prisma.creditLot.create({
          data: {
            tenantId,
            customerId: receipt.customerId,
            earnLedgerEntryId: ledgerEntry.id,
            originalAmountKobo: creditKobo,
            remainingAmountKobo: creditKobo,
            earnedAt: receipt.occurredAt,
            expiresAt: addMonths(receipt.occurredAt, 12),
          },
        });

        const outboxEvent = await prisma.outboxEvent.create({
          data: {
            tenantId,
            aggregateType: 'receipt',
            aggregateId: receipt.id,
            eventType: 'sms.send',
            payload: {
              version: 1,
              receiptId: receipt.id,
              transactionId: ledgerEntry.id,
              customerId: receipt.customerId,
              phoneE164: receipt.customer.phoneE164,
              template: 'earn-confirmed',
              creditKobo: creditKobo.toString(),
            },
            status: 'PENDING',
            nextAttemptAt: now,
          },
        });
        await prisma.smsMessage.create({
          data: {
            tenantId,
            receiptId: receipt.id,
            outboxEventId: outboxEvent.id,
            phoneE164: receipt.customer.phoneE164,
            template: 'earn-confirmed',
            payload: {
              version: 1,
              receiptId: receipt.id,
              transactionId: ledgerEntry.id,
              customerId: receipt.customerId,
              phoneE164: receipt.customer.phoneE164,
              template: 'earn-confirmed',
              creditKobo: creditKobo.toString(),
            },
            status: SmsMessageStatus.QUEUED,
            queuedAt: now,
          },
        });

        await prisma.receipt.update({
          where: { tenantId_id: { tenantId, id: receipt.id } },
          data: {
            reviewStatus: ReceiptReviewStatus.APPROVED,
            reviewedAt: now,
            reviewedByTenantId: actor.user.tenantId,
            reviewedBy: actor.user.id,
            approvedAt: now,
            approvedByTenantId: actor.user.tenantId,
            approvedBy: actor.user.id,
          },
        });

        const executed = await prisma.approval.updateMany({
          where: { tenantId, id: approvalId, status: ApprovalStatus.APPROVED },
          data: {
            status: ApprovalStatus.EXECUTED,
            executedAt: now,
          },
        });

        if (executed.count !== 1) {
          throw new DomainHttpException(
            409,
            'APPROVAL_EXECUTION_FAILED',
            'Approval execution did not complete',
          );
        }

        await this.auditService.recordWithClient(prisma, {
          tenantId,
          actorId: actor.user.id,
          action: 'approval.execute',
          entityType: 'approval',
          entityId: approvalId,
          metadata: {
            decision,
            reason: normalizedReason,
            executedAt: now,
            ledgerEntryId: ledgerEntry.id,
          },
        });

        return {
          id: approvalId,
          status: ApprovalStatus.EXECUTED,
          receiptId: approval.receiptId,
          ledgerEntryId: ledgerEntry.id,
          creditKobo: Number(creditKobo),
          reason: normalizedReason,
          decidedAt: now.toISOString(),
          executedAt: now.toISOString(),
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    if ('expired' in decisionResult) {
      throw new DomainHttpException(
        422,
        'APPROVAL_EXPIRED',
        'Approval has expired',
      );
    }

    return decisionResult;
  }
}

function normalizeIdempotencyKey(key: string | undefined): string {
  const normalized = key?.trim();
  if (!normalized) {
    throw new BadRequestException('Idempotency-Key header is required');
  }

  return normalized;
}

function normalizeReceiptNumber(value: string): string {
  const normalized = value.trim();
  if (!normalized) {
    throw new BadRequestException('posReceiptNumber is required');
  }

  return normalized;
}

function normalizeReceiptIdentity(value: string): string {
  return value.trim().toUpperCase();
}

function parseDate(value: string, fieldName: string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException(`${fieldName} must be a valid date-time`);
  }

  return date;
}

function assertPurchaseAmountAllowed(
  purchaseAmountKobo: number,
  configService: ConfigService,
): void {
  if (!Number.isSafeInteger(purchaseAmountKobo)) {
    throw new BadRequestException('purchaseAmountKobo must be a safe integer');
  }

  const purchaseAmountCeilingKobo =
    configService.get<number>('PURCHASE_AMOUNT_CEILING_KOBO') ?? 100_000_000;

  if (purchaseAmountKobo > purchaseAmountCeilingKobo) {
    throw new BadRequestException(
      'purchaseAmountKobo exceeds the allowed maximum',
    );
  }
}

function resolveCaptureStatus(
  purchaseAmountKobo: number,
  configService: ConfigService,
): 'CAPTURED' | 'FLAGGED' | 'PENDING_APPROVAL' {
  const flagThresholdKobo =
    configService.get<number>('PURCHASE_FLAG_THRESHOLD_KOBO') ?? 10_000_000;
  const approvalThresholdKobo =
    configService.get<number>('PURCHASE_APPROVAL_THRESHOLD_KOBO') ?? 20_000_000;

  if (purchaseAmountKobo > approvalThresholdKobo) {
    return 'PENDING_APPROVAL';
  }

  if (purchaseAmountKobo > flagThresholdKobo) {
    return 'FLAGGED';
  }

  return 'CAPTURED';
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
    throw new BadRequestException('Branch receipt week start day is invalid');
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
    throw new BadRequestException('Unable to derive receipt week start');
  }

  const localDate = new Date(Date.UTC(year, month - 1, day));
  const localWeekday = localDate.getUTCDay();
  const weekStartZeroBased = receiptWeekStartDay;
  const deltaDays = (7 + localWeekday - weekStartZeroBased) % 7;

  return new Date(Date.UTC(year, month - 1, day - deltaDays));
}

function assertReceiptTimestampAllowed(
  role: UserRole,
  occurredAt: Date,
  overrideReason?: string,
): boolean {
  const skewMs = occurredAt.getTime() - Date.now();
  if (skewMs > MAX_POS_FUTURE_SKEW_MS) {
    return assertOverrideAllowed(role, overrideReason, 'future');
  }

  if (skewMs < -MAX_POS_PAST_SKEW_MS) {
    return assertOverrideAllowed(role, overrideReason, 'stale');
  }

  return false;
}

function assertOverrideAllowed(
  role: UserRole,
  overrideReason: string | undefined,
  kind: 'future' | 'stale',
): boolean {
  if (role === UserRole.CASHIER) {
    throw new BadRequestException(
      `occurredAt cannot be ${kind === 'future' ? 'in the future' : 'too old'}`,
    );
  }

  if (!overrideReason) {
    throw new BadRequestException(
      'overrideReason is required for timestamp overrides',
    );
  }

  return true;
}

function calculateCreditKobo(
  purchaseAmountKobo: number,
  configService: ConfigService,
): bigint {
  const earnRateBps = BigInt(
    configService.get<number>('DEFAULT_EARN_RATE_BPS') ?? 200,
  );

  return (BigInt(purchaseAmountKobo) * earnRateBps + 9_999n) / 10_000n;
}

function getApprovalPolicyVersion(configService: ConfigService): string {
  return createHash('sha256')
    .update(
      stableStringify({
        purchaseFlagThresholdKobo:
          configService.get<number>('PURCHASE_FLAG_THRESHOLD_KOBO') ??
          10_000_000,
        purchaseApprovalThresholdKobo:
          configService.get<number>('PURCHASE_APPROVAL_THRESHOLD_KOBO') ??
          20_000_000,
        purchaseAmountCeilingKobo:
          configService.get<number>('PURCHASE_AMOUNT_CEILING_KOBO') ??
          100_000_000,
        defaultEarnRateBps:
          configService.get<number>('DEFAULT_EARN_RATE_BPS') ?? 200,
      }),
    )
    .digest('hex');
}

function assertApprovalPolicyStillPermitsExecution(
  purchaseAmountKobo: number,
  configService: ConfigService,
  expectedPolicyVersion: string,
): void {
  const purchaseAmountCeilingKobo =
    configService.get<number>('PURCHASE_AMOUNT_CEILING_KOBO') ?? 100_000_000;
  const currentPolicyVersion = getApprovalPolicyVersion(configService);

  if (purchaseAmountKobo > purchaseAmountCeilingKobo) {
    throw new DomainHttpException(
      422,
      'APPROVAL_POLICY_CHANGED',
      'Approval can no longer be executed under the current policy ceiling',
    );
  }

  if (
    expectedPolicyVersion !== LEGACY_APPROVAL_POLICY_VERSION &&
    expectedPolicyVersion !== currentPolicyVersion
  ) {
    throw new DomainHttpException(
      422,
      'APPROVAL_POLICY_CHANGED',
      'Approval policy changed after the request was captured',
    );
  }

  if (
    resolveCaptureStatus(purchaseAmountKobo, configService) !==
    'PENDING_APPROVAL'
  ) {
    throw new DomainHttpException(
      422,
      'APPROVAL_POLICY_CHANGED',
      'Approval is no longer required under the current policy',
    );
  }
}

function addMonths(date: Date, months: number): Date {
  const year = date.getUTCFullYear();
  const monthIndex = date.getUTCMonth() + months;
  const targetYear = year + Math.floor(monthIndex / 12);
  const targetMonth = ((monthIndex % 12) + 12) % 12;
  const lastDayOfTargetMonth = new Date(
    Date.UTC(targetYear, targetMonth + 1, 0),
  ).getUTCDate();
  const day = Math.min(date.getUTCDate(), lastDayOfTargetMonth);

  return new Date(
    Date.UTC(
      targetYear,
      targetMonth,
      day,
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds(),
      date.getUTCMilliseconds(),
    ),
  );
}

async function calculateAvailableBalanceKobo(
  prismaService:
    | PrismaService
    | {
        creditLot: {
          findMany: (
            args: Prisma.CreditLotFindManyArgs,
          ) => Promise<Array<{ remainingAmountKobo: bigint }>>;
        };
      },
  tenantId: string,
  customerId: string,
  now = new Date(),
): Promise<bigint> {
  const lots = await prismaService.creditLot.findMany({
    where: {
      tenantId,
      customerId,
      remainingAmountKobo: { gt: 0 },
      expiresAt: { gt: now },
    },
    select: {
      remainingAmountKobo: true,
    },
  });

  return lots.reduce((total, lot) => total + lot.remainingAmountKobo, 0n);
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
      endpoint: EARN_ENDPOINT,
      idempotencyKey: normalizedKey,
      expiresAt: { lte: new Date() },
    },
  });
}

async function findCompletedEarnReplay(
  prismaService: PrismaService,
  tenantId: string,
  actorId: string,
  normalizedKey: string,
  requestHash: string,
): Promise<EarnTransactionResponse | null> {
  const replay = await prismaService.idempotencyRecord.findUnique({
    where: {
      tenantId_actorId_endpoint_idempotencyKey: {
        tenantId,
        actorId,
        endpoint: EARN_ENDPOINT,
        idempotencyKey: normalizedKey,
      },
    },
  });

  if (replay?.requestHash === requestHash && replay.responseJson) {
    return replay.responseJson as unknown as EarnTransactionResponse;
  }

  return null;
}

async function waitForSerializationRetryJitter(): Promise<void> {
  const delayMs = Math.floor(
    Math.random() * (EARN_SERIALIZATION_RETRY_JITTER_MS + 1),
  );

  await new Promise((resolve) => setTimeout(resolve, delayMs));
}

function isUniqueIdempotencyConflict(error: unknown): boolean {
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

  return (
    target.includes('actorId') &&
    target.includes('endpoint') &&
    target.includes('idempotencyKey')
  );
}

function isUniqueReceiptConflict(error: unknown): boolean {
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

  return (
    target.includes('tenantId') &&
    target.includes('branchId') &&
    target.includes('receiptWeekStart') &&
    target.includes('normalizedPosReceiptNumber')
  );
}

function isTransactionConflict(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code === 'P2034';
  }

  return false;
}
