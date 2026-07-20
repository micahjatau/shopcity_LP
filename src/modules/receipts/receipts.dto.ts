import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CaptureReceiptDto {
  @ApiProperty({ format: 'uuid' })
  @IsString()
  branchId!: string;

  @ApiProperty()
  @IsString()
  cardSerialNumber!: string;

  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  purchaseAmountKobo!: number;

  @ApiProperty({ format: 'date-time' })
  @IsDateString()
  occurredAt!: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  deviceId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  externalReceiptNumber?: string;
}
