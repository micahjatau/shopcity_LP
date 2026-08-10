import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString, MinLength } from 'class-validator';

export class FraudFlagDecisionDto {
  @ApiProperty({ enum: ['ACKNOWLEDGED', 'RESOLVED'] })
  @IsIn(['ACKNOWLEDGED', 'RESOLVED'])
  decision!: 'ACKNOWLEDGED' | 'RESOLVED';

  @ApiProperty()
  @IsString()
  @MinLength(1)
  reason!: string;
}
