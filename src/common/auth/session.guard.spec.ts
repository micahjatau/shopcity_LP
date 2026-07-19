import { loadAuthContext } from './session.guard';

describe('loadAuthContext', () => {
  const configService = {
    get: (key: string) => (key === 'SESSION_SECRET' ? 'test-secret' : undefined),
  } as never;

  it('rejects suspended tenants', async () => {
    const prismaService = {
      session: {
        findUnique: jest.fn().mockResolvedValue({
          status: 'ACTIVE',
          expiresAt: new Date(Date.now() + 1000),
          user: {
            status: 'ACTIVE',
            branchId: 'branch-id',
            tenant: { status: 'SUSPENDED' },
            branch: { status: 'ACTIVE' },
          },
        }),
      },
    } as never;

    const context = await loadAuthContext(
      {
        headers: {
          cookie: 'shopcity_session=session-token',
        },
      } as never,
      prismaService,
      configService,
    );

    expect(context).toBeNull();
  });

  it('rejects inactive branches', async () => {
    const prismaService = {
      session: {
        findUnique: jest.fn().mockResolvedValue({
          status: 'ACTIVE',
          expiresAt: new Date(Date.now() + 1000),
          user: {
            status: 'ACTIVE',
            branchId: 'branch-id',
            tenant: { status: 'ACTIVE' },
            branch: { status: 'INACTIVE' },
          },
        }),
      },
    } as never;

    const context = await loadAuthContext(
      {
        headers: {
          cookie: 'shopcity_session=session-token',
        },
      } as never,
      prismaService,
      configService,
    );

    expect(context).toBeNull();
  });
});
