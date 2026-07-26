import { ConfigService } from '@nestjs/config';
import { RedemptionPolicyService } from './redemption-policy.service';

describe('RedemptionPolicyService', () => {
  it('derives basket cap, maximum allowed amount, and approval requirement', () => {
    const service = new RedemptionPolicyService(
      configService({
        MIN_REDEMPTION_KOBO: 50_000,
        MAX_REDEMPTION_BASKET_PERCENT: 30,
        REDEMPTION_APPROVAL_THRESHOLD_KOBO: 500_000,
      }) as ConfigService,
    );

    const result = service.evaluate({
      requestedAmountKobo: 600_000n,
      basketAmountKobo: 2_000_000n,
      activeBalanceKobo: 700_000n,
    });

    expect(result).toMatchObject({
      minimumRedemptionKobo: 50_000n,
      basketCapKobo: 600_000n,
      maximumAllowedKobo: 600_000n,
      approvalThresholdKobo: 500_000n,
      requiresApproval: true,
    });
    expect(result.policyVersion).toHaveLength(64);
  });

  it('caps maximum allowed amount by active balance', () => {
    const service = new RedemptionPolicyService(
      configService({
        MAX_REDEMPTION_BASKET_PERCENT: 30,
      }) as ConfigService,
    );

    expect(
      service.evaluate({
        requestedAmountKobo: 100_000n,
        basketAmountKobo: 2_000_000n,
        activeBalanceKobo: 250_000n,
      }).maximumAllowedKobo,
    ).toBe(250_000n);
  });
});

function configService(values: Record<string, number>) {
  return {
    get: jest.fn((key: string) => values[key]),
  };
}
