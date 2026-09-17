import { ServiceUnavailableException } from '@nestjs/common';
import { BranchStatus, TenantStatus } from '@prisma/client';
import { ConfigurationService } from './configuration.service';

describe('ConfigurationService', () => {
  it('exposes kobo-correct public policy values and DB-backed branch config', async () => {
    const service = new ConfigurationService(
      {
        get: (key: string) => {
          const values: Record<string, unknown> = {
            DEFAULT_PUBLIC_TENANT_ID: '00000000-0000-0000-0000-000000000001',
            DEFAULT_PUBLIC_BRANCH_ID: '00000000-0000-0000-0000-000000000002',
            DEFAULT_EARN_RATE_BPS: 200,
            MIN_REDEMPTION_KOBO: 50000,
            MAX_REDEMPTION_BASKET_PERCENT: 30,
            PURCHASE_FLAG_THRESHOLD_KOBO: 10000000,
            PURCHASE_APPROVAL_THRESHOLD_KOBO: 20000000,
            PURCHASE_AMOUNT_CEILING_KOBO: 100000000,
            REDEMPTION_APPROVAL_THRESHOLD_KOBO: 500000,
          };

          return values[key];
        },
      } as never,
      {
        tenant: {
          findUnique: jest.fn().mockResolvedValue({
            id: '00000000-0000-0000-0000-000000000001',
            status: TenantStatus.ACTIVE,
            name: 'ShopCity',
          }),
        },
        branch: {
          findUnique: jest.fn().mockResolvedValue({
            id: '00000000-0000-0000-0000-000000000002',
            tenantId: '00000000-0000-0000-0000-000000000001',
            status: BranchStatus.ACTIVE,
            name: 'Main Branch',
            timezone: 'Africa/Nairobi',
            receiptWeekStartDay: 3,
          }),
        },
        policyConfiguration: {
          findUnique: jest.fn().mockResolvedValue(null),
        },
      } as never,
      { recordWithClient: jest.fn() } as never,
    );

    await expect(service.getPublicConfig()).resolves.toEqual({
      tenant: {
        id: '00000000-0000-0000-0000-000000000001',
        name: 'ShopCity',
      },
      branch: {
        id: '00000000-0000-0000-0000-000000000002',
        name: 'Main Branch',
        timezone: 'Africa/Nairobi',
        receiptWeekStartDay: 3,
      },
      policies: {
        defaultEarnRateBps: 200,
        minRedemptionKobo: 50000,
        maxRedemptionBasketPercent: 30,
        purchaseFlagThresholdKobo: 10000000,
        purchaseApprovalThresholdKobo: 20000000,
        purchaseAmountCeilingKobo: 100000000,
        redemptionApprovalThresholdKobo: 500000,
        offlineRedemptionDisabled: true,
      },
    });
  });

  it('rejects mismatched public tenant and branch ownership', async () => {
    const service = new ConfigurationService(
      {
        get: (key: string) => {
          const values: Record<string, unknown> = {
            DEFAULT_PUBLIC_TENANT_ID: '00000000-0000-0000-0000-000000000001',
            DEFAULT_PUBLIC_BRANCH_ID: '00000000-0000-0000-0000-000000000002',
          };

          return values[key];
        },
      } as never,
      {
        tenant: {
          findUnique: jest.fn().mockResolvedValue({
            id: '00000000-0000-0000-0000-000000000001',
            status: TenantStatus.ACTIVE,
            name: 'ShopCity',
          }),
        },
        branch: {
          findUnique: jest.fn().mockResolvedValue({
            id: '00000000-0000-0000-0000-000000000002',
            tenantId: '00000000-0000-0000-0000-000000000099',
            status: BranchStatus.ACTIVE,
            name: 'Main Branch',
            timezone: 'Africa/Lagos',
            receiptWeekStartDay: 1,
          }),
        },
        policyConfiguration: {
          findUnique: jest.fn().mockResolvedValue(null),
        },
      } as never,
      { recordWithClient: jest.fn() } as never,
    );

    await expect(service.getPublicConfig()).rejects.toThrow(
      'Public configuration bootstrap data is inconsistent',
    );
  });

  it('creates an audited branch policy at version one', async () => {
    const tx = {
      policyConfiguration: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({
          id: 'policy-1',
          tenantId: 'tenant-1',
          branchId: 'branch-1',
          version: 1,
          defaultEarnRateBps: 200,
          minRedemptionKobo: 50000n,
          maxRedemptionBasketPercent: 30,
          purchaseFlagThresholdKobo: 10000000n,
          purchaseApprovalThresholdKobo: 20000000n,
          purchaseAmountCeilingKobo: 100000000n,
          redemptionApprovalThresholdKobo: 500000n,
          offlineRedemptionDisabled: true,
        }),
      },
    };
    const service = new ConfigurationService(
      { get: jest.fn() } as never,
      {
        branch: {
          findFirst: jest.fn().mockResolvedValue({
            id: 'branch-1',
            name: 'Main Branch',
            status: BranchStatus.ACTIVE,
          }),
        },
        $transaction: jest.fn((callback: (client: unknown) => unknown) =>
          callback(tx),
        ),
      } as never,
      { recordWithClient: jest.fn().mockResolvedValue(undefined) } as never,
    );

    await expect(
      service.updatePolicyConfiguration('tenant-1', 'admin-1', {
        branchId: 'branch-1',
        defaultEarnRateBps: 200,
        minRedemptionKobo: 50000,
        maxRedemptionBasketPercent: 30,
        purchaseFlagThresholdKobo: 10000000,
        purchaseApprovalThresholdKobo: 20000000,
        purchaseAmountCeilingKobo: 100000000,
        redemptionApprovalThresholdKobo: 500000,
        offlineRedemptionDisabled: true,
        expectedVersion: 0,
      }),
    ).resolves.toMatchObject({ version: 1, branchId: 'branch-1' });
  });

  it('rejects a stale policy version without updating', async () => {
    const updateMany = jest.fn();
    const service = new ConfigurationService(
      { get: jest.fn() } as never,
      {
        branch: {
          findFirst: jest.fn().mockResolvedValue({
            id: 'branch-1',
            name: 'Main Branch',
            status: BranchStatus.ACTIVE,
          }),
        },
        $transaction: jest.fn((callback: (client: unknown) => unknown) =>
          callback({
            policyConfiguration: {
              findUnique: jest.fn().mockResolvedValue({ version: 3 }),
              updateMany,
            },
          }),
        ),
      } as never,
      { recordWithClient: jest.fn() } as never,
    );

    await expect(
      service.updatePolicyConfiguration('tenant-1', 'admin-1', {
        branchId: 'branch-1',
        defaultEarnRateBps: 200,
        minRedemptionKobo: 50000,
        maxRedemptionBasketPercent: 30,
        purchaseFlagThresholdKobo: 10000000,
        purchaseApprovalThresholdKobo: 20000000,
        purchaseAmountCeilingKobo: 100000000,
        redemptionApprovalThresholdKobo: 500000,
        offlineRedemptionDisabled: true,
        expectedVersion: 2,
      }),
    ).rejects.toMatchObject({
      response: { code: 'POLICY_VERSION_CONFLICT' },
    });
    expect(updateMany).not.toHaveBeenCalled();
  });

  it('rejects inactive public tenant or branch configuration', async () => {
    const service = new ConfigurationService(
      {
        get: (key: string) => {
          const values: Record<string, unknown> = {
            DEFAULT_PUBLIC_TENANT_ID: '00000000-0000-0000-0000-000000000001',
            DEFAULT_PUBLIC_BRANCH_ID: '00000000-0000-0000-0000-000000000002',
          };

          return values[key];
        },
      } as never,
      {
        tenant: {
          findUnique: jest.fn().mockResolvedValue({
            id: '00000000-0000-0000-0000-000000000001',
            status: TenantStatus.SUSPENDED,
            name: 'ShopCity',
          }),
        },
        branch: {
          findUnique: jest.fn().mockResolvedValue({
            id: '00000000-0000-0000-0000-000000000002',
            tenantId: '00000000-0000-0000-0000-000000000001',
            status: BranchStatus.ACTIVE,
            name: 'Main Branch',
            timezone: 'Africa/Lagos',
            receiptWeekStartDay: 1,
          }),
        },
        policyConfiguration: {
          findUnique: jest.fn().mockResolvedValue(null),
        },
      } as never,
      { recordWithClient: jest.fn() } as never,
    );

    await expect(service.getPublicConfig()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
