import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString, IsUUID } from 'class-validator';

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
