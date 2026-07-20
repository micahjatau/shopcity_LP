import { execSync } from 'node:child_process';
import {
  PrismaClient,
  CardStatus,
  CustomerStatus,
  UserRole,
} from '@prisma/client';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import request from 'supertest';
import { seedFoundation } from '../prisma/seed';
import { SupabaseService } from '../src/supabase/supabase.service';

describe('receipt capture flows (int)', () => {
  let pgContainer: Awaited<ReturnType<PostgreSqlContainer['start']>>;
  let prisma: PrismaClient;
  let app: any;
  let createAppFn: (options?: { enableDocs?: boolean }) => Promise<any>;
  let seedData: Awaited<ReturnType<typeof seedFoundation>>;

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
    process.env.REDIS_URL = 'redis://127.0.0.1:6379';
    process.env.SESSION_SECRET = 'session-secret';
    process.env.CSRF_SECRET = 'csrf-secret';
    process.env.SUPABASE_URL = 'http://127.0.0.1:54321';
    process.env.SUPABASE_ANON_KEY = 'test-anon-key';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';

    ({ createApp: createAppFn } = require('../src/bootstrap'));

    prisma = new PrismaClient({
      datasources: { db: { url: databaseUrl } },
    });
    await prisma.$connect();

    const supabaseAuthId = 'seed-admin-supabase-user';
    seedData = await seedFoundation(prisma, {
      supabaseAdminClient: createSupabaseAdminStub(supabaseAuthId),
      adminPassword: 'password',
    });

    app = await createAppFn({ enableDocs: false });
    await app.getHttpAdapter().getInstance().ready();

    const supabaseService = app.get(SupabaseService);
    jest
      .spyOn(supabaseService.publicClient.auth as any, 'signInWithPassword')
      .mockResolvedValue({
        data: { user: { id: seedData.user.supabaseAuthId } },
        error: null,
      } as never);
  }, 120000);

  beforeEach(() => {
    execSync('redis-cli -h 127.0.0.1 -p 6379 FLUSHDB', {
      stdio: 'ignore',
    });
  });

  afterAll(async () => {
    await app?.close();
    await prisma?.$disconnect();
    await pgContainer?.stop();
  }, 120000);

  it('captures and replays the same receipt for the same idempotency key', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        username: seedData.user.username,
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
    const csrfToken = cookieToken(csrfCookie);

    const customer = await prisma.customer.create({
      data: {
        tenantId: seedData.tenant.id,
        branchId: seedData.branch.id,
        fullName: 'Ada Lovelace',
        phoneE164: '+2348012345678',
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
        barcodeValue: 'SC-0001',
        status: CardStatus.ACTIVE,
        issuedByTenantId: seedData.tenant.id,
        issuedBy: seedData.user.id,
      },
    });
    const device = await prisma.device.create({
      data: {
        tenantId: seedData.tenant.id,
        branchId: seedData.branch.id,
        name: 'POS-1',
        fingerprintHash: 'device-fingerprint-1',
        status: 'ACTIVE',
      },
    });

    const body = {
      branchId: seedData.branch.id,
      cardSerialNumber: card.barcodeValue,
      purchaseAmountKobo: 1000000,
      occurredAt: '2026-07-19T09:44:00+01:00',
      deviceId: device.id,
    };

    const firstResponse = await request(app.getHttpServer())
      .post('/api/v1/receipts')
      .set('Cookie', `${sessionCookie}; ${csrfCookie}`)
      .set('x-csrf-token', csrfToken)
      .set('Idempotency-Key', 'receipt-key-1')
      .send(body)
      .expect(201);

    const replayResponse = await request(app.getHttpServer())
      .post('/api/v1/receipts')
      .set('Cookie', `${sessionCookie}; ${csrfCookie}`)
      .set('x-csrf-token', csrfToken)
      .set('Idempotency-Key', 'receipt-key-1')
      .send(body)
      .expect(201);

    expect(firstResponse.body.data).toMatchObject({
      branchId: seedData.branch.id,
      customerId: customer.id,
      cardSerialNumber: card.barcodeValue,
      deviceId: device.id,
      purchaseAmountKobo: 1000000,
      externalReceiptNumber: null,
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

  it('rejects a reused idempotency key with a different payload', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        username: seedData.user.username,
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

    const customer = await prisma.customer.create({
      data: {
        tenantId: seedData.tenant.id,
        branchId: seedData.branch.id,
        fullName: 'Grace Hopper',
        phoneE164: '+2348012345679',
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
        barcodeValue: 'SC-0002',
        status: CardStatus.ACTIVE,
        issuedByTenantId: seedData.tenant.id,
        issuedBy: seedData.user.id,
      },
    });

    const body = {
      branchId: seedData.branch.id,
      cardSerialNumber: card.barcodeValue,
      purchaseAmountKobo: 1000000,
      occurredAt: '2026-07-19T09:44:00+01:00',
    };

    await request(app.getHttpServer())
      .post('/api/v1/receipts')
      .set('Cookie', `${sessionCookie}; ${csrfCookie}`)
      .set('x-csrf-token', cookieToken(csrfCookie))
      .set('Idempotency-Key', 'receipt-key-2')
      .send(body)
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/receipts')
      .set('Cookie', `${sessionCookie}; ${csrfCookie}`)
      .set('x-csrf-token', cookieToken(csrfCookie))
      .set('Idempotency-Key', 'receipt-key-2')
      .send({ ...body, purchaseAmountKobo: 2000000 })
      .expect(409);
  }, 120000);
});

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
