/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call, @typescript-eslint/require-await */
import { randomUUID, createHash } from 'node:crypto';
import { CustomersService } from '../src/modules/customers/customers.service';
import { CardsService } from '../src/modules/cards/cards.service';
import { AuthService } from '../src/modules/auth/auth.service';
import {
  UserRole,
  UserStatus,
  CardStatus,
  CustomerStatus,
  SessionStatus,
} from '@prisma/client';

describe('phase 1 service flows', () => {
  it('normalizes phones and blocks duplicate active customers', async () => {
    const state = createState();
    const service = new CustomersService(
      state.prisma as never,
      state.audit as never,
    );

    const actor = state.actor();
    const created = await service.createCustomer('tenant-1', actor, {
      fullName: 'Ada Lovelace',
      phone: '08012345678',
    });

    expect(created.phoneE164).toBe('+2348012345678');

    await expect(
      service.createCustomer('tenant-1', actor, {
        fullName: 'Ada Lovelace',
        phone: '08012345678',
      }),
    ).rejects.toThrow('Active customer already exists for this phone');
  });

  it('preserves card replacement history', async () => {
    const state = createState();
    state.cards.push({
      id: 'card-1',
      tenantId: 'tenant-1',
      customerId: 'customer-1',
      barcodeValue: 'SC-0001',
      status: CardStatus.ACTIVE,
      issuedBy: 'user-1',
      issuedAt: new Date(),
      blockedAt: null,
      replacedByCardId: null,
      replacedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const service = new CardsService(
      state.prisma as never,
      state.audit as never,
    );
    const replacement = await service.replaceCard(
      'tenant-1',
      state.actor(),
      'card-1',
      {
        barcodeValue: 'SC-0002',
      },
    );

    expect(replacement.barcodeValue).toBe('SC-0002');
    expect(state.cards[0].status).toBe(CardStatus.REPLACED);
    expect(state.cards[0].replacedByCardId).toBe(replacement.id);
  });

  it('issues and refreshes backend sessions', async () => {
    const state = createState();
    state.users.push({
      id: 'user-1',
      tenantId: 'tenant-1',
      branchId: 'branch-1',
      username: 'admin@shopcity.local',
      supabaseAuthId: 'supabase-user-1',
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      lastLoginAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const authService = new AuthService(
      state.prisma as never,
      {
        publicClient: {
          auth: {
            signInWithPassword: async () => ({
              data: { user: { id: 'supabase-user-1' } },
              error: null,
            }),
          },
        },
        serviceRoleClient: { auth: { admin: {} } },
      } as never,
      {
        get: (key: string) =>
          key === 'SESSION_SECRET' ? 'session-secret' : 'csrf-secret',
      } as never,
      state.audit as never,
    );

    const issued = await authService.login('admin@shopcity.local', 'password');
    expect(issued.context.user.id).toBe('user-1');
    expect(state.sessions).toHaveLength(1);

    const refreshed = await authService.refresh(state.sessions[0].id);
    expect(refreshed.context.user.id).toBe('user-1');
    expect(state.sessions).toHaveLength(2);
  });
});

function createState() {
  const state = {
    branches: [
      {
        id: 'branch-1',
        tenantId: 'tenant-1',
        name: 'Main',
        timezone: 'Africa/Lagos',
        receiptWeekStartDay: 1,
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    users: [] as any[],
    customers: [] as any[],
    cards: [] as any[],
    sessions: [] as any[],
    audit: { record: async () => undefined },
    actor() {
      return {
        session: {
          id: 'session-1',
          userId: 'user-1',
          sessionTokenHash: 'hash',
          refreshTokenHash: 'hash',
          csrfTokenHash: createHash('sha256')
            .update('csrf-secret:csrf')
            .digest('hex'),
          status: SessionStatus.ACTIVE,
          expiresAt: new Date(Date.now() + 1000 * 60 * 60),
          revokedAt: null,
          lastUsedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        user: {
          id: 'user-1',
          tenantId: 'tenant-1',
          branchId: 'branch-1',
          username: 'admin@shopcity.local',
          supabaseAuthId: 'supabase-user-1',
          role: UserRole.ADMIN,
          status: UserStatus.ACTIVE,
          lastLoginAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };
    },
  };

  const prisma = {
    branch: {
      findFirst: async ({ where }: any) =>
        state.branches.find(
          (row) => row.id === where.id && row.tenantId === where.tenantId,
        ),
      findFirstOrThrow: async ({ where }: any) => {
        const row = state.branches.find(
          (entry) => entry.tenantId === where.tenantId,
        );
        if (!row) throw new Error('branch not found');
        return row;
      },
      create: async ({ data }: any) => {
        const row = {
          id: randomUUID(),
          createdAt: new Date(),
          updatedAt: new Date(),
          status: 'ACTIVE',
          ...data,
        };
        state.branches.push(row);
        return row;
      },
    },
    customer: {
      findFirst: async ({ where }: any) =>
        state.customers.find(
          (row) =>
            row.tenantId === where.tenantId &&
            row.phoneE164 === where.phoneE164 &&
            row.status === where.status,
        ),
      findFirstOrThrow: async () => {
        throw new Error('not used');
      },
      create: async ({ data }: any) => {
        const row = {
          id: randomUUID(),
          createdAt: new Date(),
          updatedAt: new Date(),
          status: CustomerStatus.ACTIVE,
          blockedAt: null,
          ...data,
        };
        state.customers.push(row);
        return row;
      },
      update: async ({ where, data }: any) => {
        const row = state.customers.find((entry) => entry.id === where.id);
        Object.assign(row, data, { updatedAt: new Date() });
        return row;
      },
    },
    card: {
      findFirst: async ({ where }: any) =>
        state.cards.find(
          (row) => row.id === where.id && row.tenantId === where.tenantId,
        ),
      create: async ({ data }: any) => {
        const row = {
          id: randomUUID(),
          createdAt: new Date(),
          updatedAt: new Date(),
          status: CardStatus.ACTIVE,
          blockedAt: null,
          replacedByCardId: null,
          replacedAt: null,
          issuedAt: new Date(),
          ...data,
        };
        state.cards.push(row);
        return row;
      },
      update: async ({ where, data }: any) => {
        const row = state.cards.find((entry) => entry.id === where.id);
        Object.assign(row, data, { updatedAt: new Date() });
        return row;
      },
    },
    user: {
      findFirst: async ({ where }: any) =>
        state.users.find(
          (row) =>
            row.supabaseAuthId === where.OR?.[0]?.supabaseAuthId ||
            row.username === where.OR?.[1]?.username,
        ),
      findUnique: async ({ where }: any) =>
        state.users.find((row) => row.id === where.id),
      create: async ({ data }: any) => {
        const row = {
          id: randomUUID(),
          createdAt: new Date(),
          updatedAt: new Date(),
          lastLoginAt: null,
          ...data,
        };
        state.users.push(row);
        return row;
      },
      update: async ({ where, data }: any) => {
        const row = state.users.find((entry) => entry.id === where.id);
        Object.assign(row, data, { updatedAt: new Date() });
        return row;
      },
      updateMany: async ({ where, data }: any) => {
        state.sessions
          .filter((session) => session.userId === where.userId)
          .forEach((session) => Object.assign(session, data));
        return { count: 1 };
      },
    },
    session: {
      create: async ({ data }: any) => {
        const row = {
          id: randomUUID(),
          createdAt: new Date(),
          updatedAt: new Date(),
          revokedAt: null,
          lastUsedAt: null,
          status: SessionStatus.ACTIVE,
          ...data,
        };
        state.sessions.push(row);
        return row;
      },
      findUnique: async ({ where, include }: any) => {
        const row = state.sessions.find(
          (entry) =>
            entry.id === where.id ||
            entry.sessionTokenHash === where.sessionTokenHash,
        );
        if (!row) {
          return undefined;
        }

        if (include?.user) {
          const user = state.users.find((entry) => entry.id === row.userId);
          return { ...row, user };
        }

        return row;
      },
      update: async ({ where, data }: any) => {
        const row = state.sessions.find((entry) => entry.id === where.id);
        Object.assign(row, data, { updatedAt: new Date() });
        return row;
      },
      updateMany: async ({ where, data }: any) => {
        state.sessions
          .filter((session) => session.userId === where.userId)
          .forEach((session) => Object.assign(session, data));
        return { count: 1 };
      },
    },
    auditLog: {
      create: async () => undefined,
    },
    $transaction: async (callback: any) => callback(prisma),
  };

  return { prisma, ...state };
}
