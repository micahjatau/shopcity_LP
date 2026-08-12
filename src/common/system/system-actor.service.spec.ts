import { UserRole, UserStatus } from '@prisma/client';
import { SYSTEM_USERNAME, SystemActorService } from './system-actor.service';

describe('SystemActorService', () => {
  it('returns the existing active SYSTEM actor for the tenant', async () => {
    const prisma = prismaStub({
      existing: {
        id: 'system-user-id',
        tenantId: 'tenant-id',
        role: UserRole.SYSTEM,
        status: UserStatus.ACTIVE,
      },
    });
    const service = new SystemActorService();

    await expect(
      service.getOrCreate(prisma as never, 'tenant-id'),
    ).resolves.toEqual({
      id: 'system-user-id',
      tenantId: 'tenant-id',
    });

    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('creates the tenant-owned SYSTEM actor when absent', async () => {
    const prisma = prismaStub();
    const service = new SystemActorService();

    await expect(
      service.getOrCreate(prisma as never, 'tenant-id'),
    ).resolves.toEqual({
      id: 'created-system-user-id',
      tenantId: 'tenant-id',
    });

    expect(prisma.user.create).toHaveBeenCalledWith({
      data: {
        tenantId: 'tenant-id',
        branchId: null,
        username: SYSTEM_USERNAME,
        role: UserRole.SYSTEM,
        status: UserStatus.ACTIVE,
        supabaseAuthId: null,
      },
      select: { id: true, tenantId: true },
    });
  });

  it('fails closed when the reserved username is not bound to an active SYSTEM actor', async () => {
    const service = new SystemActorService();

    await expect(
      service.getOrCreate(
        prismaStub({
          existing: {
            id: 'wrong-user-id',
            tenantId: 'tenant-id',
            role: UserRole.ADMIN,
            status: UserStatus.ACTIVE,
          },
        }) as never,
        'tenant-id',
      ),
    ).rejects.toThrow(/not bound to SYSTEM role/i);

    await expect(
      service.getOrCreate(
        prismaStub({
          existing: {
            id: 'disabled-system-user-id',
            tenantId: 'tenant-id',
            role: UserRole.SYSTEM,
            status: UserStatus.DISABLED,
          },
        }) as never,
        'tenant-id',
      ),
    ).rejects.toThrow(/must remain ACTIVE/i);
  });
});

function prismaStub({
  existing = null,
}: {
  existing?: {
    id: string;
    tenantId: string;
    role: UserRole;
    status: UserStatus;
  } | null;
} = {}) {
  return {
    user: {
      findFirst: jest.fn().mockResolvedValue(existing),
      create: jest.fn().mockResolvedValue({
        id: 'created-system-user-id',
        tenantId: 'tenant-id',
      }),
    },
  };
}
