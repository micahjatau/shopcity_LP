import { UserRole } from '@prisma/client';
import { ROLES_KEY } from '../../common/auth/auth.constants';
import { THROTTLE_KEY } from '../../common/throttle/throttle.constants';
import { ReversalsService } from './reversals.service';
import { ReversalsController } from './reversals.controller';

describe('ReversalsController', () => {
  function reverseHandler(): object {
    const descriptor = Object.getOwnPropertyDescriptor(
      ReversalsController.prototype,
      'reverse',
    );

    if (!descriptor || typeof descriptor.value !== 'function') {
      throw new Error('reverse handler missing');
    }

    return descriptor.value as object;
  }

  it('delegates transaction reversal requests to the reversals service', async () => {
    const reversalsService: Pick<ReversalsService, 'reverse'> = {
      reverse: jest.fn().mockResolvedValue({ id: 'reversal-1' }),
    };
    const controller = new ReversalsController(
      reversalsService as ReversalsService,
    );
    const request = {
      authContext: {
        user: { id: 'user-1', tenantId: 'tenant-1' },
        session: undefined,
      },
    };
    const reply = { code: jest.fn().mockReturnThis() };
    const dto = { reason: 'Customer refund' };

    await expect(
      controller.reverse(
        request as never,
        'transaction-1',
        'idem-1',
        dto,
        reply as never,
      ),
    ).resolves.toEqual({ id: 'reversal-1' });

    expect(reversalsService.reverse).toHaveBeenCalledWith(
      'tenant-1',
      request.authContext,
      'transaction-1',
      'idem-1',
      dto,
    );
    expect(reply.code).toHaveBeenCalledWith(201);
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
