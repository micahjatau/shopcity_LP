import { execSync } from 'node:child_process';
import { createHmac, randomUUID } from 'node:crypto';
import {
  CardStatus,
  CustomerStatus,
  DeviceStatus,
  PrismaClient,
  UserRole,
} from '@prisma/client';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import request from 'supertest';
import type { SignInWithPasswordCredentials } from '@supabase/supabase-js';
import { seedFoundation } from '../prisma/seed';
import {
  createRedisTestEnvironment,
  type RedisTestEnvironment,
} from './support/redis-testcontainer';
import type { INestApplication } from '@nestjs/common';

let prisma: PrismaClient;
let app: INestApplication;
let httpServer: Parameters<typeof request>[0];
let seedData: Awaited<ReturnType<typeof seedFoundation>>;
let cashierTwo: {
  id: string;
  tenantId: string;
  branchId: string | null;
  username: string;
  supabaseAuthId: string | null;
};
let branchlessAdmin: {
  id: string;
  tenantId: string;
  branchId: string | null;
  username: string;
  supabaseAuthId: string | null;
};

describe('receipt capture flows (int)', () => {
  let pgContainer: Awaited<ReturnType<PostgreSqlContainer['start']>>;
  let redisEnv: RedisTestEnvironment;
  let createAppFn: (options?: {
    enableDocs?: boolean;
  }) => Promise<INestApplication>;
  let SupabaseServiceToken: typeof import('../src/supabase/supabase.service').SupabaseService;

  beforeAll(async () => {
    pgContainer = await new PostgreSqlContainer('postgres:16-alpine').start();
    redisEnv = await createRedisTestEnvironment();

    const databaseUrl = pgContainer.getConnectionUri();

    execSync('npx prisma migrate deploy', {
      stdio: 'inherit',
      env: {
        ...process.env,
        DATABASE_URL: databaseUrl,
      },
    });

    process.env.DATABASE_URL = databaseUrl;
    process.env.REDIS_URL = redisEnv.redisUrl;
    process.env.SESSION_SECRET = 'session-secret';
    process.env.CSRF_SECRET = 'csrf-secret';
    process.env.SUPABASE_URL = 'http://127.0.0.1:54321';
    process.env.SUPABASE_ANON_KEY = 'test-anon-key';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';

    jest.resetModules();
    const supabaseModule = jest.requireActual<
      typeof import('../src/supabase/supabase.service')
    >('../src/supabase/supabase.service');
    SupabaseServiceToken = supabaseModule.SupabaseService;
    const bootstrap =
      jest.requireActual<typeof import('../src/bootstrap')>('../src/bootstrap');
    createAppFn = bootstrap.createApp;

    prisma = new PrismaClient({
      datasources: { db: { url: databaseUrl } },
    });
    await prisma.$connect();

    const supabaseAuthId = 'seed-admin-supabase-user';
    seedData = await seedFoundation(prisma, {
      supabaseAdminClient: createSupabaseAdminStub(supabaseAuthId),
      adminPassword: 'password',
    });

    cashierTwo = await prisma.user.create({
      data: {
        tenantId: seedData.tenant.id,
        branchId: seedData.branch.id,
        username: 'cashier.two@shopcity.local',
        supabaseAuthId: 'seed-cashier-two-supabase-user',
        role: UserRole.CASHIER,
        status: 'ACTIVE',
      },
    });

    branchlessAdmin = await prisma.user.create({
      data: {
        tenantId: seedData.tenant.id,
        branchId: null,
        username: 'admin.branchless@shopcity.local',
        supabaseAuthId: 'seed-branchless-admin-supabase-user',
        role: UserRole.ADMIN,
        status: 'ACTIVE',
      },
    });

    app = await createAppFn({ enableDocs: false });
    await (
      app.getHttpAdapter().getInstance() as {
        ready: () => Promise<void>;
      }
    ).ready();
    httpServer = app.getHttpServer() as Parameters<typeof request>[0];

    const supabaseService = app.get(SupabaseServiceToken);
    const authIds: Record<string, string> = {
      [seedData.user.username]: seedData.user.supabaseAuthId,
      [cashierTwo.username]: cashierTwo.supabaseAuthId!,
      [branchlessAdmin.username]: branchlessAdmin.supabaseAuthId!,
    };
    jest
      .spyOn(supabaseService.publicClient.auth, 'signInWithPassword')
      .mockImplementation((credentials: SignInWithPasswordCredentials) => {
        const email = 'email' in credentials ? credentials.email : undefined;
        const userId = email ? authIds[email] : undefined;
        if (!userId) {
          return {
            data: { user: null },
            error: new Error('Invalid credentials'),
          } as never;
        }

        return {
          data: { user: { id: userId }, session: null },
          error: null,
        } as never;
      });
  }, 120000);

  beforeEach(async () => {
    await redisEnv.flushDb();
  });

  afterAll(async () => {
    await app?.close();
    await prisma?.$disconnect();
    await redisEnv?.close();
    await pgContainer?.stop();
  }, 120000);

  it('captures and replays the same receipt for the same idempotency key', async () => {
    const { authHeaders, body, card, device } = await prepareReceiptFixture({
      customerSuffix: '01',
      cardSerialNumber: 'SC-1001',
      deviceName: 'POS-1',
      fingerprintHash: 'device-fingerprint-1',
      posReceiptNumber: 'POS-1001',
      occurredAt: recentOccurredAt(),
    });

    const firstResponse = await postReceipt(
      body,
      authHeaders,
      'receipt-key-1',
    ).expect(201);
    const replayResponse = await postReceipt(
      body,
      authHeaders,
      'receipt-key-1',
    ).expect(201);

    const firstBody = firstResponse.body as ReceiptResponseBody;
    const replayBody = replayResponse.body as ReceiptResponseBody;

    expect(firstBody.data).toMatchObject({
      branchId: seedData.branch.id,
      customerId: card.customerId,
      cardSerialNumber: card.barcodeValue,
      deviceId: device.id,
      posReceiptNumber: 'POS-1001',
      purchaseAmountKobo: 1000000,
      status: 'CAPTURED',
    });
    expect(replayBody.data).toEqual(firstBody.data);

    const receiptCount = await prisma.receipt.count({
      where: { tenantId: seedData.tenant.id },
    });
    const idempotencyCount = await prisma.idempotencyRecord.count({
      where: { actorId: seedData.user.id },
    });

    expect(receiptCount).toBe(1);
    expect(idempotencyCount).toBe(1);
  }, 120000);

  it('rejects the same receipt when idempotency keys differ', async () => {
    const { authHeaders, body } = await prepareReceiptFixture({
      customerSuffix: '02',
      cardSerialNumber: 'SC-1002',
      deviceName: 'POS-2',
      fingerprintHash: 'device-fingerprint-2',
      posReceiptNumber: 'POS-1002',
      occurredAt: recentOccurredAt(),
    });

    await postReceipt(body, authHeaders, 'receipt-key-2').expect(201);
    await postReceipt(body, authHeaders, 'receipt-key-3').expect(409);
  }, 120000);

  it('rejects the same receipt when a different cashier submits it', async () => {
    const { authHeaders: adminHeaders, body } = await prepareReceiptFixture({
      customerSuffix: '03',
      cardSerialNumber: 'SC-1003',
      deviceName: 'POS-3',
      fingerprintHash: 'device-fingerprint-3',
      posReceiptNumber: 'POS-1003',
      occurredAt: new Date(Date.now() - 60_000).toISOString(),
    });
    const cashierDevice = await prisma.device.create({
      data: {
        tenantId: seedData.tenant.id,
        branchId: seedData.branch.id,
        name: 'POS-cashier-two',
        fingerprintHash: 'device-fingerprint-cashier-two',
        status: DeviceStatus.ACTIVE,
      },
    });
    const cashierHeaders = await loginAs(cashierTwo.username, cashierDevice.id);

    await postReceipt(body, adminHeaders, 'receipt-key-4').expect(201);
    await postReceipt(body, cashierHeaders, 'receipt-key-5').expect(409);
  }, 120000);

  it('serializes concurrent captures of the same physical receipt', async () => {
    const { authHeaders, body } = await prepareReceiptFixture({
      customerSuffix: '03a',
      cardSerialNumber: 'SC-1003A',
      deviceName: 'POS-3A',
      fingerprintHash: 'device-fingerprint-3a',
      posReceiptNumber: 'POS-1003A',
      occurredAt: recentOccurredAt(),
    });

    const [firstStatus, secondStatus] = await Promise.all([
      postReceipt(body, authHeaders, 'receipt-key-4a').then(
        (response) => response.status,
      ),
      postReceipt(body, authHeaders, 'receipt-key-4b').then(
        (response) => response.status,
      ),
    ]);

    expect([firstStatus, secondStatus].sort()).toEqual([201, 409]);

    const receiptCount = await prisma.receipt.count({
      where: {
        tenantId: seedData.tenant.id,
        normalizedPosReceiptNumber: 'POS-1003A',
      },
    });

    expect(receiptCount).toBe(1);
  }, 120000);

  it('rejects the same receipt when a different card is used', async () => {
    const fixture = await prepareReceiptFixture({
      customerSuffix: '04',
      cardSerialNumber: 'SC-1004A',
      deviceName: 'POS-4',
      fingerprintHash: 'device-fingerprint-4',
      posReceiptNumber: 'POS-1004',
      occurredAt: recentOccurredAt(),
    });
    const secondCustomer = await prisma.customer.create({
      data: {
        tenantId: seedData.tenant.id,
        branchId: seedData.branch.id,
        fullName: 'Second Card Holder',
        phoneE164: '+2348012345699',
        isStaff: false,
        status: CustomerStatus.ACTIVE,
        registeredByTenantId: seedData.tenant.id,
        registeredBy: seedData.user.id,
      },
    });
    const secondCard = await prisma.card.create({
      data: {
        tenantId: seedData.tenant.id,
        customerId: secondCustomer.id,
        barcodeValue: 'SC-1004B',
        status: CardStatus.ACTIVE,
        issuedByTenantId: seedData.tenant.id,
        issuedBy: seedData.user.id,
      },
    });

    await postReceipt(
      fixture.body,
      fixture.authHeaders,
      'receipt-key-6',
    ).expect(201);
    await postReceipt(
      {
        ...fixture.body,
        cardSerialNumber: secondCard.barcodeValue,
      },
      fixture.authHeaders,
      'receipt-key-7',
    ).expect(409);
  }, 120000);

  it('accepts the same receipt on a week boundary', async () => {
    const originalBranch = await prisma.branch.findUnique({
      where: { id: seedData.branch.id },
    });

    if (!originalBranch) {
      throw new Error('Missing seed branch');
    }

    await prisma.branch.update({
      where: { id: seedData.branch.id },
      data: {
        timezone: 'UTC',
        receiptWeekStartDay: 2,
      },
    });

    try {
      const { authHeaders, body } = await prepareReceiptFixture({
        customerSuffix: '05',
        cardSerialNumber: 'SC-1005',
        deviceName: 'POS-5',
        fingerprintHash: 'device-fingerprint-5',
        posReceiptNumber: 'POS-1005',
        occurredAt: recentOccurredAt(),
      });

      const boundaryStart = new Date();
      boundaryStart.setUTCHours(0, 0, 0, 0);

      await postReceipt(
        {
          ...body,
          occurredAt: new Date(boundaryStart.getTime() - 60_000).toISOString(),
          overrideReason: 'Boundary timing validation',
        },
        authHeaders,
        'receipt-key-8',
      ).expect(201);
      await postReceipt(
        {
          ...body,
          occurredAt: new Date(boundaryStart.getTime() + 60_000).toISOString(),
          overrideReason: 'Boundary timing validation',
        },
        authHeaders,
        'receipt-key-9',
      ).expect(201);

      const receipts = await prisma.receipt.findMany({
        where: {
          tenantId: seedData.tenant.id,
          normalizedPosReceiptNumber: 'POS-1005',
        },
        orderBy: { occurredAt: 'asc' },
      });

      expect(receipts).toHaveLength(2);
      expect(receipts[0].receiptWeekStart.getTime()).not.toBe(
        receipts[1].receiptWeekStart.getTime(),
      );
    } finally {
      await prisma.branch.update({
        where: { id: seedData.branch.id },
        data: {
          timezone: originalBranch.timezone,
          receiptWeekStartDay: originalBranch.receiptWeekStartDay,
        },
      });
    }
  }, 120000);

  it('accepts a zero-based receipt week start day', async () => {
    const originalBranch = await prisma.branch.findUnique({
      where: { id: seedData.branch.id },
    });

    if (!originalBranch) {
      throw new Error('Missing seed branch');
    }

    await prisma.branch.update({
      where: { id: seedData.branch.id },
      data: {
        timezone: 'UTC',
        receiptWeekStartDay: 0,
      },
    });

    try {
      const { authHeaders, body } = await prepareReceiptFixture({
        customerSuffix: '05a',
        cardSerialNumber: 'SC-1005A',
        deviceName: 'POS-5A',
        fingerprintHash: 'device-fingerprint-5a',
        posReceiptNumber: 'POS-1005A',
        occurredAt: '2026-07-19T12:00:00.000Z',
      });

      await postReceipt(
        {
          ...body,
          occurredAt: '2026-07-19T12:00:00.000Z',
          overrideReason: 'Zero-based week validation',
        },
        authHeaders,
        'receipt-key-8a',
      ).expect(201);

      const receipt = await prisma.receipt.findFirst({
        where: {
          tenantId: seedData.tenant.id,
          normalizedPosReceiptNumber: 'POS-1005A',
        },
      });

      expect(receipt?.receiptWeekStart.toISOString()).toBe(
        '2026-07-19T00:00:00.000Z',
      );
    } finally {
      await prisma.branch.update({
        where: { id: seedData.branch.id },
        data: {
          timezone: originalBranch.timezone,
          receiptWeekStartDay: originalBranch.receiptWeekStartDay,
        },
      });
    }
  }, 120000);

  it('rejects invalid stored receipt week start values', async () => {
    const originalBranch = await prisma.branch.findUnique({
      where: { id: seedData.branch.id },
    });

    if (!originalBranch) {
      throw new Error('Missing seed branch');
    }

    await prisma.branch.update({
      where: { id: seedData.branch.id },
      data: {
        timezone: 'UTC',
        receiptWeekStartDay: 7,
      },
    });

    try {
      const { authHeaders, body } = await prepareReceiptFixture({
        customerSuffix: '05b',
        cardSerialNumber: 'SC-1005B',
        deviceName: 'POS-5B',
        fingerprintHash: 'device-fingerprint-5b',
        posReceiptNumber: 'POS-1005B',
        occurredAt: '2026-07-19T12:00:00.000Z',
      });

      await postReceipt(
        {
          ...body,
          occurredAt: '2026-07-19T12:00:00.000Z',
          overrideReason: 'Invalid week validation',
        },
        authHeaders,
        'receipt-key-8b',
      ).expect(400);
    } finally {
      await prisma.branch.update({
        where: { id: seedData.branch.id },
        data: {
          timezone: originalBranch.timezone,
          receiptWeekStartDay: originalBranch.receiptWeekStartDay,
        },
      });
    }
  }, 120000);

  it('binds the device to the session and rejects spoofed receipt device fields', async () => {
    const { authHeaders, body } = await prepareReceiptFixture({
      customerSuffix: '06',
      cardSerialNumber: 'SC-1006',
      deviceName: 'POS-6',
      fingerprintHash: 'device-fingerprint-6',
      posReceiptNumber: 'POS-1006',
      occurredAt: recentOccurredAt(),
    });
    const otherBranch = await prisma.branch.create({
      data: {
        tenantId: seedData.tenant.id,
        name: 'Overflow Branch',
        timezone: 'Africa/Lagos',
        receiptWeekStartDay: 1,
        status: 'ACTIVE',
      },
    });
    const otherBranchDevice = await prisma.device.create({
      data: {
        tenantId: seedData.tenant.id,
        branchId: otherBranch.id,
        name: 'POS-other',
        fingerprintHash: 'device-fingerprint-other',
        status: DeviceStatus.ACTIVE,
      },
    });

    await request(httpServer)
      .post('/api/v1/auth/login')
      .set('x-device-id', otherBranchDevice.id)
      .send({
        username: seedData.user.username,
        password: seedData.adminPassword,
      })
      .expect(400);

    await postReceipt(
      {
        ...body,
        deviceId: otherBranchDevice.id,
        posReceiptNumber: 'POS-1006',
      },
      authHeaders,
      'receipt-key-10',
    ).expect(400);

    const inactiveDevice = await prisma.device.create({
      data: {
        tenantId: seedData.tenant.id,
        branchId: seedData.branch.id,
        name: 'POS-inactive',
        fingerprintHash: 'device-fingerprint-inactive',
        status: DeviceStatus.INACTIVE,
      },
    });

    await request(httpServer)
      .post('/api/v1/auth/login')
      .set('x-device-id', inactiveDevice.id)
      .send({
        username: seedData.user.username,
        password: seedData.adminPassword,
      })
      .expect(400);
  }, 120000);

  it('derives the receipt branch from the transaction snapshot when a device is reassigned after login', async () => {
    const { authHeaders, body, device } = await prepareReceiptFixture({
      customerSuffix: '06a',
      cardSerialNumber: 'SC-1006A',
      deviceName: 'POS-6A',
      fingerprintHash: 'device-fingerprint-6a',
      posReceiptNumber: 'POS-1006A',
      occurredAt: recentOccurredAt(),
      loginUsername: branchlessAdmin.username,
    });
    const reassignedBranch = await prisma.branch.create({
      data: {
        tenantId: seedData.tenant.id,
        name: 'Reassigned Branch',
        timezone: 'Africa/Lagos',
        receiptWeekStartDay: 1,
        status: 'ACTIVE',
      },
    });

    await prisma.device.update({
      where: { id: device.id },
      data: { branchId: reassignedBranch.id },
    });

    const response = await postReceipt(
      body,
      authHeaders,
      'receipt-key-10a',
    ).expect(201);
    const payload = response.body as unknown as ReceiptResponseBody;

    expect(payload.data.branchId).toBe(reassignedBranch.id);

    const receipt = await prisma.receipt.findUnique({
      where: {
        tenantId_id: { tenantId: seedData.tenant.id, id: payload.data.id },
      },
    });

    expect(receipt?.branchId).toBe(reassignedBranch.id);
  }, 120000);

  it('rejects future and stale cashier timestamps', async () => {
    const { body } = await prepareReceiptFixture({
      customerSuffix: '07',
      cardSerialNumber: 'SC-1007',
      deviceName: 'POS-7',
      fingerprintHash: 'device-fingerprint-7',
      posReceiptNumber: 'POS-1009',
      occurredAt: new Date(Date.now() - 60_000).toISOString(),
    });
    const cashierDevice = await prisma.device.create({
      data: {
        tenantId: seedData.tenant.id,
        branchId: seedData.branch.id,
        name: 'POS-cashier-two-timecheck',
        fingerprintHash: 'device-fingerprint-cashier-two-timecheck',
        status: DeviceStatus.ACTIVE,
      },
    });
    const cashierHeaders = await loginAs(cashierTwo.username, cashierDevice.id);

    await postReceipt(
      {
        ...body,
        occurredAt: new Date(Date.now() + 10 * 60_000).toISOString(),
        posReceiptNumber: 'POS-1009-FUTURE',
      },
      cashierHeaders,
      'receipt-key-13',
    ).expect(400);

    await postReceipt(
      {
        ...body,
        occurredAt: new Date(Date.now() - 13 * 60 * 60_000).toISOString(),
        posReceiptNumber: 'POS-1009-STALE',
      },
      cashierHeaders,
      'receipt-key-14',
    ).expect(400);
  }, 120000);

  it('allows a privileged timestamp override with audit evidence', async () => {
    const { body, device } = await prepareReceiptFixture({
      customerSuffix: '08',
      cardSerialNumber: 'SC-1008',
      deviceName: 'POS-8',
      fingerprintHash: 'device-fingerprint-8',
      posReceiptNumber: 'POS-1010',
      occurredAt: new Date(Date.now() - 60_000).toISOString(),
    });

    const overrideResponse = await postReceipt(
      {
        ...body,
        occurredAt: new Date(Date.now() - 13 * 60 * 60_000).toISOString(),
        overrideReason: 'POS clock drift during close-out',
        posReceiptNumber: 'POS-1010-OVERRIDE',
      },
      await loginAs(seedData.user.username, device.id),
      'receipt-key-15',
    ).expect(201);

    const overrideBody = overrideResponse.body as ReceiptResponseBody;
    expect(overrideBody.data.posReceiptNumber).toBe('POS-1010-OVERRIDE');

    const overrideAudit = await prisma.auditLog.findFirst({
      where: {
        tenantId: seedData.tenant.id,
        action: 'receipt.capture.override',
        entityId: overrideBody.data.id,
      },
    });

    expect(overrideAudit).toBeTruthy();
  }, 120000);

  it('marks purchases beyond the approval threshold as pending approval', async () => {
    const { authHeaders, body } = await prepareReceiptFixture({
      customerSuffix: '09',
      cardSerialNumber: 'SC-1009',
      deviceName: 'POS-9',
      fingerprintHash: 'device-fingerprint-9',
      posReceiptNumber: 'POS-1011',
      occurredAt: recentOccurredAt(),
    });

    await postReceipt(
      {
        ...body,
        purchaseAmountKobo: 25_000_000,
      },
      authHeaders,
      'receipt-key-16',
    )
      .expect(201)
      .expect((response) => {
        const payload = response.body as ReceiptResponseBody;
        expect(payload.data.status).toBe('PENDING_APPROVAL');
      });
  }, 120000);

  it('enforces the hard purchase ceiling', async () => {
    const { authHeaders, body } = await prepareReceiptFixture({
      customerSuffix: '09a',
      cardSerialNumber: 'SC-1009A',
      deviceName: 'POS-9A',
      fingerprintHash: 'device-fingerprint-9a',
      posReceiptNumber: 'POS-1011A',
      occurredAt: recentOccurredAt(),
    });

    await postReceipt(
      {
        ...body,
        posReceiptNumber: 'POS-1011A-BELOW',
        purchaseAmountKobo: 99_999_999,
      },
      authHeaders,
      'receipt-key-16a',
    ).expect(201);

    await postReceipt(
      {
        ...body,
        posReceiptNumber: 'POS-1011A-AT',
        purchaseAmountKobo: 100_000_000,
      },
      authHeaders,
      'receipt-key-16b',
    )
      .expect(201)
      .expect((response) => {
        const payload = response.body as ReceiptResponseBody;
        expect(payload.data.status).toBe('PENDING_APPROVAL');
      });

    await postReceipt(
      {
        ...body,
        posReceiptNumber: 'POS-1011A-OVER',
        purchaseAmountKobo: 100_000_001,
      },
      authHeaders,
      'receipt-key-16c',
    ).expect(400);
  }, 120000);

  it('approves a pending receipt from a different reviewer', async () => {
    const fixture = await prepareReceiptFixture({
      customerSuffix: '10',
      cardSerialNumber: 'SC-1010',
      deviceName: 'POS-10',
      fingerprintHash: 'device-fingerprint-10',
      posReceiptNumber: 'POS-1012',
      occurredAt: recentOccurredAt(),
      loginUsername: cashierTwo.username,
    });

    const receiptResponse = await postReceipt(
      {
        ...fixture.body,
        purchaseAmountKobo: 25_000_000,
      },
      fixture.authHeaders,
      'receipt-key-17',
    ).expect(201);
    const receiptBody = receiptResponse.body as unknown as ReceiptResponseBody;

    await postReceiptDecision(
      `/api/v1/receipts/${receiptBody.data.id}/approve`,
      await loginAs(branchlessAdmin.username, fixture.device.id),
    ).expect(200);

    const receipt = await prisma.receipt.findUnique({
      where: {
        tenantId_id: {
          tenantId: seedData.tenant.id,
          id: receiptBody.data.id,
        },
      },
    });

    expect(receipt?.reviewStatus).toBe('APPROVED');
    expect(receipt?.approvedAt).toBeTruthy();
    expect(receipt?.reviewedBy).toBe(branchlessAdmin.id);
  }, 120000);

  it('rejects self-approval on a pending receipt', async () => {
    const fixture = await prepareReceiptFixture({
      customerSuffix: '11',
      cardSerialNumber: 'SC-1011',
      deviceName: 'POS-11',
      fingerprintHash: 'device-fingerprint-11',
      posReceiptNumber: 'POS-1013',
      occurredAt: recentOccurredAt(),
      loginUsername: seedData.user.username,
    });

    const receiptResponse = await postReceipt(
      {
        ...fixture.body,
        purchaseAmountKobo: 25_000_000,
      },
      fixture.authHeaders,
      'receipt-key-18',
    ).expect(201);
    const receiptBody = receiptResponse.body as unknown as ReceiptResponseBody;

    await postReceiptDecision(
      `/api/v1/receipts/${receiptBody.data.id}/approve`,
      fixture.authHeaders,
    ).expect(400);
  }, 120000);

  it('rejects a pending receipt through the approval workflow', async () => {
    const fixture = await prepareReceiptFixture({
      customerSuffix: '12',
      cardSerialNumber: 'SC-1012',
      deviceName: 'POS-12',
      fingerprintHash: 'device-fingerprint-12',
      posReceiptNumber: 'POS-1014',
      occurredAt: recentOccurredAt(),
      loginUsername: cashierTwo.username,
    });

    const receiptResponse = await postReceipt(
      {
        ...fixture.body,
        purchaseAmountKobo: 25_000_000,
      },
      fixture.authHeaders,
      'receipt-key-19',
    ).expect(201);
    const receiptBody = receiptResponse.body as unknown as ReceiptResponseBody;

    await postReceiptDecision(
      `/api/v1/receipts/${receiptBody.data.id}/reject`,
      await loginAs(branchlessAdmin.username, fixture.device.id),
    ).expect(200);

    const receipt = await prisma.receipt.findUnique({
      where: {
        tenantId_id: {
          tenantId: seedData.tenant.id,
          id: receiptBody.data.id,
        },
      },
    });

    expect(receipt?.reviewStatus).toBe('REJECTED');
    expect(receipt?.approvedAt).toBeNull();
    expect(receipt?.reviewedBy).toBe(branchlessAdmin.id);
  }, 120000);

  it('allows an expired completed idempotency record to be ignored', async () => {
    const { authHeaders, body } = await prepareReceiptFixture({
      customerSuffix: '13',
      cardSerialNumber: 'SC-1013',
      deviceName: 'POS-13',
      fingerprintHash: 'device-fingerprint-13',
      posReceiptNumber: 'POS-1015',
      occurredAt: recentOccurredAt(),
      loginUsername: cashierTwo.username,
    });

    await prisma.idempotencyRecord.create({
      data: {
        tenantId: seedData.tenant.id,
        actorId: cashierTwo.id,
        endpoint: 'POST /api/v1/receipts',
        idempotencyKey: 'expired-completed-key',
        requestHash: 'stale-hash',
        responseJson: { stale: true },
        status: 'COMPLETED',
        expiresAt: new Date(Date.now() - 60_000),
      },
    });

    const response = await postReceipt(
      {
        ...body,
        posReceiptNumber: 'POS-1015-NEW',
        cardSerialNumber: 'SC-1013',
      },
      authHeaders,
      'expired-completed-key',
    ).expect(201);
    const responseBody = response.body as unknown as ReceiptResponseBody;

    expect(responseBody.data.posReceiptNumber).toBe('POS-1015-NEW');
  }, 120000);

  it('allows an expired pending idempotency record to be ignored', async () => {
    const { authHeaders, body } = await prepareReceiptFixture({
      customerSuffix: '14',
      cardSerialNumber: 'SC-1014',
      deviceName: 'POS-14',
      fingerprintHash: 'device-fingerprint-14',
      posReceiptNumber: 'POS-1016',
      occurredAt: recentOccurredAt(),
      loginUsername: cashierTwo.username,
    });

    await prisma.idempotencyRecord.create({
      data: {
        tenantId: seedData.tenant.id,
        actorId: cashierTwo.id,
        endpoint: 'POST /api/v1/receipts',
        idempotencyKey: 'expired-pending-key',
        requestHash: 'stale-hash',
        status: 'PENDING',
        expiresAt: new Date(Date.now() - 60_000),
      },
    });

    const response = await postReceipt(
      {
        ...body,
        posReceiptNumber: 'POS-1016-NEW',
        cardSerialNumber: 'SC-1014',
      },
      authHeaders,
      'expired-pending-key',
    ).expect(201);
    const responseBody = response.body as unknown as ReceiptResponseBody;

    expect(responseBody.data.posReceiptNumber).toBe('POS-1016-NEW');
  }, 120000);
});

async function prepareReceiptFixture(options: {
  customerSuffix: string;
  cardSerialNumber: string;
  deviceName: string;
  fingerprintHash: string;
  posReceiptNumber: string;
  occurredAt: string;
  loginUsername?: string;
}) {
  const customer = await prisma.customer.create({
    data: {
      tenantId: seedData.tenant.id,
      branchId: seedData.branch.id,
      fullName: `Fixture Customer ${options.customerSuffix}`,
      phoneE164: `+23480123${options.customerSuffix}00`,
      isStaff: false,
      status: CustomerStatus.ACTIVE,
      registeredByTenantId: seedData.tenant.id,
      registeredBy: seedData.user.id,
    },
  });

  const card = await prisma.card.create({
    data: {
      tenantId: seedData.tenant.id,
      customerId: customer.id,
      barcodeValue: options.cardSerialNumber,
      status: CardStatus.ACTIVE,
      issuedByTenantId: seedData.tenant.id,
      issuedBy: seedData.user.id,
    },
  });

  const device = await prisma.device.create({
    data: {
      tenantId: seedData.tenant.id,
      branchId: seedData.branch.id,
      name: options.deviceName,
      fingerprintHash: options.fingerprintHash,
      status: DeviceStatus.ACTIVE,
    },
  });

  const authHeaders = await loginAs(
    options.loginUsername ?? seedData.user.username,
    device.id,
  );

  return {
    authHeaders,
    body: {
      cardSerialNumber: card.barcodeValue,
      posReceiptNumber: options.posReceiptNumber,
      purchaseAmountKobo: 1000000,
      occurredAt: options.occurredAt,
    },
    card,
    device,
  };
}

async function loginAs(username: string, deviceId?: string) {
  const attestation = deviceId
    ? buildDeviceAttestation(
        deviceId,
        (
          await prisma.device.findUnique({
            where: { id: deviceId },
            select: { fingerprintHash: true },
          })
        )?.fingerprintHash,
      )
    : undefined;

  const loginRequest = request(httpServer)
    .post('/api/v1/auth/login')
    .set('x-device-id', deviceId ?? '')
    .send({
      username,
      password: seedData.adminPassword,
    });

  if (attestation) {
    loginRequest.set('x-device-attestation', attestation);
  }

  const loginResponse = await loginRequest.expect(200);

  const sessionCookie = cookieValue(
    loginResponse.headers['set-cookie'],
    'shopcity_session',
  );
  const csrfCookie = cookieValue(
    loginResponse.headers['set-cookie'],
    'shopcity_csrf',
  );

  return {
    headers: `${sessionCookie}; ${csrfCookie}`,
    csrfToken: cookieToken(csrfCookie),
  };
}

function buildDeviceAttestation(
  deviceId: string,
  fingerprintHash: string | undefined,
): string {
  if (!fingerprintHash) {
    throw new Error(`Missing fingerprint hash for device ${deviceId}`);
  }

  const timestamp = Date.now();
  const nonce = randomUUID();
  const signature = createHmac('sha256', fingerprintHash)
    .update(`${deviceId}.${timestamp}.${nonce}`)
    .digest('base64url');

  return `${timestamp}.${nonce}.${signature}`;
}

function postReceipt(
  body: Record<string, unknown>,
  authHeaders: { headers: string; csrfToken: string },
  idempotencyKey: string,
) {
  return request(httpServer)
    .post('/api/v1/receipts')
    .set('Cookie', authHeaders.headers)
    .set('x-csrf-token', authHeaders.csrfToken)
    .set('Idempotency-Key', idempotencyKey)
    .send(body);
}

function postReceiptDecision(
  path: string,
  authHeaders: { headers: string; csrfToken: string },
) {
  return request(httpServer)
    .post(path)
    .set('Cookie', authHeaders.headers)
    .set('x-csrf-token', authHeaders.csrfToken);
}

type ReceiptResponseBody = {
  data: {
    id: string;
    branchId: string;
    customerId: string;
    cardSerialNumber: string;
    deviceId: string;
    posReceiptNumber: string;
    purchaseAmountKobo: number;
    status: string;
  };
};

function cookieValue(
  setCookie: string[] | string | undefined,
  name: string,
): string {
  const cookies = Array.isArray(setCookie)
    ? setCookie
    : setCookie
      ? [setCookie]
      : [];
  const match = cookies.find((entry) => entry.startsWith(`${name}=`));
  if (!match) {
    throw new Error(`Missing ${name} cookie`);
  }

  return match.split(';')[0];
}

function cookieToken(cookiePair: string): string {
  const separator = cookiePair.indexOf('=');
  if (separator === -1) {
    throw new Error('Invalid cookie pair');
  }

  return cookiePair.slice(separator + 1);
}

function recentOccurredAt(minutesAgo = 1): string {
  return new Date(Date.now() - minutesAgo * 60_000).toISOString();
}

function createSupabaseAdminStub(supabaseAuthId: string) {
  return {
    auth: {
      admin: {
        listUsers: jest.fn().mockResolvedValue({
          data: { users: [] },
          error: null,
        }),
        createUser: jest.fn().mockResolvedValue({
          data: { user: { id: supabaseAuthId } },
          error: null,
        }),
        updateUserById: jest.fn(),
        deleteUser: jest.fn(),
      },
    },
  } as never;
}
