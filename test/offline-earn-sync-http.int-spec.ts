import { execSync } from 'node:child_process';
import { createHmac, randomUUID } from 'node:crypto';
import { PrismaClient, UserRole } from '@prisma/client';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import request from 'supertest';
import { seedFoundation } from '../prisma/seed';
import { createAttestedDeviceData } from './support/device-attestation';
import {
  createRedisTestEnvironment,
  type RedisTestEnvironment,
} from './support/redis-testcontainer';
import type { INestApplication } from '@nestjs/common';

const DEFAULT_POLICY = {
  OFFLINE_SYNC_MAX_RECORDS: 100,
  OFFLINE_EARN_MAX_AGE_HOURS: 72,
};

describe('offline earn sync HTTP (int)', () => {
  let pgContainer: Awaited<ReturnType<PostgreSqlContainer['start']>>;
  let redisEnv: RedisTestEnvironment;
  let prisma: PrismaClient;
  let app: INestApplication;
  let httpServer: Parameters<typeof request>[0];
  let seedData: Awaited<ReturnType<typeof seedFoundation>>;
  let cashier: Awaited<ReturnType<typeof createCashierUser>>;
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
      env: { ...process.env, DATABASE_URL: databaseUrl },
    });

    process.env.DATABASE_URL = databaseUrl;
    process.env.REDIS_URL = redisEnv.redisUrl;
    process.env.SESSION_SECRET = 'session-secret';
    process.env.CSRF_SECRET = 'csrf-secret';
    process.env.SUPABASE_URL = 'http://127.0.0.1:54321';
    process.env.SUPABASE_ANON_KEY = 'test-anon-key';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
    process.env.OFFLINE_SYNC_MAX_RECORDS = String(
      DEFAULT_POLICY.OFFLINE_SYNC_MAX_RECORDS,
    );
    process.env.OFFLINE_EARN_MAX_AGE_HOURS = String(
      DEFAULT_POLICY.OFFLINE_EARN_MAX_AGE_HOURS,
    );

    jest.resetModules();
    const supabaseModule = jest.requireActual<
      typeof import('../src/supabase/supabase.service')
    >('../src/supabase/supabase.service');
    SupabaseServiceToken = supabaseModule.SupabaseService;
    const bootstrap =
      jest.requireActual<typeof import('../src/bootstrap')>('../src/bootstrap');
    createAppFn = bootstrap.createApp;

    prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
    await prisma.$connect();

    seedData = await seedFoundation(prisma, {
      supabaseAdminClient: createSupabaseAdminStub('seed-admin-supabase-user'),
      adminPassword: 'password',
    });

    cashier = await createCashierUser(
      prisma,
      seedData.tenant.id,
      seedData.branch.id,
    );

    app = await createAppFn({ enableDocs: false });
    await (
      app.getHttpAdapter().getInstance() as { ready: () => Promise<void> }
    ).ready();
    httpServer = app.getHttpServer() as Parameters<typeof request>[0];

    const supabaseService = app.get(SupabaseServiceToken);
    jest
      .spyOn(supabaseService.publicClient.auth, 'signInWithPassword')
      .mockImplementation((credentials) => {
        const email = 'email' in credentials ? credentials.email : '';
        if (email !== cashier.username) {
          return Promise.resolve({
            data: { user: null },
            error: new Error('Invalid credentials'),
          } as never);
        }

        return Promise.resolve({
          data: { user: { id: cashier.supabaseAuthId }, session: null },
          error: null,
        } as never);
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

  it('accepts offline earn batches over HTTP and preserves replayed results', async () => {
    const fixture = await createHttpFixture(
      prisma,
      seedData.tenant.id,
      seedData.branch.id,
      cashier.id,
      'POS-OFFLINE-HTTP-1',
    );
    const occurredAtLocal = recentOccurredAt();
    const body = buildHttpOfflineBody(
      fixture,
      cashier.id,
      seedData.branch.id,
      1_000_000,
      occurredAtLocal,
      formatYmd(
        deriveReceiptWeekStart(new Date(occurredAtLocal), 'Africa/Lagos', 1),
      ),
    );

    const loginResponse = await request(httpServer)
      .post('/api/v1/auth/login')
      .set('x-device-id', fixture.device.id)
      .set(
        'x-device-attestation',
        buildDeviceAttestation(
          fixture.device.id,
          fixture.device.fingerprintHash,
        ),
      )
      .send({ username: cashier.username, password: 'password' })
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

    const first = await request(httpServer)
      .post('/api/v1/offline-sync/earn-batch')
      .set('Cookie', `${sessionCookie}; ${csrfCookie}`)
      .set('x-csrf-token', csrfToken)
      .send(body);

    expect(first.status).toBe(200);

    const replay = await request(httpServer)
      .post('/api/v1/offline-sync/earn-batch')
      .set('Cookie', `${sessionCookie}; ${csrfCookie}`)
      .set('x-csrf-token', csrfToken)
      .send(body)
      .expect(200);

    expect(replay.body.data).toEqual(first.body.data);
    expect(first.body.data.records[0]).toMatchObject({
      status: 'CONFIRMED',
      retryable: false,
    });
  }, 120000);
});

async function createCashierUser(
  prisma: PrismaClient,
  tenantId: string,
  branchId: string,
) {
  return prisma.user.create({
    data: {
      id: randomUUID(),
      tenantId,
      branchId,
      username: 'cashier.http@offline.local',
      supabaseAuthId: 'cashier-http-supabase-user',
      role: UserRole.CASHIER,
      status: 'ACTIVE',
    },
  });
}

async function createHttpFixture(
  prisma: PrismaClient,
  tenantId: string,
  branchId: string,
  cashierId: string,
  receiptNumber: string,
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
      phoneE164: '+2348012345678',
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

  return { device, customer, card };
}

function buildHttpOfflineBody(
  fixture: Awaited<ReturnType<typeof createHttpFixture>>,
  cashierId: string,
  branchId: string,
  purchaseAmountKobo: number,
  occurredAtLocal: string,
  receiptWeekStart: string,
) {
  return {
    deviceId: fixture.device.id,
    records: [
      {
        localId: randomUUID(),
        idempotencyKey: randomUUID(),
        cashierId,
        branchId,
        cardBarcode: fixture.card.barcodeValue,
        receiptNumber: `POS-${fixture.card.barcodeValue}`,
        receiptWeekStart,
        purchaseAmountKobo,
        occurredAtLocal,
      },
    ],
  };
}

function cookieValue(
  setCookieHeader: string | string[] | undefined,
  name: string,
): string {
  const headers = Array.isArray(setCookieHeader)
    ? setCookieHeader
    : setCookieHeader
      ? [setCookieHeader]
      : undefined;
  const header = headers?.find((value) => value.startsWith(`${name}=`));
  if (!header) {
    throw new Error(`Missing cookie ${name}`);
  }

  return header.split(';')[0] ?? '';
}

function cookieToken(cookie: string): string {
  return decodeURIComponent(cookie.split('=')[1] ?? '');
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

function buildDeviceAttestation(
  deviceId: string,
  fingerprintHash: string,
): string {
  const timestamp = Date.now();
  const nonce = randomUUID();
  const signature = createHmac('sha256', fingerprintHash)
    .update(`${deviceId}.${timestamp}.${nonce}`)
    .digest('base64url');

  return `${timestamp}.${nonce}.${signature}`;
}

function createSupabaseAdminStub(supabaseAuthId: string) {
  return {
    auth: {
      admin: {
        listUsers: jest
          .fn()
          .mockResolvedValue({ data: { users: [] }, error: null }),
        createUser: jest.fn().mockResolvedValue({
          data: { user: { id: supabaseAuthId } },
          error: null,
        }),
        updateUserById: jest.fn().mockResolvedValue({ error: null }),
        deleteUser: jest.fn().mockResolvedValue({ error: null }),
      },
    },
  } as never;
}
