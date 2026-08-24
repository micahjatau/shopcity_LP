import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BranchStatus, TenantStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

const PUBLIC_CONFIG_FRESH_MS = 5 * 60 * 1000;
const PUBLIC_CONFIG_STALE_MS = 30 * 60 * 1000;

type PublicConfig = {
  tenant: { id: string; name: string };
  branch: {
    id: string;
    name: string;
    timezone: string;
    receiptWeekStartDay: number;
  };
  policies: Record<string, number | boolean>;
};

@Injectable()
export class ConfigurationService {
  private publicConfigCache: {
    value: PublicConfig;
    loadedAt: number;
  } | null = null;
  private publicConfigRefresh: Promise<PublicConfig> | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly prismaService: PrismaService,
  ) {}

  async getPublicConfig(): Promise<PublicConfig> {
    const now = Date.now();
    if (
      this.publicConfigCache &&
      now - this.publicConfigCache.loadedAt < PUBLIC_CONFIG_FRESH_MS
    ) {
      return this.publicConfigCache.value;
    }

    if (this.publicConfigRefresh) {
      return this.publicConfigRefresh;
    }

    this.publicConfigRefresh = this.loadPublicConfig();
    try {
      const value = await this.publicConfigRefresh;
      this.publicConfigCache = { value, loadedAt: Date.now() };
      return value;
    } catch (error) {
      if (
        this.publicConfigCache &&
        now - this.publicConfigCache.loadedAt < PUBLIC_CONFIG_STALE_MS
      ) {
        return this.publicConfigCache.value;
      }
      throw error;
    } finally {
      this.publicConfigRefresh = null;
    }
  }

  private async loadPublicConfig() {
    const tenantId =
      this.configService.get<string>('DEFAULT_PUBLIC_TENANT_ID') ??
      '00000000-0000-0000-0000-000000000001';
    const branchId =
      this.configService.get<string>('DEFAULT_PUBLIC_BRANCH_ID') ??
      '00000000-0000-0000-0000-000000000002';

    const [tenant, branch] = await Promise.all([
      this.prismaService.tenant.findUnique({ where: { id: tenantId } }),
      this.prismaService.branch.findUnique({ where: { id: branchId } }),
    ]);

    if (!tenant || !branch) {
      throw new Error('Public configuration bootstrap data is missing');
    }

    if (branch.tenantId !== tenant.id) {
      throw new Error('Public configuration bootstrap data is inconsistent');
    }

    if (
      tenant.status !== TenantStatus.ACTIVE ||
      branch.status !== BranchStatus.ACTIVE
    ) {
      throw new ServiceUnavailableException(
        'Public configuration is unavailable',
      );
    }

    return {
      tenant: {
        id: tenant.id,
        name: tenant.name,
      },
      branch: {
        id: branch.id,
        name: branch.name,
        timezone: branch.timezone,
        receiptWeekStartDay: branch.receiptWeekStartDay,
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
        purchaseAmountCeilingKobo:
          this.configService.get<number>('PURCHASE_AMOUNT_CEILING_KOBO') ??
          100000000,
        redemptionApprovalThresholdKobo:
          this.configService.get<number>(
            'REDEMPTION_APPROVAL_THRESHOLD_KOBO',
          ) ?? 500000,
        offlineRedemptionDisabled: true,
      },
    };
  }
}
