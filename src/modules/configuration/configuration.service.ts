import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DEFAULT_PUBLIC_BRANCH_NAME,
  DEFAULT_PUBLIC_TENANT_NAME,
} from '../../config/app.constants';

@Injectable()
export class ConfigurationService {
  constructor(private readonly configService: ConfigService) {}

  getPublicConfig() {
    const tenantId =
      this.configService.get<string>('DEFAULT_PUBLIC_TENANT_ID') ??
      '00000000-0000-0000-0000-000000000001';
    const branchId =
      this.configService.get<string>('DEFAULT_PUBLIC_BRANCH_ID') ??
      '00000000-0000-0000-0000-000000000002';

    return {
      tenant: {
        id: tenantId,
        name: DEFAULT_PUBLIC_TENANT_NAME,
      },
      branch: {
        id: branchId,
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
          this.configService.get<number>('MIN_REDEMPTION_KOBO') ?? 50000,
        maxRedemptionBasketPercent:
          this.configService.get<number>('MAX_REDEMPTION_BASKET_PERCENT') ?? 30,
        purchaseFlagThresholdKobo:
          this.configService.get<number>('PURCHASE_FLAG_THRESHOLD_KOBO') ??
          10000000,
        purchaseApprovalThresholdKobo:
          this.configService.get<number>('PURCHASE_APPROVAL_THRESHOLD_KOBO') ??
          20000000,
        redemptionApprovalThresholdKobo:
          this.configService.get<number>(
            'REDEMPTION_APPROVAL_THRESHOLD_KOBO',
          ) ?? 500000,
      },
    };
  }
}
