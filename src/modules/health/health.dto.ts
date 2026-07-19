import { ApiProperty } from '@nestjs/swagger';

export class HealthOkDto {
  @ApiProperty({ example: 'ok' })
  status!: 'ok';

  @ApiProperty({ type: 'object', additionalProperties: true })
  info!: { api: unknown };
}

export class HealthReadyDto {
  @ApiProperty({ example: 'ok' })
  status!: 'ok';

  @ApiProperty({ type: 'object', additionalProperties: true })
  info!: { database: unknown; redis: unknown };
}
