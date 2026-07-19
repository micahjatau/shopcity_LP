import { Controller, Get, Version, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiHealthIndicator } from './api-health.indicator';
import { PrismaHealthIndicator } from './prisma-health.indicator';
import { RedisHealthIndicator } from './redis-health.indicator';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly prismaHealth: PrismaHealthIndicator,
    private readonly redisHealth: RedisHealthIndicator,
    private readonly apiHealth: ApiHealthIndicator,
  ) {}

  @Get('live')
  @Version(VERSION_NEUTRAL)
  @ApiOperation({
    summary: 'Check liveness',
    description: 'Returns ok when the process is running.',
  })
  @ApiOkResponse({ description: 'Liveness check' })
  async live(): Promise<{ status: string; info: { api: unknown } }> {
    return {
      status: 'ok',
      info: {
        api: await this.apiHealth.pingCheck('api'),
      },
    };
  }

  @Get('ready')
  @Version(VERSION_NEUTRAL)
  @ApiOperation({
    summary: 'Check readiness',
    description: 'Returns ok when the application can reach Postgres and Redis.',
  })
  @ApiOkResponse({ description: 'Readiness check' })
  async ready(): Promise<{
    status: string;
    info: { database: unknown; redis: unknown };
  }> {
    const database = await this.prismaHealth.pingCheck('database');
    const redis = await this.redisHealth.pingCheck('redis');

    return {
      status: 'ok',
      info: {
        database: database.database,
        redis: redis.redis,
      },
    };
  }
}
