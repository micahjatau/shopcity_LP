import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class RedeemTransactionDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  cardSerialNumber!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  posReceiptNumber!: string;

  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  @Max(Number.MAX_SAFE_INTEGER)
  basketAmountKobo!: number;

  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  @Max(Number.MAX_SAFE_INTEGER)
  requestedRedemptionKobo!: number;

  @ApiProperty({ format: 'date-time' })
  @IsDateString()
  occurredAt!: string;
}
