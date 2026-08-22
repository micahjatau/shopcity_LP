import { execSync } from 'node:child_process';
import type { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import request from 'supertest';
import { seedFoundation } from '../prisma/seed';

describe('redis throttling fail-closed (int)', () => {
  let pgContainer: Awaited<ReturnType<PostgreSqlContainer['start']>>;
  let prisma: PrismaClient;
  let app: INestApplication;
  let createAppFn: (options?: {
    enableDocs?: boolean;
  }) => Promise<INestApplication>;
  let SupabaseServiceToken: typeof import('../src/supabase/supabase.service').SupabaseService;
  let httpServer: Parameters<typeof request>[0];

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

    const seedData = await seedFoundation(prisma, {
      supabaseAdminClient: createSupabaseAdminStub('seed-admin-supabase-user'),
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
    const user = {
      id: seedData.user.supabaseAuthId,
      app_metadata: {},
      user_metadata: {},
      aud: 'authenticated',
      created_at: new Date().toISOString(),
    } satisfies AuthUser;
    const session = {
      access_token: 'test-access-token',
      refresh_token: 'test-refresh-token',
      expires_in: 3600,
      token_type: 'bearer',
      user,
    } satisfies AuthSession;
    const successResponse = {
      data: {
        user,
        session,
      },
      error: null,
    } satisfies Awaited<
      ReturnType<typeof supabaseService.publicClient.auth.signInWithPassword>
    >;
    jest
      .spyOn(supabaseService.publicClient.auth, 'signInWithPassword')
      .mockResolvedValue(successResponse);
  }, 240000);

  afterAll(async () => {
    await app?.close();
    await prisma?.$disconnect();
    await pgContainer?.stop();
  }, 240000);

  it('returns service unavailable when Redis cannot be reached', async () => {
    await request(httpServer)
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
        createUser: jest
          .fn()
          .mockImplementation(({ email }: { email?: string }) => ({
            data: {
              user: {
                id: email?.startsWith('cashier@')
                  ? `${supabaseAuthId}-cashier`
                  : email?.startsWith('supervisor@')
                    ? `${supabaseAuthId}-supervisor`
                    : supabaseAuthId,
              },
            },
            error: null,
          })),
        updateUserById: jest.fn(),
        deleteUser: jest.fn(),
      },
    },
  } as never;
}

type AuthUser = {
  id: string;
  app_metadata: Record<string, unknown>;
  user_metadata: Record<string, unknown>;
  aud: string;
  created_at: string;
};

type AuthSession = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: 'bearer';
  user: AuthUser;
};
