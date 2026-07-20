/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */
import { execSync } from 'node:child_process';
import {
  CardStatus,
  CustomerStatus,
  DeviceStatus,
  PrismaClient,
  UserRole,
} from '@prisma/client';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import request from 'supertest';
import { seedFoundation } from '../prisma/seed';
import { SupabaseService } from '../src/supabase/supabase.service';
import {
  createRedisTestEnvironment,
  type RedisTestEnvironment,
} from './support/redis-testcontainer';
import type { INestApplication } from '@nestjs/common';

let prisma: PrismaClient;
let app: INestApplication;
let seedData: Awaited<ReturnType<typeof seedFoundation>>;
let cashierTwo: {
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

    ({ createApp: createAppFn } = await import('../src/bootstrap'));

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

    app = await createAppFn({ enableDocs: false });
    await app.getHttpAdapter().getInstance().ready();

    const supabaseService = app.get(SupabaseService);
    const authIds: Record<string, string> = {
      [seedData.user.username]: seedData.user.supabaseAuthId,
      [cashierTwo.username]: cashierTwo.supabaseAuthId!,
    };
    jest
      .spyOn(supabaseService.publicClient.auth, 'signInWithPassword')
      .mockImplementation(({ email }: { email: string }) => {
        const userId = authIds[email];
        if (!userId) {
          return {
            data: { user: null },
            error: new Error('Invalid credentials'),
          };
        }

        return {
          data: { user: { id: userId } },
          error: null,
        };
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
      occurredAt: '2026-07-19T09:44:00+01:00',
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

    expect(firstResponse.body.data).toMatchObject({
      branchId: seedData.branch.id,
      customerId: card.customerId,
      cardSerialNumber: card.barcodeValue,
      deviceId: device.id,
      posReceiptNumber: 'POS-1001',
      purchaseAmountKobo: 1000000,
      status: 'CAPTURED',
    });
    expect(replayResponse.body.data).toEqual(firstResponse.body.data);

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
      occurredAt: '2026-07-19T09:44:00+01:00',
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
    const cashierHeaders = await loginAs(cashierTwo.username);

    await postReceipt(body, adminHeaders, 'receipt-key-4').expect(201);
    await postReceipt(body, cashierHeaders, 'receipt-key-5').expect(409);
  }, 120000);

  it('rejects the same receipt when a different card is used', async () => {
    const fixture = await prepareReceiptFixture({
      customerSuffix: '04',
      cardSerialNumber: 'SC-1004A',
      deviceName: 'POS-4',
      fingerprintHash: 'device-fingerprint-4',
      posReceiptNumber: 'POS-1004',
      occurredAt: '2026-07-19T09:44:00+01:00',
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
    const { authHeaders, body } = await prepareReceiptFixture({
      customerSuffix: '05',
      cardSerialNumber: 'SC-1005',
      deviceName: 'POS-5',
      fingerprintHash: 'device-fingerprint-5',
      posReceiptNumber: 'POS-1005',
      occurredAt: '2026-07-19T23:59:00+01:00',
    });

    await postReceipt(body, authHeaders, 'receipt-key-8').expect(201);
    await postReceipt(
      {
        ...body,
        occurredAt: '2026-07-20T00:01:00+01:00',
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
  }, 120000);

  it('rejects cross-branch and invalid device submissions', async () => {
    const { authHeaders, body } = await prepareReceiptFixture({
      customerSuffix: '06',
      cardSerialNumber: 'SC-1006',
      deviceName: 'POS-6',
      fingerprintHash: 'device-fingerprint-6',
      posReceiptNumber: 'POS-1006',
      occurredAt: '2026-07-19T09:44:00+01:00',
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

    await postReceipt(
      {
        ...body,
        deviceId: otherBranchDevice.id,
        posReceiptNumber: 'POS-1006',
      },
      authHeaders,
      'receipt-key-10',
    ).expect(400);

    const bodyWithoutDevice = { ...body } as Record<string, unknown>;
    delete bodyWithoutDevice.deviceId;
    await postReceipt(
      {
        ...bodyWithoutDevice,
        posReceiptNumber: 'POS-1007',
      },
      authHeaders,
      'receipt-key-11',
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

    await postReceipt(
      {
        ...body,
        deviceId: inactiveDevice.id,
        posReceiptNumber: 'POS-1008',
      },
      authHeaders,
      'receipt-key-12',
    ).expect(400);
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
    const cashierHeaders = await loginAs(cashierTwo.username);

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
});

async function prepareReceiptFixture(options: {
  customerSuffix: string;
  cardSerialNumber: string;
  deviceName: string;
  fingerprintHash: string;
  posReceiptNumber: string;
  occurredAt: string;
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

  const authHeaders = await loginAs(seedData.user.username);

  return {
    authHeaders,
    body: {
      cardSerialNumber: card.barcodeValue,
      deviceId: device.id,
      posReceiptNumber: options.posReceiptNumber,
      purchaseAmountKobo: 1000000,
      occurredAt: options.occurredAt,
    },
    card,
    device,
  };
}

async function loginAs(username: string) {
  const loginResponse = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({
      username,
      password: seedData.adminPassword,
    })
    .expect(200);

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

function postReceipt(
  body: Record<string, unknown>,
  authHeaders: { headers: string; csrfToken: string },
  idempotencyKey: string,
) {
  return request(app.getHttpServer())
    .post('/api/v1/receipts')
    .set('Cookie', authHeaders.headers)
    .set('x-csrf-token', authHeaders.csrfToken)
    .set('Idempotency-Key', idempotencyKey)
    .send(body);
}

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
