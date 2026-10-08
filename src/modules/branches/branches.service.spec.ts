import { createHash } from 'node:crypto';
import {
  BranchStatus,
  DeviceAttestationTrustResult,
  DeviceAuthBindingMode,
  DeviceEnrollmentPurpose,
  DeviceStatus,
  DeviceWebAuthnCredentialStatus,
  TenantStatus,
  SessionStatus,
  UserRole,
  UserStatus,
} from '@prisma/client';
import {
  MetadataService,
  verifyRegistrationResponse,
  type MetadataStatement,
  type RegistrationResponseJSON,
} from '@simplewebauthn/server';
import type { AuthContext } from '../../common/auth/session.types';
import { BranchesService } from './branches.service';

jest.mock('@simplewebauthn/server', () => {
  const actual = jest.requireActual<typeof import('@simplewebauthn/server')>(
    '@simplewebauthn/server',
  );
  return {
    ...actual,
    verifyRegistrationResponse: jest.fn(),
    MetadataService: { initialize: jest.fn(), getStatement: jest.fn() },
  };
});

describe('BranchesService', () => {
  beforeEach(() => {
    jest.mocked(verifyRegistrationResponse).mockReset();
    jest
      .mocked(MetadataService)
      .initialize.mockReset()
      .mockResolvedValue(undefined);
    jest
      .mocked(MetadataService)
      .getStatement.mockReset()
      .mockResolvedValue({
        keyProtection: ['hardware'],
      } as unknown as MetadataStatement);
  });
  it('lists safe device binding metadata without widening Supervisor branch scope', async () => {
    const findMany = jest.fn(
      (args: {
        where: Record<string, string>;
        select: Record<string, unknown>;
      }) => {
        void args;
        return Promise.resolve([]);
      },
    );
    const service = new BranchesService(
      { device: { findMany } } as never,
      { recordWithClient: jest.fn() } as never,
      { get: () => false } as never,
    );
    const supervisor = actorStub();
    supervisor.user.role = UserRole.SUPERVISOR;

    await service.listDevices('tenant-id', supervisor);

    const callArgs = findMany.mock.calls[0]?.[0];
    expect(callArgs?.where).toEqual({
      tenantId: 'tenant-id',
      branchId: 'branch-id',
    });
    expect(callArgs?.select.authBindingMode).toBe(true);
    expect(callArgs?.select.pairedAt).toBe(true);
    expect(callArgs?.select.branch).toEqual({ select: { name: true } });
    expect(callArgs?.select.webAuthnCredentials).toBeDefined();
  });

  it('fails pairing closed until qualification or local development is explicitly enabled', async () => {
    const prisma = { device: { findFirst: jest.fn() } };
    const service = new BranchesService(
      prisma as never,
      { recordWithClient: jest.fn() } as never,
      { get: () => false } as never,
    );
    await expect(
      service.createDeviceEnrollment('tenant-id', actorStub(), 'device-id'),
    ).rejects.toMatchObject({
      response: { code: 'DEVICE_ENROLLMENT_INVALID' },
    });
    expect(prisma.device.findFirst).not.toHaveBeenCalled();
  });

  it('rejects the development opt-in outside NODE_ENV=development', async () => {
    const findFirst = jest.fn();
    const prisma = { device: { findFirst } };
    const config = {
      NODE_ENV: 'production',
      WEBAUTHN_DEVICE_QUALIFICATION_APPROVED: false,
      WEBAUTHN_DEV_ENROLLMENT_ENABLED: true,
    };
    const service = new BranchesService(
      prisma as never,
      { recordWithClient: jest.fn() } as never,
      { get: (key: string) => config[key as keyof typeof config] } as never,
    );

    await expect(
      service.createDeviceEnrollment('tenant-id', actorStub(), 'device-id'),
    ).rejects.toMatchObject({
      response: { code: 'DEVICE_ENROLLMENT_INVALID' },
    });
    expect(findFirst).not.toHaveBeenCalled();
  });

  it('allows enrollment only when the explicit Vercel Preview opt-in is in Preview', async () => {
    const findFirst = jest.fn().mockResolvedValue(null);
    const prisma = { device: { findFirst } };
    const config: Record<string, string | boolean> = {
      NODE_ENV: 'production',
      VERCEL_ENV: 'preview',
      WEBAUTHN_DEVICE_QUALIFICATION_APPROVED: false,
      WEBAUTHN_DEV_ENROLLMENT_ENABLED: false,
      WEBAUTHN_PREVIEW_ENROLLMENT_ENABLED: true,
      WEBAUTHN_RP_ID: 'pos-preview.example.com',
      WEBAUTHN_ALLOWED_ORIGINS: 'https://pos-preview.example.com',
    };
    const service = new BranchesService(
      prisma as never,
      { recordWithClient: jest.fn() } as never,
      { get: (key: string) => config[key] } as never,
    );

    await expect(
      service.createDeviceEnrollment('tenant-id', actorStub(), 'device-id'),
    ).rejects.toMatchObject({
      response: { code: 'DEVICE_NOT_AVAILABLE' },
    });
    expect(findFirst).toHaveBeenCalledTimes(1);

    config.VERCEL_ENV = 'production';
    findFirst.mockClear();
    await expect(
      service.createDeviceEnrollment('tenant-id', actorStub(), 'device-id'),
    ).rejects.toMatchObject({
      response: { code: 'DEVICE_ENROLLMENT_INVALID' },
    });
    expect(findFirst).not.toHaveBeenCalled();
  });

  it('returns one-time pairing token but persists only its SHA-256 hash', async () => {
    let persistedChallenge: Record<string, unknown> | undefined;
    const tx = {
      deviceEnrollmentChallenge: {
        create: jest.fn((args: { data: Record<string, unknown> }) => {
          persistedChallenge = args.data;
          return {};
        }),
      },
    };
    const prisma = {
      device: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'device-id',
          tenantId: 'tenant-id',
          branchId: 'branch-id',
          name: 'POS',
          authBindingMode: DeviceAuthBindingMode.UNPAIRED,
          status: DeviceStatus.ACTIVE,
          branch: {
            status: BranchStatus.ACTIVE,
            tenant: { status: TenantStatus.ACTIVE },
          },
          webAuthnCredentials: [],
        }),
      },
      $transaction: jest.fn((callback: (client: typeof tx) => unknown) =>
        callback(tx),
      ),
    };
    const auditEvents: Array<{ action: string; metadata?: unknown }> = [];
    const auditService = {
      recordWithClient: jest.fn(
        (_client: unknown, event: { action: string; metadata?: unknown }) => {
          auditEvents.push(event);
          return {};
        },
      ),
    };
    const service = new BranchesService(
      prisma as never,
      auditService as never,
      {
        get: (key: string) => {
          const values: Record<string, string | boolean> = {
            NODE_ENV: 'development',
            WEBAUTHN_DEVICE_QUALIFICATION_APPROVED: false,
            WEBAUTHN_DEV_ENROLLMENT_ENABLED: true,
            WEBAUTHN_RP_ID: 'localhost',
            WEBAUTHN_ALLOWED_ORIGINS: 'http://localhost:3000',
          };
          return values[key];
        },
      } as never,
    );
    const result = await service.createDeviceEnrollment(
      'tenant-id',
      actorStub(),
      'device-id',
    );
    expect(result.authorizationToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(prisma.device.findFirst).toHaveBeenCalledWith({
      where: { id: 'device-id', tenantId: 'tenant-id' },
      include: {
        branch: { include: { tenant: true } },
        webAuthnCredentials: {
          where: { status: DeviceWebAuthnCredentialStatus.ACTIVE },
        },
      },
    });
    expect(result.options).toMatchObject({
      attestation: 'direct',
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        residentKey: 'discouraged',
      },
      timeout: 300000,
    });
    expect(persistedChallenge?.authorizationTokenHash).not.toBe(
      result.authorizationToken,
    );
    expect(persistedChallenge?.authorizationTokenHash).toMatch(
      /^[a-f0-9]{64}$/,
    );
    expect(persistedChallenge?.challengeHash).not.toBe(
      result.options.challenge,
    );
    expect(auditEvents[0]?.action).toBe('device.enrollment.authorize');
    const authorizationAudit = auditEvents[0]?.metadata as {
      purpose: DeviceEnrollmentPurpose;
      expiresAt: Date;
    };
    expect(authorizationAudit.purpose).toBe(DeviceEnrollmentPurpose.PAIRING);
    expect(authorizationAudit.expiresAt).toBeInstanceOf(Date);
    expect(JSON.stringify(auditEvents[0]?.metadata)).not.toContain(
      result.authorizationToken,
    );
  });
  it('allows a Supervisor to create enrollment only in their own branch', async () => {
    const tx = {
      deviceEnrollmentChallenge: { create: jest.fn(() => Promise.resolve({})) },
    };
    const device = {
      id: 'device-id',
      tenantId: 'tenant-id',
      branchId: 'branch-id',
      name: 'POS',
      status: DeviceStatus.ACTIVE,
      authBindingMode: DeviceAuthBindingMode.UNPAIRED,
      branch: {
        status: BranchStatus.ACTIVE,
        tenant: { status: TenantStatus.ACTIVE },
      },
      webAuthnCredentials: [],
    };
    const prisma = {
      device: { findFirst: jest.fn(() => Promise.resolve(device)) },
      $transaction: jest.fn(
        (callback: (client: typeof tx) => Promise<unknown>) => callback(tx),
      ),
    };
    const config = {
      get: (key: string) =>
        ({
          WEBAUTHN_DEVICE_QUALIFICATION_APPROVED: true,
          WEBAUTHN_RP_ID: 'example.com',
          WEBAUTHN_ALLOWED_ORIGINS: 'https://pos.example.com',
        })[key],
    };
    const service = new BranchesService(
      prisma as never,
      { recordWithClient: jest.fn(() => Promise.resolve({})) } as never,
      config as never,
    );
    const supervisor = actorStub();
    supervisor.user.role = UserRole.SUPERVISOR;
    await service.createDeviceEnrollment('tenant-id', supervisor, 'device-id');
    expect(prisma.device.findFirst).toHaveBeenCalledWith({
      where: { id: 'device-id', tenantId: 'tenant-id', branchId: 'branch-id' },
      include: {
        branch: { include: { tenant: true } },
        webAuthnCredentials: {
          where: { status: DeviceWebAuthnCredentialStatus.ACTIVE },
        },
      },
    });
  });

  it('completes HMAC migration atomically using verified metadata only', async () => {
    const fixture = enrollmentFixture(DeviceAuthBindingMode.HMAC_LEGACY);
    const result = await fixture.service.completeDeviceEnrollment(
      'device-id',
      'authorization-bearer-token-12345678901234567890',
      fixture.response,
    );

    expect(result).toEqual({ status: 'ACTIVE' });
    expect(jest.mocked(MetadataService).initialize.mock.calls).toEqual([
      [{ verificationMode: 'strict' }],
    ]);
    const verificationArgs = jest.mocked(verifyRegistrationResponse).mock
      .calls[0]?.[0];
    expect(verificationArgs?.expectedOrigin).toEqual([
      'https://pos.example.com',
    ]);
    expect(verificationArgs?.expectedRPID).toBe('example.com');
    expect(
      typeof verificationArgs?.expectedChallenge === 'function'
        ? await verificationArgs.expectedChallenge('known-challenge')
        : false,
    ).toBe(true);

    expect(fixture.challengeConsumeArgs()?.where).toMatchObject({
      id: 'challenge-id',
      consumedAt: null,
    });
    const createdCredential = fixture.createdCredentialData();
    expect(createdCredential).toMatchObject({
      credentialId: 'credential-public-id',
      publicKey: Buffer.from([1, 2, 3]),
      aaguid: 'aaguid-1',
      signCount: 7,
      authenticatorAttachment: 'platform',
      backupEligible: false,
      backedUp: false,
      attestationFormat: 'packed',
      attestationTrustResult: DeviceAttestationTrustResult.TRUSTED,
      rpId: 'example.com',
      status: DeviceWebAuthnCredentialStatus.ACTIVE,
    });
    expect(createdCredential).not.toHaveProperty('attestationObject');
    expect(fixture.credentialSupersedeArgs()?.where).toMatchObject({
      status: DeviceWebAuthnCredentialStatus.ACTIVE,
      id: { not: 'credential-row-id' },
    });
    expect(fixture.credentialSupersedeArgs()?.data).toEqual({
      status: DeviceWebAuthnCredentialStatus.SUPERSEDED,
    });
    expect(fixture.deviceTransitionArgs()?.where).toMatchObject({
      authBindingMode: DeviceAuthBindingMode.HMAC_LEGACY,
      pairedAt: null,
    });
    expect(fixture.deviceTransitionArgs()?.data).toMatchObject({
      authBindingMode: DeviceAuthBindingMode.WEBAUTHN,
      attestationSecretCiphertext: null,
      attestationSecretVersion: 0,
    });
    expect(fixture.sessionRevocationArgs()).toMatchObject({
      where: { deviceId: 'device-id', status: 'ACTIVE' },
      data: { status: 'REVOKED' },
    });
    expect(fixture.auditEvents.map((event) => event.action)).toEqual(
      expect.arrayContaining([
        'device.sessions.revoke',
        'device.credential.activate',
      ]),
    );
  });

  it('re-pairs a WEBAUTHN device using the repair purpose and superseding predicate', async () => {
    const fixture = enrollmentFixture(DeviceAuthBindingMode.WEBAUTHN);
    await expect(
      fixture.service.completeDeviceEnrollment(
        'device-id',
        'authorization-bearer-token-12345678901234567890',
        fixture.response,
      ),
    ).resolves.toEqual({ status: 'ACTIVE' });
    expect(fixture.challenge.purpose).toBe(DeviceEnrollmentPurpose.REPAIR);
    expect(fixture.deviceTransitionArgs()?.where).toMatchObject({
      authBindingMode: DeviceAuthBindingMode.WEBAUTHN,
      pairedAt: fixture.device.pairedAt,
    });
    expect(fixture.credentialSupersedeArgs()?.data).toEqual({
      status: DeviceWebAuthnCredentialStatus.SUPERSEDED,
    });
  });

  it.each([
    'invalid signature',
    'wrong origin',
    'wrong RP ID',
    'missing user verification',
  ])('rejects verifier failure for %s without enrollment writes', async () => {
    const fixture = enrollmentFixture(DeviceAuthBindingMode.UNPAIRED);
    jest.mocked(verifyRegistrationResponse).mockResolvedValue({
      verified: false,
    });
    await expect(
      fixture.service.completeDeviceEnrollment(
        'device-id',
        'authorization-bearer-token-12345678901234567890',
        fixture.response,
      ),
    ).rejects.toMatchObject({
      response: { code: 'DEVICE_ENROLLMENT_INVALID' },
    });
    expectEnrollmentWritesAbsent(fixture);
  });

  it.each([
    ['non-platform authenticator', { attachment: 'cross-platform' }],
    ['none attestation', { fmt: 'none' }],
    ['multi-device credential', { credentialDeviceType: 'multiDevice' }],
    ['backed-up credential', { credentialBackedUp: true }],
  ] as const)(
    'rejects %s without enrollment writes',
    async (_name, options) => {
      const fixture = enrollmentFixture(
        DeviceAuthBindingMode.UNPAIRED,
        options,
      );
      await expect(
        fixture.service.completeDeviceEnrollment(
          'device-id',
          'authorization-bearer-token-12345678901234567890',
          fixture.response,
        ),
      ).rejects.toMatchObject({
        response: { code: 'DEVICE_ENROLLMENT_INVALID' },
      });
      expectEnrollmentWritesAbsent(fixture);
    },
  );

  it.each([
    ['unknown authenticator', undefined],
    [
      'authenticator without hardware protection',
      { keyProtection: ['software'] },
    ],
  ])(
    'rejects %s metadata without enrollment writes',
    async (_name, statement) => {
      const fixture = enrollmentFixture(DeviceAuthBindingMode.UNPAIRED);
      jest
        .mocked(MetadataService)
        .getStatement.mockResolvedValue(
          statement as unknown as MetadataStatement,
        );
      await expect(
        fixture.service.completeDeviceEnrollment(
          'device-id',
          'authorization-bearer-token-12345678901234567890',
          fixture.response,
        ),
      ).rejects.toMatchObject({
        response: { code: 'DEVICE_ENROLLMENT_INVALID' },
      });
      expectEnrollmentWritesAbsent(fixture);
    },
  );

  it('shares one strict metadata initialization promise across concurrent verifications', async () => {
    const fixture = enrollmentFixture(DeviceAuthBindingMode.UNPAIRED);
    const subject = fixture.service as unknown as {
      initializeMetadataService: () => Promise<void>;
    };
    await Promise.all([
      subject.initializeMetadataService(),
      subject.initializeMetadataService(),
      subject.initializeMetadataService(),
    ]);
    expect(jest.mocked(MetadataService).initialize.mock.calls).toEqual([
      [{ verificationMode: 'strict' }],
    ]);
  });

  it('fails closed and caches a failed signed-MDS initialization', async () => {
    const fixture = enrollmentFixture(DeviceAuthBindingMode.UNPAIRED);
    jest
      .mocked(MetadataService)
      .initialize.mockRejectedValue(new Error('offline'));
    await expect(
      fixture.service.completeDeviceEnrollment(
        'device-id',
        'authorization-bearer-token-12345678901234567890',
        fixture.response,
      ),
    ).rejects.toMatchObject({
      response: { code: 'DEVICE_ENROLLMENT_INVALID' },
    });
    await expect(
      fixture.service.completeDeviceEnrollment(
        'device-id',
        'authorization-bearer-token-12345678901234567890',
        fixture.response,
      ),
    ).rejects.toMatchObject({
      response: { code: 'DEVICE_ENROLLMENT_INVALID' },
    });
    expect(jest.mocked(MetadataService).initialize.mock.calls).toHaveLength(1);
    expectEnrollmentWritesAbsent(fixture);
  });

  it('does not write enrollment state when the authorization was already consumed', async () => {
    const fixture = enrollmentFixture(DeviceAuthBindingMode.UNPAIRED);
    fixture.tx.deviceEnrollmentChallenge.updateMany.mockResolvedValue({
      count: 0,
    });
    await expect(
      fixture.service.completeDeviceEnrollment(
        'device-id',
        'authorization-bearer-token-12345678901234567890',
        fixture.response,
      ),
    ).rejects.toMatchObject({
      response: { code: 'DEVICE_ENROLLMENT_INVALID' },
    });
    expect(fixture.tx.device.findFirst).not.toHaveBeenCalled();
    expectEnrollmentWritesAbsent(fixture);
  });

  it.each([
    ['missing actor', { actor: null }],
    ['inactive device', { deviceStatus: DeviceStatus.INACTIVE }],
    ['inactive branch', { branchStatus: BranchStatus.INACTIVE }],
    ['inactive tenant', { tenantStatus: TenantStatus.SUSPENDED }],
  ])(
    'rejects stale %s without credential/device/session writes',
    async (_name, options) => {
      const fixture = enrollmentFixture(
        DeviceAuthBindingMode.UNPAIRED,
        options,
      );
      await expect(
        fixture.service.completeDeviceEnrollment(
          'device-id',
          'authorization-bearer-token-12345678901234567890',
          fixture.response,
        ),
      ).rejects.toMatchObject({
        response: { code: 'DEVICE_ENROLLMENT_INVALID' },
      });
      expectEnrollmentWritesAbsent(fixture);
    },
  );

  it('returns opaque DEVICE_NOT_AVAILABLE for an out-of-branch Supervisor', async () => {
    const prisma = { device: { findFirst: jest.fn().mockResolvedValue(null) } };
    const service = new BranchesService(
      prisma as never,
      { recordWithClient: jest.fn() } as never,
      {
        get: (key: string) =>
          ({
            WEBAUTHN_DEVICE_QUALIFICATION_APPROVED: true,
            WEBAUTHN_RP_ID: 'example.com',
            WEBAUTHN_ALLOWED_ORIGINS: 'https://pos.example.com',
          })[key],
      } as never,
    );
    const supervisor = actorStub();
    supervisor.user.role = UserRole.SUPERVISOR;
    await expect(
      service.createDeviceEnrollment('tenant-id', supervisor, 'device-id'),
    ).rejects.toMatchObject({
      response: {
        code: 'DEVICE_NOT_AVAILABLE',
        message: 'Device not available',
      },
    });
    expect(prisma.device.findFirst).toHaveBeenCalledWith({
      where: { id: 'device-id', tenantId: 'tenant-id', branchId: 'branch-id' },
      include: {
        branch: { include: { tenant: true } },
        webAuthnCredentials: {
          where: { status: DeviceWebAuthnCredentialStatus.ACTIVE },
        },
      },
    });
  });

  it('lists current credential status without public-key material', async () => {
    const credentialRows = [
      { id: 'active-id', status: DeviceWebAuthnCredentialStatus.ACTIVE },
      { id: 'revoked-id', status: DeviceWebAuthnCredentialStatus.REVOKED },
    ];
    const credentialSelects: Array<Record<string, boolean>> = [];
    const prisma = {
      device: { findFirst: jest.fn().mockResolvedValue({ id: 'device-id' }) },
      deviceWebAuthnCredential: {
        findMany: jest.fn((args: { select: Record<string, boolean> }) => {
          credentialSelects.push(args.select);
          return Promise.resolve(credentialRows);
        }),
      },
    };
    const service = new BranchesService(
      prisma as never,
      { recordWithClient: jest.fn() } as never,
      { get: () => undefined } as never,
    );
    await expect(
      service.listDeviceCredentials('tenant-id', actorStub(), 'device-id'),
    ).resolves.toEqual(credentialRows);
    expect(credentialSelects[0]?.id).toBe(true);
    expect(credentialSelects[0]?.status).toBe(true);
    expect(credentialSelects[0]?.attestationTrustResult).toBe(true);
    expect(Object.hasOwn(credentialSelects[0] ?? {}, 'publicKey')).toBe(false);
  });

  it('revokes only sessions bound to the selected active credential', async () => {
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([]),
      device: { findFirst: jest.fn().mockResolvedValue({ id: 'device-id' }) },
      deviceWebAuthnCredential: {
        findFirst: jest.fn().mockResolvedValue({ id: 'credential-id' }),
        updateMany: jest.fn(() => Promise.resolve({ count: 1 })),
      },
      session: { updateMany: jest.fn(() => Promise.resolve({ count: 1 })) },
    };
    const prisma = {
      device: { findFirst: jest.fn().mockResolvedValue({ id: 'device-id' }) },
      $transaction: jest.fn(
        (callback: (client: typeof tx) => Promise<unknown>) => callback(tx),
      ),
    };
    const auditActions: string[] = [];
    const audit = {
      recordWithClient: jest.fn(
        (_client: unknown, event: { action: string }) => {
          auditActions.push(event.action);
          return Promise.resolve({});
        },
      ),
    };
    const service = new BranchesService(
      prisma as never,
      audit as never,
      { get: () => undefined } as never,
    );
    await expect(
      service.revokeDeviceCredential(
        'tenant-id',
        actorStub(),
        'device-id',
        'credential-id',
      ),
    ).resolves.toEqual({ status: DeviceWebAuthnCredentialStatus.REVOKED });
    expect(tx.deviceWebAuthnCredential.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'credential-id',
          deviceId: 'device-id',
          tenantId: 'tenant-id',
          status: DeviceWebAuthnCredentialStatus.ACTIVE,
        },
      }),
    );
    expect(tx.session.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          deviceId: 'device-id',
          deviceCredentialId: 'credential-id',
          status: 'ACTIVE',
        },
      }),
    );
    expect(auditActions).toEqual(
      expect.arrayContaining([
        'device.sessions.revoke',
        'device.credential.revoke',
      ]),
    );
    expect(tx.$queryRaw).toHaveBeenCalledTimes(2);
    expect(tx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
      tx.$queryRaw.mock.invocationCallOrder[1],
    );
    expect(tx.$queryRaw.mock.invocationCallOrder[1]).toBeLessThan(
      tx.deviceWebAuthnCredential.findFirst.mock.invocationCallOrder[0],
    );
    expect(
      tx.deviceWebAuthnCredential.findFirst.mock.invocationCallOrder[0],
    ).toBeLessThan(
      tx.deviceWebAuthnCredential.updateMany.mock.invocationCallOrder[0],
    );
    expect(
      tx.deviceWebAuthnCredential.updateMany.mock.invocationCallOrder[0],
    ).toBeLessThan(tx.session.updateMany.mock.invocationCallOrder[0]);
  });

  it('does not revoke sessions when the locked credential is no longer active', async () => {
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([]),
      device: { findFirst: jest.fn().mockResolvedValue({ id: 'device-id' }) },
      deviceWebAuthnCredential: {
        findFirst: jest.fn().mockResolvedValue(null),
        updateMany: jest.fn(),
      },
      session: { updateMany: jest.fn() },
    };
    const prisma = {
      device: { findFirst: jest.fn().mockResolvedValue({ id: 'device-id' }) },
      $transaction: jest.fn(
        (callback: (client: typeof tx) => Promise<unknown>) => callback(tx),
      ),
    };
    const service = new BranchesService(
      prisma as never,
      { recordWithClient: jest.fn() } as never,
      { get: () => undefined } as never,
    );

    await expect(
      service.revokeDeviceCredential(
        'tenant-id',
        actorStub(),
        'device-id',
        'credential-id',
      ),
    ).rejects.toMatchObject({ response: { code: 'DEVICE_NOT_AVAILABLE' } });
    expect(tx.deviceWebAuthnCredential.updateMany).not.toHaveBeenCalled();
    expect(tx.session.updateMany).not.toHaveBeenCalled();
  });

  it.each([
    ['device', { deviceStatus: DeviceStatus.INACTIVE }],
    ['branch', { branchStatus: BranchStatus.INACTIVE }],
    ['tenant', { tenantStatus: TenantStatus.SUSPENDED }],
  ] as const)(
    'does not enroll an inactive %s and uses opaque 404',
    async (_label, state) => {
      const deadDevice = enrollmentFixture(
        DeviceAuthBindingMode.UNPAIRED,
        state,
      );
      const prisma = {
        device: { findFirst: jest.fn().mockResolvedValue(deadDevice.device) },
        $transaction: jest.fn(),
      };
      const config = {
        get: (key: string) =>
          ({
            WEBAUTHN_DEVICE_QUALIFICATION_APPROVED: true,
            WEBAUTHN_RP_ID: 'example.com',
            WEBAUTHN_ALLOWED_ORIGINS: 'https://pos.example.com',
          })[key],
      };
      const service = new BranchesService(
        prisma as never,
        { recordWithClient: jest.fn() } as never,
        config as never,
      );
      await expect(
        service.createDeviceEnrollment('tenant-id', actorStub(), 'device-id'),
      ).rejects.toMatchObject({
        response: {
          code: 'DEVICE_NOT_AVAILABLE',
          message: 'Device not available',
        },
      });
      expect(prisma.$transaction).not.toHaveBeenCalled();
    },
  );

  it('creates new devices unpaired without fingerprint or HMAC secret', async () => {
    const tx = {
      device: {
        create: jest.fn((args: { data: Record<string, unknown> }) => {
          void args;
          return {
            id: 'device-id',
            tenantId: 'tenant-id',
            branchId: 'branch-id',
            name: 'Front desk tablet',
            fingerprintHash: null,
            authBindingMode: 'UNPAIRED',
            attestationSecretCiphertext: null,
            attestationSecretVersion: 0,
            attestationSecretRotatedAt: null,
            status: DeviceStatus.ACTIVE,
            lastSeenAt: null,
            createdAt: new Date('2026-08-03T00:00:00.000Z'),
            updatedAt: new Date('2026-08-03T00:00:00.000Z'),
          };
        }),
      },
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: 'audit-id' }),
      },
    };
    const prisma = {
      branch: {
        findFirst: jest.fn().mockResolvedValue({ id: 'branch-id' }),
      },
      $transaction: jest.fn((callback: (client: typeof tx) => unknown) =>
        callback(tx),
      ),
    };
    const service = new BranchesService(
      prisma as never,
      {
        recordWithClient: jest.fn().mockResolvedValue({ id: 'audit-id' }),
      } as never,
      {
        get: (key: string) =>
          key === 'DEVICE_ATTESTATION_KEK' ? 'device-kek' : undefined,
      } as never,
    );

    const created = await service.createDevice(
      'tenant-id',
      actorStub(),
      {
        branchId: 'branch-id',
        name: 'Front desk tablet',
        fingerprintHash: 'fingerprint-hash',
      },
      'device-key',
    );

    expect(created).toEqual(
      expect.objectContaining({ id: 'device-id', authBindingMode: 'UNPAIRED' }),
    );
    const createArgs = tx.device.create.mock.calls[0]?.[0];
    expect(createArgs?.data).toEqual(
      expect.objectContaining({
        fingerprintHash: null,
        authBindingMode: 'UNPAIRED',
        attestationSecretCiphertext: null,
      }),
    );
    expect(created).not.toHaveProperty('attestationSecret');
    expect(created).not.toHaveProperty('attestationSecretCiphertext');
    expect(created).not.toHaveProperty('fingerprintHash');
  });

  it('revokes active sessions when a device becomes inactive', async () => {
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([]),
      device: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'device-id',
          tenantId: 'tenant-id',
          branchId: 'branch-id',
          status: DeviceStatus.ACTIVE,
        }),
        update: jest.fn().mockResolvedValue({
          id: 'device-id',
          tenantId: 'tenant-id',
          status: DeviceStatus.INACTIVE,
          attestationSecretVersion: 1,
          attestationSecretRotatedAt: null,
          attestationSecretCiphertext: 'ciphertext',
        }),
      },
      session: {
        updateMany: jest.fn().mockResolvedValue({ count: 2 }),
      },
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: 'audit-id' }),
      },
    };
    const prisma = {
      device: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'device-id',
          tenantId: 'tenant-id',
          branchId: 'branch-id',
          status: DeviceStatus.ACTIVE,
        }),
      },
      $transaction: jest.fn((callback: (client: typeof tx) => unknown) =>
        callback(tx),
      ),
    };
    const auditService = {
      recordWithClient: jest.fn().mockResolvedValue({ id: 'audit-id' }),
    };
    const service = new BranchesService(
      prisma as never,
      auditService as never,
      {
        get: (key: string) =>
          key === 'DEVICE_ATTESTATION_KEK' ? 'device-kek' : undefined,
      } as never,
    );

    await service.updateDevice(
      'tenant-id',
      actorStub(),
      'device-id',
      { status: DeviceStatus.INACTIVE },
      'device-update-key-1',
    );

    type SessionUpdateArgs = {
      where: { deviceId: string; status: string };
      data: { status: string; revokedAt: Date };
    };

    const sessionUpdateMany = tx.session.updateMany as jest.MockedFunction<
      (args: SessionUpdateArgs) => Promise<{ count: number }>
    >;
    const sessionUpdateArgs = sessionUpdateMany.mock.calls[0]?.[0];
    expect(sessionUpdateArgs).toMatchObject({
      where: { deviceId: 'device-id', status: 'ACTIVE' },
      data: { status: 'REVOKED' },
    });
    expect(sessionUpdateArgs.data.revokedAt).toBeInstanceOf(Date);
    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
    expect(tx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
      tx.device.update.mock.invocationCallOrder[0],
    );
    expect(tx.device.update.mock.invocationCallOrder[0]).toBeLessThan(
      tx.session.updateMany.mock.invocationCallOrder[0],
    );
    expect(auditService.recordWithClient).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        tenantId: 'tenant-id',
        actorId: 'user-id',
        action: 'device.sessions.revoke',
        entityType: 'device',
        entityId: 'device-id',
        metadata: {
          reason: 'device_status_ineligible',
          status: DeviceStatus.INACTIVE,
          revokedSessionCount: 2,
        },
      }),
    );
  });

  it('does not restore revoked sessions when a device is reactivated', async () => {
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([]),
      device: {
        updateMany: jest.fn(() => Promise.resolve({ count: 1 })),
        findFirst: jest
          .fn()
          .mockResolvedValueOnce({
            id: 'device-id',
            tenantId: 'tenant-id',
            branchId: 'branch-id',
            status: DeviceStatus.INACTIVE,
            authBindingMode: DeviceAuthBindingMode.HMAC_LEGACY,
            pairedAt: null,
            attestationSecretVersion: 1,
            attestationSecretRotatedAt: new Date('2026-08-03T00:00:00.000Z'),
            attestationSecretCiphertext: 'ciphertext',
          })
          .mockResolvedValue({
            id: 'device-id',
            tenantId: 'tenant-id',
            status: DeviceStatus.ACTIVE,
            authBindingMode: DeviceAuthBindingMode.HMAC_LEGACY,
            attestationSecretVersion: 2,
            attestationSecretRotatedAt: new Date(),
            attestationSecretCiphertext: 'ciphertext-rotated',
          }),
      },
      session: {
        updateMany: jest.fn(),
      },
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: 'audit-id' }),
      },
    };
    const prisma = {
      device: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'device-id',
          tenantId: 'tenant-id',
          branchId: 'branch-id',
          status: DeviceStatus.INACTIVE,
          authBindingMode: DeviceAuthBindingMode.HMAC_LEGACY,
          pairedAt: null,
          attestationSecretCiphertext: 'ciphertext',
          attestationSecretVersion: 1,
          attestationSecretRotatedAt: new Date('2026-08-03T00:00:00.000Z'),
        }),
      },
      $transaction: jest.fn((callback: (client: typeof tx) => unknown) =>
        callback(tx),
      ),
    };
    const auditService = {
      recordWithClient: jest.fn().mockResolvedValue({ id: 'audit-id' }),
    };
    const service = new BranchesService(
      prisma as never,
      auditService as never,
      {
        get: (key: string) =>
          key === 'DEVICE_ATTESTATION_KEK' ? 'device-kek' : undefined,
      } as never,
    );

    await service.updateDevice(
      'tenant-id',
      actorStub(),
      'device-id',
      { status: DeviceStatus.ACTIVE },
      'device-update-key-2',
    );

    expect(tx.session.updateMany).not.toHaveBeenCalled();
    expect(tx.device.updateMany).toHaveBeenCalled();
  });

  it('returns the rotated secret once and never persists it for idempotent replay', async () => {
    type IdempotencyRecordRow = {
      requestHash: string;
      responseJson: unknown;
    } | null;
    let persistedRequestHash: string | undefined;
    const idempotencyCreate = jest.fn(
      (args: { data: { requestHash: string } }) => {
        persistedRequestHash = args.data.requestHash;
        return Promise.resolve({});
      },
    );
    const idempotencyFindUnique = jest.fn(
      (args: unknown): Promise<IdempotencyRecordRow> => {
        void args;
        return Promise.resolve(null);
      },
    );
    let persistedResponse: unknown;
    const idempotencyUpdate = jest.fn(
      (args: {
        data: { responseJson: unknown };
        where: Record<string, unknown>;
      }) => {
        persistedResponse = args.data.responseJson;
        return Promise.resolve({});
      },
    );
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([]),
      idempotencyRecord: { create: idempotencyCreate },
      device: {
        updateMany: jest.fn(() => Promise.resolve({ count: 1 })),
        findFirst: jest.fn().mockResolvedValue({
          id: 'device-id',
          tenantId: 'tenant-id',
          branchId: 'branch-id',
          status: DeviceStatus.ACTIVE,
          authBindingMode: DeviceAuthBindingMode.HMAC_LEGACY,
          attestationSecretCiphertext: 'ciphertext-after-rotation',
          attestationSecretVersion: 2,
          attestationSecretRotatedAt: new Date(),
        }),
      },
      session: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: 'audit-id' }),
      },
    };
    const prisma = {
      device: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'device-id',
          tenantId: 'tenant-id',
          branchId: 'branch-id',
          status: DeviceStatus.ACTIVE,
          authBindingMode: 'HMAC_LEGACY',
        }),
      },
      idempotencyRecord: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        findUnique: idempotencyFindUnique,
        update: idempotencyUpdate,
      },
      $transaction: jest.fn((callback: (client: typeof tx) => unknown) =>
        callback(tx),
      ),
    };
    const auditService = {
      recordWithClient: jest.fn().mockResolvedValue({ id: 'audit-id' }),
    };
    const service = new BranchesService(
      prisma as never,
      auditService as never,
      {
        get: (key: string) =>
          key === 'DEVICE_ATTESTATION_KEK' ? 'device-kek' : undefined,
      } as never,
    );

    const updated = await service.updateDevice(
      'tenant-id',
      actorStub(),
      'device-id',
      {
        rotateAttestationSecret: true,
      },
      'device-update-key-3',
    );

    expect(updated).toEqual(
      expect.objectContaining({
        id: 'device-id',
      }),
    );
    const secret =
      'attestationSecret' in updated &&
      typeof updated.attestationSecret === 'string'
        ? updated.attestationSecret
        : undefined;
    expect(secret).toEqual(expect.any(String));
    if (!secret) throw new Error('Expected rotated attestation secret');
    const requestHash = persistedRequestHash;
    if (!requestHash) throw new Error('Expected idempotency request hash');
    if (
      !persistedResponse ||
      typeof persistedResponse !== 'object' ||
      Array.isArray(persistedResponse)
    ) {
      throw new Error('Expected persisted idempotency response');
    }
    const persistedResponseRecord = persistedResponse as Record<
      string,
      unknown
    >;
    expect(persistedResponseRecord).toMatchObject({ id: 'device-id' });
    expect(persistedResponseRecord).not.toHaveProperty('attestationSecret');
    expect(JSON.stringify(persistedResponseRecord)).not.toContain(secret);

    idempotencyFindUnique.mockResolvedValue({
      requestHash,
      responseJson: persistedResponseRecord,
    });
    const replay = await service.updateDevice(
      'tenant-id',
      actorStub(),
      'device-id',
      { rotateAttestationSecret: true },
      'device-update-key-3',
    );
    expect(replay).toEqual(persistedResponseRecord);
    expect(replay).not.toHaveProperty('attestationSecret');
    expect(prisma.device.findFirst).toHaveBeenCalledTimes(1);

    expect(auditService.recordWithClient).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        action: 'device.attestation-secret.rotate',
        entityType: 'device',
        entityId: 'device-id',
      }),
    );
    expect(tx.device.updateMany).toHaveBeenCalled();
    expect(tx.session.updateMany).toHaveBeenCalled();
  });

  it('does not rotate an HMAC secret if WebAuthn pairing won the race', async () => {
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([]),
      device: {
        updateMany: jest.fn(() => Promise.resolve({ count: 0 })),
        findFirst: jest.fn().mockResolvedValue({
          id: 'device-id',
          tenantId: 'tenant-id',
          branchId: 'branch-id',
          status: DeviceStatus.ACTIVE,
          authBindingMode: DeviceAuthBindingMode.HMAC_LEGACY,
          pairedAt: null,
          attestationSecretCiphertext: 'legacy-ciphertext',
          attestationSecretVersion: 1,
          attestationSecretRotatedAt: new Date(),
        }),
      },
      session: { updateMany: jest.fn() },
    };
    const prisma = {
      device: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'device-id',
          tenantId: 'tenant-id',
          branchId: 'branch-id',
          status: DeviceStatus.ACTIVE,
          authBindingMode: DeviceAuthBindingMode.HMAC_LEGACY,
          attestationSecretCiphertext: 'legacy-ciphertext',
          attestationSecretVersion: 1,
          attestationSecretRotatedAt: new Date(),
          pairedAt: null,
        }),
      },
      $transaction: jest.fn((callback: (client: typeof tx) => unknown) =>
        callback(tx),
      ),
    };
    const service = new BranchesService(
      prisma as never,
      { recordWithClient: jest.fn() } as never,
      {
        get: (key: string) =>
          key === 'DEVICE_ATTESTATION_KEK' ? 'device-kek' : undefined,
      } as never,
    );
    await expect(
      service.updateDevice(
        'tenant-id',
        actorStub(),
        'device-id',
        { rotateAttestationSecret: true },
        'legacy-race',
      ),
    ).rejects.toMatchObject({ response: { code: 'DEVICE_NOT_AVAILABLE' } });
    expect(tx.device.updateMany).toHaveBeenCalled();
    expect(tx.session.updateMany).not.toHaveBeenCalled();
  });

  it('allows UNPAIRED devices to reactivate without HMAC metadata', async () => {
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([]),
      device: {
        updateMany: jest.fn(() => Promise.resolve({ count: 1 })),
        findFirst: jest.fn().mockResolvedValue({
          id: 'device-id',
          tenantId: 'tenant-id',
          branchId: 'branch-id',
          status: DeviceStatus.INACTIVE,
          authBindingMode: DeviceAuthBindingMode.UNPAIRED,
          pairedAt: null,
          attestationSecretCiphertext: null,
          attestationSecretVersion: 0,
          attestationSecretRotatedAt: null,
        }),
      },
      session: { updateMany: jest.fn() },
    };
    const prisma = {
      device: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'device-id',
          tenantId: 'tenant-id',
          branchId: 'branch-id',
          status: DeviceStatus.INACTIVE,
          authBindingMode: DeviceAuthBindingMode.UNPAIRED,
          pairedAt: null,
          attestationSecretCiphertext: null,
          attestationSecretVersion: 0,
          attestationSecretRotatedAt: null,
        }),
      },
      $transaction: jest.fn((callback: (client: typeof tx) => unknown) =>
        callback(tx),
      ),
    };
    const service = new BranchesService(
      prisma as never,
      { recordWithClient: jest.fn() } as never,
      { get: () => undefined } as never,
    );
    await expect(
      service.updateDevice(
        'tenant-id',
        actorStub(),
        'device-id',
        { status: DeviceStatus.ACTIVE },
        'unpaired-reactivate',
      ),
    ).resolves.toBeDefined();
    expect(tx.device.updateMany).toHaveBeenCalled();
  });

  it('requires an active WebAuthn credential to reactivate a WEBAUTHN device', async () => {
    const pairedAt = new Date();
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([]),
      device: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'device-id',
          tenantId: 'tenant-id',
          branchId: 'branch-id',
          status: DeviceStatus.INACTIVE,
          authBindingMode: DeviceAuthBindingMode.WEBAUTHN,
          pairedAt,
        }),
        update: jest.fn(),
      },
      deviceWebAuthnCredential: {
        updateMany: jest.fn(() => Promise.resolve({ count: 0 })),
      },
      session: { updateMany: jest.fn() },
    };
    const prisma = {
      device: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'device-id',
          tenantId: 'tenant-id',
          branchId: 'branch-id',
          status: DeviceStatus.INACTIVE,
          authBindingMode: DeviceAuthBindingMode.WEBAUTHN,
          pairedAt,
        }),
      },
      $transaction: jest.fn((callback: (client: typeof tx) => unknown) =>
        callback(tx),
      ),
    };
    const service = new BranchesService(
      prisma as never,
      { recordWithClient: jest.fn() } as never,
      { get: () => undefined } as never,
    );
    await expect(
      service.updateDevice(
        'tenant-id',
        actorStub(),
        'device-id',
        { status: DeviceStatus.ACTIVE },
        'webauthn-reactivate-empty',
      ),
    ).rejects.toMatchObject({ response: { code: 'VALIDATION_ERROR' } });
    expect(tx.device.update).not.toHaveBeenCalled();
    expect(tx.session.updateMany).not.toHaveBeenCalled();
  });

  it('allows WEBAUTHN reactivation only when an active credential exists', async () => {
    const pairedAt = new Date();
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([]),
      device: {
        updateMany: jest.fn(() => Promise.resolve({ count: 1 })),
        findFirst: jest.fn().mockResolvedValue({
          id: 'device-id',
          tenantId: 'tenant-id',
          branchId: 'branch-id',
          status: DeviceStatus.INACTIVE,
          authBindingMode: DeviceAuthBindingMode.WEBAUTHN,
          pairedAt,
        }),
      },
      deviceWebAuthnCredential: {
        updateMany: jest.fn(() => Promise.resolve({ count: 1 })),
      },
      session: { updateMany: jest.fn() },
    };
    const prisma = {
      device: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'device-id',
          tenantId: 'tenant-id',
          branchId: 'branch-id',
          status: DeviceStatus.INACTIVE,
          authBindingMode: DeviceAuthBindingMode.WEBAUTHN,
          pairedAt,
        }),
      },
      $transaction: jest.fn((callback: (client: typeof tx) => unknown) =>
        callback(tx),
      ),
    };
    const service = new BranchesService(
      prisma as never,
      { recordWithClient: jest.fn() } as never,
      { get: () => undefined } as never,
    );
    await service.updateDevice(
      'tenant-id',
      actorStub(),
      'device-id',
      { status: DeviceStatus.ACTIVE },
      'webauthn-reactivate-active',
    );
    expect(tx.deviceWebAuthnCredential.updateMany).toHaveBeenCalledWith({
      where: {
        tenantId: 'tenant-id',
        deviceId: 'device-id',
        status: DeviceWebAuthnCredentialStatus.ACTIVE,
      },
      data: { status: DeviceWebAuthnCredentialStatus.ACTIVE },
    });
    expect(tx.device.updateMany).toHaveBeenCalled();
  });

  it('rejects activating an HMAC_LEGACY device without attestation metadata', async () => {
    const prisma = {
      device: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'device-id',
          tenantId: 'tenant-id',
          branchId: 'branch-id',
          status: DeviceStatus.INACTIVE,
          authBindingMode: DeviceAuthBindingMode.HMAC_LEGACY,
          attestationSecretCiphertext: null,
          attestationSecretVersion: 0,
          attestationSecretRotatedAt: null,
        }),
      },
      $transaction: jest.fn(),
    };
    const service = new BranchesService(
      prisma as never,
      {
        recordWithClient: jest.fn(),
      } as never,
      {
        get: (key: string) =>
          key === 'DEVICE_ATTESTATION_KEK' ? 'device-kek' : undefined,
      } as never,
    );

    await expect(
      service.updateDevice(
        'tenant-id',
        actorStub(),
        'device-id',
        { status: DeviceStatus.ACTIVE },
        'device-update-key-4',
      ),
    ).rejects.toMatchObject({
      response: {
        code: 'VALIDATION_ERROR',
      },
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});

type EnrollmentFixtureOptions = {
  attachment?: 'platform' | 'cross-platform';
  fmt?: 'packed' | 'none';
  credentialDeviceType?: 'singleDevice' | 'multiDevice';
  credentialBackedUp?: boolean;
  actor?: ReturnType<typeof actorStub>['user'] | null;
  deviceStatus?: DeviceStatus;
  branchStatus?: BranchStatus;
  tenantStatus?: TenantStatus;
};

function enrollmentFixture(
  mode: DeviceAuthBindingMode,
  options: EnrollmentFixtureOptions = {},
) {
  const actor = options.actor === undefined ? actorStub().user : options.actor;
  const device = {
    id: 'device-id',
    tenantId: 'tenant-id',
    branchId: 'branch-id',
    status: options.deviceStatus ?? DeviceStatus.ACTIVE,
    authBindingMode: mode,
    pairedAt: mode === DeviceAuthBindingMode.WEBAUTHN ? new Date(0) : null,
    branch: {
      status: options.branchStatus ?? BranchStatus.ACTIVE,
      tenant: { status: options.tenantStatus ?? TenantStatus.ACTIVE },
    },
  };
  const challenge = {
    id: 'challenge-id',
    tenantId: 'tenant-id',
    branchId: 'branch-id',
    deviceId: 'device-id',
    actorUserId: 'user-id',
    challengeHash: createHash('sha256').update('known-challenge').digest('hex'),
    purpose:
      mode === DeviceAuthBindingMode.WEBAUTHN
        ? DeviceEnrollmentPurpose.REPAIR
        : DeviceEnrollmentPurpose.PAIRING,
    expiresAt: new Date(Date.now() + 60_000),
    consumedAt: null,
  };
  type MutationCall = {
    where: Record<string, unknown>;
    data: Record<string, unknown>;
  };
  let challengeConsumeArgs: MutationCall | undefined;
  let deviceTransitionArgs: MutationCall | undefined;
  let credentialSupersedeArgs: MutationCall | undefined;
  let sessionRevocationArgs: MutationCall | undefined;
  let createdCredentialData: Record<string, unknown> | undefined;
  const transaction = {
    deviceEnrollmentChallenge: {
      updateMany: jest.fn((args: MutationCall) => {
        challengeConsumeArgs = args;
        return Promise.resolve({ count: 1 });
      }),
    },
    device: {
      findFirst: jest.fn(() => Promise.resolve(device)),
      updateMany: jest.fn((args: MutationCall) => {
        deviceTransitionArgs = args;
        return Promise.resolve({ count: 1 });
      }),
    },
    user: { findFirst: jest.fn(() => Promise.resolve(actor)) },
    deviceWebAuthnCredential: {
      create: jest.fn((args: { data: Record<string, unknown> }) => {
        createdCredentialData = args.data;
        return Promise.resolve({ id: 'credential-row-id' });
      }),
      updateMany: jest.fn((args: MutationCall) => {
        credentialSupersedeArgs = args;
        return Promise.resolve({ count: 1 });
      }),
    },
    session: {
      updateMany: jest.fn((args: MutationCall) => {
        sessionRevocationArgs = args;
        return Promise.resolve({ count: 2 });
      }),
    },
  };
  const prisma = {
    deviceEnrollmentChallenge: {
      findFirst: jest.fn(() => Promise.resolve(challenge)),
    },
    $transaction: jest.fn(
      (callback: (client: typeof transaction) => Promise<unknown>) =>
        callback(transaction),
    ),
  };
  const auditEvents: Array<{ action: string; metadata?: unknown }> = [];
  const audit = {
    recordWithClient: jest.fn(
      (_client: unknown, event: { action: string; metadata?: unknown }) => {
        auditEvents.push(event);
        return Promise.resolve({});
      },
    ),
  };
  const config = {
    get: (key: string) => {
      const values: Record<string, string | boolean> = {
        WEBAUTHN_DEVICE_QUALIFICATION_APPROVED: true,
        WEBAUTHN_RP_ID: 'example.com',
        WEBAUTHN_ALLOWED_ORIGINS: 'https://pos.example.com',
      };
      return values[key];
    },
  };
  const service = new BranchesService(
    prisma as never,
    audit as never,
    config as never,
  );
  const registrationInfo = {
    fmt: options.fmt ?? 'packed',
    aaguid: 'aaguid-1',
    credential: {
      id: 'credential-public-id',
      publicKey: Uint8Array.from([1, 2, 3]),
      counter: 7,
      transports: ['internal'],
    },
    credentialType: 'public-key' as const,
    userVerified: true,
    attestationObject: Uint8Array.from([9, 9, 9]),
    credentialDeviceType: options.credentialDeviceType ?? 'singleDevice',
    credentialBackedUp: options.credentialBackedUp ?? false,
    origin: 'https://pos.example.com',
    rpID: 'example.com',
  };
  jest.mocked(verifyRegistrationResponse).mockResolvedValue({
    verified: true,
    registrationInfo,
  });
  const response: RegistrationResponseJSON = {
    id: 'credential-public-id',
    rawId: 'credential-public-id',
    response: {
      clientDataJSON: 'client-data',
      attestationObject: 'attestation',
      transports: ['internal'],
    },
    type: 'public-key',
    clientExtensionResults: {},
    authenticatorAttachment: options.attachment ?? 'platform',
  };
  return {
    service,
    transaction,
    tx: transaction,
    challenge,
    prisma,
    auditEvents,
    response,
    device,
    challengeConsumeArgs: () => challengeConsumeArgs,
    deviceTransitionArgs: () => deviceTransitionArgs,
    credentialSupersedeArgs: () => credentialSupersedeArgs,
    sessionRevocationArgs: () => sessionRevocationArgs,
    createdCredentialData: () => createdCredentialData,
  };
}

function expectEnrollmentWritesAbsent(
  fixture: ReturnType<typeof enrollmentFixture>,
) {
  expect(
    fixture.transaction.deviceWebAuthnCredential.create,
  ).not.toHaveBeenCalled();
  expect(
    fixture.transaction.deviceWebAuthnCredential.updateMany,
  ).not.toHaveBeenCalled();
  expect(fixture.transaction.device.updateMany).not.toHaveBeenCalled();
  expect(fixture.transaction.session.updateMany).not.toHaveBeenCalled();
  expect(fixture.auditEvents).toEqual([]);
}

function actorStub(): AuthContext {
  return {
    session: {
      id: 'session-id',
      userId: 'user-id',
      deviceId: null,
      deviceCredentialId: null,
      sessionTokenHash: 'session-hash',
      csrfTokenHash: 'csrf-hash',
      status: SessionStatus.ACTIVE,
      expiresAt: new Date('2026-08-03T00:00:00.000Z'),
      revokedAt: null,
      lastUsedAt: null,
      createdAt: new Date('2026-08-03T00:00:00.000Z'),
      updatedAt: new Date('2026-08-03T00:00:00.000Z'),
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
      createdAt: new Date('2026-08-03T00:00:00.000Z'),
      updatedAt: new Date('2026-08-03T00:00:00.000Z'),
    },
  };
}
