import {
  Controller,
  Get,
  Logger,
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
  private readonly logger = new Logger(HealthController.name);

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
      this.logger.warn(
        `Readiness check failed: ${this.describeReadinessFailure(error)}`,
      );

      if (error instanceof ServiceUnavailableException) {
        throw error;
      }

      throw new ServiceUnavailableException({
        message: 'Readiness check failed',
        error: 'Readiness check failed',
      });
    }
  }

  private describeReadinessFailure(error: unknown): string {
    if (error instanceof ServiceUnavailableException) {
      return this.describeServiceUnavailable(error);
    }

    if (this.hasHealthCheckCauses(error)) {
      return Object.entries(error.causes)
        .map(([name, cause]) => `${name}=${this.describeCause(cause)}`)
        .join(', ');
    }

    if (error instanceof Error) {
      return error.message;
    }

    if (error === null || error === undefined) {
      return String(error);
    }

    if (typeof error === 'string' || typeof error === 'number') {
      return String(error);
    }

    return '[diagnostic unavailable]';
  }

  private describeServiceUnavailable(
    error: ServiceUnavailableException,
  ): string {
    const response = error.getResponse();
    if (!this.isReadinessPayload(response)) {
      return error.message;
    }

    const parts: string[] = [];
    if (this.isHealthRecord(response.error)) {
      parts.push(...this.describeHealthRecord(response.error));
    }

    if (this.isHealthRecord(response.details)) {
      parts.push(...this.describeHealthRecord(response.details));
    }

    return parts.length > 0 ? parts.join(', ') : error.message;
  }

  private describeHealthRecord(record: Record<string, unknown>): string[] {
    return Object.entries(record).map(
      ([name, cause]) => `${name}=${this.describeCause(cause)}`,
    );
  }

  private describeCause(cause: unknown): string {
    if (cause === null) {
      return 'null';
    }

    if (cause === undefined) {
      return 'undefined';
    }

    if (typeof cause === 'string') {
      return cause;
    }

    if (
      typeof cause === 'number' ||
      typeof cause === 'boolean' ||
      typeof cause === 'bigint'
    ) {
      return cause.toString();
    }

    if (typeof cause === 'symbol') {
      return cause.description ?? 'symbol';
    }

    if (typeof cause !== 'object') {
      return '[diagnostic available]';
    }

    const record = cause as Record<string, unknown>;
    const details: string[] = [];

    if (typeof record.status === 'string') {
      details.push(`status=${record.status}`);
    }

    if (typeof record.message === 'string') {
      details.push(`message=${record.message}`);
    }

    if (typeof record.error === 'string') {
      details.push(`error=${record.error}`);
    }

    return details.length > 0 ? details.join(' ') : '[diagnostic available]';
  }

  private hasHealthCheckCauses(
    error: unknown,
  ): error is { causes: Record<string, unknown> } {
    return (
      typeof error === 'object' &&
      error !== null &&
      'causes' in error &&
      typeof (error as { causes?: unknown }).causes === 'object' &&
      (error as { causes?: unknown }).causes !== null
    );
  }

  private isHealthRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }

  private isReadinessPayload(response: unknown): response is {
    error?: Record<string, unknown>;
    details?: Record<string, unknown>;
  } {
    return (
      typeof response === 'object' &&
      response !== null &&
      ('error' in response || 'details' in response)
    );
  }
}
