import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DEFAULT_PUBLIC_BRANCH_ID,
  DEFAULT_PUBLIC_BRANCH_NAME,
  DEFAULT_PUBLIC_TENANT_NAME,
} from '../../config/app.constants';

@Injectable()
export class ConfigurationService {
  constructor(private readonly configService: ConfigService) {}

  getPublicConfig() {
    return {
      tenant: {
        id: DEFAULT_PUBLIC_BRANCH_ID,
        name: DEFAULT_PUBLIC_TENANT_NAME,
      },
      branch: {
        id: DEFAULT_PUBLIC_BRANCH_ID,
        name: DEFAULT_PUBLIC_BRANCH_NAME,
        timezone:
          this.configService.get<string>('SHOPCITY_TIMEZONE') ?? 'Africa/Lagos',
        receiptWeekStartDay:
          this.configService.get<number>('RECEIPT_WEEK_START_DAY') ?? 1,
      },
      policies: {
        defaultEarnRateBps:
          this.configService.get<number>('DEFAULT_EARN_RATE_BPS') ?? 200,
        minRedemptionKobo:
          this.configService.get<number>('MIN_REDEMPTION_KOBO') ?? 500,
        maxRedemptionBasketPercent:
          this.configService.get<number>('MAX_REDEMPTION_BASKET_PERCENT') ?? 30,
        purchaseFlagThresholdKobo:
          this.configService.get<number>('PURCHASE_FLAG_THRESHOLD_KOBO') ??
          100000,
        purchaseApprovalThresholdKobo:
          this.configService.get<number>('PURCHASE_APPROVAL_THRESHOLD_KOBO') ??
          200000,
        redemptionApprovalThresholdKobo:
          this.configService.get<number>(
            'REDEMPTION_APPROVAL_THRESHOLD_KOBO',
          ) ?? 5000,
      },
    };
  }
}
