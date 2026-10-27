import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class ListIssuedManagementCardsQueryDto {
  @ApiPropertyOptional({ minimum: 1, maximum: 100 })
  @IsOptional()
  @IsString()
  limit?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({
    maxLength: 120,
    description: 'Card number or owner name search',
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  q?: string;

  @ApiPropertyOptional({ enum: ['ACTIVE', 'BLOCKED', 'REPLACED'] })
  @IsOptional()
  @IsIn(['ACTIVE', 'BLOCKED', 'REPLACED'])
  status?: 'ACTIVE' | 'BLOCKED' | 'REPLACED';

  @ApiPropertyOptional({ format: 'date', example: '2026-10-01' })
  @IsOptional()
  @IsDateString({ strict: true })
  issuedFrom?: string;

  @ApiPropertyOptional({ format: 'date', example: '2026-10-31' })
  @IsOptional()
  @IsDateString({ strict: true })
  issuedTo?: string;
}

export class CreateCardDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  @IsString()
  customerId!: string;

  @ApiProperty({ name: 'serialNumber' })
  @IsString()
  serialNumber!: string;
}

export class ReplaceCardDto {
  @ApiProperty({ name: 'serialNumber' })
  @IsString()
  serialNumber!: string;
}

export class UpdateCardStatusDto {
  @ApiProperty({ enum: ['ACTIVE', 'BLOCKED'] })
  @IsIn(['ACTIVE', 'BLOCKED'])
  status!: 'ACTIVE' | 'BLOCKED';
}
