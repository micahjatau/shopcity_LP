import { UserRole, UserStatus } from '@prisma/client';
import { isSessionDeviceEligible, isSessionIdleExpired } from './session.guard';

describe('isSessionIdleExpired', () => {
  const config = {
    get: jest.fn(
      (key: string) =>
        ({
          SESSION_IDLE_CASHIER_MINUTES: 30,
          SESSION_IDLE_SUPERVISOR_MINUTES: 15,
          SESSION_IDLE_ADMIN_MINUTES: 15,
        })[key],
    ),
  };
  const now = new Date('2026-08-24T12:00:00.000Z');

  it('expires an idle cashier after the cashier window', () => {
    expect(
      isSessionIdleExpired(
        { lastUsedAt: new Date('2026-08-24T11:29:59.000Z') },
        { role: UserRole.CASHIER },
        config,
        now,
      ),
    ).toBe(true);
  });

  it('uses the shorter supervisor window', () => {
    expect(
      isSessionIdleExpired(
        { lastUsedAt: new Date('2026-08-24T11:44:59.000Z') },
        { role: UserRole.SUPERVISOR },
        config,
        now,
      ),
    ).toBe(true);
  });

  it('keeps a recently used session active', () => {
    expect(
      isSessionIdleExpired(
        { lastUsedAt: new Date('2026-08-24T11:45:01.000Z') },
        { role: UserRole.SUPERVISOR },
        config,
        now,
      ),
    ).toBe(false);
  });
});

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
