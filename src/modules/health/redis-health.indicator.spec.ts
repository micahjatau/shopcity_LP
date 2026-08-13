import { RedisHealthIndicator } from './redis-health.indicator';
import { RedisClientService } from '../../common/redis/redis.client.service';

describe('RedisHealthIndicator', () => {
  it('issues a Redis PING', async () => {
    const pingMock = jest.fn().mockResolvedValue('PONG');
    const redisClientService = {
      ping: pingMock,
    } as unknown as RedisClientService;
    const indicator = new RedisHealthIndicator(redisClientService);

    const result = await indicator.pingCheck('redis');

    expect(pingMock).toHaveBeenCalledTimes(1);
    expect(result.redis.status).toBe('up');
  });

  it('reports redis unavailability when ping fails', async () => {
    const pingMock = jest.fn().mockRejectedValue(new Error('redis offline'));
    const redisClientService = {
      ping: pingMock,
    } as unknown as RedisClientService;
    const indicator = new RedisHealthIndicator(redisClientService);

    const result = await indicator.pingCheck('redis');

    expect(result.redis.status).toBe('down');
    expect(result.redis.message).toBe('Redis is unavailable');
    expect(result.redis.error).toBe('redis offline');
  });
});
