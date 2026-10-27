import { CustomersController } from './customers.controller';
import { UserRole } from '@prisma/client';

describe('CustomersController profile projection', () => {
  it('forwards the authenticated customer request to withdraw marketing consent', async () => {
    const result = { status: 'OPTED_OUT', source: 'IN_STORE' };
    const customersService = {
      withdrawCustomerMarketingPreference: jest.fn().mockResolvedValue(result),
    };
    const controller = new CustomersController(customersService as never);
    const authContext = {
      user: {
        id: 'cashier-id',
        tenantId: 'tenant-id',
        role: UserRole.CASHIER,
      },
    };

    await expect(
      controller.withdrawMarketingPreference(
        { authContext } as never,
        'customer-id',
        { confirmedInPersonRequest: true },
        'marketing-withdrawal-key',
      ),
    ).resolves.toBe(result);
    expect(
      customersService.withdrawCustomerMarketingPreference,
    ).toHaveBeenCalledWith(
      'tenant-id',
      authContext,
      'customer-id',
      true,
      'marketing-withdrawal-key',
    );
  });

  it('forwards the authorized current marketing preference read to the service', async () => {
    const result = { status: 'NOT_OPTED_IN', source: 'REGISTRATION' };
    const customersService = {
      getCustomerMarketingPreference: jest.fn().mockResolvedValue(result),
    };
    const controller = new CustomersController(customersService as never);
    const authContext = {
      user: {
        id: 'cashier-id',
        tenantId: 'tenant-id',
        role: UserRole.CASHIER,
      },
    };

    await expect(
      controller.getMarketingPreference(
        { authContext } as never,
        'customer-id',
      ),
    ).resolves.toBe(result);
    expect(
      customersService.getCustomerMarketingPreference,
    ).toHaveBeenCalledWith('tenant-id', 'customer-id', authContext);
  });

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
