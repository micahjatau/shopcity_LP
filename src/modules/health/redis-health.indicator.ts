import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
import { RedisClientService } from '../../common/redis/redis.client.service';

@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  constructor(private readonly redisClientService: RedisClientService) {
    super();
  }

  async pingCheck(key: string): Promise<HealthIndicatorResult> {
    try {
      await this.redisClientService.ping();

      return this.getStatus(key, true, {
        status: 'up',
      });
    } catch (error) {
      return this.getStatus(key, false, {
        status: 'down',
        message: 'Redis is unavailable',
        error: this.describeError(error),
      });
    }
  }

  private describeError(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    if (typeof error === 'string') {
      return error;
    }

    return '[diagnostic unavailable]';
  }
}
