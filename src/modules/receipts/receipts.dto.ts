import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class CaptureReceiptDto {
  @ApiProperty()
  @IsString()
  posReceiptNumber!: string;

  @ApiProperty()
  @IsString()
  cardSerialNumber!: string;

  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  @Max(Number.MAX_SAFE_INTEGER)
  purchaseAmountKobo!: number;

  @ApiProperty({ format: 'date-time' })
  @IsDateString()
  occurredAt!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  deviceId!: string;

  @ApiPropertyOptional({ minLength: 1 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  overrideReason?: string;
}
