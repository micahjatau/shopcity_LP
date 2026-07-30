import { ConfigService } from '@nestjs/config';
import { RedemptionPolicyService } from './redemption-policy.service';

describe('RedemptionPolicyService', () => {
  it('derives basket cap, maximum allowed amount, and approval requirement', () => {
    const service = new RedemptionPolicyService(
      configService({
        MIN_REDEMPTION_KOBO: 50_000,
        MAX_REDEMPTION_BASKET_PERCENT: 30,
        REDEMPTION_APPROVAL_THRESHOLD_KOBO: 500_000,
      }),
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
      }),
    );

    expect(
      service.evaluate({
        requestedAmountKobo: 100_000n,
        basketAmountKobo: 2_000_000n,
        activeBalanceKobo: 250_000n,
      }).maximumAllowedKobo,
    ).toBe(250_000n);
  });

  it('keeps threshold boundary, basket floor division, and zero balance deterministic', () => {
    const service = new RedemptionPolicyService(
      configService({
        MIN_REDEMPTION_KOBO: 75_000,
        MAX_REDEMPTION_BASKET_PERCENT: 30,
        REDEMPTION_APPROVAL_THRESHOLD_KOBO: 500_000,
      }),
    );

    expect(
      service.evaluate({
        requestedAmountKobo: 500_000n,
        basketAmountKobo: 333_333n,
        activeBalanceKobo: 0n,
      }),
    ).toMatchObject({
      minimumRedemptionKobo: 75_000n,
      basketCapKobo: 99_999n,
      maximumAllowedKobo: 0n,
      approvalThresholdKobo: 500_000n,
      requiresApproval: false,
    });
  });

  it('keeps policy versions stable for the same config and changes when config changes', () => {
    const stableService = new RedemptionPolicyService(
      configService({
        MIN_REDEMPTION_KOBO: 50_000,
        MAX_REDEMPTION_BASKET_PERCENT: 30,
        REDEMPTION_APPROVAL_THRESHOLD_KOBO: 500_000,
      }),
    );
    const changedService = new RedemptionPolicyService(
      configService({
        MIN_REDEMPTION_KOBO: 50_000,
        MAX_REDEMPTION_BASKET_PERCENT: 40,
        REDEMPTION_APPROVAL_THRESHOLD_KOBO: 500_000,
      }),
    );

    expect(stableService.policyVersion()).toBe(stableService.policyVersion());
    expect(stableService.policyVersion()).not.toBe(
      changedService.policyVersion(),
    );
  });
});

function configService(values: Record<string, number>) {
  const config = new ConfigService();
  jest.spyOn(config, 'get').mockImplementation((key: string) => values[key]);

  return config;
}
