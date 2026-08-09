import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateAdjustmentDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  customerId!: string;

  @ApiProperty({ enum: ['CREDIT', 'DEBIT'] })
  @IsIn(['CREDIT', 'DEBIT'])
  kind!: 'CREDIT' | 'DEBIT';

  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  @Max(Number.MAX_SAFE_INTEGER)
  amountKobo!: number;

  @ApiProperty({ maxLength: 500 })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  reason!: string;

  @ApiProperty({ format: 'date-time', required: false })
  @IsDateString()
  effectiveAt?: string;
}
