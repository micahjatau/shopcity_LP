import { execSync } from 'node:child_process';
import { createHmac, randomUUID } from 'node:crypto';
import {
  PrismaClient,
  BranchStatus,
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
import type { INestApplication } from '@nestjs/common';

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
      .mockResolvedValue({
        data: {
          user: { id: seedData.user.supabaseAuthId },
          session: null,
        },
        error: null,
      } as never);
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

  it('binds login sessions to attested devices', async () => {
    const device = await prisma.device.create({
      data: {
        tenantId: seedData.tenant.id,
        branchId: seedData.branch.id,
        name: 'POS-attested',
        fingerprintHash: 'device-fingerprint-attested',
        status: DeviceStatus.ACTIVE,
      },
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
      data: {
        tenantId: seedData.tenant.id,
        branchId: seedData.branch.id,
        name: 'POS-unattested',
        fingerprintHash: 'device-fingerprint-unattested',
        status: 'ACTIVE',
      },
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
