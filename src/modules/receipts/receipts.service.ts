import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  BranchStatus,
  CardStatus,
  CustomerStatus,
  DeviceStatus,
  Prisma,
  ReceiptReviewStatus,
  UserRole,
} from '@prisma/client';
import { createHash } from 'node:crypto';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuthContext } from '../../common/auth/session.types';
import { CaptureReceiptDto } from './receipts.dto';

const RECEIPT_CAPTURE_ENDPOINT = 'POST /api/v1/receipts';
const MAX_POS_FUTURE_SKEW_MS = 5 * 60 * 1000;
const MAX_POS_PAST_SKEW_MS = 12 * 60 * 60 * 1000;
const IDP_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

type ReceiptCaptureResponse = {
  id: string;
  tenantId: string;
  branchId: string;
  customerId: string;
  cardSerialNumber: string;
  deviceId: string | null;
  posReceiptNumber: string;
  purchaseAmountKobo: number;
  occurredAt: string;
  capturedAt: string;
  status: 'CAPTURED' | 'FLAGGED' | 'PENDING_APPROVAL';
  reviewStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
};

type ReceiptWithRelations = Prisma.ReceiptGetPayload<{
  include: {
    tenant: true;
    branch: true;
    customer: true;
    card: true;
    device: true;
  };
}>;

@Injectable()
export class ReceiptsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly auditService: AuditService,
    private readonly configService: ConfigService,
  ) {}

  async captureReceipt(
    tenantId: string,
    actor: AuthContext,
    idempotencyKey: string | undefined,
    data: CaptureReceiptDto,
  ): Promise<ReceiptCaptureResponse> {
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
      throw new BadRequestException('Session device is required');
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
            throw new BadRequestException('Device is not active');
          }

          if (
            actor.user.branchId &&
            actor.user.branchId !== transactionDevice.branchId
          ) {
            throw new BadRequestException(
              'Device does not belong to cashier branch',
            );
          }

          if (
            !transactionCard ||
            transactionCard.status !== CardStatus.ACTIVE ||
            transactionCard.customer.status !== CustomerStatus.ACTIVE ||
            transactionCard.customer.isStaff
          ) {
            throw new NotFoundException('Card not found');
          }

          const branchId = actor.user.branchId ?? transactionDevice.branchId;
          if (!branchId) {
            throw new BadRequestException('Branch context is required');
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
                endpoint: RECEIPT_CAPTURE_ENDPOINT,
                idempotencyKey: normalizedKey,
              },
            },
          });

          if (existing?.expiresAt && existing.expiresAt <= new Date()) {
            await prisma.idempotencyRecord.deleteMany({
              where: {
                tenantId,
                actorId: actor.user.id,
                endpoint: RECEIPT_CAPTURE_ENDPOINT,
                idempotencyKey: normalizedKey,
              },
            });
          } else if (existing) {
            if (existing.requestHash !== requestHash) {
              throw new ConflictException(
                'Idempotency key reused with different payload',
              );
            }

            if (existing.responseJson && existing.status === 'COMPLETED') {
              return existing.responseJson as ReceiptCaptureResponse;
            }

            throw new ConflictException('Idempotency key is still being processed');
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
            throw new ConflictException('Physical receipt already captured');
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

          await prisma.idempotencyRecord.create({
            data: {
              tenantId,
              actorId: actor.user.id,
              endpoint: RECEIPT_CAPTURE_ENDPOINT,
              idempotencyKey: normalizedKey,
              requestHash,
              status: 'PENDING',
              expiresAt: new Date(now.getTime() + IDP_EXPIRY_MS),
            },
          });

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
                  ? 'PURCHASE_ABOVE_APPROVAL_THRESHOLD'
                  : null,
            },
            include: receiptInclude,
          });

          const response = toReceiptCaptureResponse(receipt);

          if (overrideApplied) {
            await this.auditService.recordWithClient(prisma, {
              tenantId,
              actorId: actor.user.id,
              action: 'receipt.capture.override',
              entityType: 'receipt',
              entityId: receipt.id,
              metadata: {
                approvedByUserId: actor.user.id,
                approvedOccurredAt: occurredAt,
                approvalTimestamp: now,
                originalOccurredAt: occurredAt,
                overrideReason,
              },
            });
          }

          await prisma.idempotencyRecord.update({
            where: {
              tenantId_actorId_endpoint_idempotencyKey: {
                tenantId,
                actorId: actor.user.id,
                endpoint: RECEIPT_CAPTURE_ENDPOINT,
                idempotencyKey: normalizedKey,
              },
            },
            data: {
              status: 'COMPLETED',
              responseJson: response,
            },
          });

          await this.auditService.recordWithClient(prisma, {
            tenantId,
            actorId: actor.user.id,
            action: 'receipt.capture',
            entityType: 'receipt',
            entityId: receipt.id,
            metadata: response,
          });

          return response;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (isUniqueIdempotencyConflict(error)) {
        const replay = await this.prismaService.idempotencyRecord.findUnique({
          where: {
            tenantId_actorId_endpoint_idempotencyKey: {
              tenantId,
              actorId: actor.user.id,
              endpoint: RECEIPT_CAPTURE_ENDPOINT,
              idempotencyKey: normalizedKey,
            },
          },
        });

        if (replay?.requestHash === requestHash && replay.responseJson) {
          return replay.responseJson as ReceiptCaptureResponse;
        }

        throw new ConflictException(
          'Idempotency key reused with different payload',
        );
      }

      if (isTransactionConflict(error)) {
        throw new ConflictException('Physical receipt already captured');
      }

      if (isUniqueReceiptConflict(error)) {
        throw new ConflictException('Physical receipt already captured');
      }

      throw error;
    }
  }

  async approveReceipt(
    tenantId: string,
    actor: AuthContext,
    receiptId: string,
  ) {
    return this.reviewReceipt(tenantId, actor, receiptId, 'APPROVED');
  }

  async rejectReceipt(
    tenantId: string,
    actor: AuthContext,
    receiptId: string,
  ) {
    return this.reviewReceipt(tenantId, actor, receiptId, 'REJECTED');
  }

  private async reviewReceipt(
    tenantId: string,
    actor: AuthContext,
    receiptId: string,
    reviewStatus: 'APPROVED' | 'REJECTED',
  ) {
    return this.prismaService.$transaction(async (prisma) => {
      const receipt = await prisma.receipt.findFirst({
        where: { tenantId, id: receiptId },
      });

      if (!receipt) {
        throw new NotFoundException('Receipt not found');
      }

      if (receipt.captureStatus !== 'PENDING_APPROVAL') {
        throw new BadRequestException('Receipt does not require review');
      }

      if (receipt.reviewStatus !== ReceiptReviewStatus.PENDING) {
        throw new ConflictException('Receipt has already been reviewed');
      }

      if (
        receipt.capturedByTenantId === actor.user.tenantId &&
        receipt.capturedBy === actor.user.id
      ) {
        throw new BadRequestException(
          'Capturing cashier cannot review the same receipt',
        );
      }

      const now = new Date();
      const updatedCount = await prisma.receipt.updateMany({
        where: {
          tenantId,
          id: receiptId,
          captureStatus: 'PENDING_APPROVAL',
          reviewStatus: ReceiptReviewStatus.PENDING,
        },
        data: {
          reviewStatus,
          reviewedAt: now,
          reviewedByTenantId: actor.user.tenantId,
          reviewedBy: actor.user.id,
          approvedAt: reviewStatus === 'APPROVED' ? now : null,
          approvedByTenantId:
            reviewStatus === 'APPROVED' ? actor.user.tenantId : null,
          approvedBy: reviewStatus === 'APPROVED' ? actor.user.id : null,
        },
      });

      if (updatedCount.count !== 1) {
        throw new ConflictException('Receipt has already been reviewed');
      }

      await this.auditService.recordWithClient(prisma, {
        tenantId,
        actorId: actor.user.id,
        action: reviewStatus === 'APPROVED' ? 'receipt.approve' : 'receipt.reject',
        entityType: 'receipt',
        entityId: receiptId,
        metadata: {
          reviewStatus,
          reviewedAt: now,
        },
      });

      return {
        id: receiptId,
        reviewStatus,
        reviewedAt: now.toISOString(),
      };
    });
  }
}

const receiptInclude = {
  tenant: true,
  branch: true,
  customer: true,
  card: true,
  device: true,
} as const;

function toReceiptCaptureResponse(
  receipt: ReceiptWithRelations,
): ReceiptCaptureResponse {
  return {
    id: receipt.id,
    tenantId: receipt.tenantId,
    branchId: receipt.branchId,
    customerId: receipt.customerId,
    cardSerialNumber: receipt.card.barcodeValue,
    deviceId: receipt.deviceId,
    posReceiptNumber: receipt.posReceiptNumber,
    purchaseAmountKobo: Number(receipt.purchaseAmountKobo),
    occurredAt: receipt.occurredAt.toISOString(),
    capturedAt: receipt.capturedAt.toISOString(),
    status: receipt.captureStatus,
    reviewStatus: receipt.reviewStatus,
  };
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
    throw new BadRequestException('purchaseAmountKobo exceeds the allowed maximum');
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
      endpoint: RECEIPT_CAPTURE_ENDPOINT,
      idempotencyKey: normalizedKey,
      expiresAt: { lte: new Date() },
    },
  });
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
    return ['P2028', 'P2031', 'P2034'].includes(error.code);
  }

  return error instanceof Error && /transaction/i.test(error.message);
}
