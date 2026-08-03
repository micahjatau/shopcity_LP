import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsBoolean,
  IsOptional,
  IsString,
  Min,
  Max,
  IsUUID,
} from 'class-validator';
import { DeviceStatus } from '@prisma/client';

export class CreateBranchDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({ minimum: 0, maximum: 6 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(6)
  receiptWeekStartDay?: number;
}

export class UpdateBranchDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({ minimum: 0, maximum: 6 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(6)
  receiptWeekStartDay?: number;
}

export class CreateDeviceDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  @IsString()
  branchId!: string;

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty()
  @IsString()
  fingerprintHash!: string;
}

export class UpdateDeviceDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ enum: DeviceStatus })
  @IsOptional()
  @IsEnum(DeviceStatus)
  status?: DeviceStatus;

  @ApiPropertyOptional({ description: 'Rotate the device attestation secret' })
  @IsOptional()
  @IsBoolean()
  rotateAttestationSecret?: boolean;
}
