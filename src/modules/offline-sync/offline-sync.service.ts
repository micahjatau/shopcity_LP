import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  BranchStatus,
  CardStatus,
  CustomerStatus,
  DeviceStatus,
  UserRole,
} from '@prisma/client';
import { createHash } from 'node:crypto';
import { DomainHttpException } from '../../common/errors/domain.exception';
import { PrismaService } from '../../database/prisma.service';
import { LoyaltyService } from '../loyalty/loyalty.service';
import { getOfflineSyncPolicy } from './offline-sync.policy';
import {
  type OfflineEarnBatchRecordInput,
  type OfflineEarnBatchRecordResult,
  type OfflineEarnBatchRequest,
  type OfflineEarnBatchResponse,
  type OfflineSyncAttemptResponseJson,
} from './offline-sync.types';
import type { AuthContext } from '../../common/auth/session.types';
import type { EarnTransactionDto } from '../loyalty/loyalty.dto';

const OFFLINE_BATCH_ENDPOINT = 'POST /api/v1/offline-sync/earn-batch';

@Injectable()
export class OfflineSyncService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly loyaltyService: LoyaltyService,
    private readonly configService: ConfigService,
  ) {}

  async earnBatch(
    tenantId: string,
    actor: AuthContext,
    request: OfflineEarnBatchRequest,
  ): Promise<OfflineEarnBatchResponse> {
    if (actor.user.role !== UserRole.CASHIER) {
      throw new DomainHttpException(
        403,
        'SYNC_ACTOR_MISMATCH',
        'Offline earn sync requires a cashier session',
      );
    }

    if (!actor.session.deviceId) {
      throw new DomainHttpException(
        400,
        'SYNC_DEVICE_MISMATCH',
        'Session device is required for offline sync',
      );
    }

    if (request.deviceId !== actor.session.deviceId) {
      throw new DomainHttpException(
        400,
        'SYNC_DEVICE_MISMATCH',
        'Offline sync device does not match the authenticated session',
      );
    }

    if (actor.user.branchId == null) {
      throw new DomainHttpException(
        400,
        'SYNC_BRANCH_MISMATCH',
        'Branch context is required for offline sync',
      );
    }

    const policy = getOfflineSyncPolicy(this.configService);
    if (request.records.length > policy.maxRecords) {
      throw new BadRequestException('Offline sync batch is too large');
    }

    const results: OfflineEarnBatchRecordResult[] = [];
    for (const record of request.records) {
      results.push(
        await this.processRecord(tenantId, actor, request.deviceId, policy, record),
      );
    }

    return {
      deviceId: request.deviceId,
      records: results,
    };
  }

  private async processRecord(
    tenantId: string,
    actor: AuthContext,
    deviceId: string,
    policy: ReturnType<typeof getOfflineSyncPolicy>,
    record: OfflineEarnBatchRecordInput,
  ): Promise<OfflineEarnBatchRecordResult> {
    const requestHash = hashRequest({
      tenantId,
      deviceId,
      localId: record.localId,
      idempotencyKey: record.idempotencyKey,
      cashierId: record.cashierId,
      branchId: record.branchId,
      cardBarcode: normalizeCardBarcode(record.cardBarcode),
      receiptNumber: normalizeReceiptNumber(record.receiptNumber),
      receiptWeekStart: normalizeReceiptWeekStart(record.receiptWeekStart),
      purchaseAmountKobo: record.purchaseAmountKobo,
      occurredAtLocal: record.occurredAtLocal,
    });

    const existingAttempt =
      await this.prismaService.offlineSyncAttempt.findUnique({
        where: {
          tenantId_deviceId_localId: {
            tenantId,
            deviceId,
            localId: record.localId,
          },
        },
      });

    if (existingAttempt) {
      if (existingAttempt.requestHash !== requestHash) {
        return this.persistResult(tenantId, deviceId, record.localId, {
          localId: record.localId,
          status: 'REJECTED',
          transactionId: null,
          approvalId: null,
          creditEarnedKobo: null,
          errorCode: 'SYNC_RECORD_CONFLICT',
          retryable: false,
        });
      }

      if (existingAttempt.responseJson) {
        return existingAttempt.responseJson as OfflineSyncAttemptResponseJson;
      }

      return this.persistResult(tenantId, deviceId, record.localId, {
        localId: record.localId,
        status: 'RETRYABLE',
        transactionId: null,
        approvalId: null,
        creditEarnedKobo: null,
        errorCode: 'SYNC_RECORD_PROCESSING',
        retryable: true,
      });
    }

    try {
      await this.prismaService.offlineSyncAttempt.create({
        data: {
          tenantId,
          deviceId,
          localId: record.localId,
          idempotencyKey: record.idempotencyKey,
          requestHash,
          cashierId: record.cashierId,
          branchId: record.branchId,
          posReceiptNumber: normalizeReceiptNumber(record.receiptNumber),
          receiptWeekStartSubmitted: parseYmdDate(record.receiptWeekStart),
          purchaseAmountKobo: record.purchaseAmountKobo,
          occurredAt: parseDate(record.occurredAtLocal, 'occurredAtLocal'),
          status: 'RETRYABLE',
        },
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        return this.processRecord(tenantId, actor, deviceId, policy, record);
      }

      throw error;
    }

    const validationError = await this.validateRecord(
      tenantId,
      actor,
      deviceId,
      policy,
      record,
    );

    if (validationError) {
      return this.persistResult(tenantId, deviceId, record.localId, validationError);
    }

    try {
      const earnResponse = await this.loyaltyService.earn(tenantId, actor, record.idempotencyKey, {
        posReceiptNumber: normalizeReceiptNumber(record.receiptNumber),
        cardSerialNumber: normalizeCardBarcode(record.cardBarcode),
        purchaseAmountKobo: record.purchaseAmountKobo,
        occurredAt: parseDate(record.occurredAtLocal, 'occurredAtLocal').toISOString(),
      } satisfies EarnTransactionDto);

      const result =
        earnResponse.state === 'PENDING_APPROVAL'
          ? {
              localId: record.localId,
              status: 'PENDING_APPROVAL' as const,
              transactionId: null,
              approvalId: earnResponse.approvalId ?? null,
              creditEarnedKobo: null,
              errorCode: null,
              retryable: false,
            }
          : {
              localId: record.localId,
              status: 'CONFIRMED' as const,
              transactionId: earnResponse.transactionId,
              approvalId: null,
              creditEarnedKobo: earnResponse.creditKobo,
              errorCode: null,
              retryable: false,
            };

      return this.persistResult(tenantId, deviceId, record.localId, result, {
        transactionId: result.transactionId,
        approvalId: result.approvalId,
        syncedAt: new Date(),
      });
    } catch (error) {
      const mapped = mapEarnFailure(record.localId, error);
      return this.persistResult(tenantId, deviceId, record.localId, mapped, {
        transactionId: mapped.transactionId,
        approvalId: mapped.approvalId,
        syncedAt: new Date(),
      });
    }
  }

  private async validateRecord(
    tenantId: string,
    actor: AuthContext,
    deviceId: string,
    policy: ReturnType<typeof getOfflineSyncPolicy>,
    record: OfflineEarnBatchRecordInput,
  ): Promise<OfflineEarnBatchRecordResult | null> {
    if (record.cashierId !== actor.user.id) {
      return buildRejectedResult(record.localId, 'SYNC_ACTOR_MISMATCH');
    }

    if (record.branchId !== actor.user.branchId) {
      return buildRejectedResult(record.localId, 'SYNC_BRANCH_MISMATCH');
    }

    const occurredAt = parseDate(record.occurredAtLocal, 'occurredAtLocal');
    const ageHours =
      (Date.now() - occurredAt.getTime()) / (60 * 60 * 1000);
    if (ageHours > policy.maxRecordAgeHours) {
      return buildRejectedResult(record.localId, 'SYNC_RECORD_EXPIRED');
    }

    const device = await this.prismaService.device.findFirst({
      where: { tenantId, id: deviceId },
      include: { branch: true },
    });

    if (
      !device ||
      device.status !== DeviceStatus.ACTIVE ||
      device.branch.status !== BranchStatus.ACTIVE ||
      device.branchId !== record.branchId
    ) {
      return buildRejectedResult(record.localId, 'SYNC_DEVICE_MISMATCH');
    }

    const derivedWeekStart = deriveReceiptWeekStart(
      occurredAt,
      device.branch.timezone,
      device.branch.receiptWeekStartDay,
    );
    const submittedWeekStart = normalizeReceiptWeekStart(
      record.receiptWeekStart,
    );

    if (submittedWeekStart !== formatYmd(derivedWeekStart)) {
      return buildRejectedResult(record.localId, 'SYNC_WEEK_MISMATCH');
    }

    const card = await this.prismaService.card.findFirst({
      where: { tenantId, barcodeValue: normalizeCardBarcode(record.cardBarcode) },
      include: { customer: true },
    });

    if (
      !card ||
      card.status !== CardStatus.ACTIVE ||
      card.customer.status !== CustomerStatus.ACTIVE
    ) {
      return buildRejectedResult(record.localId, 'CARD_INACTIVE');
    }

    if (card.customer.isStaff) {
      return buildRejectedResult(record.localId, 'STAFF_INELIGIBLE');
    }

    return null;
  }

  private async persistResult(
    tenantId: string,
    deviceId: string,
    localId: string,
    result: OfflineEarnBatchRecordResult,
    extra: Partial<{
      transactionId: string | null;
      approvalId: string | null;
      syncedAt: Date;
    }> = {},
  ): Promise<OfflineEarnBatchRecordResult> {
    const responseJson: OfflineSyncAttemptResponseJson = {
      ...result,
    };

    await this.prismaService.offlineSyncAttempt.update({
      where: {
        tenantId_deviceId_localId: {
          tenantId,
          deviceId,
          localId,
        },
      },
      data: {
        status: result.status,
        errorCode: result.errorCode,
        transactionId: extra.transactionId ?? result.transactionId,
        approvalId: extra.approvalId ?? result.approvalId,
        responseJson,
        syncedAt: extra.syncedAt ?? new Date(),
      },
    });

    return responseJson;
  }
}

function buildRejectedResult(
  localId: string,
  errorCode: string,
): OfflineEarnBatchRecordResult {
  return {
    localId,
    status: 'REJECTED',
    transactionId: null,
    approvalId: null,
    creditEarnedKobo: null,
    errorCode,
    retryable: false,
  };
}

function mapEarnFailure(
  localId: string,
  error: unknown,
): OfflineEarnBatchRecordResult {
  const code = readDomainCode(error);
  if (code === 'EARN_TRANSACTION_CONFLICT') {
    return {
      localId,
      status: 'RETRYABLE',
      transactionId: null,
      approvalId: null,
      creditEarnedKobo: null,
      errorCode: code,
      retryable: true,
    };
  }

  if (code === 'RECEIPT_ALREADY_USED') {
    return {
      localId,
      status: 'REJECTED',
      transactionId: null,
      approvalId: null,
      creditEarnedKobo: null,
      errorCode: code,
      retryable: false,
    };
  }

  if (code === 'CARD_NOT_FOUND') {
    return {
      localId,
      status: 'REJECTED',
      transactionId: null,
      approvalId: null,
      creditEarnedKobo: null,
      errorCode: 'CARD_INACTIVE',
      retryable: false,
    };
  }

  if (code === 'DEVICE_NOT_ACTIVE' || code === 'DEVICE_BRANCH_MISMATCH') {
    return {
      localId,
      status: 'REJECTED',
      transactionId: null,
      approvalId: null,
      creditEarnedKobo: null,
      errorCode: 'SYNC_DEVICE_MISMATCH',
      retryable: false,
    };
  }

  if (code === 'IDEMPOTENCY_CONFLICT') {
    return {
      localId,
      status: 'REJECTED',
      transactionId: null,
      approvalId: null,
      creditEarnedKobo: null,
      errorCode: code,
      retryable: false,
    };
  }

  return {
    localId,
    status: 'RETRYABLE',
    transactionId: null,
    approvalId: null,
    creditEarnedKobo: null,
    errorCode: code ?? 'OFFLINE_SYNC_UNEXPECTED_ERROR',
    retryable: true,
  };
}

function readDomainCode(error: unknown): string | null {
  if (error instanceof DomainHttpException) {
    const body = error.getResponse();
    if (body && typeof body === 'object' && 'code' in body) {
      return String((body as { code?: unknown }).code ?? '');
    }
  }

  if (error && typeof error === 'object' && 'response' in error) {
    const response = (error as { response?: unknown }).response;
    if (response && typeof response === 'object' && 'code' in response) {
      return String((response as { code?: unknown }).code ?? '');
    }
  }

  return null;
}

function normalizeReceiptNumber(value: string): string {
  const normalized = value.trim();
  if (!normalized) {
    throw new BadRequestException('receiptNumber is required');
  }

  return normalized;
}

function normalizeCardBarcode(value: string): string {
  const normalized = value.trim();
  if (!normalized) {
    throw new BadRequestException('cardBarcode is required');
  }

  return normalized;
}

function normalizeReceiptWeekStart(value: string): string {
  const normalized = value.trim();
  if (!normalized) {
    throw new BadRequestException('receiptWeekStart is required');
  }

  return normalized;
}

function parseYmdDate(value: string): Date {
  const normalized = normalizeReceiptWeekStart(value);
  const parsed = new Date(`${normalized}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw new BadRequestException('receiptWeekStart must be a valid date');
  }

  return parsed;
}

function parseDate(value: string, fieldName: string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException(`${fieldName} must be a valid date-time`);
  }

  return date;
}

function formatYmd(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function deriveReceiptWeekStart(
  occurredAt: Date,
  timeZone: string,
  receiptWeekStartDay: number,
): Date {
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
  const deltaDays = (7 + localWeekday - receiptWeekStartDay) % 7;

  return new Date(Date.UTC(year, month - 1, day - deltaDays));
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

function isUniqueConstraintError(error: unknown): boolean {
  return Boolean(
    error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code?: string }).code === 'P2002',
  );
}
