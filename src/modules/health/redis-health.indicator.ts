import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
import { RedisClientService } from '../../common/redis/redis.client.service';

@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  constructor(private readonly redisClientService: RedisClientService) {
    super();
  }

  async pingCheck(key: string): Promise<HealthIndicatorResult> {
    await this.redisClientService.ping();

    return this.getStatus(key, true, {
      status: 'up',
    });
  }
}
