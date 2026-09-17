import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsUUID, Max, Min } from 'class-validator';

const MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER;

export class GetPolicyConfigurationDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  branchId!: string;
}

export class UpdatePolicyConfigurationDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  branchId!: string;

  @ApiProperty({ minimum: 0, maximum: 10000 })
  @IsInt()
  @Min(0)
  @Max(10000)
  defaultEarnRateBps!: number;

  @ApiProperty({ minimum: 1, maximum: MAX_SAFE_INTEGER })
  @IsInt()
  @Min(1)
  @Max(MAX_SAFE_INTEGER)
  minRedemptionKobo!: number;

  @ApiProperty({ minimum: 1, maximum: 100 })
  @IsInt()
  @Min(1)
  @Max(100)
  maxRedemptionBasketPercent!: number;

  @ApiProperty({ minimum: 0, maximum: MAX_SAFE_INTEGER })
  @IsInt()
  @Min(0)
  @Max(MAX_SAFE_INTEGER)
  purchaseFlagThresholdKobo!: number;

  @ApiProperty({ minimum: 0, maximum: MAX_SAFE_INTEGER })
  @IsInt()
  @Min(0)
  @Max(MAX_SAFE_INTEGER)
  purchaseApprovalThresholdKobo!: number;

  @ApiProperty({ minimum: 0, maximum: MAX_SAFE_INTEGER })
  @IsInt()
  @Min(0)
  @Max(MAX_SAFE_INTEGER)
  purchaseAmountCeilingKobo!: number;

  @ApiProperty({ minimum: 1, maximum: MAX_SAFE_INTEGER })
  @IsInt()
  @Min(1)
  @Max(MAX_SAFE_INTEGER)
  redemptionApprovalThresholdKobo!: number;

  @ApiProperty()
  @IsBoolean()
  offlineRedemptionDisabled!: boolean;

  @ApiProperty({ minimum: 0 })
  @IsInt()
  @Min(0)
  expectedVersion!: number;
}
