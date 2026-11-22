import {
  Body,
  ConflictException,
  Controller,
  Headers,
  InternalServerErrorException,
  Post,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiExcludeEndpoint } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'node:crypto';
import { PublicRoute } from '../../common/auth/public-route.decorator';
import { ScheduledJobsService } from './scheduled-jobs.service';

interface ScheduledJobRequest {
  flow?: unknown;
  invocationKey?: unknown;
}

@Controller({ path: 'internal/scheduled-jobs', version: '1' })
export class ScheduledJobsController {
  constructor(
    private readonly config: ConfigService,
    private readonly jobs: ScheduledJobsService,
  ) {}

  @PublicRoute()
  @ApiExcludeEndpoint()
  @Post()
  async run(
    @Body() body: ScheduledJobRequest,
    @Headers('authorization') authorization?: string,
    @Headers('x-shopcity-scheduler-environment') requestEnvironment?: string,
  ) {
    const expectedSecret = this.config.get<string>('SCHEDULER_SECRET');
    const expectedEnvironment = this.config
      .get<string>('SCHEDULER_ENVIRONMENT')
      ?.trim();
    const runtimeEnvironment =
      this.config.get<string>('SHOPCITY_DEPLOYMENT_ENV')?.trim() ??
      this.config.get<string>('VERCEL_ENV')?.trim() ??
      this.config.get<string>('NODE_ENV')?.trim();
    if (
      !expectedSecret?.trim() ||
      !expectedEnvironment ||
      !runtimeEnvironment
    ) {
      throw new ServiceUnavailableException(
        'Scheduled processing is not configured.',
      );
    }
    if (!hasValidBearerSecret(authorization, expectedSecret)) {
      throw new UnauthorizedException('Invalid scheduler authorization.');
    }
    if (
      requestEnvironment !== expectedEnvironment ||
      runtimeEnvironment !== expectedEnvironment
    ) {
      throw new UnauthorizedException('Scheduler environment mismatch.');
    }
    if (
      !body ||
      typeof body !== 'object' ||
      Object.keys(body).some(
        (key) => !['flow', 'invocationKey'].includes(key),
      ) ||
      typeof body.flow !== 'string' ||
      !this.jobs.isFlow(body.flow)
    ) {
      throw new UnauthorizedException('Invalid scheduled flow.');
    }
    if (
      typeof body.invocationKey !== 'string' ||
      body.invocationKey.length < 1 ||
      body.invocationKey.length > 120 ||
      !/^[A-Za-z0-9:_-]+$/.test(body.invocationKey)
    ) {
      throw new UnauthorizedException('Invalid scheduled invocation key.');
    }

    const result = await this.jobs.run(body.flow, body.invocationKey);
    if (result.status === 'FAILED') {
      throw new InternalServerErrorException('Scheduled job failed.');
    }
    if (result.status !== 'COMPLETED') {
      throw new ConflictException('Scheduled job is already in progress.');
    }
    return {
      success: result.status === 'COMPLETED',
      flow: result.flow,
      status: result.status,
      startedAt: result.startedAt.toISOString(),
      finishedAt: result.finishedAt?.toISOString() ?? null,
      result: result.result,
      failureCategory: result.failureCategory,
    };
  }
}

function hasValidBearerSecret(
  authorization: string | undefined,
  expectedSecret: string,
): boolean {
  if (!authorization?.startsWith('Bearer ')) return false;
  const supplied = Buffer.from(authorization.slice('Bearer '.length));
  const expected = Buffer.from(expectedSecret);
  return (
    supplied.length === expected.length && timingSafeEqual(supplied, expected)
  );
}
