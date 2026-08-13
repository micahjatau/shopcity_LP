import { Prisma, UserRole, UserStatus } from '@prisma/client';
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

  it('re-reads the canonical SYSTEM actor after a concurrent create race', async () => {
    const prisma = prismaStub({
      existingSequence: [
        null,
        {
          id: 'raced-system-user-id',
          tenantId: 'tenant-id',
          role: UserRole.SYSTEM,
          status: UserStatus.ACTIVE,
        },
      ],
      createError: uniqueConstraintError(),
    });
    const service = new SystemActorService();

    await expect(
      service.getOrCreate(prisma as never, 'tenant-id'),
    ).resolves.toEqual({
      id: 'raced-system-user-id',
      tenantId: 'tenant-id',
    });

    expect(prisma.user.findFirst).toHaveBeenCalledTimes(2);
    expect(prisma.user.create).toHaveBeenCalledTimes(1);
  });

  it('rethrows unexpected create errors', async () => {
    const createError = new Error('database unavailable');
    const prisma = prismaStub({ createError });
    const service = new SystemActorService();

    await expect(
      service.getOrCreate(prisma as never, 'tenant-id'),
    ).rejects.toThrow(createError);
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
  existingSequence,
  createError,
}: {
  existing?: {
    id: string;
    tenantId: string;
    role: UserRole;
    status: UserStatus;
  } | null;
  existingSequence?: Array<{
    id: string;
    tenantId: string;
    role: UserRole;
    status: UserStatus;
  } | null>;
  createError?: Error;
} = {}) {
  const findFirst = jest.fn();

  if (existingSequence) {
    for (const value of existingSequence) {
      findFirst.mockResolvedValueOnce(value);
    }
  } else {
    findFirst.mockResolvedValue(existing);
  }

  const create = jest.fn();
  if (createError) {
    create.mockRejectedValue(createError);
  } else {
    create.mockResolvedValue({
      id: 'created-system-user-id',
      tenantId: 'tenant-id',
    });
  }

  return {
    user: {
      findFirst,
      create,
    },
  };
}

function uniqueConstraintError() {
  return new Prisma.PrismaClientKnownRequestError(
    'Unique constraint failed on the fields: (`tenantId`,`username`)',
    {
      code: 'P2002',
      clientVersion: 'test',
      meta: { target: ['tenantId', 'username'] },
    },
  );
}
