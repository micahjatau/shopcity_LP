import { IsOptional, IsString, IsInt, Min, Max } from 'class-validator';

export class CreateBranchDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(6)
  receiptWeekStartDay?: number;
}

export class UpdateBranchDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(6)
  receiptWeekStartDay?: number;
}

export class CreateDeviceDto {
  @IsString()
  branchId!: string;

  @IsString()
  name!: string;

  @IsString()
  fingerprintHash!: string;
}

export class UpdateDeviceDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  status?: string;
}
