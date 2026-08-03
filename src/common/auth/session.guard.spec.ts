import { UserRole, UserStatus } from '@prisma/client';
import { isSessionDeviceEligible } from './session.guard';

describe('isSessionDeviceEligible', () => {
  it('rejects a linked device on an inactive branch', () => {
    expect(
      isSessionDeviceEligible({
        deviceId: 'device-id',
        user: activeUser(),
        device: {
          tenantId: 'tenant-id',
          status: 'ACTIVE',
          branchId: 'branch-id',
          branch: { status: 'INACTIVE' },
        },
      }),
    ).toBe(false);
  });

  it('rejects a linked device moved away from the user branch', () => {
    expect(
      isSessionDeviceEligible({
        deviceId: 'device-id',
        user: activeUser(),
        device: {
          tenantId: 'tenant-id',
          status: 'ACTIVE',
          branchId: 'other-branch-id',
          branch: { status: 'ACTIVE' },
        },
      }),
    ).toBe(false);
  });

  it('rejects a linked device from another tenant', () => {
    expect(
      isSessionDeviceEligible({
        deviceId: 'device-id',
        user: activeUser(),
        device: {
          tenantId: 'other-tenant-id',
          status: 'ACTIVE',
          branchId: 'branch-id',
          branch: { status: 'ACTIVE' },
        },
      }),
    ).toBe(false);
  });
});

function activeUser() {
  return {
    id: 'user-id',
    tenantId: 'tenant-id',
    branchId: 'branch-id',
    username: 'cashier@shopcity.local',
    supabaseAuthId: 'supabase-id',
    role: UserRole.CASHIER,
    status: UserStatus.ACTIVE,
    lastLoginAt: null,
    createdAt: new Date('2026-08-03T00:00:00.000Z'),
    updatedAt: new Date('2026-08-03T00:00:00.000Z'),
  };
}
