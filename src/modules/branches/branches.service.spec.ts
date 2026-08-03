import { DeviceStatus, SessionStatus, UserRole, UserStatus } from '@prisma/client';
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
      $transaction: jest.fn().mockImplementation((callback) => callback(tx)),
    };
    const service = new BranchesService(prisma as never, {
      recordWithClient: jest.fn().mockResolvedValue({ id: 'audit-id' }),
    } as never);

    const created = await service.createDevice('tenant-id', actorStub(), {
      branchId: 'branch-id',
      name: 'Front desk tablet',
      fingerprintHash: 'fingerprint-hash',
    });

    expect(created).toEqual(
      expect.objectContaining({
        id: 'device-id',
        attestationSecret: expect.any(String),
      }),
    );
    expect(created).not.toHaveProperty('attestationSecretCiphertext');
  });

  it('revokes active sessions when a device becomes inactive', async () => {
    const tx = {
      device: {
        update: jest.fn().mockResolvedValue({
          id: 'device-id',
          tenantId: 'tenant-id',
          status: DeviceStatus.INACTIVE,
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
          status: DeviceStatus.ACTIVE,
        }),
      },
      $transaction: jest.fn().mockImplementation((callback) => callback(tx)),
    };
    const auditService = {
      recordWithClient: jest.fn().mockResolvedValue({ id: 'audit-id' }),
    };
    const service = new BranchesService(prisma as never, auditService as never);

    await service.updateDevice('tenant-id', actorStub(), 'device-id', {
      status: DeviceStatus.INACTIVE,
    });

    expect(tx.session.updateMany).toHaveBeenCalledWith({
      where: { deviceId: 'device-id', status: 'ACTIVE' },
      data: { status: 'REVOKED', revokedAt: expect.any(Date) },
    });
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
          status: DeviceStatus.INACTIVE,
        }),
      },
      $transaction: jest.fn().mockImplementation((callback) => callback(tx)),
    };
    const auditService = {
      recordWithClient: jest.fn().mockResolvedValue({ id: 'audit-id' }),
    };
    const service = new BranchesService(prisma as never, auditService as never);

    await service.updateDevice('tenant-id', actorStub(), 'device-id', {
      status: DeviceStatus.ACTIVE,
    });

    expect(tx.session.updateMany).not.toHaveBeenCalled();
  });

  it('rotates the attestation secret when requested', async () => {
    const tx = {
      device: {
        update: jest
          .fn()
          .mockResolvedValueOnce({
            id: 'device-id',
            tenantId: 'tenant-id',
            status: DeviceStatus.ACTIVE,
            attestationSecretCiphertext: 'ciphertext-before-rotation',
          })
          .mockResolvedValueOnce({
            id: 'device-id',
            tenantId: 'tenant-id',
            status: DeviceStatus.ACTIVE,
            attestationSecretCiphertext: 'ciphertext-after-rotation',
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
          status: DeviceStatus.ACTIVE,
        }),
      },
      $transaction: jest.fn().mockImplementation((callback) => callback(tx)),
    };
    const service = new BranchesService(prisma as never, {
      recordWithClient: jest.fn().mockResolvedValue({ id: 'audit-id' }),
    } as never);

    const updated = await service.updateDevice('tenant-id', actorStub(), 'device-id', {
      rotateAttestationSecret: true,
    });

    expect(updated).toEqual(
      expect.objectContaining({
        id: 'device-id',
        attestationSecret: expect.any(String),
      }),
    );
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
