import { UserRole } from '@prisma/client';
import { ROLES_KEY } from '../../common/auth/auth.constants';
import { THROTTLE_KEY } from '../../common/throttle/throttle.constants';
import { ReversalsController } from './reversals.controller';

describe('ReversalsController', () => {
  function reverseHandler(): object {
    const descriptor = Object.getOwnPropertyDescriptor(
      ReversalsController.prototype,
      'reverse',
    );

    return descriptor!.value as object;
  }

  it('delegates transaction reversal requests to the reversals service', async () => {
    const reversalsService = {
      reverse: jest.fn().mockResolvedValue({
        code: 'REVERSAL_DEFERRED',
        transactionId: 'transaction-1',
      }),
    };
    const controller = new ReversalsController(reversalsService as never);
    const request = {
      authContext: {
        user: { id: 'user-1', tenantId: 'tenant-1' },
        session: {},
      },
    };
    const dto = { reason: 'Customer refund' };

    await expect(
      controller.reverse(request as never, 'transaction-1', 'idem-1', dto),
    ).resolves.toMatchObject({
      code: 'REVERSAL_DEFERRED',
      transactionId: 'transaction-1',
    });

    expect(reversalsService.reverse).toHaveBeenCalledWith(
      'tenant-1',
      request.authContext,
      'transaction-1',
      'idem-1',
      dto,
    );
  });

  it('restricts reversal requests to supervisors and admins', () => {
    expect(Reflect.getMetadata(ROLES_KEY, reverseHandler())).toEqual([
      UserRole.SUPERVISOR,
      UserRole.ADMIN,
    ]);
  });

  it('applies a reversal-specific throttle bucket', () => {
    expect(Reflect.getMetadata(THROTTLE_KEY, reverseHandler())).toMatchObject({
      bucket: 'transactions.reverse',
      limit: 20,
      windowMs: 60_000,
    });
  });
});
