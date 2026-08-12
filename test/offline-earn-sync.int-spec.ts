import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { UserRole } from '@prisma/client';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { AuditService } from '../src/modules/audit/audit.service';
import { LoyaltyService } from '../src/modules/loyalty/loyalty.service';
import { OfflineSyncService } from '../src/modules/offline-sync/offline-sync.service';
import type { AuthContext } from '../src/common/auth/session.types';
import { PrismaService } from '../src/database/prisma.service';
import { createAttestedDeviceData } from './support/device-attestation';

const DEFAULT_POLICY = {
  OFFLINE_SYNC_MAX_RECORDS: 100,
  OFFLINE_EARN_MAX_AGE_HOURS: 72,
  DEFAULT_EARN_RATE_BPS: 200,
  PURCHASE_FLAG_THRESHOLD_KOBO: 10_000_000,
  PURCHASE_APPROVAL_THRESHOLD_KOBO: 20_000_000,
  PURCHASE_AMOUNT_CEILING_KOBO: 100_000_000,
};

describe('offline earn sync foundation (int)', () => {
  let pgContainer: Awaited<ReturnType<PostgreSqlContainer['start']>>;
  let prisma: PrismaService;
  let offlineSyncService: OfflineSyncService;
  let loyaltyService: LoyaltyService;
  let tenant: { id: string };
  let branch: { id: string };
  let cashier: Awaited<ReturnType<typeof createStaffUser>>;
  let configValues: Record<string, number>;

  beforeAll(async () => {
    pgContainer = await new PostgreSqlContainer('postgres:16-alpine').start();
    const databaseUrl = pgContainer.getConnectionUri();

    execSync('npx prisma migrate deploy', {
      stdio: 'inherit',
      env: {
        ...process.env,
        DATABASE_URL: databaseUrl,
      },
    });

    process.env.DATABASE_URL = databaseUrl;

    prisma = new PrismaService();
    await prisma.$connect();

    tenant = await prisma.tenant.create({
      data: { id: randomUUID(), name: 'Offline Tenant', status: 'ACTIVE' },
    });
    branch = await prisma.branch.create({
      data: {
        id: randomUUID(),
        tenantId: tenant.id,
        name: 'Offline Branch',
        timezone: 'Africa/Lagos',
        receiptWeekStartDay: 1,
        status: 'ACTIVE',
      },
    });
    cashier = await createStaffUser(
      prisma,
      tenant.id,
      branch.id,
      UserRole.CASHIER,
      'cashier@offline.local',
    );

    configValues = { ...DEFAULT_POLICY };
    const configService = { get: (key: string) => configValues[key] } as never;
    const auditService = new AuditService(prisma);
    loyaltyService = new LoyaltyService(prisma, auditService, configService);
    offlineSyncService = new OfflineSyncService(
      prisma,
      loyaltyService,
      configService,
    );
  }, 120000);

  afterAll(async () => {
    await prisma?.$disconnect();
    await pgContainer?.stop();
  }, 120000);

  it('confirms an offline earn and replays the exact original response', async () => {
    const fixture = await createOfflineFixture(
      prisma,
      tenant.id,
      branch.id,
      cashier.id,
      'POS-OFFLINE-0001',
    );
    const request = buildOfflineRequest(fixture, 1_000_000);

    const first = await offlineSyncService.earnBatch(
      tenant.id,
      fixture.actor,
      request,
    );
    const replay = await offlineSyncService.earnBatch(
      tenant.id,
      fixture.actor,
      request,
    );

    expect(replay).toEqual(first);
    expect(first.records[0]).toMatchObject({
      localId: request.records[0].localId,
      status: 'CONFIRMED',
      creditEarnedKobo: 20_000,
      retryable: false,
    });

    const firstRecord = request.records[0];
    if (!firstRecord) {
      throw new Error('Offline request must contain a record');
    }

    const counts = await Promise.all([
      prisma.receipt.count({
        where: {
          tenantId: tenant.id,
          posReceiptNumber: firstRecord.receiptNumber,
        },
      }),
      prisma.loyaltyLedgerEntry.count({
        where: {
          tenantId: tenant.id,
          receipt: { posReceiptNumber: firstRecord.receiptNumber },
        },
      }),
      prisma.creditLot.count({
        where: { tenantId: tenant.id, customerId: fixture.customer.id },
      }),
      prisma.outboxEvent.count({
        where: {
          tenantId: tenant.id,
          aggregateType: 'receipt',
          eventType: 'sms.send',
        },
      }),
      prisma.offlineSyncAttempt.count({
        where: { tenantId: tenant.id, localId: firstRecord.localId },
      }),
    ]);

    expect(counts).toEqual([1, 1, 1, 1, 1]);
  }, 120000);

  it('rejects a changed payload for the same local record without mutating the original replay', async () => {
    const fixture = await createOfflineFixture(
      prisma,
      tenant.id,
      branch.id,
      cashier.id,
      'POS-OFFLINE-0002',
    );
    const request = buildOfflineRequest(fixture, 1_000_000);
    const first = await offlineSyncService.earnBatch(
      tenant.id,
      fixture.actor,
      request,
    );

    const firstRecord = request.records[0];
    if (!firstRecord) {
      throw new Error('Offline request must contain a record');
    }

    const changed = {
      ...request,
      records: [{ ...firstRecord, purchaseAmountKobo: 1_000_001 }],
    };

    const conflict = await offlineSyncService.earnBatch(
      tenant.id,
      fixture.actor,
      changed,
    );
    expect(conflict.records[0]).toMatchObject({
      localId: firstRecord.localId,
      status: 'REJECTED',
      errorCode: 'SYNC_RECORD_CONFLICT',
      retryable: false,
    });

    const replay = await offlineSyncService.earnBatch(
      tenant.id,
      fixture.actor,
      request,
    );
    expect(replay).toEqual(first);
    expect(replay.records[0]).toMatchObject({
      status: 'CONFIRMED',
      transactionId: first.records[0]?.transactionId,
      approvalId: null,
      errorCode: null,
      retryable: false,
    });
  }, 120000);

  it('keeps valid neighbors in a mixed batch', async () => {
    const firstFixture = await createOfflineFixture(
      prisma,
      tenant.id,
      branch.id,
      cashier.id,
      'POS-OFFLINE-0003',
    );
    const secondFixture = await createOfflineFixture(
      prisma,
      tenant.id,
      branch.id,
      cashier.id,
      'POS-OFFLINE-0004',
      { weekMismatch: true },
    );

    const response = await offlineSyncService.earnBatch(
      tenant.id,
      firstFixture.actor,
      {
        deviceId: firstFixture.device.id,
        records: [
          buildOfflineRecord(firstFixture, 1_000_000),
          buildOfflineRecord(secondFixture, 1_000_000),
        ],
      },
    );

    expect(response.records[0]).toMatchObject({
      status: 'CONFIRMED',
      errorCode: null,
    });
    expect(response.records[1]).toMatchObject({
      status: 'REJECTED',
      errorCode: 'SYNC_WEEK_MISMATCH',
    });

    const firstRecord = buildOfflineRecord(firstFixture, 1_000_000);
    expect(
      await prisma.receipt.count({
        where: {
          tenantId: tenant.id,
          posReceiptNumber: firstRecord.receiptNumber,
        },
      }),
    ).toBe(1);
    expect(
      await prisma.loyaltyLedgerEntry.count({
        where: {
          tenantId: tenant.id,
          receipt: { posReceiptNumber: firstRecord.receiptNumber },
        },
      }),
    ).toBe(1);
  }, 120000);

  it('creates pending approval without ledger or lot effects', async () => {
    const fixture = await createOfflineFixture(
      prisma,
      tenant.id,
      branch.id,
      cashier.id,
      'POS-OFFLINE-0005',
    );

    const response = await offlineSyncService.earnBatch(
      tenant.id,
      fixture.actor,
      {
        deviceId: fixture.device.id,
        records: [buildOfflineRecord(fixture, 21_000_000)],
      },
    );

    const pendingRecord = response.records[0];
    expect(pendingRecord).toMatchObject({
      status: 'PENDING_APPROVAL',
      transactionId: null,
      creditEarnedKobo: null,
      retryable: false,
    });
    expect(typeof pendingRecord?.approvalId).toBe('string');

    const firstRecord = buildOfflineRecord(fixture, 21_000_000);
    const receipt = await prisma.receipt.findFirstOrThrow({
      where: {
        tenantId: tenant.id,
        posReceiptNumber: firstRecord.receiptNumber,
      },
    });

    const [receipts, ledgers, lots, approvals, smsMessages] = await Promise.all(
      [
        prisma.receipt.count({
          where: { tenantId: tenant.id, id: receipt.id },
        }),
        prisma.loyaltyLedgerEntry.count({
          where: { tenantId: tenant.id, receiptId: receipt.id },
        }),
        prisma.creditLot.count({
          where: { tenantId: tenant.id, customerId: fixture.customer.id },
        }),
        prisma.approval.count({
          where: { tenantId: tenant.id, receiptId: receipt.id },
        }),
        prisma.smsMessage.count({
          where: { tenantId: tenant.id, receiptId: receipt.id },
        }),
      ],
    );

    expect(receipts).toBe(1);
    expect(ledgers).toBe(0);
    expect(lots).toBe(0);
    expect(approvals).toBe(1);
    expect(smsMessages).toBe(0);
  }, 120000);

  it('rejects invalid offline earn boundaries without confirming any financial effect', async () => {
    const cases = [
      {
        name: 'actor mismatch',
        setup: async () => {
          const fixture = await createOfflineFixture(
            prisma,
            tenant.id,
            branch.id,
            cashier.id,
            'POS-OFFLINE-0006',
          );
          return {
            fixture,
            actor: makeContext(
              {
                id: cashier.id,
                tenantId: tenant.id,
                branchId: branch.id,
                role: UserRole.SUPERVISOR,
              },
              fixture.device.id,
            ),
            request: buildOfflineRequest(fixture, 1_000_000),
            expectedCode: 'SYNC_ACTOR_MISMATCH',
            expectReject: true,
          };
        },
      },
      {
        name: 'expired record',
        setup: async () => {
          const fixture = await createOfflineFixture(
            prisma,
            tenant.id,
            branch.id,
            cashier.id,
            'POS-OFFLINE-0007',
          );
          const request = buildOfflineRequest(fixture, 1_000_000);
          const record = request.records[0];
          if (!record) {
            throw new Error('Offline request must contain a record');
          }
          record.occurredAtLocal = '2020-01-01T00:00:00.000Z';
          return {
            fixture,
            actor: fixture.actor,
            request,
            expectedCode: 'SYNC_RECORD_EXPIRED',
            expectReject: false,
          };
        },
      },
      {
        name: 'device mismatch',
        setup: async () => {
          const fixture = await createOfflineFixture(
            prisma,
            tenant.id,
            branch.id,
            cashier.id,
            'POS-OFFLINE-0008',
          );
          return {
            fixture,
            actor: fixture.actor,
            request: {
              ...buildOfflineRequest(fixture, 1_000_000),
              deviceId: randomUUID(),
            },
            expectedCode: 'SYNC_DEVICE_MISMATCH',
            expectReject: true,
          };
        },
      },
      {
        name: 'branch mismatch',
        setup: async () => {
          const fixture = await createOfflineFixture(
            prisma,
            tenant.id,
            branch.id,
            cashier.id,
            'POS-OFFLINE-0009',
          );
          const request = buildOfflineRequest(fixture, 1_000_000);
          const record = request.records[0];
          if (!record) {
            throw new Error('Offline request must contain a record');
          }
          record.branchId = randomUUID();
          return {
            fixture,
            actor: fixture.actor,
            request,
            expectedCode: 'SYNC_BRANCH_MISMATCH',
            expectReject: false,
          };
        },
      },
      {
        name: 'card inactive',
        setup: async () => {
          const fixture = await createOfflineFixture(
            prisma,
            tenant.id,
            branch.id,
            cashier.id,
            'POS-OFFLINE-0010',
          );
          await prisma.card.update({
            where: {
              tenantId_id: {
                tenantId: tenant.id,
                id: fixture.card.id,
              },
            },
            data: { status: 'BLOCKED' },
          });
          return {
            fixture,
            actor: fixture.actor,
            request: buildOfflineRequest(fixture, 1_000_000),
            expectedCode: 'CARD_INACTIVE',
            expectReject: false,
          };
        },
      },
      {
        name: 'staff ineligible',
        setup: async () => {
          const fixture = await createOfflineFixture(
            prisma,
            tenant.id,
            branch.id,
            cashier.id,
            'POS-OFFLINE-0011',
          );
          await prisma.customer.update({
            where: {
              tenantId_id: {
                tenantId: tenant.id,
                id: fixture.customer.id,
              },
            },
            data: { isStaff: true },
          });
          return {
            fixture,
            actor: fixture.actor,
            request: buildOfflineRequest(fixture, 1_000_000),
            expectedCode: 'STAFF_INELIGIBLE',
            expectReject: false,
          };
        },
      },
    ] as const;

    for (const testCase of cases) {
      const { actor, request, expectedCode, expectReject } =
        await testCase.setup();
      const beforeCounts = await Promise.all([
        prisma.receipt.count({ where: { tenantId: tenant.id } }),
        prisma.loyaltyLedgerEntry.count({ where: { tenantId: tenant.id } }),
      ]);

      if (expectReject) {
        await expect(
          offlineSyncService.earnBatch(tenant.id, actor, request),
        ).rejects.toMatchObject({ response: { code: expectedCode } });
      } else {
        const response = await offlineSyncService.earnBatch(
          tenant.id,
          actor,
          request,
        );
        expect(response.records[0]).toMatchObject({
          status: 'REJECTED',
          errorCode: expectedCode,
          retryable: false,
        });
      }

      const afterCounts = await Promise.all([
        prisma.receipt.count({ where: { tenantId: tenant.id } }),
        prisma.loyaltyLedgerEntry.count({ where: { tenantId: tenant.id } }),
      ]);

      expect(afterCounts).toEqual(beforeCounts);
    }
  }, 120000);

  it('rejects an offline duplicate after the receipt was captured online', async () => {
    const fixture = await createOfflineFixture(
      prisma,
      tenant.id,
      branch.id,
      cashier.id,
      'POS-OFFLINE-0012',
    );
    const request = buildOfflineRequest(fixture, 1_000_000);
    const offlineRecord = request.records[0];
    if (!offlineRecord) {
      throw new Error('Offline request must contain a record');
    }

    await loyaltyService.earn(tenant.id, fixture.actor, randomUUID(), {
      posReceiptNumber: offlineRecord.receiptNumber,
      cardSerialNumber: fixture.card.barcodeValue,
      purchaseAmountKobo: 1_000_000,
      occurredAt: offlineRecord.occurredAtLocal,
    });

    const response = await offlineSyncService.earnBatch(
      tenant.id,
      fixture.actor,
      request,
    );

    expect(response.records[0]).toMatchObject({
      status: 'REJECTED',
      errorCode: 'RECEIPT_ALREADY_USED',
      retryable: false,
    });
    expect(
      await prisma.receipt.count({
        where: {
          tenantId: tenant.id,
          posReceiptNumber: offlineRecord.receiptNumber,
        },
      }),
    ).toBe(1);
    expect(
      await prisma.loyaltyLedgerEntry.count({
        where: {
          tenantId: tenant.id,
          receipt: { posReceiptNumber: offlineRecord.receiptNumber },
        },
      }),
    ).toBe(1);
  }, 120000);

  it('rejects an online duplicate after the receipt was captured offline', async () => {
    const fixture = await createOfflineFixture(
      prisma,
      tenant.id,
      branch.id,
      cashier.id,
      'POS-OFFLINE-0013',
    );
    const request = buildOfflineRequest(fixture, 1_000_000);
    const offlineRecord = request.records[0];
    if (!offlineRecord) {
      throw new Error('Offline request must contain a record');
    }

    const offlineResponse = await offlineSyncService.earnBatch(
      tenant.id,
      fixture.actor,
      request,
    );
    expect(offlineResponse.records[0]).toMatchObject({ status: 'CONFIRMED' });

    await expect(
      loyaltyService.earn(tenant.id, fixture.actor, randomUUID(), {
        posReceiptNumber: offlineRecord.receiptNumber,
        cardSerialNumber: fixture.card.barcodeValue,
        purchaseAmountKobo: 1_000_000,
        occurredAt: offlineRecord.occurredAtLocal,
      }),
    ).rejects.toMatchObject({
      response: { code: 'RECEIPT_ALREADY_USED' },
    });

    await expectSingleFinancialEffect(
      offlineRecord.receiptNumber,
      fixture.customer.id,
    );
  }, 120000);

  it('keeps one financial effect for concurrent online/offline duplicate submissions', async () => {
    const fixture = await createOfflineFixture(
      prisma,
      tenant.id,
      branch.id,
      cashier.id,
      'POS-OFFLINE-0014',
    );
    const request = buildOfflineRequest(fixture, 1_000_000);
    const offlineRecord = request.records[0];
    if (!offlineRecord) {
      throw new Error('Offline request must contain a record');
    }

    const settled = await Promise.allSettled([
      loyaltyService.earn(tenant.id, fixture.actor, randomUUID(), {
        posReceiptNumber: offlineRecord.receiptNumber,
        cardSerialNumber: fixture.card.barcodeValue,
        purchaseAmountKobo: 1_000_000,
        occurredAt: offlineRecord.occurredAtLocal,
      }),
      offlineSyncService.earnBatch(tenant.id, fixture.actor, request),
    ]);

    expectRecognizedOnlineOfflineRaceOutcome(settled);

    await expectSingleFinancialEffect(
      offlineRecord.receiptNumber,
      fixture.customer.id,
    );
  }, 120000);

  it('keeps one financial effect for concurrent distinct offline duplicate submissions', async () => {
    const fixture = await createOfflineFixture(
      prisma,
      tenant.id,
      branch.id,
      cashier.id,
      'POS-OFFLINE-0015',
    );
    const first = buildOfflineRequest(fixture, 1_000_000);
    const firstRecord = first.records[0];
    if (!firstRecord) {
      throw new Error('Offline request must contain a record');
    }
    const second = {
      ...first,
      records: [
        {
          ...firstRecord,
          localId: randomUUID(),
          idempotencyKey: randomUUID(),
        },
      ],
    };

    const settled = await Promise.allSettled([
      offlineSyncService.earnBatch(tenant.id, fixture.actor, first),
      offlineSyncService.earnBatch(tenant.id, fixture.actor, second),
    ]);

    expectRecognizedDistinctOfflineRaceOutcome(settled);

    await expectSingleFinancialEffect(
      firstRecord.receiptNumber,
      fixture.customer.id,
    );
  }, 120000);

  it('keeps one financial effect for concurrent offline duplicate submissions', async () => {
    const fixture = await createOfflineFixture(
      prisma,
      tenant.id,
      branch.id,
      cashier.id,
      'POS-OFFLINE-0016',
    );
    const request = buildOfflineRequest(fixture, 1_000_000);
    const [first, second] = await Promise.all([
      offlineSyncService.earnBatch(tenant.id, fixture.actor, request),
      offlineSyncService.earnBatch(tenant.id, fixture.actor, request),
    ]);

    expect(first.records[0]).toMatchObject({ status: 'CONFIRMED' });
    expect(second.records[0]).toMatchObject({ status: 'CONFIRMED' });
    expect(first).toEqual(second);
    const record = request.records[0];
    if (!record) {
      throw new Error('Offline request must contain a record');
    }

    expect(
      await prisma.receipt.count({
        where: {
          tenantId: tenant.id,
          posReceiptNumber: record.receiptNumber,
        },
      }),
    ).toBe(1);
    expect(
      await prisma.loyaltyLedgerEntry.count({
        where: {
          tenantId: tenant.id,
          receipt: { posReceiptNumber: record.receiptNumber },
        },
      }),
    ).toBe(1);
  }, 120000);

  async function expectSingleFinancialEffect(
    receiptNumber: string,
    customerId: string,
  ): Promise<void> {
    const [receiptCount, ledgerCount, lotCount] = await Promise.all([
      prisma.receipt.count({
        where: { tenantId: tenant.id, posReceiptNumber: receiptNumber },
      }),
      prisma.loyaltyLedgerEntry.count({
        where: {
          tenantId: tenant.id,
          receipt: { posReceiptNumber: receiptNumber },
        },
      }),
      prisma.creditLot.count({ where: { tenantId: tenant.id, customerId } }),
    ]);

    expect(receiptCount).toBe(1);
    expect(ledgerCount).toBe(1);
    expect(lotCount).toBe(1);
  }
});

function expectRecognizedOnlineOfflineRaceOutcome(
  settled: [
    PromiseSettledResult<unknown>,
    PromiseSettledResult<{
      records: Array<{ status: string; errorCode: string | null }>;
    }>,
  ],
): void {
  const [onlineResult, offlineResult] = settled;

  if (onlineResult.status === 'fulfilled') {
    expect(offlineResult.status).toBe('fulfilled');
    if (offlineResult.status !== 'fulfilled') {
      throw offlineResult.reason;
    }

    expect(offlineResult.value.records[0]).toMatchObject({
      status: 'REJECTED',
      errorCode: 'RECEIPT_ALREADY_USED',
      retryable: false,
    });
    return;
  }

  expect(readErrorCode(onlineResult.reason)).toBe('RECEIPT_ALREADY_USED');
  expect(offlineResult.status).toBe('fulfilled');
  if (offlineResult.status !== 'fulfilled') {
    throw offlineResult.reason;
  }

  expect(offlineResult.value.records[0]).toMatchObject({
    status: 'CONFIRMED',
    errorCode: null,
    retryable: false,
  });
}

function expectRecognizedDistinctOfflineRaceOutcome(
  settled: [
    PromiseSettledResult<{
      records: Array<{
        status: string;
        errorCode: string | null;
        retryable?: boolean;
      }>;
    }>,
    PromiseSettledResult<{
      records: Array<{
        status: string;
        errorCode: string | null;
        retryable?: boolean;
      }>;
    }>,
  ],
): void {
  const outcomes = settled.map((result) => {
    if (result.status !== 'fulfilled') {
      throw result.reason;
    }

    return result.value.records[0];
  });

  const confirmed = outcomes.filter((record) => record?.status === 'CONFIRMED');
  const rejectedDuplicates = outcomes.filter(
    (record) =>
      record?.status === 'REJECTED' &&
      record.errorCode === 'RECEIPT_ALREADY_USED' &&
      record.retryable === false,
  );

  expect(confirmed).toHaveLength(1);
  expect(rejectedDuplicates).toHaveLength(1);
}

function readErrorCode(error: unknown): string | null {
  if (!error || typeof error !== 'object' || !('response' in error)) {
    return null;
  }

  const response = (error as { response?: unknown }).response;
  if (!response || typeof response !== 'object' || !('code' in response)) {
    return null;
  }

  return typeof (response as { code?: unknown }).code === 'string'
    ? ((response as { code: string }).code ?? null)
    : null;
}

async function createStaffUser(
  prisma: PrismaService,
  tenantId: string,
  branchId: string,
  role: UserRole,
  username: string,
) {
  return prisma.user.create({
    data: {
      id: randomUUID(),
      tenantId,
      branchId,
      username,
      role,
      status: 'ACTIVE',
    },
  });
}

async function createOfflineFixture(
  prisma: PrismaService,
  tenantId: string,
  branchId: string,
  cashierId: string,
  receiptNumber: string,
  options: { weekMismatch?: boolean } = {},
) {
  const device = await prisma.device.create({
    data: createAttestedDeviceData({
      id: randomUUID(),
      tenantId,
      branchId,
      name: `Device-${receiptNumber}`,
      fingerprintHash: `fingerprint-${receiptNumber}`,
      status: 'ACTIVE',
    }),
  });

  const customer = await prisma.customer.create({
    data: {
      id: randomUUID(),
      tenantId,
      branchId,
      fullName: `Customer ${receiptNumber}`,
      phoneE164: `+23480123${Math.floor(Math.random() * 1_000_000)
        .toString()
        .padStart(6, '0')}`,
      isStaff: false,
      status: 'ACTIVE',
      registeredByTenantId: tenantId,
      registeredBy: cashierId,
    },
  });

  const card = await prisma.card.create({
    data: {
      id: randomUUID(),
      tenantId,
      customerId: customer.id,
      barcodeValue: `CARD-${receiptNumber}`,
      status: 'ACTIVE',
      issuedByTenantId: tenantId,
      issuedBy: cashierId,
    },
  });

  const actor = makeContext(
    { id: cashierId, tenantId, branchId, role: UserRole.CASHIER },
    device.id,
  );

  return {
    device,
    customer,
    card,
    actor,
    weekMismatch: options.weekMismatch ?? false,
  };
}

function buildOfflineRequest(
  fixture: Awaited<ReturnType<typeof createOfflineFixture>>,
  purchaseAmountKobo: number,
) {
  return {
    deviceId: fixture.device.id,
    records: [buildOfflineRecord(fixture, purchaseAmountKobo)],
  };
}

function buildOfflineRecord(
  fixture: Awaited<ReturnType<typeof createOfflineFixture>>,
  purchaseAmountKobo: number,
) {
  const occurredAt = recentOccurredAt();
  const derivedWeekStart = formatYmd(
    deriveReceiptWeekStart(new Date(occurredAt), 'Africa/Lagos', 1),
  );

  return {
    localId: randomUUID(),
    idempotencyKey: randomUUID(),
    cashierId: fixture.actor.user.id,
    branchId: fixture.actor.user.branchId!,
    cardBarcode: fixture.card.barcodeValue,
    receiptNumber: `POS-${fixture.card.barcodeValue}`,
    receiptWeekStart: fixture.weekMismatch ? '2026-01-01' : derivedWeekStart,
    purchaseAmountKobo,
    occurredAtLocal: occurredAt,
  };
}

function makeContext(
  user: {
    id: string;
    tenantId: string;
    branchId: string | null;
    role: UserRole;
  },
  deviceId?: string,
): AuthContext {
  const now = new Date();
  return {
    session: {
      id: randomUUID(),
      userId: user.id,
      deviceId: deviceId ?? null,
      sessionTokenHash: 'session-token-hash',
      csrfTokenHash: 'csrf-token-hash',
      status: 'ACTIVE',
      expiresAt: new Date(now.getTime() + 60 * 60 * 1000),
      revokedAt: null,
      lastUsedAt: now,
      createdAt: now,
      updatedAt: now,
    },
    user: {
      id: user.id,
      tenantId: user.tenantId,
      branchId: user.branchId,
      username: `${user.role.toLowerCase()}@offline.local`,
      role: user.role,
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
      lastLoginAt: now,
      supabaseAuthId: null,
      tenant: null,
      branch: null,
    },
  };
}

function recentOccurredAt(): string {
  return new Date(Date.now() - 60_000).toISOString();
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
  const localDate = new Date(Date.UTC(year, month - 1, day));
  const localWeekday = localDate.getUTCDay();
  const deltaDays = (7 + localWeekday - receiptWeekStartDay) % 7;

  return new Date(Date.UTC(year, month - 1, day - deltaDays));
}

function formatYmd(value: Date): string {
  return value.toISOString().slice(0, 10);
}
