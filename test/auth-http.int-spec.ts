import { execSync } from 'node:child_process';
import { createHmac, randomUUID } from 'node:crypto';
import {
  PrismaClient,
  BranchStatus,
  AdjustmentKind,
  CardStatus,
  CustomerStatus,
  LedgerEntryDirection,
  LedgerEntryStatus,
  LedgerEntryType,
  ReceiptCaptureStatus,
  ReceiptReviewStatus,
  DeviceStatus,
  TenantStatus,
  SessionStatus,
  UserRole,
} from '@prisma/client';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import request from 'supertest';
import { seedFoundation } from '../prisma/seed';
import {
  createRedisTestEnvironment,
  type RedisTestEnvironment,
} from './support/redis-testcontainer';
import { createAttestedDeviceData } from './support/device-attestation';
import type { INestApplication } from '@nestjs/common';

let receiptlessFixtureSeq = 0;

describe('auth and readiness flows (int)', () => {
  let pgContainer: Awaited<ReturnType<PostgreSqlContainer['start']>>;
  let redisEnv: RedisTestEnvironment;
  let prisma: PrismaClient;
  let app: INestApplication;
  let createAppFn: (options?: {
    enableDocs?: boolean;
  }) => Promise<INestApplication>;
  let SupabaseServiceToken: typeof import('../src/supabase/supabase.service').SupabaseService;
  let httpServer: Parameters<typeof request>[0];
  let seedData: Awaited<ReturnType<typeof seedFoundation>>;
  let cashierUser: Awaited<ReturnType<typeof createStaffUser>>;

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
    cashierUser = await createStaffUser(
      prisma,
      seedData.tenant.id,
      seedData.branch.id,
      UserRole.CASHIER,
      'cashier.read-model@shopcity.local',
      'cashier-read-model-supabase-user',
    );

    app = await createAppFn({ enableDocs: false });
    await (
      app.getHttpAdapter().getInstance() as {
        ready: () => Promise<void>;
      }
    ).ready();
    httpServer = app.getHttpServer() as Parameters<typeof request>[0];

    const supabaseService = app.get(SupabaseServiceToken);
    jest
      .spyOn(supabaseService.publicClient.auth, 'signInWithPassword')
      .mockImplementation((credentials) => {
        const email = 'email' in credentials ? credentials.email : '';

        return Promise.resolve({
          data: {
            user: {
              id:
                email === cashierUser.username
                  ? cashierUser.supabaseAuthId
                  : seedData.user.supabaseAuthId,
            },
            session: null,
          },
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

  it('logs in, rotates, rejects stale sessions, and logs out over HTTP', async () => {
    const loginResponse = await request(httpServer)
      .post('/api/v1/auth/login')
      .send({
        username: seedData.user.username,
        password: seedData.adminPassword,
      })
      .expect(200);

    const loginSessionCookie = cookieValue(
      loginResponse.headers['set-cookie'],
      'shopcity_session',
    );
    const loginCsrfCookie = cookieValue(
      loginResponse.headers['set-cookie'],
      'shopcity_csrf',
    );
    const loginCsrfToken = cookieToken(loginCsrfCookie);

    const loginBody = loginResponse.body as AuthLoginResponseBody;
    expect(loginBody.success).toBe(true);
    expect(loginBody.data.user).toEqual({
      id: seedData.user.id,
      username: seedData.user.username,
      role: UserRole.ADMIN,
      branchId: seedData.user.branchId,
    });
    expect(loginBody.data.session).toHaveProperty('expiresAt');

    await request(httpServer)
      .get('/api/v1/auth/me')
      .set('Cookie', loginSessionCookie)
      .expect(200)
      .expect((response) => {
        const body = response.body as AuthMeResponseBody;
        expect(body.data.user.username).toBe(seedData.user.username);
      });

    await request(httpServer)
      .post('/api/v1/auth/refresh')
      .set('Cookie', `${loginSessionCookie}; ${loginCsrfCookie}`)
      .expect(403);

    const refreshResponse = await request(httpServer)
      .post('/api/v1/auth/refresh')
      .set('Cookie', `${loginSessionCookie}; ${loginCsrfCookie}`)
      .set('x-csrf-token', loginCsrfToken)
      .expect(200);

    const refreshedSessionCookie = cookieValue(
      refreshResponse.headers['set-cookie'],
      'shopcity_session',
    );
    const refreshedCsrfCookie = cookieValue(
      refreshResponse.headers['set-cookie'],
      'shopcity_csrf',
    );

    const sessionsAfterRefresh = await prisma.session.findMany({
      where: { userId: seedData.user.id },
      orderBy: { createdAt: 'asc' },
    });

    expect(sessionsAfterRefresh).toHaveLength(2);
    expect(sessionsAfterRefresh[0].status).toBe(SessionStatus.REVOKED);
    expect(sessionsAfterRefresh[1].status).toBe(SessionStatus.ACTIVE);

    await request(httpServer)
      .get('/api/v1/auth/me')
      .set('Cookie', loginSessionCookie)
      .expect(401);

    await request(httpServer)
      .get('/api/v1/auth/me')
      .set('Cookie', refreshedSessionCookie)
      .expect(200);

    await request(httpServer)
      .post('/api/v1/auth/logout')
      .set('Cookie', `${refreshedSessionCookie}; ${refreshedCsrfCookie}`)
      .set('x-csrf-token', cookieToken(refreshedCsrfCookie))
      .expect(200);

    const sessionsAfterLogout = await prisma.session.findMany({
      where: { userId: seedData.user.id },
      orderBy: { createdAt: 'asc' },
    });

    expect(
      sessionsAfterLogout.every(
        (session) => session.status === SessionStatus.REVOKED,
      ),
    ).toBe(true);

    await request(httpServer)
      .get('/api/v1/auth/me')
      .set('Cookie', refreshedSessionCookie)
      .expect(401);
  }, 120000);

  it('returns truthful reversal and receiptless transaction boundaries over HTTP', async () => {
    const loginResponse = await request(httpServer)
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

    const receiptlessFixture = await createReceiptlessTransactionFixture(
      prisma,
      seedData,
    );

    await request(httpServer)
      .post('/api/v1/transactions/reversal-http-test/reverse')
      .set('Cookie', `${sessionCookie}; ${csrfCookie}`)
      .set('x-csrf-token', cookieToken(csrfCookie))
      .set('Idempotency-Key', 'reverse-http-test')
      .send({ reason: 'Customer refund' })
      .expect(404)
      .expect((response) => {
        const body = response.body as {
          success: false;
          error: { code: string };
        };

        expect(body.success).toBe(false);
        expect(body.error.code).toBe('TRANSACTION_NOT_FOUND');
      });

    await request(httpServer)
      .get(`/api/v1/transactions/${receiptlessFixture.ledgerEntry.id}`)
      .set('Cookie', sessionCookie)
      .expect(200)
      .expect((response) => {
        const body = response.body as {
          success: true;
          data: {
            transactionId: string;
            cardSerialNumber: string | null;
            posReceiptNumber: string | null;
            purchaseAmountKobo: number | null;
            captureStatus: string | null;
            reviewStatus: string | null;
            adjustment: { id: string; kind: string; reason: string } | null;
            ledger: { receiptId: string | null };
          };
        };

        expect(body.success).toBe(true);
        expect(body.data.transactionId).toBe(receiptlessFixture.ledgerEntry.id);
        expect(body.data.cardSerialNumber).toBeNull();
        expect(body.data.posReceiptNumber).toBeNull();
        expect(body.data.purchaseAmountKobo).toBeNull();
        expect(body.data.captureStatus).toBeNull();
        expect(body.data.reviewStatus).toBeNull();
        expect(body.data.adjustment).toMatchObject({
          kind: AdjustmentKind.CREDIT,
          reason: 'Receiptless transaction boundary fixture',
        });
        expect(body.data.adjustment?.id).toBeTruthy();
        expect(body.data.ledger.receiptId).toBeNull();
      });
  }, 120000);

  it('replays concurrent same-key adjustment requests with the same response', async () => {
    const loginResponse = await request(httpServer)
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
    const fixture = await createReceiptlessTransactionFixture(prisma, seedData);

    const payload = {
      customerId: fixture.customer.id,
      kind: 'CREDIT',
      amountKobo: 1_000,
      reason: 'Concurrent adjustment replay',
      effectiveAt: fixture.ledgerEntry.effectiveAt.toISOString(),
    };

    const [first, second] = await Promise.all([
      request(httpServer)
        .post('/api/v1/adjustments')
        .set('Cookie', `${sessionCookie}; ${csrfCookie}`)
        .set('x-csrf-token', cookieToken(csrfCookie))
        .set('Idempotency-Key', 'adjustment-concurrent-replay')
        .send(payload)
        .expect(201),
      request(httpServer)
        .post('/api/v1/adjustments')
        .set('Cookie', `${sessionCookie}; ${csrfCookie}`)
        .set('x-csrf-token', cookieToken(csrfCookie))
        .set('Idempotency-Key', 'adjustment-concurrent-replay')
        .send(payload)
        .expect(201),
    ]);

    expect(first.body.data).toMatchObject(second.body.data);
    expect(first.body.data.adjustmentId).toBeDefined();
    expect(first.body.data.creditLot).toBeTruthy();
  }, 120000);

  it('replays concurrent same-key reversal requests with the same response', async () => {
    const loginResponse = await request(httpServer)
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
    const fixture = await createReceiptlessTransactionFixture(prisma, seedData);

    const payload = { reason: 'Concurrent reversal replay' };
    const idempotencyKey = `reversal-concurrent-replay-${Date.now()}`;

    const [first, second] = await Promise.all([
      request(httpServer)
        .post(`/api/v1/transactions/${fixture.ledgerEntry.id}/reverse`)
        .set('Cookie', `${sessionCookie}; ${csrfCookie}`)
        .set('x-csrf-token', cookieToken(csrfCookie))
        .set('Idempotency-Key', idempotencyKey)
        .send(payload)
        .expect(201),
      request(httpServer)
        .post(`/api/v1/transactions/${fixture.ledgerEntry.id}/reverse`)
        .set('Cookie', `${sessionCookie}; ${csrfCookie}`)
        .set('x-csrf-token', cookieToken(csrfCookie))
        .set('Idempotency-Key', idempotencyKey)
        .send(payload)
        .expect(201),
    ]);

    expect(first.body.data).toMatchObject(second.body.data);
    expect(first.body.data.originalTransactionId).toBe(fixture.ledgerEntry.id);
    expect(first.body.data.smsStatus).toBe('QUEUED');
  }, 120000);

  it('binds login sessions to attested devices', async () => {
    const device = await prisma.device.create({
      data: createAttestedDeviceData({
        tenantId: seedData.tenant.id,
        branchId: seedData.branch.id,
        name: 'POS-attested',
        fingerprintHash: 'device-fingerprint-attested',
        status: DeviceStatus.ACTIVE,
      }),
    });

    const loginResponse = await request(httpServer)
      .post('/api/v1/auth/login')
      .set('x-device-id', device.id)
      .set(
        'x-device-attestation',
        buildDeviceAttestation(device.id, device.fingerprintHash),
      )
      .send({
        username: seedData.user.username,
        password: seedData.adminPassword,
      })
      .expect(200);

    const loginBody = loginResponse.body as unknown as AuthLoginResponseBody;

    expect(loginBody.data.session).toHaveProperty('expiresAt');

    const session = await prisma.session.findFirst({
      where: { userId: seedData.user.id, deviceId: device.id },
    });

    expect(session).toBeTruthy();
  }, 120000);

  it('rejects login when the device attestation is missing or invalid', async () => {
    const device = await prisma.device.create({
      data: createAttestedDeviceData({
        tenantId: seedData.tenant.id,
        branchId: seedData.branch.id,
        name: 'POS-unattested',
        fingerprintHash: 'device-fingerprint-unattested',
        status: 'ACTIVE',
      }),
    });

    await request(httpServer)
      .post('/api/v1/auth/login')
      .set('x-device-id', device.id)
      .send({
        username: seedData.user.username,
        password: seedData.adminPassword,
      })
      .expect(400);

    await request(httpServer)
      .post('/api/v1/auth/login')
      .set('x-device-id', device.id)
      .set(
        'x-device-attestation',
        buildDeviceAttestation(device.id, 'wrong-fingerprint-secret'),
      )
      .send({
        username: seedData.user.username,
        password: seedData.adminPassword,
      })
      .expect(400);
  }, 120000);

  it('allows bearer-authenticated unsafe requests without CSRF', async () => {
    const loginResponse = await request(httpServer)
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

    await request(httpServer)
      .post('/api/v1/auth/refresh')
      .set('Authorization', `Bearer ${cookieToken(sessionCookie)}`)
      .expect(200);
  }, 120000);

  it('writes ip, account, and pair buckets for login throttling', async () => {
    await request(httpServer)
      .post('/api/v1/auth/login')
      .send({
        username: seedData.user.username,
        password: seedData.adminPassword,
      })
      .expect(200);

    const redisKeys = await redisEnv.getKeys('auth.login*');

    expect(redisKeys).toHaveLength(3);
    expect(
      redisKeys.some((key) => key.startsWith('auth.login:login:ip:')),
    ).toBe(true);
    expect(
      redisKeys.some((key) =>
        key.startsWith(`auth.login:login:account:${seedData.user.username}`),
      ),
    ).toBe(true);
    expect(
      redisKeys.some(
        (key) =>
          key.startsWith(`auth.login:login:pair:`) &&
          key.endsWith(`:${seedData.user.username}`),
      ),
    ).toBe(true);
  }, 120000);

  it('serializes cashier customer reads with active balance and without PII', async () => {
    const fixture = await createCustomerReadFixture(
      prisma,
      seedData,
      'cashier-http',
    );
    const sessionCookie = await loginSessionCookie(cashierUser.username);

    const listResponse = await request(httpServer)
      .get('/api/v1/customers')
      .query({ q: fixture.customer.phoneE164, limit: '10' })
      .set('Cookie', sessionCookie)
      .expect(200);

    const listItem = (listResponse.body as CustomerListResponseBody).data
      .items[0];
    expect(listItem).toEqual({
      customerId: fixture.customer.id,
      fullName: fixture.customer.fullName,
      maskedPhone: maskPhone(fixture.customer.phoneE164),
      cardStatus: CardStatus.ACTIVE,
      availableBalanceKobo: 1_500,
    });
    expect(listItem).not.toHaveProperty('phoneE164');
    expect(listItem).not.toHaveProperty('email');
    expect(listItem).not.toHaveProperty('creditLots');

    const detailResponse = await request(httpServer)
      .get(`/api/v1/customers/${fixture.customer.id}`)
      .set('Cookie', sessionCookie)
      .expect(200);

    const detail = (detailResponse.body as CustomerDetailResponseBody).data;
    expect(detail.availableBalanceKobo).toBe(1_500);
    expect(detail).not.toHaveProperty('phoneE164');
    expect(detail).not.toHaveProperty('email');
    expect(detail).not.toHaveProperty('creditLots');
  }, 120000);

  it('serializes supervisor customer reads without raw bigint or credit lots', async () => {
    const fixture = await createCustomerReadFixture(
      prisma,
      seedData,
      'supervisor-http',
    );
    const sessionCookie = await loginSessionCookie(seedData.user.username);

    const listResponse = await request(httpServer)
      .get('/api/v1/customers')
      .query({ q: fixture.customer.email, limit: '10' })
      .set('Cookie', sessionCookie)
      .expect(200);

    const listItem = (listResponse.body as CustomerListResponseBody).data
      .items[0];
    expect(listItem).toMatchObject({
      id: fixture.customer.id,
      phoneE164: fixture.customer.phoneE164,
      email: fixture.customer.email,
      activeCardStatus: CardStatus.ACTIVE,
      availableBalanceKobo: 1_500,
    });
    expect(typeof listItem.availableBalanceKobo).toBe('number');
    expect(listItem).not.toHaveProperty('creditLots');

    const detailResponse = await request(httpServer)
      .get(`/api/v1/customers/${fixture.customer.id}`)
      .set('Cookie', sessionCookie)
      .expect(200);

    const detail = (detailResponse.body as CustomerDetailResponseBody).data;
    expect(detail).toMatchObject({
      id: fixture.customer.id,
      phoneE164: fixture.customer.phoneE164,
      email: fixture.customer.email,
      availableBalanceKobo: 1_500,
    });
    expect(detail).not.toHaveProperty('creditLots');

    const auditLog = await prisma.auditLog.findFirst({
      where: {
        tenantId: seedData.tenant.id,
        actorId: seedData.user.id,
        action: 'customer.pii.list',
      },
      orderBy: { createdAt: 'desc' },
    });
    expect(auditLog?.metadata).toMatchObject({
      queryPresent: true,
      queryType: 'email',
      resultCount: 1,
    });
    expect(JSON.stringify(auditLog?.metadata)).not.toContain(
      fixture.customer.email!,
    );
  }, 120000);

  it('serializes card lookup with minimized customer active balance', async () => {
    const fixture = await createCustomerReadFixture(
      prisma,
      seedData,
      'card-http',
    );
    const sessionCookie = await loginSessionCookie(cashierUser.username);

    const response = await request(httpServer)
      .get(`/api/v1/cards/lookup/${fixture.card.barcodeValue}`)
      .set('Cookie', sessionCookie)
      .expect(200);

    const body = response.body as CardLookupResponseBody;
    expect(body.data.customer).toEqual({
      customerId: fixture.customer.id,
      fullName: fixture.customer.fullName,
      maskedPhone: maskPhone(fixture.customer.phoneE164),
      cardStatus: CardStatus.ACTIVE,
      availableBalanceKobo: 1_500,
    });
    expect(body.data.customer).not.toHaveProperty('email');
    expect(body.data.customer).not.toHaveProperty('creditLots');
  }, 120000);

  it('returns 201 for confirmed redemption and 202 for pending approval redemption', async () => {
    const fixture = await createCustomerReadFixture(
      prisma,
      seedData,
      'redeem-http',
    );
    await createCreditLotFixture(prisma, seedData, {
      customerId: fixture.customer.id,
      cardId: fixture.card.id,
      suffix: 'redeem-http-topup',
      remainingAmountKobo: 1_000_000,
      originalAmountKobo: 1_000_000,
      earnedAt: new Date(Date.now() - 60_000),
    });

    const device = await prisma.device.create({
      data: createAttestedDeviceData({
        tenantId: seedData.tenant.id,
        branchId: seedData.branch.id,
        name: 'POS-redeem-http',
        fingerprintHash: 'device-fingerprint-redeem-http',
        status: DeviceStatus.ACTIVE,
      }),
    });
    const bearerToken = await loginCashierBearerToken(
      device.id,
      device.fingerprintHash,
    );
    const occurredAt = new Date(Date.now() - 60_000).toISOString();

    await request(httpServer)
      .post('/api/v1/transactions/redeem')
      .set('Authorization', `Bearer ${bearerToken}`)
      .set('Idempotency-Key', 'redeem-http-pending')
      .send({
        cardSerialNumber: fixture.card.barcodeValue,
        posReceiptNumber: 'POS-REDEEM-HTTP-PENDING',
        basketAmountKobo: 2_000_000,
        requestedRedemptionKobo: 600_000,
        occurredAt,
      })
      .expect(202)
      .expect((response) => {
        const body = response.body as { data: { state: string } };

        expect(body.data.state).toBe('PENDING_APPROVAL');
      });

    await request(httpServer)
      .post('/api/v1/transactions/redeem')
      .set('Authorization', `Bearer ${bearerToken}`)
      .set('Idempotency-Key', 'redeem-http-confirmed')
      .send({
        cardSerialNumber: fixture.card.barcodeValue,
        posReceiptNumber: 'POS-REDEEM-HTTP-CONFIRMED',
        basketAmountKobo: 1_000_000,
        requestedRedemptionKobo: 100_000,
        occurredAt,
      })
      .expect(201)
      .expect((response) => {
        const body = response.body as { data: { state: string } };

        expect(body.data.state).toBe('CONFIRMED');
      });
  }, 120000);

  it('returns RATE_LIMITED when earn throttling is exhausted', async () => {
    const sessionCookie = await loginSessionCookie(cashierUser.username);
    const bearerToken = cookieToken(sessionCookie);

    for (let index = 0; index < 30; index += 1) {
      await request(httpServer)
        .post('/api/v1/transactions/earn')
        .set('Authorization', `Bearer ${bearerToken}`)
        .set('Idempotency-Key', `throttle-${index}`)
        .send({})
        .expect(400);
    }

    const response = await request(httpServer)
      .post('/api/v1/transactions/earn')
      .set('Authorization', `Bearer ${bearerToken}`)
      .set('Idempotency-Key', 'throttle-over-limit')
      .send({})
      .expect(429);

    expect(response.body).toMatchObject({
      success: false,
      error: {
        statusCode: 429,
        code: 'RATE_LIMITED',
      },
    });
  }, 120000);

  it('rejects protected requests when the tenant or branch is inactive', async () => {
    const loginResponse = await request(httpServer)
      .post('/api/v1/auth/login')
      .send({ username: seedData.username, password: seedData.adminPassword })
      .expect(200);

    const sessionCookie = cookieValue(
      loginResponse.headers['set-cookie'],
      'shopcity_session',
    );

    await prisma.tenant.update({
      where: { id: seedData.tenant.id },
      data: { status: TenantStatus.SUSPENDED },
    });

    await request(httpServer)
      .get('/api/v1/auth/me')
      .set('Cookie', sessionCookie)
      .expect(401);

    await prisma.tenant.update({
      where: { id: seedData.tenant.id },
      data: { status: TenantStatus.ACTIVE },
    });
    await prisma.branch.update({
      where: { id: seedData.branch.id },
      data: { status: BranchStatus.INACTIVE },
    });

    await request(httpServer)
      .get('/api/v1/auth/me')
      .set('Cookie', sessionCookie)
      .expect(401);
  }, 120000);

  it('serves branch config from the database', async () => {
    await prisma.tenant.update({
      where: { id: seedData.tenant.id },
      data: { status: TenantStatus.ACTIVE },
    });
    await prisma.branch.update({
      where: { id: seedData.branch.id },
      data: { status: BranchStatus.ACTIVE },
    });

    await prisma.branch.update({
      where: { id: seedData.branch.id },
      data: {
        timezone: 'Africa/Nairobi',
        receiptWeekStartDay: 3,
      },
    });

    const response = await request(httpServer)
      .get('/api/v1/config/public')
      .expect(200);

    const body = response.body as PublicConfigResponseBody;
    expect(body.data.branch).toEqual({
      id: seedData.branch.id,
      name: 'Main Branch',
      timezone: 'Africa/Nairobi',
      receiptWeekStartDay: 3,
    });
    expect(body.data.policies.purchaseAmountCeilingKobo).toBe(100000000);
  }, 120000);

  it('rejects public config when the tenant or branch is inactive', async () => {
    await prisma.tenant.update({
      where: { id: seedData.tenant.id },
      data: { status: TenantStatus.SUSPENDED },
    });

    await request(httpServer).get('/api/v1/config/public').expect(503);

    await prisma.tenant.update({
      where: { id: seedData.tenant.id },
      data: { status: TenantStatus.ACTIVE },
    });
    await prisma.branch.update({
      where: { id: seedData.branch.id },
      data: { status: BranchStatus.INACTIVE },
    });

    await request(httpServer).get('/api/v1/config/public').expect(503);
  }, 120000);

  it('reports readiness from live postgres and redis dependencies', async () => {
    const response = await request(httpServer).get('/health/ready');
    expect(response.status).toBe(200);
    const body = response.body as ReadinessResponseBody;
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('ok');
    expect(body.data.info.database.status).toBe('up');
    expect(body.data.info.redis.status).toBe('up');
  }, 120000);

  async function loginSessionCookie(username: string): Promise<string> {
    const response = await request(httpServer)
      .post('/api/v1/auth/login')
      .send({ username, password: seedData.adminPassword })
      .expect(200);

    return cookieValue(response.headers['set-cookie'], 'shopcity_session');
  }

  async function loginCashierBearerToken(
    deviceId: string,
    fingerprintHash: string,
  ): Promise<string> {
    const response = await request(httpServer)
      .post('/api/v1/auth/login')
      .set('x-device-id', deviceId)
      .set(
        'x-device-attestation',
        buildDeviceAttestation(deviceId, fingerprintHash),
      )
      .send({
        username: cashierUser.username,
        password: seedData.adminPassword,
      })
      .expect(200);

    return cookieToken(
      cookieValue(response.headers['set-cookie'], 'shopcity_session'),
    );
  }
});

type AuthLoginResponseBody = {
  success: boolean;
  data: {
    user: {
      id: string;
      username: string;
      role: UserRole;
      branchId: string | null;
    };
    session: {
      expiresAt: string;
    };
  };
};

type AuthMeResponseBody = {
  data: {
    user: {
      username: string;
    };
  };
};

type PublicConfigResponseBody = {
  data: {
    branch: {
      id: string;
      name: string;
      timezone: string;
      receiptWeekStartDay: number;
    };
    policies: {
      purchaseAmountCeilingKobo: number;
    };
  };
};

type ReadinessResponseBody = {
  success: boolean;
  data: {
    status: string;
    info: {
      database: { status: string };
      redis: { status: string };
    };
  };
};

type CustomerListResponseBody = {
  data: {
    items: Array<Record<string, unknown> & { availableBalanceKobo?: number }>;
  };
};

type CustomerDetailResponseBody = {
  data: Record<string, unknown> & { availableBalanceKobo?: number };
};

type CardLookupResponseBody = {
  data: {
    customer: Record<string, unknown> & { availableBalanceKobo?: number };
  };
};

let customerReadFixtureCounter = 0;

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

async function createStaffUser(
  prisma: PrismaClient,
  tenantId: string,
  branchId: string,
  role: UserRole,
  username: string,
  supabaseAuthId: string,
) {
  return prisma.user.create({
    data: {
      tenantId,
      branchId,
      username,
      role,
      status: 'ACTIVE',
      supabaseAuthId,
    },
  });
}

async function createCustomerReadFixture(
  prisma: PrismaClient,
  seedData: Awaited<ReturnType<typeof seedFoundation>>,
  suffix: string,
) {
  const now = new Date();
  customerReadFixtureCounter += 1;
  const phoneE164 = `+234802${String(customerReadFixtureCounter).padStart(7, '0')}`;
  const customer = await prisma.customer.create({
    data: {
      tenantId: seedData.tenant.id,
      branchId: seedData.branch.id,
      fullName: `Read Model ${suffix}`,
      email: `read-model-${suffix}@shopcity.local`,
      phoneE164,
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
      barcodeValue: `CARD-${suffix}`,
      status: CardStatus.ACTIVE,
      issuedByTenantId: seedData.tenant.id,
      issuedBy: seedData.user.id,
    },
  });

  const activeEarnedAt = now;
  const expiredEarnedAt = new Date(
    Date.UTC(
      now.getUTCFullYear() - 2,
      now.getUTCMonth(),
      now.getUTCDate(),
      now.getUTCHours(),
      now.getUTCMinutes(),
      now.getUTCSeconds(),
      now.getUTCMilliseconds(),
    ),
  );

  await createCreditLotFixture(prisma, seedData, {
    customerId: customer.id,
    cardId: card.id,
    suffix: `${suffix}-active`,
    remainingAmountKobo: 1_500,
    earnedAt: activeEarnedAt,
  });
  await createCreditLotFixture(prisma, seedData, {
    customerId: customer.id,
    cardId: card.id,
    suffix: `${suffix}-expired`,
    remainingAmountKobo: 2_500,
    earnedAt: expiredEarnedAt,
  });
  await createCreditLotFixture(prisma, seedData, {
    customerId: customer.id,
    cardId: card.id,
    suffix: `${suffix}-depleted`,
    originalAmountKobo: 500,
    remainingAmountKobo: 0,
    earnedAt: activeEarnedAt,
  });

  return { customer, card };
}

async function createCreditLotFixture(
  prisma: PrismaClient,
  seedData: Awaited<ReturnType<typeof seedFoundation>>,
  data: {
    customerId: string;
    cardId: string;
    suffix: string;
    originalAmountKobo?: number;
    remainingAmountKobo: number;
    earnedAt: Date;
  },
) {
  const occurredAt = data.earnedAt;
  const originalAmountKobo =
    data.originalAmountKobo ?? data.remainingAmountKobo;
  return prisma.$transaction(async (tx) => {
    const receipt = await tx.receipt.create({
      data: {
        tenantId: seedData.tenant.id,
        branchId: seedData.branch.id,
        customerId: data.customerId,
        cardId: data.cardId,
        posReceiptNumber: `READ-${data.suffix}`,
        normalizedPosReceiptNumber: `read-${data.suffix}`,
        receiptWeekStart: new Date(
          Date.UTC(
            occurredAt.getUTCFullYear(),
            occurredAt.getUTCMonth(),
            occurredAt.getUTCDate(),
          ),
        ),
        purchaseAmountKobo: Math.max(originalAmountKobo, 1),
        occurredAt,
        capturedByTenantId: seedData.tenant.id,
        capturedBy: seedData.user.id,
        captureStatus: ReceiptCaptureStatus.CAPTURED,
        reviewStatus: ReceiptReviewStatus.APPROVED,
        reviewedAt: occurredAt,
        reviewedByTenantId: seedData.tenant.id,
        reviewedBy: seedData.user.id,
        approvedByTenantId: seedData.tenant.id,
        approvedBy: seedData.user.id,
        approvedAt: occurredAt,
      },
    });
    const ledgerEntry = await tx.loyaltyLedgerEntry.create({
      data: {
        tenantId: seedData.tenant.id,
        customerId: data.customerId,
        receiptId: receipt.id,
        type: LedgerEntryType.EARN,
        direction: LedgerEntryDirection.CREDIT,
        amountKobo: originalAmountKobo,
        status: LedgerEntryStatus.CONFIRMED,
        correlationId: `read-model-${data.suffix}`,
        createdByTenantId: seedData.tenant.id,
        createdBy: seedData.user.id,
        effectiveAt: occurredAt,
      },
    });

    return tx.creditLot.create({
      data: {
        tenantId: seedData.tenant.id,
        customerId: data.customerId,
        earnLedgerEntryId: ledgerEntry.id,
        originalAmountKobo,
        remainingAmountKobo: data.remainingAmountKobo,
        earnedAt: data.earnedAt,
        expiresAt: addUtcYears(data.earnedAt, 1),
      },
    });
  });
}

async function createReceiptlessTransactionFixture(
  prisma: PrismaClient,
  seedData: Awaited<ReturnType<typeof seedFoundation>>,
) {
  return prisma.$transaction(async (tx) => {
    const effectiveAt = new Date();
    const uniqueSuffix = `${Date.now()}-${++receiptlessFixtureSeq}`;
    const customer = await tx.customer.create({
      data: {
        tenantId: seedData.tenant.id,
        branchId: seedData.branch.id,
        fullName: 'Receiptless Read Model',
        email: `receiptless-read-model-${uniqueSuffix}@shopcity.local`,
        phoneE164: `+234802${String(uniqueSuffix).replace(/\D/g, '').padStart(7, '0').slice(-7)}`,
        isStaff: false,
        status: CustomerStatus.ACTIVE,
        registeredByTenantId: seedData.tenant.id,
        registeredBy: seedData.user.id,
      },
    });

    const ledgerEntry = await tx.loyaltyLedgerEntry.create({
      data: {
        tenantId: seedData.tenant.id,
        customerId: customer.id,
        receiptId: null,
        type: LedgerEntryType.ADJUSTMENT,
        direction: LedgerEntryDirection.CREDIT,
        amountKobo: 1_000n,
        status: LedgerEntryStatus.CONFIRMED,
        correlationId: `receiptless-${randomUUID()}`,
        createdByTenantId: seedData.tenant.id,
        createdBy: seedData.user.id,
        effectiveAt,
      },
    });

    await tx.adjustment.create({
      data: {
        tenantId: seedData.tenant.id,
        customerId: customer.id,
        kind: AdjustmentKind.CREDIT,
        amountKobo: 1_000n,
        reason: 'Receiptless transaction boundary fixture',
        createdByTenantId: seedData.tenant.id,
        createdBy: seedData.user.id,
        ledgerEntryId: ledgerEntry.id,
        effectiveAt,
      },
    });

    await tx.creditLot.create({
      data: {
        tenantId: seedData.tenant.id,
        customerId: customer.id,
        earnLedgerEntryId: ledgerEntry.id,
        originalAmountKobo: 1_000n,
        remainingAmountKobo: 1_000n,
        earnedAt: effectiveAt,
        expiresAt: addUtcYears(effectiveAt, 1),
      },
    });

    return { customer, ledgerEntry };
  });
}

function addUtcYears(date: Date, years: number): Date {
  const year = date.getUTCFullYear() + years;
  const month = date.getUTCMonth();
  const lastDayOfMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const day = Math.min(date.getUTCDate(), lastDayOfMonth);

  return new Date(
    Date.UTC(
      year,
      month,
      day,
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds(),
      date.getUTCMilliseconds(),
    ),
  );
}

function maskPhone(phoneE164: string): string {
  const normalized = phoneE164.trim();
  if (normalized.length <= 6) {
    return '***';
  }

  return `${normalized.slice(0, Math.min(7, normalized.length - 4))}* *** ${normalized.slice(-4)}`;
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
