import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString, IsUUID } from 'class-validator';

export class CreateCardDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  @IsString()
  customerId!: string;

  @ApiProperty()
  @IsString()
  barcodeValue!: string;
}

export class ReplaceCardDto {
  @ApiProperty()
  @IsString()
  barcodeValue!: string;
}

export class UpdateCardStatusDto {
  @ApiProperty({ enum: ['ACTIVE', 'BLOCKED'] })
  @IsIn(['ACTIVE', 'BLOCKED'])
  status!: 'ACTIVE' | 'BLOCKED';
}
