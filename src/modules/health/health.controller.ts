import {
  Controller,
  Get,
  ServiceUnavailableException,
  Version,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { HealthCheckService } from '@nestjs/terminus';
import { ApiHealthIndicator } from './api-health.indicator';
import { PrismaHealthIndicator } from './prisma-health.indicator';
import { RedisHealthIndicator } from './redis-health.indicator';
import { PublicRoute } from '../../common/auth/public-route.decorator';
import {
  apiErrorEnvelopeResponses,
  apiSuccessEnvelopeResponse,
} from '../../common/openapi-envelope';
import { HealthOkDto, HealthReadyDto } from './health.dto';

@ApiTags('health')
@Controller('health')
@apiErrorEnvelopeResponses()
export class HealthController {
  constructor(
    private readonly healthCheckService: HealthCheckService,
    private readonly prismaHealth: PrismaHealthIndicator,
    private readonly redisHealth: RedisHealthIndicator,
    private readonly apiHealth: ApiHealthIndicator,
  ) {}

  @Get('live')
  @Version(VERSION_NEUTRAL)
  @PublicRoute()
  @apiSuccessEnvelopeResponse({ description: 'Liveness check' })
  @ApiOperation({
    summary: 'Check liveness',
    description: 'Returns ok when the process is running.',
  })
  async live(): Promise<HealthOkDto> {
    const result = await this.healthCheckService.check([
      async () => this.apiHealth.pingCheck('api'),
    ]);
    const info = (result.info ?? {}) as { api?: unknown };

    return {
      status: 'ok',
      info: {
        api: info.api,
      },
    };
  }

  @Get('ready')
  @Version(VERSION_NEUTRAL)
  @PublicRoute()
  @apiSuccessEnvelopeResponse({ description: 'Readiness check' })
  @ApiOperation({
    summary: 'Check readiness',
    description:
      'Returns ok when the application can reach Postgres and Redis.',
  })
  async ready(): Promise<HealthReadyDto> {
    try {
      const result = await this.healthCheckService.check([
        async () => this.prismaHealth.pingCheck('database'),
        async () => this.redisHealth.pingCheck('redis'),
      ]);
      const info = (result.info ?? {}) as {
        database?: unknown;
        redis?: unknown;
      };

      return {
        status: 'ok',
        info: {
          database: info.database,
          redis: info.redis,
        },
      };
    } catch (error) {
      throw new ServiceUnavailableException('Readiness check failed', {
        cause: error as Error,
      });
    }
  }
}
