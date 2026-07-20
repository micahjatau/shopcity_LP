import { execSync } from 'node:child_process';
import {
  PrismaClient,
  BranchStatus,
  TenantStatus,
  SessionStatus,
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

describe('auth and readiness flows (int)', () => {
  let pgContainer: Awaited<ReturnType<PostgreSqlContainer['start']>>;
  let redisEnv: RedisTestEnvironment;
  let prisma: PrismaClient;
  let app: any;
  let createAppFn: (options?: { enableDocs?: boolean }) => Promise<any>;
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
    const loginResponse = await request(app.getHttpServer())
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

    expect(loginResponse.body.success).toBe(true);
    expect(loginResponse.body.data.user).toEqual({
      id: seedData.user.id,
      username: seedData.user.username,
      role: UserRole.ADMIN,
      branchId: seedData.user.branchId,
    });
    expect(loginResponse.body.data.session).toHaveProperty('expiresAt');

    await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Cookie', loginSessionCookie)
      .expect(200)
      .expect((response) => {
        expect(response.body.data.user.username).toBe(seedData.user.username);
      });

    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', `${loginSessionCookie}; ${loginCsrfCookie}`)
      .expect(403);

    const refreshResponse = await request(app.getHttpServer())
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

    await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Cookie', loginSessionCookie)
      .expect(401);

    await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Cookie', refreshedSessionCookie)
      .expect(200);

    await request(app.getHttpServer())
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

    await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Cookie', refreshedSessionCookie)
      .expect(401);
  }, 120000);

  it('writes ip, account, and pair buckets for login throttling', async () => {
    await request(app.getHttpServer())
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
    const loginResponse = await request(app.getHttpServer())
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

    await request(app.getHttpServer())
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

    await request(app.getHttpServer())
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

    const response = await request(app.getHttpServer())
      .get('/api/v1/config/public')
      .expect(200);

    expect(response.body.data.branch).toEqual({
      id: seedData.branch.id,
      name: 'Main Branch',
      timezone: 'Africa/Nairobi',
      receiptWeekStartDay: 3,
    });
  }, 120000);

  it('rejects public config when the tenant or branch is inactive', async () => {
    await prisma.tenant.update({
      where: { id: seedData.tenant.id },
      data: { status: TenantStatus.SUSPENDED },
    });

    await request(app.getHttpServer()).get('/api/v1/config/public').expect(503);

    await prisma.tenant.update({
      where: { id: seedData.tenant.id },
      data: { status: TenantStatus.ACTIVE },
    });
    await prisma.branch.update({
      where: { id: seedData.branch.id },
      data: { status: BranchStatus.INACTIVE },
    });

    await request(app.getHttpServer()).get('/api/v1/config/public').expect(503);
  }, 120000);

  it('reports readiness from live postgres and redis dependencies', async () => {
    const response = await request(app.getHttpServer()).get('/health/ready');
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe('ok');
    expect(response.body.data.info.database.status).toBe('up');
    expect(response.body.data.info.redis.status).toBe('up');
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
