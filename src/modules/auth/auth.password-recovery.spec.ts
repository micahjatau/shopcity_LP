import { HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';

afterEach(() => {
  jest.useRealTimers();
});

function makeRecoveryService(
  options: {
    setSessionError?: { status?: number; code?: string } | null;
    updateUserError?: { status?: number; code?: string } | null;
    transactionFailure?: boolean;
    linkedUser?: { id: string; tenantId: string } | null;
  } = {},
) {
  const auth = {
    resetPasswordForEmail: jest.fn().mockResolvedValue({ error: null }),
    setSession: jest.fn().mockResolvedValue({
      data: { user: { id: 'supabase-user-id' } },
      error: options.setSessionError ?? null,
    }),
    updateUser: jest.fn().mockResolvedValue({
      data: { user: { id: 'supabase-user-id' } },
      error: options.updateUserError ?? null,
    }),
  };
  const transientClient = { auth };
  const sessionUpdateMany = jest.fn().mockResolvedValue({ count: 2 });
  const transactionClient = { session: { updateMany: sessionUpdateMany } };
  const prisma = {
    user: {
      findUnique: jest
        .fn()
        .mockResolvedValue(
          options.linkedUser === undefined
            ? { id: 'shopcity-user-id', tenantId: 'tenant-id' }
            : options.linkedUser,
        ),
    },
    $transaction: jest.fn((callback: (client: unknown) => unknown) => {
      if (options.transactionFailure) {
        return Promise.reject(new Error('database unavailable'));
      }
      return Promise.resolve(callback(transactionClient));
    }),
  };
  const audit = { recordWithClient: jest.fn().mockResolvedValue(undefined) };
  const supabase = {
    createTransientPublicClient: jest.fn().mockReturnValue(transientClient),
  };
  const service = new AuthService(
    prisma as never,
    supabase as never,
    {} as never,
    audit as never,
  );

  return {
    service,
    auth,
    prisma,
    audit,
    sessionUpdateMany,
    transactionClient,
    transientClient,
    supabase,
  };
}

describe('AuthService password recovery', () => {
  it('sends a normalized email to Supabase without exposing account state', async () => {
    const { service, auth, supabase } = makeRecoveryService();

    await expect(
      service.requestPasswordRecovery(
        ' Staff@Example.test ',
        'https://shopcity.example.test/reset-password',
        '0d6d26e1-c25a-4fea-a1ad-7e21cbab1c29',
      ),
    ).resolves.toBeUndefined();

    expect(supabase.createTransientPublicClient).toHaveBeenCalledTimes(1);
    expect(auth.resetPasswordForEmail).toHaveBeenCalledWith(
      'staff@example.test',
      { redirectTo: 'https://shopcity.example.test/reset-password' },
    );
  });

  it('returns the same successful public outcome when Supabase cannot send', async () => {
    const { service, auth } = makeRecoveryService();
    auth.resetPasswordForEmail.mockRejectedValueOnce(
      new Error('provider error includes staff@example.test'),
    );

    await expect(
      service.requestPasswordRecovery(
        'staff@example.test',
        'https://shopcity.example.test/reset-password',
      ),
    ).resolves.toBeUndefined();
  });

  it('validates recovery with a transient client, changes the password, revokes sessions, and audits', async () => {
    const {
      service,
      auth,
      prisma,
      audit,
      sessionUpdateMany,
      transactionClient,
    } = makeRecoveryService();
    const revokedAt = new Date('2026-11-11T11:00:00.000Z');
    jest.useFakeTimers();
    jest.setSystemTime(revokedAt);

    await expect(
      service.completePasswordRecovery(
        'access-token',
        'refresh-token',
        'new-password',
        '0d6d26e1-c25a-4fea-a1ad-7e21cbab1c29',
      ),
    ).resolves.toBeUndefined();

    expect(auth.setSession).toHaveBeenCalledWith({
      access_token: 'access-token',
      refresh_token: 'refresh-token',
    });
    expect(auth.updateUser).toHaveBeenCalledWith({ password: 'new-password' });
    expect(sessionUpdateMany).toHaveBeenCalledWith({
      where: { userId: 'shopcity-user-id', status: 'ACTIVE' },
      data: { status: 'REVOKED', revokedAt },
    });
    expect(audit.recordWithClient).toHaveBeenCalledWith(transactionClient, {
      tenantId: 'tenant-id',
      actorId: 'shopcity-user-id',
      action: 'auth.password_reset.completed',
      entityType: 'User',
      entityId: 'shopcity-user-id',
      requestId: '0d6d26e1-c25a-4fea-a1ad-7e21cbab1c29',
      metadata: { source: 'supabase_auth_recovery' },
    });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('does not change the password or touch ShopCity when the recovery grant is invalid', async () => {
    const { service, auth, prisma } = makeRecoveryService({
      setSessionError: { status: 400, code: 'session_not_found' },
    });

    await expect(
      service.completePasswordRecovery(
        'bad-access',
        'bad-refresh',
        'new-password',
      ),
    ).rejects.toMatchObject({
      status: HttpStatus.BAD_REQUEST,
      response: { code: 'PASSWORD_RECOVERY_LINK_INVALID' },
    });
    expect(auth.updateUser).not.toHaveBeenCalled();
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('maps Supabase password-policy rejection without logging or returning tokens', async () => {
    const { service, auth, prisma } = makeRecoveryService({
      updateUserError: { status: 422, code: 'weak_password' },
    });

    await expect(
      service.completePasswordRecovery('access-token', 'refresh-token', 'weak'),
    ).rejects.toMatchObject({
      status: HttpStatus.UNPROCESSABLE_ENTITY,
      response: { code: 'PASSWORD_POLICY_UNMET' },
    });
    expect(auth.updateUser).toHaveBeenCalledTimes(1);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('fails closed if ShopCity session revocation cannot be committed after the password change', async () => {
    const { service, auth, prisma } = makeRecoveryService({
      transactionFailure: true,
    });

    await expect(
      service.completePasswordRecovery(
        'access-token',
        'refresh-token',
        'new-password',
        '0d6d26e1-c25a-4fea-a1ad-7e21cbab1c29',
      ),
    ).rejects.toMatchObject({
      status: HttpStatus.SERVICE_UNAVAILABLE,
      response: {
        code: 'PASSWORD_RECOVERY_FINALIZATION_FAILED',
      },
    });
    expect(auth.updateUser).toHaveBeenCalledTimes(1);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('does not query ShopCity mappings for an unlinked Supabase identity', async () => {
    const { service, prisma, audit } = makeRecoveryService({
      linkedUser: null,
    });

    await expect(
      service.completePasswordRecovery(
        'access-token',
        'refresh-token',
        'new-password',
      ),
    ).resolves.toBeUndefined();

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { supabaseAuthId: 'supabase-user-id' },
      select: { id: true, tenantId: true },
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(audit.recordWithClient).not.toHaveBeenCalled();
  });
});
