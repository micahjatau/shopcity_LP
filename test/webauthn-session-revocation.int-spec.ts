import { execSync } from 'node:child_process';
import {
  DeviceAuthBindingMode,
  DeviceAttestationTrustResult,
  DeviceStatus,
  DeviceWebAuthnCredentialStatus,
  Prisma,
  PrismaClient,
  SessionPurpose,
  SessionStatus,
  UserRole,
} from '@prisma/client';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { seedFoundation } from '../prisma/seed';
import { AuthService } from '../src/modules/auth/auth.service';
import { BranchesService } from '../src/modules/branches/branches.service';

describe('WebAuthn session revocation PostgreSQL race', () => {
  let container: Awaited<ReturnType<PostgreSqlContainer['start']>>;
  let prisma: PrismaClient;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine').start();
    const databaseUrl = container.getConnectionUri();
    execSync('npx prisma migrate deploy', {
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: databaseUrl },
    });
    prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
    await prisma.$connect();
  }, 120000);

  afterAll(async () => {
    await prisma?.$disconnect();
    await container?.stop();
  }, 120000);

  it('revokes the rotated successor when credential revocation races refresh', async () => {
    const seed = await seedFoundation(prisma, {
      supabaseAdminClient: createSupabaseAdminStub(),
    });
    const cashier = await prisma.user.findUniqueOrThrow({
      where: { id: '00000000-0000-4000-8000-000000000004' },
    });
    expect(cashier.role).toBe(UserRole.CASHIER);

    const device = await prisma.device.create({
      data: {
        tenantId: seed.tenant.id,
        branchId: seed.branch.id,
        name: 'Race test WebAuthn device',
        authBindingMode: DeviceAuthBindingMode.WEBAUTHN,
        pairedAt: new Date(),
        status: DeviceStatus.ACTIVE,
      },
    });
    const credential = await prisma.deviceWebAuthnCredential.create({
      data: {
        tenantId: seed.tenant.id,
        deviceId: device.id,
        credentialId: 'race-test-credential',
        publicKey: Buffer.from('test-public-key'),
        aaguid: '00000000-0000-0000-0000-000000000000',
        authenticatorAttachment: 'platform',
        backupEligible: false,
        backedUp: false,
        attestationFormat: 'packed',
        attestationTrustResult: DeviceAttestationTrustResult.TRUSTED,
        rpId: 'localhost',
        status: DeviceWebAuthnCredentialStatus.ACTIVE,
        pairedAt: new Date(),
      },
    });
    const initialSession = await prisma.session.create({
      data: {
        userId: cashier.id,
        deviceId: device.id,
        deviceCredentialId: credential.id,
        sessionTokenHash: 'race-session-token-hash',
        csrfTokenHash: 'race-csrf-token-hash',
        purpose: SessionPurpose.USER,
        status: SessionStatus.ACTIVE,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    let releaseRefreshLock!: () => void;
    let signalRefreshCredentialLock!: () => void;
    let signalRevokeDeviceLockDispatched!: () => void;
    let revokeBackendPid: number | undefined;
    const refreshGate = new Promise<void>((resolve) => {
      releaseRefreshLock = resolve;
    });
    const refreshCredentialLockReached = new Promise<void>((resolve) => {
      signalRefreshCredentialLock = resolve;
    });
    const revokeDeviceLockDispatched = new Promise<void>((resolve) => {
      signalRevokeDeviceLockDispatched = resolve;
    });

    const authService = new AuthService(
      prismaProxy(prisma, {
        async onRawQuery(query, execute) {
          const sql = rawQueryText(query);
          const result = await execute();
          if (sql.includes('DeviceWebAuthnCredential')) {
            signalRefreshCredentialLock();
            await refreshGate;
          }
          return result;
        },
      }) as never,
      {
        publicClient: { auth: { signInWithPassword: jest.fn() } },
        serviceRoleClient: { auth: { admin: {} } },
      } as never,
      {
        get: (key: string) =>
          ({
            SESSION_SECRET: 'session-secret',
            WEBAUTHN_RP_ID: 'localhost',
          })[key],
      } as never,
      auditStub() as never,
    );
    const branchesService = new BranchesService(
      prismaProxy(prisma, {
        async onTransaction(transaction) {
          const rows = await transaction.$queryRaw<{ pid: number }[]>(
            Prisma.sql`SELECT pg_backend_pid() AS pid`,
          );
          revokeBackendPid = rows[0]?.pid;
        },
        onRawQuery(query, execute) {
          const result = execute();
          if (rawQueryText(query).includes('FROM "Device"')) {
            signalRevokeDeviceLockDispatched();
          }
          return result;
        },
      }) as never,
      auditStub() as never,
      { get: () => undefined } as never,
    );

    let refreshPromise: ReturnType<AuthService['refresh']> | undefined;
    let revokePromise:
      ReturnType<BranchesService['revokeDeviceCredential']> | undefined;
    try {
      refreshPromise = authService.refresh(initialSession.id);
      void refreshPromise.catch(() => signalRefreshCredentialLock());
      await refreshCredentialLockReached;
      revokePromise = branchesService.revokeDeviceCredential(
        seed.tenant.id,
        seed.actor,
        device.id,
        credential.id,
      );
      void revokePromise.catch(() => signalRevokeDeviceLockDispatched());
      await revokeDeviceLockDispatched;
      if (revokeBackendPid === undefined) {
        throw new Error('Could not identify the revocation transaction PID');
      }
      await waitForBackendLockWait(prisma, revokeBackendPid);
      releaseRefreshLock();
      await Promise.all([refreshPromise, revokePromise]);
    } finally {
      // Always unblock the retained transaction and drain started operations, even
      // when an assertion or one of the service calls fails.
      releaseRefreshLock();
      await Promise.allSettled(
        [refreshPromise, revokePromise].filter(
          (operation): operation is NonNullable<typeof operation> =>
            operation !== undefined,
        ),
      );
    }

    const persistedCredential =
      await prisma.deviceWebAuthnCredential.findUniqueOrThrow({
        where: { id: credential.id },
      });
    const sessions = await prisma.session.findMany({
      where: { deviceCredentialId: credential.id },
    });
    expect(persistedCredential.status).toBe(
      DeviceWebAuthnCredentialStatus.REVOKED,
    );
    expect(sessions).toHaveLength(2);
    expect(
      sessions.every((session) => session.status === SessionStatus.REVOKED),
    ).toBe(true);
    expect(
      sessions.some(
        (session) =>
          session.id !== initialSession.id &&
          session.status === SessionStatus.REVOKED,
      ),
    ).toBe(true);
    expect(
      sessions.filter((session) => session.status === SessionStatus.ACTIVE),
    ).toHaveLength(0);
  }, 120000);
});

function prismaProxy(
  client: PrismaClient,
  hooks: {
    onTransaction?: (transaction: Prisma.TransactionClient) => Promise<void>;
    onRawQuery: (
      query: Prisma.Sql,
      execute: () => Promise<unknown>,
    ) => Promise<unknown>;
  },
): PrismaClient {
  const wrapTransaction = (transaction: Prisma.TransactionClient) =>
    new Proxy(transaction, {
      get(target, property, receiver) {
        const value: unknown = Reflect.get(
          target,
          property,
          receiver,
        ) as unknown;
        if (property === '$queryRaw') {
          const queryRaw = value as (query: Prisma.Sql) => Promise<unknown>;
          return (query: Prisma.Sql) =>
            hooks.onRawQuery(query, () => queryRaw.call(target, query));
        }
        return typeof value === 'function'
          ? (...args: unknown[]) =>
              Reflect.apply(value, target, args) as unknown
          : value;
      },
    });

  return new Proxy(client, {
    get(target, property, receiver) {
      if (property === '$transaction') {
        const transaction = Reflect.get(
          target,
          property,
          receiver,
        ) as unknown as (
          operation: (
            transaction: Prisma.TransactionClient,
          ) => Promise<unknown>,
        ) => Promise<unknown>;
        return (
          operation: (
            transaction: Prisma.TransactionClient,
          ) => Promise<unknown>,
        ) =>
          transaction.call(target, async (transactionClient) => {
            await hooks.onTransaction?.(transactionClient);
            return operation(wrapTransaction(transactionClient));
          });
      }
      const value: unknown = Reflect.get(target, property, receiver) as unknown;
      return typeof value === 'function'
        ? (...args: unknown[]) => Reflect.apply(value, target, args) as unknown
        : value;
    },
  });
}

async function waitForBackendLockWait(
  client: PrismaClient,
  backendPid: number,
): Promise<void> {
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    const rows = await client.$queryRaw<
      { wait_event_type: string | null; query: string }[]
    >(Prisma.sql`
      SELECT wait_event_type, query
      FROM pg_stat_activity
      WHERE pid = ${backendPid}
    `);
    if (
      rows[0]?.wait_event_type === 'Lock' &&
      rows[0].query.includes('FROM "Device"') &&
      rows[0].query.includes('FOR UPDATE')
    ) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error('Revocation transaction never waited on the Device row lock');
}

function rawQueryText(query: Prisma.Sql): string {
  return query.sql ?? query.strings.join(' ');
}

function auditStub() {
  return {
    record: () => Promise.resolve(undefined),
    recordWithClient: () => Promise.resolve(undefined),
  };
}

function createSupabaseAdminStub() {
  return {
    auth: {
      admin: {
        listUsers: jest.fn().mockResolvedValue({
          data: { users: [] },
          error: null,
        }),
        createUser: jest
          .fn()
          .mockImplementation(({ email }: { email: string }) =>
            Promise.resolve({
              data: { user: { id: `test-${email}`, email } },
              error: null,
            }),
          ),
        updateUserById: jest
          .fn()
          .mockImplementation(
            (id: string, attributes: Record<string, unknown>) =>
              Promise.resolve({
                data: { user: { id, ...attributes } },
                error: null,
              }),
          ),
        deleteUser: jest.fn().mockResolvedValue({ error: null }),
      },
    },
  };
}
