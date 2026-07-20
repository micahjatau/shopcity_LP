import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsInt, IsString, IsUUID, Min } from 'class-validator';

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
  purchaseAmountKobo!: number;

  @ApiProperty({ format: 'date-time' })
  @IsDateString()
  occurredAt!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  deviceId!: string;
}
