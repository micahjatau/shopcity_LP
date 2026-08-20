import { Prisma, UserRole, UserStatus } from '@prisma/client';
import { createHmac } from 'node:crypto';
import { AuthService } from './auth.service';
import { encryptDeviceAttestationSecret } from '../../common/auth/device-attestation-secret';

describe('AuthService', () => {
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
    const signature = createHmac('sha256', 'device-secret')
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
    const deviceOneSecret = 'device-one-secret';
    const deviceTwoSecret = 'device-two-secret';
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
    const attestation = `${timestamp}.${nonce}.${createHmac('sha256', secret)
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

  it('rejects expired device attestations', async () => {
    const timestamp = Date.now() - 10 * 60 * 1000;
    const secret = 'device-secret';
    const nonce = 'nonce';
    const signature = createHmac('sha256', secret)
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
    const signature = createHmac('sha256', oldSecret)
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

function buildDevice(secret: string, deviceId: string = 'device-id') {
  return {
    id: deviceId,
    tenantId: 'tenant-id',
    branchId: 'branch-id',
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
  };

  return new AuthService(
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
            : 'csrf',
    } as never,
    {
      recordWithClient: jest.fn().mockResolvedValue(undefined),
    } as never,
  );
}
