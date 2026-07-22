import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class EarnTransactionDto {
  @ApiProperty()
  @IsString()
  posReceiptNumber!: string;

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

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  overrideReason?: string;
}

export class ApprovalDecisionDto {
  @ApiProperty({ enum: ['APPROVED', 'REJECTED'] })
  @IsIn(['APPROVED', 'REJECTED'])
  decision!: 'APPROVED' | 'REJECTED';

  @ApiProperty()
  @IsString()
  reason!: string;
}
