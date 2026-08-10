import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsInt,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export class OfflineEarnBatchRecordDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  localId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  idempotencyKey!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  cashierId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsString()
  branchId!: string;

  @ApiProperty()
  @IsString()
  cardBarcode!: string;

  @ApiProperty()
  @IsString()
  receiptNumber!: string;

  @ApiProperty({ example: '2026-07-13' })
  @IsString()
  receiptWeekStart!: string;

  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  purchaseAmountKobo!: number;

  @ApiProperty({ format: 'date-time' })
  @IsDateString()
  occurredAtLocal!: string;
}

export class OfflineEarnBatchRequestDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  deviceId!: string;

  @ApiProperty({ type: [OfflineEarnBatchRecordDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OfflineEarnBatchRecordDto)
  records!: OfflineEarnBatchRecordDto[];
}

export class OfflineEarnBatchRecordResponseDto {
  @ApiProperty({ format: 'uuid' })
  localId!: string;

  @ApiProperty({ enum: ['CONFIRMED', 'PENDING_APPROVAL', 'REJECTED', 'RETRYABLE'] })
  status!: 'CONFIRMED' | 'PENDING_APPROVAL' | 'REJECTED' | 'RETRYABLE';

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  transactionId!: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  approvalId!: string | null;

  @ApiPropertyOptional({ nullable: true })
  creditEarnedKobo!: number | null;

  @ApiPropertyOptional({ nullable: true })
  errorCode!: string | null;

  @ApiProperty()
  retryable!: boolean;
}

export class OfflineEarnBatchResponseDto {
  @ApiProperty({ format: 'uuid' })
  deviceId!: string;

  @ApiProperty({ type: [OfflineEarnBatchRecordResponseDto] })
  records!: OfflineEarnBatchRecordResponseDto[];
}
