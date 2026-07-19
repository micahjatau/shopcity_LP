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
            REDEMPTION_APPROVAL_THRESHOLD_KOBO: 500000,
          };

          return values[key];
        },
      } as never,
      {
        tenant: {
          findUnique: jest.fn().mockResolvedValue({
            id: '00000000-0000-0000-0000-000000000001',
            name: 'ShopCity',
          }),
        },
        branch: {
          findUnique: jest.fn().mockResolvedValue({
            id: '00000000-0000-0000-0000-000000000002',
            name: 'Main Branch',
            timezone: 'Africa/Nairobi',
            receiptWeekStartDay: 3,
          }),
        },
      } as never,
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
        redemptionApprovalThresholdKobo: 500000,
      },
    });
  });
});
