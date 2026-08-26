import {
  DeviceStatus,
  SessionStatus,
  UserRole,
  UserStatus,
} from '@prisma/client';
import { BranchesService } from './branches.service';

describe('BranchesService', () => {
  it('returns a one-time attestation secret when creating a device', async () => {
    const tx = {
      device: {
        create: jest.fn().mockResolvedValue({
          id: 'device-id',
          tenantId: 'tenant-id',
          branchId: 'branch-id',
          name: 'Front desk tablet',
          fingerprintHash: 'fingerprint-hash',
          attestationSecretCiphertext: 'ciphertext',
          attestationSecretVersion: 1,
          attestationSecretRotatedAt: new Date('2026-08-03T00:00:00.000Z'),
          status: DeviceStatus.ACTIVE,
          lastSeenAt: null,
          createdAt: new Date('2026-08-03T00:00:00.000Z'),
          updatedAt: new Date('2026-08-03T00:00:00.000Z'),
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
      expect.objectContaining({
        id: 'device-id',
        attestationSecretVersion: 1,
      }),
    );
    expect(typeof created.attestationSecret).toBe('string');
    expect(created).not.toHaveProperty('attestationSecretCiphertext');
    expect(created).not.toHaveProperty('fingerprintHash');
  });

  it('revokes active sessions when a device becomes inactive', async () => {
    const tx = {
      device: {
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
      device: {
        update: jest.fn().mockResolvedValue({
          id: 'device-id',
          tenantId: 'tenant-id',
          status: DeviceStatus.ACTIVE,
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
  });

  it('rotates the attestation secret when requested', async () => {
    const tx = {
      device: {
        update: jest.fn().mockResolvedValue({
          id: 'device-id',
          tenantId: 'tenant-id',
          status: DeviceStatus.ACTIVE,
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
    expect(
      typeof (updated as { attestationSecret?: unknown }).attestationSecret,
    ).toBe('string');
    expect(auditService.recordWithClient).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        action: 'device.attestation-secret.rotate',
        entityType: 'device',
        entityId: 'device-id',
      }),
    );
    expect(tx.session.updateMany).toHaveBeenCalled();
  });

  it('rejects activating a device without attestation metadata', async () => {
    const prisma = {
      device: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'device-id',
          tenantId: 'tenant-id',
          branchId: 'branch-id',
          status: DeviceStatus.INACTIVE,
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

function actorStub() {
  return {
    session: {
      id: 'session-id',
      userId: 'user-id',
      deviceId: null,
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
