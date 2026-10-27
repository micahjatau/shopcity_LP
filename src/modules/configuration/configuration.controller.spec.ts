import { UserRole } from '@prisma/client';
import { ROLES_KEY } from '../../common/auth/auth.constants';
import { ConfigurationController } from './configuration.controller';
import { ConfigurationService } from './configuration.service';

describe('ConfigurationController', () => {
  function handler(
    name: 'getPolicyConfiguration' | 'updatePolicyConfiguration',
  ) {
    const descriptor = Object.getOwnPropertyDescriptor(
      ConfigurationController.prototype,
      name,
    );
    if (!descriptor || typeof descriptor.value !== 'function') {
      throw new Error(`${name} handler missing`);
    }
    return descriptor.value as object;
  }

  it('restricts policy reads and writes to Admin', () => {
    expect(
      Reflect.getMetadata(ROLES_KEY, handler('getPolicyConfiguration')),
    ).toEqual([UserRole.ADMIN]);
    expect(
      Reflect.getMetadata(ROLES_KEY, handler('updatePolicyConfiguration')),
    ).toEqual([UserRole.ADMIN]);
  });

  it('passes tenant scope and actor identity to the policy mutation', async () => {
    const updatePolicyConfiguration = jest
      .fn()
      .mockResolvedValue({ version: 2 });
    const service = {
      updatePolicyConfiguration,
    } as unknown as ConfigurationService;
    const controller = new ConfigurationController(service);
    const request = {
      authContext: {
        user: { id: 'admin-1', tenantId: 'tenant-1' },
      },
    };
    const input = { branchId: 'branch-1', expectedVersion: 1 };

    await expect(
      controller.updatePolicyConfiguration(request as never, input as never),
    ).resolves.toEqual({ version: 2 });
    expect(updatePolicyConfiguration).toHaveBeenCalledWith(
      'tenant-1',
      'admin-1',
      input,
    );
  });
});
