import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import type {
  RedemptionPolicyInput,
  RedemptionPolicyResult,
} from '../modules/redemptions/redemptions.types';

type RedemptionPolicyValues = {
  minRedemptionKobo: bigint;
  maxRedemptionBasketPercent: number;
  redemptionApprovalThresholdKobo: bigint;
  version?: number;
};

@Injectable()
export class RedemptionPolicyService {
  constructor(private readonly configService: ConfigService) {}

  evaluate(
    input: RedemptionPolicyInput,
    configuredPolicy?: RedemptionPolicyValues,
  ): RedemptionPolicyResult {
    const minimumRedemptionKobo =
      configuredPolicy?.minRedemptionKobo ??
      BigInt(this.configService.get<number>('MIN_REDEMPTION_KOBO') ?? 50_000);
    const maxBasketPercent = BigInt(
      configuredPolicy?.maxRedemptionBasketPercent ??
        this.configService.get<number>('MAX_REDEMPTION_BASKET_PERCENT') ??
        30,
    );
    const approvalThresholdKobo =
      configuredPolicy?.redemptionApprovalThresholdKobo ??
      BigInt(
        this.configService.get<number>('REDEMPTION_APPROVAL_THRESHOLD_KOBO') ??
          500_000,
      );
    const basketCapKobo = (input.basketAmountKobo * maxBasketPercent) / 100n;
    const maximumAllowedKobo =
      input.activeBalanceKobo < basketCapKobo
        ? input.activeBalanceKobo
        : basketCapKobo;

    return {
      minimumRedemptionKobo,
      basketCapKobo,
      maximumAllowedKobo,
      approvalThresholdKobo,
      requiresApproval: input.requestedAmountKobo > approvalThresholdKobo,
      policyVersion: this.policyVersion(configuredPolicy),
    };
  }

  policyVersion(configuredPolicy?: RedemptionPolicyValues): string {
    if (!configuredPolicy) {
      return createHash('sha256')
        .update(
          JSON.stringify({
            minimumRedemptionKobo:
              this.configService.get<number>('MIN_REDEMPTION_KOBO') ?? 50_000,
            maxBasketPercent:
              this.configService.get<number>('MAX_REDEMPTION_BASKET_PERCENT') ??
              30,
            approvalThresholdKobo:
              this.configService.get<number>(
                'REDEMPTION_APPROVAL_THRESHOLD_KOBO',
              ) ?? 500_000,
          }),
        )
        .digest('hex');
    }

    return createHash('sha256')
      .update(
        JSON.stringify({
          minimumRedemptionKobo: configuredPolicy.minRedemptionKobo.toString(),
          maxBasketPercent: configuredPolicy.maxRedemptionBasketPercent,
          approvalThresholdKobo:
            configuredPolicy.redemptionApprovalThresholdKobo.toString(),
          version: configuredPolicy.version ?? null,
        }),
      )
      .digest('hex');
  }
}
