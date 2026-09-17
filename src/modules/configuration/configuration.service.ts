import {
  ConflictException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BranchStatus, TenantStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { DomainHttpException } from '../../common/errors/domain.exception';
import type { UpdatePolicyConfigurationDto } from './configuration.dto';

const PUBLIC_CONFIG_FRESH_MS = 5 * 60 * 1000;
const PUBLIC_CONFIG_STALE_MS = 30 * 60 * 1000;
const STAGING_TENANT_ID = 'd7e5c452-a63b-445c-af0d-aa740a676905';
const STAGING_BRANCH_ID = '80241e14-2855-4cd8-87ad-0dd06083b50a';

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
    private readonly auditService: AuditService,
  ) {}

  async getPublicConfig(): Promise<PublicConfig> {
    const now = Date.now();
    if (
      this.publicConfigCache &&
      now - this.publicConfigCache.loadedAt < PUBLIC_CONFIG_FRESH_MS
    ) {
      if (await this.isCachedConfigActive(this.publicConfigCache.value)) {
        return this.publicConfigCache.value;
      }
      this.publicConfigCache = null;
    }

    if (this.publicConfigRefresh) {
      return this.publicConfigRefresh;
    }

    const isStagingBranch = process.env.VERCEL_GIT_COMMIT_REF === 'staging';
    const tenantId = isStagingBranch
      ? STAGING_TENANT_ID
      : (this.configService.get<string>('DEFAULT_PUBLIC_TENANT_ID') ??
        '00000000-0000-0000-0000-000000000001');
    const branchId = isStagingBranch
      ? STAGING_BRANCH_ID
      : (this.configService.get<string>('DEFAULT_PUBLIC_BRANCH_ID') ??
        '00000000-0000-0000-0000-000000000002');

    this.publicConfigRefresh = this.loadConfig(tenantId, branchId);
    try {
      const value = await this.publicConfigRefresh;
      this.publicConfigCache = { value, loadedAt: Date.now() };
      return value;
    } catch (error) {
      if (
        !(error instanceof ServiceUnavailableException) &&
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

  async getOperationalConfig(tenantId: string, branchId: string) {
    return this.loadConfig(tenantId, branchId);
  }

  async getPolicyConfiguration(tenantId: string, branchId: string) {
    const branch = await this.assertBranchScope(tenantId, branchId);
    const policy = await this.prismaService.policyConfiguration.findUnique({
      where: { tenantId_branchId: { tenantId, branchId } },
    });

    return this.serializePolicy(policy ?? this.defaultPolicy(branchId), {
      tenantId,
      branchId,
      branchName: branch.name,
    });
  }

  async updatePolicyConfiguration(
    tenantId: string,
    actorId: string,
    input: UpdatePolicyConfigurationDto,
  ) {
    const branch = await this.assertBranchScope(tenantId, input.branchId);
    this.validatePolicyRelationships(input);

    const result = await this.prismaService.$transaction(async (tx) => {
      const current = await tx.policyConfiguration.findUnique({
        where: {
          tenantId_branchId: { tenantId, branchId: input.branchId },
        },
      });
      const expectedVersion = input.expectedVersion;

      if ((current?.version ?? 0) !== expectedVersion) {
        throw new ConflictException({
          code: 'POLICY_VERSION_CONFLICT',
          message: 'Policy changed since it was loaded; reload before saving.',
          details: { currentVersion: current?.version ?? 0 },
        });
      }

      const data = this.policyData(input);
      let policy;
      if (!current) {
        if (expectedVersion !== 0) {
          throw new ConflictException({
            code: 'POLICY_VERSION_CONFLICT',
            message:
              'Policy changed since it was loaded; reload before saving.',
            details: { currentVersion: 0 },
          });
        }
        policy = await tx.policyConfiguration.create({
          data: {
            tenantId,
            branchId: input.branchId,
            version: 1,
            ...data,
          },
        });
      } else {
        const updated = await tx.policyConfiguration.updateMany({
          where: {
            tenantId,
            branchId: input.branchId,
            version: expectedVersion,
          },
          data: { ...data, version: { increment: 1 } },
        });
        if (updated.count !== 1) {
          throw new ConflictException({
            code: 'POLICY_VERSION_CONFLICT',
            message:
              'Policy changed since it was loaded; reload before saving.',
          });
        }
        policy = await tx.policyConfiguration.findUniqueOrThrow({
          where: {
            tenantId_branchId: { tenantId, branchId: input.branchId },
          },
        });
      }

      await this.auditService.recordWithClient(tx, {
        tenantId,
        actorId,
        action: 'configuration.policy.updated',
        entityType: 'PolicyConfiguration',
        entityId: policy.id,
        metadata: {
          branchId: input.branchId,
          version: policy.version,
          previousVersion: expectedVersion,
          policy: this.serializePolicyValues(policy),
        },
      });

      return this.serializePolicy(policy, {
        tenantId,
        branchId: input.branchId,
        branchName: branch.name,
      });
    });
    this.publicConfigCache = null;
    return result;
  }

  private async assertBranchScope(tenantId: string, branchId: string) {
    const branch = await this.prismaService.branch.findFirst({
      where: { id: branchId, tenantId },
      select: { id: true, name: true, status: true },
    });
    if (!branch) {
      throw new DomainHttpException(
        404,
        'BRANCH_NOT_FOUND',
        'The requested branch is not in the current tenant.',
      );
    }
    if (branch.status !== BranchStatus.ACTIVE) {
      throw new ServiceUnavailableException(
        'The requested branch is inactive.',
      );
    }
    return branch;
  }

  private validatePolicyRelationships(input: UpdatePolicyConfigurationDto) {
    if (input.purchaseApprovalThresholdKobo < input.purchaseFlagThresholdKobo) {
      throw new DomainHttpException(
        422,
        'POLICY_VALIDATION_FAILED',
        'Purchase approval threshold cannot be below the fraud flag threshold.',
      );
    }
    if (input.purchaseAmountCeilingKobo < input.purchaseApprovalThresholdKobo) {
      throw new DomainHttpException(
        422,
        'POLICY_VALIDATION_FAILED',
        'Purchase amount ceiling cannot be below the approval threshold.',
      );
    }
    if (input.redemptionApprovalThresholdKobo < input.minRedemptionKobo) {
      throw new DomainHttpException(
        422,
        'POLICY_VALIDATION_FAILED',
        'Redemption approval threshold cannot be below the minimum redemption.',
      );
    }
  }

  private policyData(input: UpdatePolicyConfigurationDto) {
    return {
      defaultEarnRateBps: input.defaultEarnRateBps,
      minRedemptionKobo: BigInt(input.minRedemptionKobo),
      maxRedemptionBasketPercent: input.maxRedemptionBasketPercent,
      purchaseFlagThresholdKobo: BigInt(input.purchaseFlagThresholdKobo),
      purchaseApprovalThresholdKobo: BigInt(
        input.purchaseApprovalThresholdKobo,
      ),
      purchaseAmountCeilingKobo: BigInt(input.purchaseAmountCeilingKobo),
      redemptionApprovalThresholdKobo: BigInt(
        input.redemptionApprovalThresholdKobo,
      ),
      offlineRedemptionDisabled: input.offlineRedemptionDisabled,
    };
  }

  private defaultPolicy(branchId: string) {
    return {
      id: null,
      tenantId: null,
      branchId,
      version: 0,
      ...this.defaultPolicyValues(),
    };
  }

  private defaultPolicyValues() {
    return {
      defaultEarnRateBps:
        this.configService.get<number>('DEFAULT_EARN_RATE_BPS') ?? 200,
      minRedemptionKobo: BigInt(
        this.configService.get<number>('MIN_REDEMPTION_KOBO') ?? 50000,
      ),
      maxRedemptionBasketPercent:
        this.configService.get<number>('MAX_REDEMPTION_BASKET_PERCENT') ?? 30,
      purchaseFlagThresholdKobo: BigInt(
        this.configService.get<number>('PURCHASE_FLAG_THRESHOLD_KOBO') ??
          10000000,
      ),
      purchaseApprovalThresholdKobo: BigInt(
        this.configService.get<number>('PURCHASE_APPROVAL_THRESHOLD_KOBO') ??
          20000000,
      ),
      purchaseAmountCeilingKobo: BigInt(
        this.configService.get<number>('PURCHASE_AMOUNT_CEILING_KOBO') ??
          100000000,
      ),
      redemptionApprovalThresholdKobo: BigInt(
        this.configService.get<number>('REDEMPTION_APPROVAL_THRESHOLD_KOBO') ??
          500000,
      ),
      offlineRedemptionDisabled: true,
    };
  }

  private serializePolicyValues(policy: {
    defaultEarnRateBps: number;
    minRedemptionKobo: bigint;
    maxRedemptionBasketPercent: number;
    purchaseFlagThresholdKobo: bigint;
    purchaseApprovalThresholdKobo: bigint;
    purchaseAmountCeilingKobo: bigint;
    redemptionApprovalThresholdKobo: bigint;
    offlineRedemptionDisabled: boolean;
  }) {
    return {
      defaultEarnRateBps: policy.defaultEarnRateBps,
      minRedemptionKobo: Number(policy.minRedemptionKobo),
      maxRedemptionBasketPercent: policy.maxRedemptionBasketPercent,
      purchaseFlagThresholdKobo: Number(policy.purchaseFlagThresholdKobo),
      purchaseApprovalThresholdKobo: Number(
        policy.purchaseApprovalThresholdKobo,
      ),
      purchaseAmountCeilingKobo: Number(policy.purchaseAmountCeilingKobo),
      redemptionApprovalThresholdKobo: Number(
        policy.redemptionApprovalThresholdKobo,
      ),
      offlineRedemptionDisabled: policy.offlineRedemptionDisabled,
    };
  }

  private serializePolicy(
    policy: {
      id: string | null;
      tenantId: string | null;
      branchId: string;
      version: number;
      defaultEarnRateBps: number;
      minRedemptionKobo: bigint;
      maxRedemptionBasketPercent: number;
      purchaseFlagThresholdKobo: bigint;
      purchaseApprovalThresholdKobo: bigint;
      purchaseAmountCeilingKobo: bigint;
      redemptionApprovalThresholdKobo: bigint;
      offlineRedemptionDisabled: boolean;
    },
    scope: { tenantId: string; branchId: string; branchName: string },
  ) {
    return {
      id: policy.id,
      tenantId: scope.tenantId,
      branchId: scope.branchId,
      branchName: scope.branchName,
      version: policy.version,
      ...this.serializePolicyValues(policy),
    };
  }

  private async isCachedConfigActive(config: PublicConfig) {
    const [tenant, branch] = await Promise.all([
      this.prismaService.tenant.findUnique({
        where: { id: config.tenant.id },
        select: { id: true, status: true },
      }),
      this.prismaService.branch.findUnique({
        where: { id: config.branch.id },
        select: { status: true, tenantId: true },
      }),
    ]);

    return (
      tenant?.status === TenantStatus.ACTIVE &&
      branch?.status === BranchStatus.ACTIVE &&
      branch.tenantId === tenant.id
    );
  }

  private async loadConfig(tenantId: string, branchId: string) {
    const [tenant, branch, policy] = await Promise.all([
      this.prismaService.tenant.findUnique({ where: { id: tenantId } }),
      this.prismaService.branch.findUnique({ where: { id: branchId } }),
      this.prismaService.policyConfiguration.findUnique({
        where: { tenantId_branchId: { tenantId, branchId } },
      }),
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
      policies: this.serializePolicyValues(
        policy ?? this.defaultPolicyValues(),
      ),
    };
  }
}
