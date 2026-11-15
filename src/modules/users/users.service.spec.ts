import { BadRequestException } from '@nestjs/common';
import { UserRole, UserStatus } from '@prisma/client';
import { AuthContext } from '../../common/auth/session.types';
import { PrismaService } from '../../database/prisma.service';
import { SupabaseService } from '../../supabase/supabase.service';
import { AuditService } from '../audit/audit.service';
import { UsersService } from './users.service';

type FindManyArgs = {
  where: { tenantId: string; role: { not: UserRole } };
  select: Record<string, boolean>;
  orderBy: Array<Record<string, 'asc' | 'desc'>>;
};
type CreateUserArgs = {
  data: {
    tenantId: string;
    branchId: string;
    username: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
    role: UserRole;
    status: UserStatus;
    supabaseAuthId: string;
  };
  select: Record<string, boolean>;
};
type AuditEntry = {
  tenantId: string;
  actorId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: unknown;
};

describe('UsersService staff directory and registration', () => {
  const tenantId = 'tenant-1';
  const actor = {
    user: {
      id: 'admin-1',
      tenantId,
      branchId: 'branch-1',
      role: UserRole.ADMIN,
    },
  } as unknown as AuthContext;

  it('lists only tenant human staff and exposes only directory/profile fields', async () => {
    const findMany = jest
      .fn<Promise<unknown[]>, [FindManyArgs]>()
      .mockResolvedValue([]);
    const service = new UsersService(
      {
        user: { findMany },
      } as unknown as PrismaService,
      {} as SupabaseService,
      {} as AuditService,
    );

    await service.listUsers(tenantId);

    expect(findMany.mock.calls[0]?.[0]).toEqual({
      where: { tenantId, role: { not: UserRole.SYSTEM } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        username: true,
        phoneNumber: true,
        role: true,
        status: true,
        branchId: true,
        lastLoginAt: true,
        createdAt: true,
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
    });
    const selectedFields = findMany.mock.calls[0]?.[0]?.select;
    expect(selectedFields).not.toHaveProperty('supabaseAuthId');
    expect(selectedFields).not.toHaveProperty('password');
  });

  it('persists required contact fields without writing them to audit metadata', async () => {
    const userResult = {
      id: 'staff-1',
      firstName: 'Ada',
      lastName: 'Lovelace',
      username: 'ada@example.test',
      phoneNumber: '+234 801 234 5678',
      role: UserRole.CASHIER,
      status: UserStatus.ACTIVE,
      branchId: 'branch-1',
      createdAt: new Date('2026-10-01T00:00:00.000Z'),
    };
    const createUser = jest
      .fn<Promise<typeof userResult>, [CreateUserArgs]>()
      .mockResolvedValue(userResult);
    const transactionClient = { user: { create: createUser } };
    const prisma = {
      branch: { findFirst: jest.fn().mockResolvedValue({ id: 'branch-1' }) },
      $transaction: jest.fn(
        async (callback: (client: unknown) => Promise<unknown>) =>
          callback(transactionClient),
      ),
    } as unknown as PrismaService;
    const createAuthUser = jest
      .fn<
        Promise<{ data: { user: { id: string } }; error: null }>,
        [{ email: string; password: string; email_confirm: true }]
      >()
      .mockResolvedValue({
        data: { user: { id: 'supabase-user-1' } },
        error: null,
      });
    const auditRecord = jest
      .fn<Promise<void>, [unknown, AuditEntry]>()
      .mockResolvedValue(undefined);
    const service = new UsersService(
      prisma,
      {
        serviceRoleClient: {
          auth: { admin: { createUser: createAuthUser } },
        },
      } as unknown as SupabaseService,
      { recordWithClient: auditRecord } as unknown as AuditService,
    );

    const result = await service.createUser(tenantId, actor, {
      username: 'ada@example.test',
      firstName: ' Ada ',
      lastName: ' Lovelace ',
      phoneNumber: ' +234 801 234 5678 ',
      password: 'not-stored-in-the-user-row',
      role: UserRole.CASHIER,
      branchId: 'branch-1',
    });

    expect(result).toEqual(userResult);
    expect(createAuthUser.mock.calls[0]?.[0]).toEqual({
      email: 'ada@example.test',
      password: 'not-stored-in-the-user-row',
      email_confirm: true,
    });
    const createArgs = createUser.mock.calls[0]?.[0];
    expect(createArgs?.data).toEqual({
      tenantId,
      branchId: 'branch-1',
      username: 'ada@example.test',
      firstName: 'Ada',
      lastName: 'Lovelace',
      phoneNumber: '+234 801 234 5678',
      role: UserRole.CASHIER,
      status: UserStatus.ACTIVE,
      supabaseAuthId: 'supabase-user-1',
    });
    expect(createArgs?.data).not.toHaveProperty('password');
    expect(createArgs?.select).toEqual({
      id: true,
      firstName: true,
      lastName: true,
      username: true,
      phoneNumber: true,
      role: true,
      status: true,
      branchId: true,
      createdAt: true,
    });
    expect(auditRecord.mock.calls[0]).toEqual([
      transactionClient,
      {
        tenantId,
        actorId: 'admin-1',
        action: 'user.create',
        entityType: 'user',
        entityId: 'staff-1',
        metadata: { role: UserRole.CASHIER, branchId: 'branch-1' },
      },
    ]);
  });

  it('rejects internal roles and missing or foreign branches before Auth provisioning', async () => {
    const branchLookup = jest
      .fn<Promise<null>, [{ where: { id: string; tenantId: string } }]>()
      .mockResolvedValue(null);
    const createAuthUser = jest.fn();
    const service = new UsersService(
      { branch: { findFirst: branchLookup } } as unknown as PrismaService,
      {
        serviceRoleClient: {
          auth: { admin: { createUser: createAuthUser } },
        },
      } as unknown as SupabaseService,
      {} as AuditService,
    );
    const createData = {
      username: 'staff@example.test',
      firstName: 'A Staff',
      lastName: 'Member',
      phoneNumber: '+234 801 234 5678',
      password: 'not-logged',
      role: UserRole.CASHIER,
      branchId: 'branch-foreign',
    };

    await expect(
      service.createUser(tenantId, actor, {
        ...createData,
        role: UserRole.SYSTEM,
        branchId: 'branch-1',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(branchLookup).not.toHaveBeenCalled();

    await expect(
      service.createUser(tenantId, actor, createData),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(branchLookup).toHaveBeenCalledWith({
      where: { id: 'branch-foreign', tenantId },
    });

    const actorWithoutBranch = {
      ...actor,
      user: { ...actor.user, branchId: null },
    } as AuthContext;
    await expect(
      service.createUser(tenantId, actorWithoutBranch, {
        ...createData,
        branchId: undefined,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(createAuthUser).not.toHaveBeenCalled();
  });
});
