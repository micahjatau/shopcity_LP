import {
  Controller,
  Get,
  Headers,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiExcludeEndpoint } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'node:crypto';
import { PublicRoute } from '../../common/auth/public-route.decorator';
import { OutboxProcessingService } from './outbox-processing.service';

@Controller({ path: 'cron/process-outbox', version: '1' })
export class OutboxProcessingCronController {
  constructor(
    private readonly config: ConfigService,
    private readonly processor: OutboxProcessingService,
  ) {}

  @PublicRoute()
  @Get()
  @ApiExcludeEndpoint()
  async run(@Headers('authorization') authorization?: string) {
    const expectedSecret = this.config.get<string>('CRON_SECRET');
    if (!expectedSecret?.trim()) {
      throw new ServiceUnavailableException(
        'Outbox processing schedule is not configured.',
      );
    }
    if (!hasValidBearerSecret(authorization, expectedSecret)) {
      throw new UnauthorizedException('Invalid cron authorization.');
    }

    const result = await this.processor.processBatch();
    return {
      success: result.retried === 0 && result.deadLettered === 0,
      ...result,
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
