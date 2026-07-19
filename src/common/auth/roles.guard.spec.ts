import { UserRole } from '@prisma/client';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  it('allows required roles', () => {
    const guard = new RolesGuard({
      getAllAndOverride: () => [UserRole.ADMIN],
    } as never);

    const request = { authContext: { user: { role: UserRole.ADMIN } } };
    const context = mockContext(request);

    expect(guard.canActivate(context)).toBe(true);
  });

  it('rejects missing roles', () => {
    const guard = new RolesGuard({
      getAllAndOverride: () => [UserRole.ADMIN],
    } as never);

    const request = { authContext: { user: { role: UserRole.CASHIER } } };
    const context = mockContext(request);

    expect(() => guard.canActivate(context)).toThrow(
      'Insufficient permissions',
    );
  });
});

function mockContext(request: unknown) {
  return {
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({ getRequest: () => request }),
  } as never;
}
