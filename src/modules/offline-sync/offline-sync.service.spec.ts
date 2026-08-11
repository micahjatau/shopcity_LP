import { createHash } from 'node:crypto';
import { UserRole } from '@prisma/client';
import { OfflineSyncService } from './offline-sync.service';
import type { AuthContext } from '../../common/auth/session.types';

describe('OfflineSyncService', () => {
  it('returns follower processing state without mutating the canonical attempt', async () => {
    const tenantId = 'tenant-1';
    const deviceId = 'device-1';
    const localId = 'local-1';
    const record = {
      localId,
      idempotencyKey: 'key-1',
      cashierId: 'cashier-1',
      branchId: 'branch-1',
      cardBarcode: 'CARD-1',
      receiptNumber: 'POS-1',
      receiptWeekStart: '2026-08-10',
      purchaseAmountKobo: 1_000_000,
      occurredAtLocal: '2026-08-10T10:00:00.000Z',
    };
    const requestHash = hashRequest({
      tenantId,
      deviceId,
      localId,
      idempotencyKey: record.idempotencyKey,
      cashierId: record.cashierId,
      branchId: record.branchId,
      cardBarcode: record.cardBarcode,
      receiptNumber: record.receiptNumber,
      receiptWeekStart: record.receiptWeekStart,
      purchaseAmountKobo: record.purchaseAmountKobo,
      occurredAtLocal: record.occurredAtLocal,
    });
    const findUnique = jest.fn().mockResolvedValue({
      tenantId,
      deviceId,
      localId,
      requestHash,
      responseJson: null,
    });
    const update = jest.fn();
    const prisma = {
      offlineSyncAttempt: {
        findUnique,
        update,
      },
    };
    const service = new OfflineSyncService(
      prisma as never,
      { earn: jest.fn() } as never,
      { get: jest.fn() } as never,
    );

    const response = await service.earnBatch(tenantId, actor(deviceId), {
      deviceId,
      records: [record],
    });

    expect(response.records[0]).toMatchObject({
      status: 'RETRYABLE',
      errorCode: 'SYNC_RECORD_PROCESSING',
      retryable: true,
    });
    expect(update).not.toHaveBeenCalled();
  });
});

function actor(deviceId: string): AuthContext {
  return {
    session: {
      id: 'session-1',
      tenantId: 'tenant-1',
      userId: 'cashier-1',
      deviceId,
      expiresAt: new Date('2026-08-11T10:00:00.000Z'),
    },
    user: {
      id: 'cashier-1',
      tenantId: 'tenant-1',
      branchId: 'branch-1',
      username: 'cashier@example.test',
      role: UserRole.CASHIER,
      status: 'ACTIVE',
    },
  } as unknown as AuthContext;
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
