import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import type {
  RedemptionPolicyInput,
  RedemptionPolicyResult,
} from '../modules/redemptions/redemptions.types';

@Injectable()
export class RedemptionPolicyService {
  constructor(private readonly configService: ConfigService) {}

  evaluate(input: RedemptionPolicyInput): RedemptionPolicyResult {
    const minimumRedemptionKobo = BigInt(
      this.configService.get<number>('MIN_REDEMPTION_KOBO') ?? 50_000,
    );
    const maxBasketPercent = BigInt(
      this.configService.get<number>('MAX_REDEMPTION_BASKET_PERCENT') ?? 30,
    );
    const approvalThresholdKobo = BigInt(
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
      policyVersion: this.policyVersion(),
    };
  }

  policyVersion(): string {
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
}
