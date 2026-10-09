import { CustomersController } from './customers.controller';
import { UserRole } from '@prisma/client';

describe('CustomersController profile projection', () => {
  it('forwards the authenticated tenant and stable customer id to the service', async () => {
    const result = { customerId: 'customer-id' };
    const customersService = {
      getCustomerProfileProjection: jest.fn().mockResolvedValue(result),
    };
    const controller = new CustomersController(customersService as never);
    const authContext = {
      user: {
        id: 'supervisor-id',
        tenantId: 'tenant-id',
        role: UserRole.SUPERVISOR,
      },
    };
    const request = { authContext } as never;

    await expect(
      controller.getCustomerProfileProjection(request, 'customer-id'),
    ).resolves.toBe(result);
    expect(customersService.getCustomerProfileProjection).toHaveBeenCalledWith(
      'tenant-id',
      'customer-id',
      authContext,
    );
  });
});
