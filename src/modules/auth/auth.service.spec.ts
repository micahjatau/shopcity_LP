import { UserRole, UserStatus } from '@prisma/client';
import { AuthService } from './auth.service';

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
      },
    });
  });

  it('rejects login when the Supabase identity is not linked locally', async () => {
    const service = new AuthService(
      {
        user: {
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

    await expect(service.login('admin@shopcity.local', 'password')).rejects.toThrow(
      'User is not active',
    );
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
});
