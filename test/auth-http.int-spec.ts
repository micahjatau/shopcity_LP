import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import {
  PrismaClient,
  SessionStatus,
  UserRole,
  UserStatus,
} from '@prisma/client';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { createServer, type AddressInfo, type Server } from 'node:net';
import request from 'supertest';
import { SupabaseService } from '../src/supabase/supabase.service';

describe('auth and readiness flows (int)', () => {
  let pgContainer: Awaited<ReturnType<PostgreSqlContainer['start']>>;
  let redisServer: Server;
  let prisma: PrismaClient;
  let app: any;
  let createAppFn: (options?: { enableDocs?: boolean }) => Promise<any>;
  let seedData: Awaited<ReturnType<typeof seedFoundation>>;

  beforeAll(async () => {
    pgContainer = await new PostgreSqlContainer('postgres:16-alpine').start();

    const databaseUrl = pgContainer.getConnectionUri();
    redisServer = createRedisPongServer();
    await new Promise<void>((resolve) =>
      redisServer.listen(0, '127.0.0.1', resolve),
    );
    const address = redisServer.address();
    if (!isAddressInfo(address)) {
      throw new Error('Redis test server did not bind a port');
    }
    const redisUrl = `redis://127.0.0.1:${address.port}`;

    execSync('npx prisma migrate deploy', {
      stdio: 'inherit',
      env: {
        ...process.env,
        DATABASE_URL: databaseUrl,
      },
    });

    process.env.DATABASE_URL = databaseUrl;
    process.env.REDIS_URL = redisUrl;
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

    seedData = await seedFoundation(prisma);

    app = await createAppFn({ enableDocs: false });
    await app.getHttpAdapter().getInstance().ready();

    const supabaseService = app.get(SupabaseService);
    jest
      .spyOn((supabaseService.publicClient.auth as any), 'signInWithPassword')
      .mockResolvedValue({
        data: { user: { id: seedData.user.supabaseAuthId } },
        error: null,
      } as never);
  }, 120000);

  afterAll(async () => {
    await app?.close();
    await prisma?.$disconnect();
    await new Promise<void>((resolve) => redisServer?.close(() => resolve()));
    await pgContainer?.stop();
  }, 120000);

  it('logs in, rotates, rejects stale sessions, and logs out over HTTP', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ username: seedData.user.username, password: 'password' })
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

  it('reports readiness from live postgres and redis dependencies', async () => {
    const response = await request(app.getHttpServer()).get('/health/ready');
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe('ok');
    expect(response.body.data.info.database.status).toBe('up');
    expect(response.body.data.info.redis.status).toBe('up');
  }, 120000);
});

async function seedFoundation(prisma: PrismaClient) {
  const tenantId = randomUUID();
  const branchId = randomUUID();
  const userId = randomUUID();
  const supabaseAuthId = randomUUID();
  const username = `admin-${userId.slice(0, 8)}@shopcity.local`;

  const tenant = await prisma.tenant.upsert({
    where: { id: tenantId },
    update: { name: 'ShopCity', status: 'ACTIVE' },
    create: {
      id: tenantId,
      name: 'ShopCity',
      status: 'ACTIVE',
    },
  });

  const branch = await prisma.branch.upsert({
    where: { id: branchId },
    update: {
      tenantId: tenant.id,
      name: 'Main Branch',
      timezone: 'Africa/Lagos',
      receiptWeekStartDay: 1,
      status: 'ACTIVE',
    },
    create: {
      id: branchId,
      tenantId: tenant.id,
      name: 'Main Branch',
      timezone: 'Africa/Lagos',
      receiptWeekStartDay: 1,
      status: 'ACTIVE',
    },
  });

  const user = await prisma.user.upsert({
    where: { id: userId },
    update: {
      tenantId: tenant.id,
      branchId: branch.id,
      username,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      supabaseAuthId,
    },
    create: {
      id: userId,
      tenantId: tenant.id,
      branchId: branch.id,
      username,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      supabaseAuthId,
    },
  });

  return {
    tenant,
    branch,
    user,
    username,
  };
}

function cookieValue(setCookie: string[] | string | undefined, name: string): string {
  const cookies = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : [];
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

function createRedisPongServer(): Server {
  return createServer((socket) => {
    socket.on('data', () => {
      socket.write('+PONG\r\n');
    });
  });
}

function isAddressInfo(address: string | AddressInfo | null): address is AddressInfo {
  return Boolean(address && typeof address !== 'string');
}
