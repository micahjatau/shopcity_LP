import { Prisma, SessionPurpose, UserRole, UserStatus } from '@prisma/client';
import { createHash, createHmac, randomBytes, randomUUID } from 'node:crypto';
import { AuthService } from './auth.service';
import {
  AuthController,
  buildCashierLoginCompletionThrottleKey,
} from './auth.controller';
import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import { encryptDeviceAttestationSecret } from '../../common/auth/device-attestation-secret';

jest.mock('@simplewebauthn/server', () => ({
  generateAuthenticationOptions: jest.fn().mockResolvedValue({
    challenge: Buffer.alloc(32, 7).toString('base64url'),
    rpId: 'pos.example.test',
    allowCredentials: [{ id: 'credential-id' }],
    userVerification: 'required',
  }),
  verifyAuthenticationResponse: jest.fn(),
}));

afterEach(() => {
  (verifyAuthenticationResponse as jest.Mock).mockClear();
});

const TEST_ATTEMPT_TOKEN = randomBytes(32).toString('base64url');
const TEST_CHALLENGE = Buffer.alloc(32, 7).toString('base64url');

function validWebAuthnVerification(overrides: Record<string, unknown> = {}) {
  return {
    verified: true,
    authenticationInfo: {
      userVerified: true,
      credentialDeviceType: 'singleDevice',
      credentialBackedUp: false,
      newCounter: 2,
      ...overrides,
    },
  };
}

function fixtureCredentialDefaults(): Record<string, unknown> {
  return {
    id: 'credential-row-id',
    tenantId: 'tenant-id',
    deviceId: 'device-id',
    credentialId: 'credential-assertion-id',
    publicKey: Buffer.from('public-key'),
    signCount: 1,
    transports: ['internal'],
    status: 'ACTIVE',
    authenticatorAttachment: 'platform',
    backupEligible: false,
    backedUp: false,
    attestationTrustResult: 'TRUSTED',
    rpId: 'pos.example.test',
  };
}

function makeCashierCompletionFixture(
  options: {
    attempt?: Record<string, unknown>;
    attemptToken?: string;
    user?: Record<string, unknown>;
    verification?: unknown;
    consumeCount?: number;
    counterUpdateCount?: number;
    storedCounter?: number;
    lockedCredential?: Record<string, unknown> | null;
    lockedDevice?: Record<string, unknown> | null;
  } = {},
) {
  const user = {
    id: 'cashier-id',
    tenantId: 'tenant-id',
    branchId: 'branch-id',
    username: 'cashier@shopcity.local',
    status: UserStatus.ACTIVE,
    role: UserRole.CASHIER,
    tenant: { status: 'ACTIVE' },
    branch: { status: 'ACTIVE' },
    ...options.user,
  };
  const credential = {
    id: 'credential-row-id',
    tenantId: 'tenant-id',
    deviceId: 'device-id',
    credentialId: 'credential-assertion-id',
    publicKey: Buffer.from('public-key'),
    signCount: options.storedCounter ?? 1,
    transports: ['internal'],
    status: 'ACTIVE',
    authenticatorAttachment: 'platform',
    backupEligible: false,
    backedUp: false,
    attestationTrustResult: 'TRUSTED',
    rpId: 'pos.example.test',
  };
  const device = {
    id: 'device-id',
    tenantId: 'tenant-id',
    branchId: 'branch-id',
    authBindingMode: 'WEBAUTHN',
    status: 'ACTIVE',
    branch: { id: 'branch-id', tenantId: 'tenant-id', status: 'ACTIVE' },
  };
  const attemptOverrides = options.attempt ?? {};
  const attemptUserOverrides = (attemptOverrides.user ?? {}) as Record<
    string,
    unknown
  >;
  const attemptDeviceOverrides = (attemptOverrides.device ?? {}) as Record<
    string,
    unknown
  >;
  const attemptCredentialOverrides = Array.isArray(
    attemptDeviceOverrides.webAuthnCredentials,
  )
    ? attemptDeviceOverrides.webAuthnCredentials
    : [credential];
  const attempt = {
    id: 'attempt-row-id',
    tenantId: 'tenant-id',
    userId: 'cashier-id',
    branchId: 'branch-id',
    deviceId: 'device-id',
    bearerTokenHash: createHash('sha256')
      .update(options.attemptToken ?? TEST_ATTEMPT_TOKEN)
      .digest('hex'),
    assertionChallengeHash: createHash('sha256')
      .update(TEST_CHALLENGE)
      .digest('hex'),
    purpose: 'CASHIER_LOGIN',
    expiresAt: new Date(Date.now() + 60_000),
    consumedAt: null as Date | null,
    ...attemptOverrides,
    user: { ...user, ...attemptUserOverrides },
    device: {
      ...device,
      ...attemptDeviceOverrides,
      webAuthnCredentials: attemptCredentialOverrides,
    },
  };
  const sessionCreate = jest.fn().mockImplementation(({ data }) =>
    Promise.resolve({
      id: `session-${user.id}`,
      userId: user.id,
      deviceId: device.id,
      status: 'ACTIVE',
      expiresAt: new Date(Date.now() + 60_000),
      ...data,
    }),
  );
  const tx = {
    cashierLoginAttempt: {
      findUnique: jest.fn().mockImplementation(() => Promise.resolve(attempt)),
      updateMany: jest
        .fn()
        .mockImplementation((args: { data: { consumedAt: Date } }) => {
          const count = options.consumeCount ?? 1;
          if (count === 1) attempt.consumedAt = args.data.consumedAt;
          return Promise.resolve({ count });
        }),
    },
    deviceWebAuthnCredential: {
      findFirst: jest
        .fn()
        .mockResolvedValue(
          options.lockedCredential === undefined
            ? credential
            : options.lockedCredential,
        ),
      findUnique: jest.fn().mockResolvedValue(credential),
      updateMany: jest
        .fn()
        .mockResolvedValue({ count: options.counterUpdateCount ?? 1 }),
    },
    user: { findUnique: jest.fn().mockResolvedValue(user) },
    device: {
      findFirst: jest
        .fn()
        .mockResolvedValue(
          options.lockedDevice === undefined ? device : options.lockedDevice,
        ),
      findUnique: jest.fn().mockResolvedValue(device),
    },
    session: { create: sessionCreate },
    $queryRaw: jest.fn().mockResolvedValue([{ id: credential.id }]),
  };
  const transaction = jest.fn((callback: (client: typeof tx) => unknown) =>
    callback(tx),
  );
  const verifier = verifyAuthenticationResponse as jest.Mock;
  verifier.mockResolvedValue(
    options.verification ?? validWebAuthnVerification(),
  );
  const service = new AuthService(
    { $transaction: transaction } as never,
    {} as never,
    {
      get: (key: string) =>
        key === 'WEBAUTHN_RP_ID'
          ? 'pos.example.test'
          : key === 'WEBAUTHN_ALLOWED_ORIGINS'
            ? 'https://pos.example.test'
            : 'secret',
    } as never,
    { recordWithClient: jest.fn().mockResolvedValue(undefined) } as never,
  );
  return {
    service,
    tx,
    transaction,
    sessionCreate,
    user,
    device,
    credential,
    attempt,
    verifier,
  };
}

function makeWebAuthnRefreshFixture(
  options: { credentialStatusDuringRefresh?: string } = {},
) {
  const user = {
    id: 'cashier-id',
    tenantId: 'tenant-id',
    branchId: 'branch-id',
    username: 'cashier@shopcity.local',
    status: UserStatus.ACTIVE,
    role: UserRole.CASHIER,
    tenant: { status: 'ACTIVE' },
    branch: { status: 'ACTIVE' },
  };
  const device = {
    id: 'device-id',
    tenantId: 'tenant-id',
    branchId: 'branch-id',
    authBindingMode: 'WEBAUTHN',
    status: 'ACTIVE',
    branch: { status: 'ACTIVE' },
  };
  const credential = {
    id: 'credential-id',
    tenantId: 'tenant-id',
    deviceId: 'device-id',
    status: 'ACTIVE',
    authenticatorAttachment: 'platform',
    backupEligible: false,
    backedUp: false,
    attestationTrustResult: 'TRUSTED',
    rpId: 'pos.example.test',
  };
  const existingSession = {
    id: 'session-id',
    userId: user.id,
    tenantId: user.tenantId,
    deviceId: device.id,
    deviceCredentialId: credential.id,
    status: 'ACTIVE',
    purpose: SessionPurpose.USER,
    expiresAt: new Date(Date.now() + 60_000),
    user,
    device,
    deviceCredential: credential,
  };
  const rotatedSession = {
    ...existingSession,
    status: 'REVOKED',
    deviceCredential: {
      ...credential,
      status: options.credentialStatusDuringRefresh ?? 'ACTIVE',
    },
  };
  const sessionCreate = jest
    .fn()
    .mockImplementation(({ data }: { data: Record<string, unknown> }) => ({
      ...data,
      id: 'replacement-session-id',
    }));
  const queryRaw = jest.fn().mockResolvedValue([{ id: 'locked-id' }]);
  const tx = {
    $queryRaw: queryRaw,
    session: {
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      findUnique: jest.fn().mockResolvedValue(rotatedSession),
      create: sessionCreate,
    },
    user: { findUnique: jest.fn().mockResolvedValue(user) },
  };
  const transaction = jest.fn((callback: (client: typeof tx) => unknown) =>
    callback(tx),
  );
  const service = new AuthService(
    {
      session: { findUnique: jest.fn().mockResolvedValue(existingSession) },
      $transaction: transaction,
    } as never,
    {} as never,
    {
      get: (key: string) =>
        key === 'WEBAUTHN_RP_ID' ? 'pos.example.test' : 'session-secret',
    } as never,
    { recordWithClient: jest.fn().mockResolvedValue(undefined) } as never,
  );
  return {
    service,
    tx,
    transaction,
    sessionCreate,
    queryRaw,
    existingSession,
    rotatedSession,
    credential,
  };
}

describe('AuthService', () => {
  it('marks smoke sessions and keeps login sessions ordinary', async () => {
    const createdSessions: Array<Record<string, unknown>> = [];
    const tx = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'user-id',
          tenantId: 'tenant-id',
          status: UserStatus.ACTIVE,
          branchId: null,
          tenant: { status: 'ACTIVE' },
          branch: null,
        }),
      },
      session: {
        create: jest
          .fn()
          .mockImplementation((args: { data: Record<string, unknown> }) => {
            createdSessions.push(args.data);
            return Promise.resolve({
              id: `session-${createdSessions.length}`,
              ...args.data,
            });
          }),
      },
    };
    const service = new AuthService(
      {} as never,
      {} as never,
      { get: (key: string) => `${key}-secret` } as never,
      { recordWithClient: jest.fn().mockResolvedValue(undefined) } as never,
    );

    const issueSession = (
      Reflect.get(service, 'issueSession') as (
        prisma: unknown,
        userId: string,
        tenantId: string,
        action: string,
        deviceId: string | null,
        lifetimeMs?: number,
        purpose?: SessionPurpose,
        deviceCredentialId?: string | null,
      ) => Promise<unknown>
    ).bind(service);
    await issueSession(
      tx,
      'user-id',
      'tenant-id',
      'auth.smoke_session_bootstrap',
      null,
      15 * 60 * 1000,
      SessionPurpose.SMOKE,
    );
    await issueSession(tx, 'user-id', 'tenant-id', 'auth.login', null);
    await issueSession(
      tx,
      'user-id',
      'tenant-id',
      'auth.cashier_login',
      'device-id',
      undefined,
      SessionPurpose.USER,
      'credential-id',
    );

    expect(createdSessions[0]?.purpose).toBe(SessionPurpose.SMOKE);
    expect(createdSessions[1]?.purpose).toBe(SessionPurpose.USER);
    expect(createdSessions[1]?.deviceCredentialId).toBeNull();
    expect(createdSessions[2]?.deviceCredentialId).toBe('credential-id');
    const loginExpiresAt = createdSessions[1]?.expiresAt;
    expect(loginExpiresAt).toBeInstanceOf(Date);
    expect(
      (loginExpiresAt instanceof Date ? loginExpiresAt.getTime() : 0) -
        Date.now(),
    ).toBeGreaterThan(11 * 60 * 60 * 1000);
  });

  it('rejects smoke session refresh attempts', async () => {
    const service = new AuthService(
      {
        session: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'smoke-session-id',
            status: 'ACTIVE',
            purpose: SessionPurpose.SMOKE,
            expiresAt: new Date(Date.now() + 60_000),
            user: {
              id: 'user-id',
              tenantId: 'tenant-id',
              status: UserStatus.ACTIVE,
              branchId: null,
              tenant: { status: 'ACTIVE' },
              branch: null,
            },
            device: null,
          }),
        },
      } as never,
      {} as never,
      { get: () => undefined } as never,
      {} as never,
    );

    await expect(service.refresh('smoke-session-id')).rejects.toThrow(
      'Smoke sessions cannot be refreshed',
    );
  });

  it('rejects smoke session lifetimes above the 15 minute maximum', async () => {
    const service = new AuthService(
      {} as never,
      {} as never,
      { get: () => 'secret' } as never,
      {} as never,
    );
    const issueSession = (
      Reflect.get(service, 'issueSession') as (
        prisma: unknown,
        userId: string,
        tenantId: string,
        action: string,
        deviceId: string | null,
        lifetimeMs?: number,
        purpose?: SessionPurpose,
      ) => Promise<unknown>
    ).bind(service);

    await expect(
      issueSession(
        {},
        'user-id',
        'tenant-id',
        'auth.smoke_session_bootstrap',
        null,
        15 * 60 * 1000 + 1,
        SessionPurpose.SMOKE,
      ),
    ).rejects.toThrow('Session lifetime exceeds the allowed maximum');
  });

  it('revokes an active smoke session during teardown', async () => {
    const updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const service = new AuthService(
      { session: { updateMany } } as never,
      {} as never,
      {} as never,
      {} as never,
    );

    await service.logout('smoke-session-id');

    expect(updateMany).toHaveBeenCalledTimes(1);
    const calls = updateMany.mock.calls as unknown as Array<
      [
        {
          where: { id: string; status: string };
          data: { status: string; revokedAt: Date };
        },
      ]
    >;
    const call = calls[0][0];
    expect(call.where).toEqual({
      id: 'smoke-session-id',
      status: 'ACTIVE',
    });
    expect(call.data.status).toBe('REVOKED');
    expect(call.data.revokedAt).toBeInstanceOf(Date);
  });

  it('returns a safe public auth response', () => {
    const service = new AuthService(
      {} as never,
      {} as never,
      { get: () => 'secret' } as never,
      {} as never,
    );

    const response = service.toResponse({
      session: {
        id: 'session-id',
        userId: 'user-id',
        deviceId: null,
        deviceCredentialId: null,
        sessionTokenHash: 'session-hash',
        csrfTokenHash: 'csrf-hash',
        status: 'ACTIVE',
        expiresAt: new Date('2026-07-19T00:00:00.000Z'),
        revokedAt: null,
        lastUsedAt: null,
        createdAt: new Date('2026-07-19T00:00:00.000Z'),
        updatedAt: new Date('2026-07-19T00:00:00.000Z'),
      },
      user: {
        id: 'user-id',
        tenantId: 'tenant-id',
        branchId: 'branch-id',
        username: 'admin@shopcity.local',
        supabaseAuthId: 'supabase-id',
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
        lastLoginAt: null,
        createdAt: new Date('2026-07-19T00:00:00.000Z'),
        updatedAt: new Date('2026-07-19T00:00:00.000Z'),
      },
    });

    expect(response).toEqual({
      user: {
        id: 'user-id',
        username: 'admin@shopcity.local',
        role: UserRole.ADMIN,
        branchId: 'branch-id',
      },
      session: {
        expiresAt: '2026-07-19T00:00:00.000Z',
        deviceId: null,
      },
    });
  });

  it('creates a hashed, short-lived attempt rather than a session for WebAuthn cashier login', async () => {
    const createAttempt = jest.fn().mockResolvedValue({ id: 'attempt-id' });
    const sessionCreate = jest.fn();
    const device = {
      id: 'device-id',
      tenantId: 'tenant-id',
      branchId: 'branch-id',
      authBindingMode: 'WEBAUTHN',
      status: 'ACTIVE',
      branch: { status: 'ACTIVE' },
      webAuthnCredentials: [
        {
          credentialId: 'credential-id',
          transports: ['internal'],
          authenticatorAttachment: 'platform',
          backupEligible: false,
          backedUp: false,
          rpId: 'pos.example.test',
          attestationTrustResult: 'TRUSTED',
        },
      ],
    };
    const service = new AuthService(
      {
        user: {
          findFirst: jest.fn().mockResolvedValue(null),
          findUnique: jest.fn().mockResolvedValue({
            id: 'user-id',
            tenantId: 'tenant-id',
            branchId: 'branch-id',
            role: UserRole.CASHIER,
            status: UserStatus.ACTIVE,
            tenant: { status: 'ACTIVE' },
            branch: { status: 'ACTIVE' },
          }),
        },
        device: { findFirst: jest.fn().mockResolvedValue(device) },
        cashierLoginAttempt: { create: createAttempt },
        session: { create: sessionCreate },
        $transaction: jest.fn(),
      } as never,
      {
        publicClient: {
          auth: {
            signInWithPassword: jest.fn().mockResolvedValue({
              data: { user: { id: 'supabase-id' } },
              error: null,
            }),
          },
        },
      } as never,
      {
        get: (key: string) =>
          key === 'WEBAUTHN_RP_ID'
            ? 'pos.example.test'
            : key === 'WEBAUTHN_ALLOWED_ORIGINS'
              ? 'https://pos.example.test'
              : 'secret',
      } as never,
      {} as never,
    );

    const result = await service.login(
      'cashier@shopcity.local',
      'password',
      'device-id',
    );

    expect(result).toMatchObject({
      statusCode: 202,
      code: 'DEVICE_ASSERTION_REQUIRED',
      options: { userVerification: 'required' },
    });
    const createCalls = createAttempt.mock.calls as unknown as Array<
      [{ data: Record<string, unknown> }]
    >;
    const createArgs = createCalls[0][0];
    expect(createArgs.data).toMatchObject({
      tenantId: 'tenant-id',
      userId: 'user-id',
      branchId: 'branch-id',
      deviceId: 'device-id',
      purpose: 'CASHIER_LOGIN',
    });
    expect(createArgs.data.expiresAt).toBeInstanceOf(Date);
    expect(createArgs.data.bearerTokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(createArgs.data.assertionChallengeHash).toBe(
      createHash('sha256').update(TEST_CHALLENGE).digest('hex'),
    );
    expect(createArgs.data.bearerTokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(createArgs.data.bearerTokenHash).not.toBe(TEST_ATTEMPT_TOKEN);
    expect(JSON.stringify(createAttempt.mock.calls)).not.toContain(
      TEST_CHALLENGE,
    );
    expect(sessionCreate).not.toHaveBeenCalled();
    expect(JSON.stringify(createAttempt.mock.calls)).not.toContain(
      'cashier@shopcity.local',
    );
  });

  it('denies missing, out-of-tenant, inactive, and wrong-branch cashier devices identically', async () => {
    const validUser = {
      id: 'cashier-id',
      tenantId: 'tenant-id',
      branchId: 'branch-id',
      role: UserRole.CASHIER,
      status: UserStatus.ACTIVE,
      tenant: { status: 'ACTIVE' },
      branch: { status: 'ACTIVE' },
    };
    const scenarios = [
      { name: 'missing device', deviceId: undefined, device: null },
      { name: 'out-of-tenant device', deviceId: 'other-device', device: null },
      {
        name: 'inactive device',
        deviceId: 'device-id',
        device: {
          id: 'device-id',
          status: 'INACTIVE',
          branchId: 'branch-id',
          branch: { status: 'ACTIVE' },
        },
      },
      {
        name: 'wrong-branch device',
        deviceId: 'device-id',
        device: {
          id: 'device-id',
          status: 'ACTIVE',
          branchId: 'other-branch',
          branch: { status: 'ACTIVE' },
        },
      },
    ];

    for (const scenario of scenarios) {
      const sessionCreate = jest.fn();
      const service = new AuthService(
        {
          user: {
            findFirst: jest.fn().mockResolvedValue(null),
            findUnique: jest.fn().mockResolvedValue(validUser),
          },
          device: { findFirst: jest.fn().mockResolvedValue(scenario.device) },
          session: { create: sessionCreate },
          $transaction: jest.fn(),
        } as never,
        {
          publicClient: {
            auth: {
              signInWithPassword: jest.fn().mockResolvedValue({
                data: { user: { id: 'supabase-id' } },
                error: null,
              }),
            },
          },
        } as never,
        {} as never,
        {} as never,
      );

      let error: unknown;
      try {
        await service.login(
          'cashier@shopcity.local',
          'password',
          scenario.deviceId,
        );
      } catch (caught) {
        error = caught;
      }
      expect(error).toMatchObject({
        status: 401,
        response: {
          code: 'DEVICE_AUTH_FAILED',
          message: 'Device authentication failed',
        },
      });
      expect(sessionCreate).not.toHaveBeenCalled();
    }
  });

  it('lets distinct eligible cashiers use their own passwords and one paired POS credential', async () => {
    const device = {
      id: 'device-id',
      tenantId: 'tenant-id',
      branchId: 'branch-id',
      authBindingMode: 'WEBAUTHN',
      status: 'ACTIVE',
      branch: { status: 'ACTIVE' },
      webAuthnCredentials: [
        {
          credentialId: 'credential-assertion-id',
          transports: ['internal'],
          authenticatorAttachment: 'platform',
          backupEligible: false,
          backedUp: false,
          rpId: 'pos.example.test',
          attestationTrustResult: 'TRUSTED',
        },
      ],
    };
    const passwordSignIn = jest.fn().mockResolvedValue({
      data: { user: { id: 'supabase-user' } },
      error: null,
    });
    const accounts = [
      {
        id: 'cashier-one',
        username: 'one@shopcity.local',
        password: 'one-password',
      },
      {
        id: 'cashier-two',
        username: 'two@shopcity.local',
        password: 'two-password',
      },
    ];
    const loginAttempts: Array<{
      account: (typeof accounts)[number];
      token: string;
      attempt: Record<string, unknown>;
    }> = [];

    for (const account of accounts) {
      const user = {
        id: account.id,
        tenantId: 'tenant-id',
        branchId: 'branch-id',
        username: account.username,
        role: UserRole.CASHIER,
        status: UserStatus.ACTIVE,
        tenant: { status: 'ACTIVE' },
        branch: { status: 'ACTIVE' },
      };
      const createAttempt = jest.fn().mockResolvedValue({ id: 'attempt-id' });
      const service = new AuthService(
        {
          user: {
            findFirst: jest.fn().mockResolvedValue(null),
            findUnique: jest.fn().mockResolvedValue(user),
          },
          device: { findFirst: jest.fn().mockResolvedValue(device) },
          cashierLoginAttempt: { create: createAttempt },
          session: { create: jest.fn() },
        } as never,
        {
          publicClient: { auth: { signInWithPassword: passwordSignIn } },
        } as never,
        {
          get: (key: string) =>
            key === 'WEBAUTHN_RP_ID'
              ? 'pos.example.test'
              : key === 'WEBAUTHN_ALLOWED_ORIGINS'
                ? 'https://pos.example.test'
                : 'secret',
        } as never,
        {} as never,
      );

      const login = await service.login(
        account.username,
        account.password,
        'device-id',
      );
      expect(login).toMatchObject({
        statusCode: 202,
        code: 'DEVICE_ASSERTION_REQUIRED',
      });
      const loginResult = login as { attemptToken: string };
      const createCalls = createAttempt.mock.calls as unknown as Array<
        [{ data: Record<string, unknown> }]
      >;
      loginAttempts.push({
        account,
        token: loginResult.attemptToken,
        attempt: createCalls[0][0].data,
      });
    }

    expect(passwordSignIn.mock.calls).toEqual(
      accounts.map((account) => [
        { email: account.username, password: account.password },
      ]),
    );
    expect(loginAttempts[0].token).not.toBe(loginAttempts[1].token);
    const completions = loginAttempts.map(({ account, token, attempt }) => {
      const fixture = makeCashierCompletionFixture({
        attemptToken: token,
        user: {
          id: account.id,
          username: account.username,
        },
        attempt: {
          userId: attempt.userId,
          branchId: attempt.branchId,
          deviceId: attempt.deviceId,
          tenantId: attempt.tenantId,
        },
      });
      return { account, token, fixture };
    });
    const sessions: Array<
      Awaited<ReturnType<AuthService['completeCashierLogin']>>
    > = [];
    for (const { account, token, fixture } of completions) {
      sessions.push(
        await fixture.service.completeCashierLogin(token, {
          id: 'credential-assertion-id',
          response: { freshAssertionFor: account.id },
        }),
      );
    }

    expect(sessions).toHaveLength(2);
    expect(verifyAuthenticationResponse).toHaveBeenCalledTimes(2);
    expect(sessions.map((session) => session.context.session.id)).toEqual([
      'session-cashier-one',
      'session-cashier-two',
    ]);
    expect(sessions.map((session) => session.context.session.userId)).toEqual([
      'cashier-one',
      'cashier-two',
    ]);
    for (const { fixture } of completions) {
      expect(fixture.sessionCreate).toHaveBeenCalledTimes(1);
      const calls = fixture.sessionCreate.mock.calls as unknown as Array<
        [{ data: Record<string, unknown> }]
      >;
      expect(calls[0][0].data).toMatchObject({
        deviceId: 'device-id',
        deviceCredentialId: 'credential-row-id',
      });
    }
    const sessionCalls = completions.map(
      ({ fixture }) =>
        (
          fixture.sessionCreate.mock.calls as unknown as Array<
            [{ data: Record<string, unknown> }]
          >
        )[0][0].data,
    );
    expect(sessionCalls.map((session) => session.userId)).toEqual([
      'cashier-one',
      'cashier-two',
    ]);
    expect(new Set(sessionCalls.map((session) => session.userId)).size).toBe(2);
    expect(sessionCalls.map((session) => session.deviceId)).toEqual([
      'device-id',
      'device-id',
    ]);
    expect(sessionCalls.map((session) => session.deviceCredentialId)).toEqual([
      'credential-row-id',
      'credential-row-id',
    ]);
  });

  it('rejects device deactivation observed after taking the device lock', async () => {
    const fixture = makeCashierCompletionFixture({
      lockedDevice: {
        id: 'device-id',
        tenantId: 'tenant-id',
        branchId: 'branch-id',
        authBindingMode: 'WEBAUTHN',
        status: 'INACTIVE',
        branch: { status: 'ACTIVE', tenantId: 'tenant-id' },
      },
    });

    await expect(
      fixture.service.completeCashierLogin(TEST_ATTEMPT_TOKEN, {
        id: 'credential-assertion-id',
      }),
    ).rejects.toMatchObject({
      status: 401,
      response: { code: 'DEVICE_AUTH_FAILED' },
    });
    expect(fixture.tx.$queryRaw).toHaveBeenCalledTimes(1);
    const lockCalls = fixture.tx.$queryRaw.mock.calls as unknown as Array<
      [{ strings: readonly string[] }]
    >;
    expect(lockCalls[0][0].strings.join('')).toContain('FROM "Device"');
    expect(lockCalls[0][0].strings.join('')).toContain('"tenantId"');
    expect(fixture.tx.device.findFirst).toHaveBeenCalledTimes(1);
    expect(fixture.verifier).not.toHaveBeenCalled();
    expect(
      fixture.tx.deviceWebAuthnCredential.findFirst,
    ).not.toHaveBeenCalled();
    expect(fixture.sessionCreate).not.toHaveBeenCalled();
  });

  it('verifies the exact challenge/origin/RP/UV, consumes once, then creates a session in that transaction', async () => {
    const fixture = makeCashierCompletionFixture();
    const assertion = {
      id: 'credential-assertion-id',
      response: { secret: 'proof' },
    };

    await fixture.service.completeCashierLogin(TEST_ATTEMPT_TOKEN, assertion);

    expect(fixture.transaction).toHaveBeenCalledTimes(1);
    expect(fixture.verifier).toHaveBeenCalledTimes(1);
    const verifyCalls = fixture.verifier.mock.calls as unknown as Array<
      [
        {
          expectedChallenge: (challenge: string) => boolean;
          expectedOrigin: string[];
          expectedRPID: string;
          requireUserVerification: boolean;
          credential: { counter: number };
        },
      ]
    >;
    const verifyArgs = verifyCalls[0][0];
    expect(verifyArgs.expectedChallenge(TEST_CHALLENGE)).toBe(true);
    expect(verifyArgs.expectedChallenge('wrong-challenge')).toBe(false);
    expect(verifyArgs.expectedOrigin).toEqual(['https://pos.example.test']);
    expect(verifyArgs.expectedRPID).toBe('pos.example.test');
    expect(verifyArgs.requireUserVerification).toBe(true);
    expect(verifyArgs.credential.counter).toBe(1);
    const consumeCalls = fixture.tx.cashierLoginAttempt.updateMany.mock
      .calls as unknown as Array<
      [{ where: Record<string, unknown>; data: { consumedAt: Date } }]
    >;
    expect(consumeCalls[0][0].where.consumedAt).toBeNull();
    expect(consumeCalls[0][0].data.consumedAt).toBeInstanceOf(Date);
    const counterCalls = fixture.tx.deviceWebAuthnCredential.updateMany.mock
      .calls as unknown as Array<
      [{ where: Record<string, unknown>; data: { signCount: number } }]
    >;
    expect(counterCalls[0][0].where.signCount).toBe(1);
    expect(counterCalls[0][0].data.signCount).toBe(2);
    expect(fixture.sessionCreate).toHaveBeenCalledTimes(1);
    const createdSessionCalls = fixture.sessionCreate.mock
      .calls as unknown as Array<[{ data: Record<string, unknown> }]>;
    expect(createdSessionCalls[0][0].data.deviceCredentialId).toBe(
      'credential-row-id',
    );
    expect(fixture.sessionCreate.mock.invocationCallOrder[0]).toBeGreaterThan(
      fixture.tx.cashierLoginAttempt.updateMany.mock.invocationCallOrder[0],
    );
    expect(fixture.sessionCreate.mock.invocationCallOrder[0]).toBeGreaterThan(
      fixture.verifier.mock.invocationCallOrder[0],
    );
    expect(fixture.tx.$queryRaw).toHaveBeenCalledTimes(2);
    const lockCalls = fixture.tx.$queryRaw.mock.calls as unknown as Array<
      [{ strings: readonly string[] }]
    >;
    expect(lockCalls[0][0].strings.join('')).toContain('FROM "Device"');
    expect(lockCalls[0][0].strings.join('')).toContain('"tenantId"');
    expect(lockCalls[1][0].strings.join('')).toContain(
      'FROM "DeviceWebAuthnCredential"',
    );
    expect(fixture.tx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
      fixture.tx.device.findFirst.mock.invocationCallOrder[0],
    );
    expect(
      fixture.tx.device.findFirst.mock.invocationCallOrder[0],
    ).toBeLessThan(fixture.tx.$queryRaw.mock.invocationCallOrder[1]);
    expect(fixture.tx.$queryRaw.mock.invocationCallOrder[1]).toBeLessThan(
      fixture.verifier.mock.invocationCallOrder[0],
    );
    const persistedCalls = JSON.stringify([
      fixture.tx.cashierLoginAttempt.findUnique.mock.calls,
      fixture.tx.cashierLoginAttempt.updateMany.mock.calls,
      fixture.tx.deviceWebAuthnCredential.updateMany.mock.calls,
    ]);
    expect(persistedCalls).not.toContain(TEST_ATTEMPT_TOKEN);
    expect(persistedCalls).not.toContain(TEST_CHALLENGE);
    expect(persistedCalls).not.toContain('proof');
  });

  it('rejects false, wrong-origin/RP, missing-UV, cross-platform, backed-up, and replayed-counter assertions', async () => {
    const invalidVerifications: Array<[string, unknown]> = [
      ['false verifier', { verified: false, authenticationInfo: {} }],
      ['wrong origin', { verified: false, authenticationInfo: {} }],
      ['wrong RP ID', { verified: false, authenticationInfo: {} }],
      ['missing UV', validWebAuthnVerification({ userVerified: false })],
      [
        'platform mismatch',
        validWebAuthnVerification({ credentialDeviceType: 'multiDevice' }),
      ],
      ['backed up', validWebAuthnVerification({ credentialBackedUp: true })],
      ['equal counter', validWebAuthnVerification({ newCounter: 1 })],
      ['lower counter', validWebAuthnVerification({ newCounter: 4 })],
    ];

    for (const [name, verification] of invalidVerifications) {
      const fixture = makeCashierCompletionFixture({
        verification,
        storedCounter: name === 'lower counter' ? 5 : undefined,
      });
      await expect(
        fixture.service.completeCashierLogin(TEST_ATTEMPT_TOKEN, {
          id: 'credential-assertion-id',
        }),
      ).rejects.toMatchObject({
        status: 401,
        response: { code: 'DEVICE_AUTH_FAILED' },
      });
      expect(fixture.sessionCreate).not.toHaveBeenCalled();
    }
  });

  it('rejects expired, consumed, mismatched-state attempts and failed atomic claims without issuing sessions', async () => {
    const stateCases: Array<[string, Record<string, unknown>]> = [
      ['expired', { expiresAt: new Date(Date.now() - 1) }],
      ['consumed', { consumedAt: new Date() }],
      ['wrong tenant', { tenantId: 'other-tenant' }],
      ['wrong user', { userId: 'other-user' }],
      ['wrong device', { deviceId: 'other-device' }],
      ['wrong branch user', { user: { branchId: 'other-branch' } }],
      ['wrong device tenant', { device: { tenantId: 'other-tenant' } }],
      ['wrong branch device', { device: { branchId: 'other-branch' } }],
      ['inactive cashier', { user: { status: UserStatus.SUSPENDED } }],
      ['empty credentials', { device: { webAuthnCredentials: [] } }],
    ];

    for (const [name, attempt] of stateCases) {
      const fixture = makeCashierCompletionFixture({ attempt });
      const result = await fixture.service
        .completeCashierLogin(TEST_ATTEMPT_TOKEN, {
          id: 'credential-assertion-id',
        })
        .then(
          () => null,
          (error: unknown) => error,
        );
      if (!result) throw new Error(`${name} unexpectedly succeeded`);
      expect(result).toMatchObject({
        status: 401,
        response: { code: 'DEVICE_AUTH_FAILED' },
      });
      expect(fixture.sessionCreate).not.toHaveBeenCalled();
    }

    const wrongCredential = makeCashierCompletionFixture();
    await expect(
      wrongCredential.service.completeCashierLogin(TEST_ATTEMPT_TOKEN, {
        id: 'different-credential',
      }),
    ).rejects.toMatchObject({
      status: 401,
      response: { code: 'DEVICE_AUTH_FAILED' },
    });
    expect(wrongCredential.sessionCreate).not.toHaveBeenCalled();

    for (const consumeCount of [0]) {
      const fixture = makeCashierCompletionFixture({ consumeCount });
      await expect(
        fixture.service.completeCashierLogin(TEST_ATTEMPT_TOKEN, {
          id: 'credential-assertion-id',
        }),
      ).rejects.toMatchObject({
        status: 401,
        response: { code: 'DEVICE_AUTH_FAILED' },
      });
      expect(fixture.sessionCreate).not.toHaveBeenCalled();
    }
  });

  it('rejects revoked, untrusted, cross-platform, and backup-eligible stored credentials', async () => {
    const invalidCredentials: Array<[string, Record<string, unknown> | null]> =
      [
        ['revoked credential', null],
        ['untrusted credential', { attestationTrustResult: 'NOT_EVALUATED' }],
        [
          'cross-platform credential',
          { authenticatorAttachment: 'cross-platform' },
        ],
        ['backup eligible credential', { backupEligible: true }],
        ['backed-up credential', { backedUp: true }],
      ];
    for (const [, overrides] of invalidCredentials) {
      const fixture = makeCashierCompletionFixture({
        lockedCredential:
          overrides === null
            ? null
            : { ...fixtureCredentialDefaults(), ...overrides },
      });
      await expect(
        fixture.service.completeCashierLogin(TEST_ATTEMPT_TOKEN, {
          id: 'credential-assertion-id',
        }),
      ).rejects.toMatchObject({
        status: 401,
        response: { code: 'DEVICE_AUTH_FAILED' },
      });
      expect(fixture.sessionCreate).not.toHaveBeenCalled();
    }
  });

  it('does not consume an attempt or create a session before verifier success, then rejects replay', async () => {
    const fixture = makeCashierCompletionFixture();
    await fixture.service.completeCashierLogin(TEST_ATTEMPT_TOKEN, {
      id: 'credential-assertion-id',
    });
    expect(fixture.sessionCreate).toHaveBeenCalledTimes(1);

    await expect(
      fixture.service.completeCashierLogin(TEST_ATTEMPT_TOKEN, {
        id: 'credential-assertion-id',
      }),
    ).rejects.toMatchObject({
      status: 401,
      response: { code: 'DEVICE_AUTH_FAILED' },
    });
    expect(fixture.sessionCreate).toHaveBeenCalledTimes(1);
  });

  it('accepts zero-counter authenticators without applying a counter update', async () => {
    const fixture = makeCashierCompletionFixture({
      storedCounter: 0,
      verification: validWebAuthnVerification({ newCounter: 0 }),
    });
    await expect(
      fixture.service.completeCashierLogin(TEST_ATTEMPT_TOKEN, {
        id: 'credential-assertion-id',
      }),
    ).resolves.toBeDefined();
    expect(
      fixture.tx.deviceWebAuthnCredential.updateMany,
    ).not.toHaveBeenCalled();
    expect(fixture.sessionCreate).toHaveBeenCalledTimes(1);
  });

  it('rejects a zero counter after a positive stored counter and rolls back without session issuance', async () => {
    const fixture = makeCashierCompletionFixture({
      storedCounter: 5,
      verification: validWebAuthnVerification({ newCounter: 0 }),
    });
    await expect(
      fixture.service.completeCashierLogin(TEST_ATTEMPT_TOKEN, {
        id: 'credential-assertion-id',
      }),
    ).rejects.toMatchObject({
      status: 401,
      response: { code: 'DEVICE_AUTH_FAILED' },
    });
    expect(fixture.tx.cashierLoginAttempt.updateMany).not.toHaveBeenCalled();
    expect(fixture.sessionCreate).not.toHaveBeenCalled();
  });

  it('fails generically when verification crosses attempt expiry', async () => {
    const fixture = makeCashierCompletionFixture();
    fixture.verifier.mockImplementation(() => {
      fixture.attempt.expiresAt = new Date(Date.now() - 1);
      return Promise.resolve(validWebAuthnVerification());
    });

    await expect(
      fixture.service.completeCashierLogin(TEST_ATTEMPT_TOKEN, {
        id: 'credential-assertion-id',
      }),
    ).rejects.toMatchObject({
      status: 401,
      response: { code: 'DEVICE_AUTH_FAILED' },
    });
    expect(fixture.tx.cashierLoginAttempt.updateMany).not.toHaveBeenCalled();
    expect(fixture.sessionCreate).not.toHaveBeenCalled();
  });

  it('accepts authenticators that consistently report a zero sign counter', async () => {
    const fixture = makeCashierCompletionFixture({
      storedCounter: 0,
      verification: validWebAuthnVerification({ newCounter: 0 }),
    });
    await expect(
      fixture.service.completeCashierLogin(TEST_ATTEMPT_TOKEN, {
        id: 'credential-assertion-id',
      }),
    ).resolves.toBeDefined();
    expect(
      fixture.tx.deviceWebAuthnCredential.updateMany,
    ).not.toHaveBeenCalled();
    expect(fixture.sessionCreate).toHaveBeenCalledTimes(1);
  });

  it('rejects a competing sign-counter update without creating a session', async () => {
    const fixture = makeCashierCompletionFixture({ counterUpdateCount: 0 });
    await expect(
      fixture.service.completeCashierLogin(TEST_ATTEMPT_TOKEN, {
        id: 'credential-assertion-id',
      }),
    ).rejects.toMatchObject({
      status: 401,
      response: { code: 'DEVICE_AUTH_FAILED' },
    });
    const calls = fixture.tx.deviceWebAuthnCredential.updateMany.mock
      .calls as unknown as Array<[{ where: Record<string, unknown> }]>;
    expect(calls[0][0].where.signCount).toBe(1);
    expect(fixture.sessionCreate).not.toHaveBeenCalled();
  });

  it('rejects malformed completion tokens and assertion arrays', async () => {
    const fixture = makeCashierCompletionFixture();
    for (const [token, assertion] of [
      ['x'.repeat(32), {}],
      [[], {}],
      [TEST_ATTEMPT_TOKEN, []],
      [TEST_ATTEMPT_TOKEN, 'assertion'],
    ] as const) {
      await expect(
        fixture.service.completeCashierLogin(token, assertion),
      ).rejects.toMatchObject({
        status: 401,
        response: { code: 'DEVICE_AUTH_FAILED' },
      });
    }
    expect(fixture.transaction).not.toHaveBeenCalled();
    expect(fixture.sessionCreate).not.toHaveBeenCalled();
  });

  it('documents the distinct 200 and 202 login responses and the completion 200 response', () => {
    const loginMethod = Object.getOwnPropertyDescriptor(
      AuthController.prototype,
      'login',
    )?.value as object;
    const completionMethod = Object.getOwnPropertyDescriptor(
      AuthController.prototype,
      'completeCashierLogin',
    )?.value as object;
    const loginResponses = Reflect.getMetadata(
      'swagger/apiResponse',
      loginMethod,
    ) as Record<string, { schema?: { properties?: Record<string, unknown> } }>;
    const completionResponses = Reflect.getMetadata(
      'swagger/apiResponse',
      completionMethod,
    ) as Record<string, unknown>;

    expect(loginResponses).toHaveProperty('200');
    expect(loginResponses).toHaveProperty('202');
    const pendingData = loginResponses['202']?.schema?.properties?.data as {
      properties?: Record<string, unknown>;
    };
    expect(pendingData.properties).toHaveProperty('attemptToken');
    expect(loginResponses['401']).toMatchObject({
      content: {
        'application/json': {
          examples: {
            deviceAuthFailed: {
              value: { error: { statusCode: 401, code: 'DEVICE_AUTH_FAILED' } },
            },
          },
        },
      },
    });
    expect(loginResponses['429']).toMatchObject({
      content: {
        'application/json': {
          examples: {
            rateLimited: {
              value: { error: { statusCode: 429, code: 'RATE_LIMITED' } },
            },
          },
        },
      },
    });
    expect(completionResponses).toHaveProperty('200');
    expect(completionResponses['401']).toMatchObject({
      content: {
        'application/json': {
          examples: {
            deviceAuthFailed: {
              value: { error: { statusCode: 401, code: 'DEVICE_AUTH_FAILED' } },
            },
          },
        },
      },
    });
    expect(completionResponses['429']).toMatchObject({
      content: {
        'application/json': {
          examples: {
            rateLimited: {
              value: { error: { statusCode: 429, code: 'RATE_LIMITED' } },
            },
          },
        },
      },
    });
  });

  it('creates a controller 202 without cookies and adds cookies only after completion succeeds', async () => {
    const reply = { code: jest.fn(), header: jest.fn() };
    const context = {
      session: { expiresAt: new Date(Date.now() + 60_000) },
    };
    const authService = {
      login: jest.fn().mockResolvedValue({
        statusCode: 202,
        code: 'DEVICE_ASSERTION_REQUIRED',
        attemptToken: TEST_ATTEMPT_TOKEN,
        options: { challenge: TEST_CHALLENGE },
      }),
      completeCashierLogin: jest.fn().mockResolvedValue({
        context,
        sessionToken: 'session-token',
        csrfToken: 'csrf-token',
      }),
      toResponse: jest.fn().mockReturnValue({ user: {}, session: {} }),
    };
    const controller = new AuthController(authService as never);

    const pending = await controller.login(
      { username: 'cashier@example.test', password: 'secret' },
      'device-id',
      undefined,
      reply as never,
    );
    expect(pending).toMatchObject({
      code: 'DEVICE_ASSERTION_REQUIRED',
      attemptToken: TEST_ATTEMPT_TOKEN,
    });
    expect(reply.code).toHaveBeenCalledWith(202);
    expect(reply.header).not.toHaveBeenCalled();

    const completed = await controller.completeCashierLogin(
      {
        attemptToken: TEST_ATTEMPT_TOKEN,
        assertion: { id: 'credential-assertion-id' },
      },
      reply as never,
    );
    expect(completed).toEqual({ user: {}, session: {} });
    expect(reply.header).toHaveBeenCalledWith(
      'Set-Cookie',
      expect.arrayContaining([expect.stringContaining('shopcity_session=')]),
    );
  });

  it('hashes only bounded token strings in completion throttle keys', () => {
    const token = TEST_ATTEMPT_TOKEN;
    const key = buildCashierLoginCompletionThrottleKey({
      ip: '127.0.0.1',
      body: { attemptToken: token },
    } as never);
    expect(key).not.toContain(token);
    expect(key).toContain(createHash('sha256').update(token).digest('hex'));

    for (const body of [
      null,
      [],
      'raw',
      4,
      { attemptToken: [] },
      { attemptToken: 'x'.repeat(1000) },
    ]) {
      const malformedKey = buildCashierLoginCompletionThrottleKey({
        ip: '127.0.0.1',
        body,
      } as never);
      expect(malformedKey).not.toContain('raw');
      expect(malformedKey).toContain('invalid-attempt');
    }
  });

  it('rejects login when the Supabase identity is not linked locally', async () => {
    const service = new AuthService(
      {
        user: {
          findFirst: jest.fn().mockResolvedValue(null),
          findUnique: jest.fn().mockResolvedValue(null),
        },
        session: {
          create: jest.fn(),
        },
        $transaction: jest.fn(),
      } as never,
      {
        publicClient: {
          auth: {
            signInWithPassword: jest.fn().mockResolvedValue({
              data: { user: { id: 'supabase-id' } },
              error: null,
            }),
          },
        },
      } as never,
      { get: () => 'secret' } as never,
      {} as never,
    );

    await expect(
      service.login('admin@shopcity.local', 'password'),
    ).rejects.toThrow('User is not active');
  });

  it('rejects inactive users when resolving the current session', async () => {
    const service = new AuthService(
      {
        session: {
          findUnique: jest.fn().mockResolvedValue({
            status: 'ACTIVE',
            user: {
              status: UserStatus.SUSPENDED,
              tenant: { status: 'ACTIVE' },
              branch: null,
            },
          }),
        },
      } as never,
      {} as never,
      { get: () => 'secret' } as never,
      {} as never,
    );

    await expect(service.resolveCurrentSession('session-id')).rejects.toThrow(
      'User is not active',
    );
  });

  it('rejects resolving a WebAuthn session whose credential has been revoked', async () => {
    const findUnique = jest.fn().mockResolvedValue({
      id: 'session-id',
      status: 'ACTIVE',
      expiresAt: new Date(Date.now() + 60_000),
      deviceId: 'device-id',
      deviceCredentialId: 'credential-id',
      user: {
        id: 'cashier-id',
        tenantId: 'tenant-id',
        branchId: 'branch-id',
        status: UserStatus.ACTIVE,
        role: UserRole.CASHIER,
        tenant: { status: 'ACTIVE' },
        branch: { status: 'ACTIVE' },
      },
      device: {
        id: 'device-id',
        tenantId: 'tenant-id',
        branchId: 'branch-id',
        authBindingMode: 'WEBAUTHN',
        status: 'ACTIVE',
        branch: { status: 'ACTIVE' },
      },
      deviceCredential: {
        id: 'credential-id',
        tenantId: 'tenant-id',
        deviceId: 'device-id',
        status: 'REVOKED',
        authenticatorAttachment: 'platform',
        backupEligible: false,
        backedUp: false,
        attestationTrustResult: 'TRUSTED',
        rpId: 'pos.example.test',
      },
    });
    const service = new AuthService(
      { session: { findUnique } } as never,
      {} as never,
      { get: () => 'pos.example.test' } as never,
      {} as never,
    );

    await expect(service.resolveCurrentSession('session-id')).rejects.toThrow(
      'User is not active',
    );
    const findCalls = findUnique.mock.calls as unknown as Array<
      [{ include: { deviceCredential: { select: Record<string, boolean> } } }]
    >;
    expect(findCalls[0][0].include.deviceCredential.select.id).toBe(true);
    expect(findCalls[0][0].include.deviceCredential.select.status).toBe(true);
  });

  it('rejects refresh when the linked device is inactive', async () => {
    const service = new AuthService(
      {
        session: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'session-id',
            userId: 'user-id',
            deviceId: 'device-id',
            status: 'ACTIVE',
            expiresAt: new Date(Date.now() + 1000),
            user: {
              status: UserStatus.ACTIVE,
              branchId: 'branch-id',
              tenant: { status: 'ACTIVE' },
              branch: { status: 'ACTIVE' },
            },
            device: {
              status: 'INACTIVE',
              branchId: 'branch-id',
              branch: { status: 'ACTIVE' },
            },
          }),
        },
      } as never,
      {} as never,
      { get: () => 'secret' } as never,
      {} as never,
    );

    await expect(service.refresh('session-id')).rejects.toThrow(
      'Device session is no longer valid',
    );
  });

  it('preserves the bound credential when refreshing a WebAuthn cashier session after taking locks first', async () => {
    const fixture = makeWebAuthnRefreshFixture();

    await fixture.service.refresh('session-id');

    const created = fixture.sessionCreate.mock.calls as unknown as Array<
      [{ data: Record<string, unknown> }]
    >;
    expect(created[0][0].data.deviceCredentialId).toBe('credential-id');
    expect(fixture.queryRaw).toHaveBeenCalledTimes(2);
    expect(fixture.queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
      fixture.queryRaw.mock.invocationCallOrder[1],
    );
    expect(fixture.queryRaw.mock.invocationCallOrder[1]).toBeLessThan(
      fixture.tx.session.updateMany.mock.invocationCallOrder[0],
    );
    expect(
      fixture.tx.session.findUnique.mock.invocationCallOrder[0],
    ).toBeGreaterThan(
      fixture.tx.session.updateMany.mock.invocationCallOrder[0],
    );
  });

  it('rejects a credential revoked during refresh rotation without creating a replacement', async () => {
    const fixture = makeWebAuthnRefreshFixture({
      credentialStatusDuringRefresh: 'REVOKED',
    });

    await expect(fixture.service.refresh('session-id')).rejects.toMatchObject({
      status: 401,
      response: { code: 'DEVICE_REVOKED' },
    });
    expect(fixture.queryRaw).toHaveBeenCalledTimes(2);
    expect(fixture.tx.session.create).not.toHaveBeenCalled();
  });

  it('does not issue a replacement session when the device is blocked during refresh rotation', async () => {
    const tx = {
      session: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUnique: jest.fn().mockResolvedValue({
          id: 'session-id',
          userId: 'user-id',
          deviceId: 'device-id',
          status: 'REVOKED',
          expiresAt: new Date(Date.now() + 1000),
          user: {
            id: 'user-id',
            tenantId: 'tenant-id',
            status: UserStatus.ACTIVE,
            branchId: 'branch-id',
            tenant: { status: 'ACTIVE' },
            branch: { status: 'ACTIVE' },
          },
          device: {
            tenantId: 'tenant-id',
            status: 'INACTIVE',
            branchId: 'branch-id',
            branch: { status: 'ACTIVE' },
          },
        }),
        create: jest.fn(),
      },
      $queryRaw: jest.fn().mockResolvedValue([{ id: 'device-id' }]),
    };
    const service = new AuthService(
      {
        session: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'session-id',
            userId: 'user-id',
            deviceId: 'device-id',
            status: 'ACTIVE',
            expiresAt: new Date(Date.now() + 1000),
            user: {
              id: 'user-id',
              tenantId: 'tenant-id',
              status: UserStatus.ACTIVE,
              branchId: 'branch-id',
              tenant: { status: 'ACTIVE' },
              branch: { status: 'ACTIVE' },
            },
            device: {
              tenantId: 'tenant-id',
              status: 'ACTIVE',
              branchId: 'branch-id',
              branch: { status: 'ACTIVE' },
            },
          }),
        },
        $transaction: jest.fn((callback: (client: typeof tx) => unknown) =>
          callback(tx),
        ),
      } as never,
      {} as never,
      { get: () => 'secret' } as never,
      {} as never,
    );

    await expect(service.refresh('session-id')).rejects.toThrow(
      'Device session is no longer valid',
    );
    expect(tx.session.create).not.toHaveBeenCalled();
  });

  it('rejects replayed device attestations during login', async () => {
    const timestamp = Date.now();
    const nonce = 'nonce';
    const signature = createHmac('sha256', 'device-secret') // nosemgrep: javascript.lang.security.audit.hardcoded-hmac-key.hardcoded-hmac-key -- deterministic test-only device secret
      .update(`device-id.${timestamp}.${nonce}`)
      .digest('base64url');
    const attestation = `${timestamp}.${nonce}.${signature}`;

    const createTransaction = (deviceAttestationCreate: jest.Mock) => ({
      deviceAttestation: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        create: deviceAttestationCreate,
        update: jest.fn().mockResolvedValue({ id: 'attestation-id' }),
      },
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'user-id',
          tenantId: 'tenant-id',
          branchId: 'branch-id',
          status: UserStatus.ACTIVE,
          tenant: { status: 'ACTIVE' },
          branch: { status: 'ACTIVE' },
        }),
      },
      session: {
        create: jest.fn().mockResolvedValue({
          id: 'session-id',
          expiresAt: new Date('2026-07-19T00:00:00.000Z'),
        }),
      },
    });

    type LoginTransaction = ReturnType<typeof createTransaction>;

    const transaction = jest
      .fn()
      .mockImplementationOnce((callback: (tx: LoginTransaction) => unknown) =>
        callback(
          createTransaction(
            jest.fn().mockResolvedValue({ id: 'attestation-id' }),
          ),
        ),
      )
      .mockImplementationOnce((callback: (tx: LoginTransaction) => unknown) =>
        callback(
          createTransaction(
            jest.fn().mockRejectedValue(
              new Prisma.PrismaClientKnownRequestError('unique', {
                code: 'P2002',
                clientVersion: 'test',
              }),
            ),
          ),
        ),
      );

    const service = new AuthService(
      {
        user: {
          findFirst: jest.fn().mockResolvedValue({
            id: 'user-id',
            tenantId: 'tenant-id',
            branchId: 'branch-id',
            status: UserStatus.ACTIVE,
            tenant: { status: 'ACTIVE' },
            branch: { status: 'ACTIVE' },
          }),
          findUnique: jest.fn().mockResolvedValue({
            id: 'user-id',
            tenantId: 'tenant-id',
            branchId: 'branch-id',
            status: UserStatus.ACTIVE,
            tenant: { status: 'ACTIVE' },
            branch: { status: 'ACTIVE' },
          }),
        },
        device: {
          findFirst: jest.fn().mockResolvedValue({
            id: 'device-id',
            tenantId: 'tenant-id',
            branchId: 'branch-id',
            fingerprintHash: 'fingerprint-hash',
            attestationSecretCiphertext: encryptDeviceAttestationSecret(
              'device-secret',
              'device-kek',
            ),
            status: 'ACTIVE',
            branch: { status: 'ACTIVE' },
          }),
        },
        session: {
          create: jest.fn(),
        },
        deviceAttestation: {
          deleteMany: jest.fn(),
          create: jest.fn(),
        },
        $transaction: transaction,
      } as never,
      {
        publicClient: {
          auth: {
            signInWithPassword: jest.fn().mockResolvedValue({
              data: { user: { id: 'supabase-id' } },
              error: null,
            }),
          },
        },
      } as never,
      {
        get: (key: string) =>
          key === 'DEVICE_ATTESTATION_KEK'
            ? 'device-kek'
            : key === 'SESSION_SECRET'
              ? 'secret'
              : 'csrf',
      } as never,
      {
        recordWithClient: jest.fn().mockResolvedValue(undefined),
      } as never,
    );

    await expect(
      service.login(
        'admin@shopcity.local',
        'password',
        'device-id',
        attestation,
      ),
    ).resolves.toBeDefined();

    await expect(
      service.login(
        'admin@shopcity.local',
        'password',
        'device-id',
        attestation,
      ),
    ).rejects.toThrow('Device attestation has already been used');
  });

  it('allows the same nonce on different devices', async () => {
    const timestamp = Date.now();
    const nonce = 'nonce';
    const deviceOneSecret = randomUUID();
    const deviceTwoSecret = randomUUID();
    const deviceOneAttestation = `${timestamp}.${nonce}.${createHmac(
      'sha256',
      deviceOneSecret,
    )
      .update(`device-one.${timestamp}.${nonce}`)
      .digest('base64url')}`;
    const deviceTwoAttestation = `${timestamp}.${nonce}.${createHmac(
      'sha256',
      deviceTwoSecret,
    )
      .update(`device-two.${timestamp}.${nonce}`)
      .digest('base64url')}`;

    const serviceOne = buildLoginService({
      device: buildDevice(deviceOneSecret, 'device-one'),
    });
    const serviceTwo = buildLoginService({
      device: buildDevice(deviceTwoSecret, 'device-two'),
    });

    await expect(
      serviceOne.login(
        'admin@shopcity.local',
        'password',
        'device-one',
        deviceOneAttestation,
      ),
    ).resolves.toBeDefined();
    await expect(
      serviceTwo.login(
        'admin@shopcity.local',
        'password',
        'device-two',
        deviceTwoAttestation,
      ),
    ).resolves.toBeDefined();
  });

  it('allows exactly one concurrent replay on the same device', async () => {
    const timestamp = Date.now();
    const secret = 'device-secret';
    const nonce = 'nonce';
    const attestation = `${timestamp}.${nonce}.${createHmac('sha256', secret) // nosemgrep: javascript.lang.security.audit.hardcoded-hmac-key.hardcoded-hmac-key -- deterministic test-only device secret
      .update(`device-id.${timestamp}.${nonce}`)
      .digest('base64url')}`;

    const createTransaction = (deviceAttestationCreate: jest.Mock) => ({
      deviceAttestation: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        create: deviceAttestationCreate,
        update: jest.fn().mockResolvedValue({ id: 'attestation-id' }),
      },
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'user-id',
          tenantId: 'tenant-id',
          branchId: 'branch-id',
          status: UserStatus.ACTIVE,
          tenant: { status: 'ACTIVE' },
          branch: { status: 'ACTIVE' },
        }),
      },
      session: {
        create: jest.fn().mockResolvedValue({
          id: 'session-id',
          expiresAt: new Date('2026-07-19T00:00:00.000Z'),
        }),
      },
    });

    const transaction = jest
      .fn()
      .mockImplementationOnce(
        (callback: (tx: ReturnType<typeof createTransaction>) => unknown) =>
          callback(
            createTransaction(
              jest.fn().mockResolvedValue({ id: 'attestation-id' }),
            ),
          ),
      )
      .mockImplementationOnce(
        (callback: (tx: ReturnType<typeof createTransaction>) => unknown) =>
          callback(
            createTransaction(
              jest.fn().mockRejectedValue(
                new Prisma.PrismaClientKnownRequestError('unique', {
                  code: 'P2002',
                  clientVersion: 'test',
                }),
              ),
            ),
          ),
      );

    const service = new AuthService(
      {
        user: {
          findFirst: jest.fn().mockResolvedValue({
            id: 'user-id',
            tenantId: 'tenant-id',
            branchId: 'branch-id',
            status: UserStatus.ACTIVE,
            tenant: { status: 'ACTIVE' },
            branch: { status: 'ACTIVE' },
          }),
          findUnique: jest.fn().mockResolvedValue({
            id: 'user-id',
            tenantId: 'tenant-id',
            branchId: 'branch-id',
            status: UserStatus.ACTIVE,
            tenant: { status: 'ACTIVE' },
            branch: { status: 'ACTIVE' },
          }),
        },
        device: {
          findFirst: jest.fn().mockResolvedValue({
            id: 'device-id',
            tenantId: 'tenant-id',
            branchId: 'branch-id',
            fingerprintHash: 'fingerprint-hash',
            attestationSecretCiphertext: encryptDeviceAttestationSecret(
              secret,
              'device-kek',
            ),
            status: 'ACTIVE',
            branch: { status: 'ACTIVE' },
          }),
        },
        session: {
          create: jest.fn(),
        },
        deviceAttestation: {
          deleteMany: jest.fn(),
          create: jest.fn(),
          update: jest.fn(),
        },
        $transaction: transaction,
      } as never,
      {
        publicClient: {
          auth: {
            signInWithPassword: jest.fn().mockResolvedValue({
              data: { user: { id: 'supabase-id' } },
              error: null,
            }),
          },
        },
      } as never,
      {
        get: (key: string) =>
          key === 'DEVICE_ATTESTATION_KEK'
            ? 'device-kek'
            : key === 'SESSION_SECRET'
              ? 'secret'
              : 'csrf',
      } as never,
      {
        recordWithClient: jest.fn().mockResolvedValue(undefined),
      } as never,
    );

    const results = await Promise.allSettled([
      service.login(
        'admin@shopcity.local',
        'password',
        'device-id',
        attestation,
      ),
      service.login(
        'admin@shopcity.local',
        'password',
        'device-id',
        attestation,
      ),
    ]);

    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    expect(
      results.filter((result) => result.status === 'rejected'),
    ).toHaveLength(1);
  });

  it('creates smoke bootstrap sessions without Supabase password login', async () => {
    const service = buildLoginService({ device: buildDevice('device-secret') });

    const issued = await service.bootstrapSmokeSession(
      'bootstrap-secret',
      UserRole.ADMIN,
      'user-id',
      'tenant-id',
    );

    const lifetimeMs = issued.context.session.expiresAt.getTime() - Date.now();
    expect(lifetimeMs).toBeGreaterThan(14 * 60 * 1000);
    expect(lifetimeMs).toBeLessThanOrEqual(15 * 60 * 1000);
  });

  it('rejects smoke bootstrap sessions without the gated secret', async () => {
    const service = buildLoginService({ device: buildDevice('device-secret') });

    await expect(
      service.bootstrapSmokeSession(
        'wrong-secret',
        UserRole.ADMIN,
        'user-id',
        'tenant-id',
      ),
    ).rejects.toThrow('Invalid smoke bootstrap credentials');
  });

  it('requires device attestation for smoke cashier bootstrap sessions', async () => {
    const service = buildLoginService({ device: buildDevice('device-secret') });

    await expect(
      service.bootstrapSmokeSession(
        'bootstrap-secret',
        UserRole.CASHIER,
        'user-id',
        'tenant-id',
        'device-id',
      ),
    ).rejects.toThrow('Device attestation is required');
  });

  it('ignores incidental cashier device locators for Admin and Supervisor logins', async () => {
    for (const role of [UserRole.ADMIN, UserRole.SUPERVISOR]) {
      const service = buildLoginService({
        device: buildDevice('device-secret'),
        userRole: role,
      });
      await expect(
        service.login(
          `${role.toLowerCase()}@shopcity.local`,
          'password',
          'device-id',
        ),
      ).resolves.toMatchObject({
        context: { session: { purpose: 'USER', deviceId: null } },
      });
    }
  });

  it('keeps cashier proof acceptance exclusive to each device binding mode', async () => {
    const timestamp = Date.now();
    const secret = 'mode-specific-device-secret';
    const nonce = 'mode-specific-nonce';
    const signature = createHmac('sha256', secret) // nosemgrep: javascript.lang.security.audit.hardcoded-hmac-key.hardcoded-hmac-key -- deterministic test-only device secret
      .update(`device-id.${timestamp}.${nonce}`)
      .digest('base64url');
    const hmacProof = `${timestamp}.${nonce}.${signature}`;

    for (const proof of [undefined, hmacProof]) {
      const unpairedService = buildLoginService({
        device: buildDevice(secret, 'device-id', 'UNPAIRED'),
        userRole: UserRole.CASHIER,
      });
      await expect(
        unpairedService.login(
          'cashier@shopcity.local',
          'password',
          'device-id',
          proof,
        ),
      ).rejects.toMatchObject({
        status: 401,
        response: { code: 'DEVICE_AUTH_FAILED' },
      });
    }

    const hmacWithoutProof = buildLoginService({
      device: buildDevice(secret, 'device-id', 'HMAC_LEGACY'),
      userRole: UserRole.CASHIER,
    });
    await expect(
      hmacWithoutProof.login('cashier@shopcity.local', 'password', 'device-id'),
    ).rejects.toMatchObject({
      status: 401,
      response: { code: 'DEVICE_AUTH_FAILED' },
    });
    const invalidHmacProof = buildLoginService({
      device: buildDevice(secret, 'device-id', 'HMAC_LEGACY'),
      userRole: UserRole.CASHIER,
    });
    await expect(
      invalidHmacProof.login(
        'cashier@shopcity.local',
        'password',
        'device-id',
        `${timestamp}.${nonce}.invalid-signature`,
      ),
    ).rejects.toMatchObject({
      status: 401,
      response: { code: 'DEVICE_AUTH_FAILED' },
    });

    const device = {
      ...buildDevice(secret, 'device-id', 'WEBAUTHN'),
      webAuthnCredentials: [
        {
          credentialId: 'credential-id',
          transports: ['internal'],
          authenticatorAttachment: 'platform',
          backupEligible: false,
          backedUp: false,
          rpId: 'pos.example.test',
          attestationTrustResult: 'TRUSTED',
        },
      ],
    };
    const createAttempt = jest.fn().mockResolvedValue({ id: 'attempt-id' });
    const sessionCreate = jest.fn();
    const user = {
      id: 'cashier-id',
      tenantId: 'tenant-id',
      branchId: 'branch-id',
      status: UserStatus.ACTIVE,
      role: UserRole.CASHIER,
      tenant: { status: 'ACTIVE' },
      branch: { status: 'ACTIVE' },
    };
    const webAuthnService = new AuthService(
      {
        user: {
          findFirst: jest.fn().mockResolvedValue(user),
          findUnique: jest.fn().mockResolvedValue(user),
        },
        device: { findFirst: jest.fn().mockResolvedValue(device) },
        cashierLoginAttempt: { create: createAttempt },
        session: { create: sessionCreate },
      } as never,
      {
        publicClient: {
          auth: {
            signInWithPassword: jest.fn().mockResolvedValue({
              data: { user: { id: 'supabase-id' } },
              error: null,
            }),
          },
        },
      } as never,
      {
        get: (key: string) =>
          key === 'WEBAUTHN_RP_ID'
            ? 'pos.example.test'
            : key === 'WEBAUTHN_ALLOWED_ORIGINS'
              ? 'https://pos.example.test'
              : 'secret',
      } as never,
      {} as never,
    );
    const webAuthnResult = await webAuthnService.login(
      'cashier@shopcity.local',
      'password',
      'device-id',
      hmacProof,
    );
    expect(webAuthnResult).toMatchObject({
      statusCode: 202,
      code: 'DEVICE_ASSERTION_REQUIRED',
    });
    expect(createAttempt).toHaveBeenCalledTimes(1);
    expect(sessionCreate).not.toHaveBeenCalled();
  });

  it('preserves the cashier HMAC_LEGACY proof path during the bounded migration', async () => {
    const timestamp = Date.now();
    const secret = 'legacy-device-secret';
    const nonce = 'legacy-nonce';
    const signature = createHmac('sha256', secret) // nosemgrep: javascript.lang.security.audit.hardcoded-hmac-key.hardcoded-hmac-key -- deterministic test-only device secret
      .update(`device-id.${timestamp}.${nonce}`)
      .digest('base64url');
    const service = buildLoginService({
      device: buildDevice(secret, 'device-id', 'HMAC_LEGACY'),
      userRole: UserRole.CASHIER,
    });

    await expect(
      service.login(
        'cashier@shopcity.local',
        'password',
        'device-id',
        `${timestamp}.${nonce}.${signature}`,
      ),
    ).resolves.toBeDefined();
  });

  it('rejects expired device attestations', async () => {
    const timestamp = Date.now() - 10 * 60 * 1000;
    const secret = 'device-secret';
    const nonce = 'nonce';
    const signature = createHmac('sha256', secret) // nosemgrep: javascript.lang.security.audit.hardcoded-hmac-key.hardcoded-hmac-key -- deterministic test-only device secret
      .update(`device-id.${timestamp}.${nonce}`)
      .digest('base64url');
    const attestation = `${timestamp}.${nonce}.${signature}`;

    const service = buildLoginService({
      device: buildDevice(secret),
    });

    await expect(
      service.login(
        'admin@shopcity.local',
        'password',
        'device-id',
        attestation,
      ),
    ).rejects.toThrow('Device attestation is invalid');
  });

  it('rejects invalid device attestation signatures', async () => {
    const timestamp = Date.now();
    const secret = 'device-secret';
    const attestation = `${timestamp}.nonce.invalid-signature`;

    const service = buildLoginService({
      device: buildDevice(secret),
    });

    await expect(
      service.login(
        'admin@shopcity.local',
        'password',
        'device-id',
        attestation,
      ),
    ).rejects.toThrow('Device attestation is invalid');
  });

  it('rejects attestations signed with a rotated device secret', async () => {
    const timestamp = Date.now();
    const oldSecret = 'old-device-secret';
    const newSecret = 'new-device-secret';
    const nonce = 'nonce';
    const signature = createHmac('sha256', oldSecret) // nosemgrep: javascript.lang.security.audit.hardcoded-hmac-key.hardcoded-hmac-key -- deterministic test-only device secret
      .update(`device-id.${timestamp}.${nonce}`)
      .digest('base64url');
    const attestation = `${timestamp}.${nonce}.${signature}`;

    const service = buildLoginService({
      device: buildDevice(newSecret),
    });

    await expect(
      service.login(
        'admin@shopcity.local',
        'password',
        'device-id',
        attestation,
      ),
    ).rejects.toThrow('Device attestation is invalid');
  });
});

function buildDevice(
  secret: string,
  deviceId: string = 'device-id',
  authBindingMode: string = 'HMAC_LEGACY',
) {
  return {
    id: deviceId,
    tenantId: 'tenant-id',
    branchId: 'branch-id',
    authBindingMode,
    fingerprintHash: 'fingerprint-hash',
    attestationSecretCiphertext: encryptDeviceAttestationSecret(
      secret,
      'device-kek',
    ),
    status: 'ACTIVE',
    branch: { status: 'ACTIVE' },
  };
}

function buildLoginService(overrides: {
  device: ReturnType<typeof buildDevice>;
  userRole?: UserRole;
}) {
  const transaction = {
    deviceAttestation: {
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      create: jest.fn().mockResolvedValue({ id: 'attestation-id' }),
      update: jest.fn().mockResolvedValue({ id: 'attestation-id' }),
    },
    user: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'user-id',
        tenantId: 'tenant-id',
        branchId: 'branch-id',
        status: UserStatus.ACTIVE,
        role: overrides.userRole ?? UserRole.ADMIN,
        tenant: { status: 'ACTIVE' },
        branch: { status: 'ACTIVE' },
      }),
    },
    session: {
      create: jest
        .fn()
        .mockImplementation(({ data }: { data: Record<string, unknown> }) => ({
          ...data,
          id: 'session-id',
        })),
    },
  };

  return new AuthService(
    {
      user: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'user-id',
          tenantId: 'tenant-id',
          branchId: 'branch-id',
          status: UserStatus.ACTIVE,
          role: overrides.userRole ?? UserRole.ADMIN,
          tenant: { status: 'ACTIVE' },
          branch: { status: 'ACTIVE' },
        }),
        findUnique: jest.fn().mockResolvedValue({
          id: 'user-id',
          tenantId: 'tenant-id',
          branchId: 'branch-id',
          status: UserStatus.ACTIVE,
          role: overrides.userRole ?? UserRole.ADMIN,
          tenant: { status: 'ACTIVE' },
          branch: { status: 'ACTIVE' },
        }),
      },
      device: {
        findFirst: jest.fn().mockResolvedValue(overrides.device),
      },
      session: {
        create: jest.fn(),
      },
      deviceAttestation: transaction.deviceAttestation,
      $transaction: jest.fn(
        (callback: (client: typeof transaction) => unknown) => {
          return callback(transaction);
        },
      ),
    } as never,
    {
      publicClient: {
        auth: {
          signInWithPassword: jest.fn().mockResolvedValue({
            data: { user: { id: 'supabase-id' } },
            error: null,
          }),
        },
      },
    } as never,
    {
      get: (key: string) =>
        key === 'DEVICE_ATTESTATION_KEK'
          ? 'device-kek'
          : key === 'SESSION_SECRET'
            ? 'secret'
            : key === 'SMOKE_SESSION_BOOTSTRAP_SECRET'
              ? 'bootstrap-secret'
              : 'csrf',
    } as never,
    {
      recordWithClient: jest.fn().mockResolvedValue(undefined),
    } as never,
  );
}
