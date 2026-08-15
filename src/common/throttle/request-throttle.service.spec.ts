import { RequestThrottleService } from './request-throttle.service';
import { RedisClientService } from '../redis/redis.client.service';

describe('RequestThrottleService', () => {
  it('uses Redis-backed counters for throttling decisions', async () => {
    const evalMock = jest
      .fn()
      .mockResolvedValueOnce([1, 15_000])
      .mockResolvedValueOnce([2, 14_999]);
    const redisClientService = {
      eval: evalMock,
    } as unknown as RedisClientService;
    const service = new RequestThrottleService(redisClientService);

    const allowed = await service.consume('auth.login:bucket', 1, 15_000);
    const blocked = await service.consume('auth.login:bucket', 1, 15_000);

    expect(allowed).toMatchObject({
      allowed: true,
      count: 1,
      remaining: 0,
    });
    expect(allowed.resetAt).toBeInstanceOf(Date);
    expect(blocked).toMatchObject({
      allowed: false,
      count: 2,
      remaining: 0,
    });
    expect(evalMock).toHaveBeenNthCalledWith(
      1,
      expect.any(String),
      ['auth.login:bucket'],
      [15_000],
    );
    expect(evalMock).toHaveBeenNthCalledWith(
      2,
      expect.any(String),
      ['auth.login:bucket'],
      [15_000],
    );
  });

  it('allows requests when Redis throttling is unavailable', async () => {
    const redisClientService = {
      eval: jest.fn().mockRejectedValue(new Error('redis down')),
    } as unknown as RedisClientService;
    const service = new RequestThrottleService(redisClientService);

    const result = await service.consume('auth.login:bucket', 3, 15_000);

    expect(result).toMatchObject({
      allowed: true,
      count: 0,
      remaining: 3,
    });
    expect(result.resetAt).toBeInstanceOf(Date);
  });
});
