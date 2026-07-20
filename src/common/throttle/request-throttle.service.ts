import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { RedisClientService } from '../redis/redis.client.service';

@Injectable()
export class RequestThrottleService {
  constructor(private readonly redisClientService: RedisClientService) {}

  async consume(key: string, limit: number, windowMs: number) {
    let count: number;
    let ttlMs: number;

    try {
      [count, ttlMs] = await this.redisClientService.eval<[number, number]>(
        THROTTLE_SCRIPT,
        [key],
        [windowMs],
      );
    } catch {
      throw new ServiceUnavailableException('Redis throttling is unavailable');
    }

    const remaining = Math.max(0, limit - count);

    return {
      allowed: count <= limit,
      count,
      remaining,
      resetAt: new Date(Date.now() + Math.max(0, ttlMs)),
    };
  }
}

const THROTTLE_SCRIPT = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
end
local ttl = redis.call('PTTL', KEYS[1])
return {count, ttl}
`;
