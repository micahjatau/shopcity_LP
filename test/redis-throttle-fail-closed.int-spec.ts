/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-require-imports, @typescript-eslint/no-unnecessary-type-assertion */
import { execSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import request from 'supertest';
import { seedFoundation } from '../prisma/seed';

describe('redis throttling fail-closed (int)', () => {
  let pgContainer: Awaited<ReturnType<PostgreSqlContainer['start']>>;
  let prisma: PrismaClient;
  let app: any;
  let createAppFn: (options?: { enableDocs?: boolean }) => Promise<any>;

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
    process.env.REDIS_URL = 'redis://127.0.0.1:6399';
    process.env.SESSION_SECRET = 'session-secret';
    process.env.CSRF_SECRET = 'csrf-secret';
    process.env.SUPABASE_URL = 'http://127.0.0.1:54321';
    process.env.SUPABASE_ANON_KEY = 'test-anon-key';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';

    jest.resetModules();
    ({ createApp: createAppFn } = require('../src/bootstrap'));
    const { SupabaseService } = require('../src/supabase/supabase.service');

    prisma = new PrismaClient({
      datasources: { db: { url: databaseUrl } },
    });
    await prisma.$connect();

    const seedData = await seedFoundation(prisma, {
      supabaseAdminClient: createSupabaseAdminStub('seed-admin-supabase-user'),
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
  }, 240000);

  afterAll(async () => {
    await app?.close();
    await prisma?.$disconnect();
    await pgContainer?.stop();
  }, 240000);

  it('returns service unavailable when Redis cannot be reached', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        username: 'admin@shopcity.local',
        password: 'password',
      })
      .expect(503);
  }, 240000);
});

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
