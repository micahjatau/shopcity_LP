import { ConfigService } from '@nestjs/config';
import { Redis as UpstashRedis } from '@upstash/redis';
import { createClient } from 'redis';
import { RedisClientService } from './redis.client.service';

jest.mock('@upstash/redis', () => ({
  Redis: jest.fn(),
}));

jest.mock('redis', () => ({
  createClient: jest.fn(),
}));

describe('RedisClientService', () => {
  const createClientMock = createClient as unknown as jest.Mock;
  const upstashRedisMock = UpstashRedis as unknown as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('prefers Upstash REST when both REST credentials and REDIS_URL exist', async () => {
    const nodeClient = makeNodeRedisClient();
    createClientMock.mockReturnValue(nodeClient);
    upstashRedisMock.mockImplementation(() => makeUpstashRedisClient());

    const service = new RedisClientService(
      makeConfigService({
        REDIS_URL: 'rediss://default:token@apt-bull-182127.upstash.io:6379',
        UPSTASH_REDIS_REST_URL: 'https://example.upstash.io',
        UPSTASH_REDIS_REST_TOKEN: 'rest-token',
      }),
    );

    await expect(service.ping()).resolves.toBe('PONG');

    expect(upstashRedisMock).toHaveBeenCalledWith({
      url: 'https://example.upstash.io',
      token: 'rest-token',
    });
    expect(createClientMock).not.toHaveBeenCalled();
  });

  it('falls back to the Upstash REST integration when REDIS_URL is local', async () => {
    const upstashClient = makeUpstashRedisClient();
    upstashRedisMock.mockImplementation(() => upstashClient);

    const service = new RedisClientService(
      makeConfigService({
        REDIS_URL: 'redis://127.0.0.1:6379',
        UPSTASH_REDIS_REST_URL: 'https://example.upstash.io',
        UPSTASH_REDIS_REST_TOKEN: 'rest-token',
      }),
    );

    await expect(service.ping()).resolves.toBe('PONG');

    expect(upstashRedisMock).toHaveBeenCalledWith({
      url: 'https://example.upstash.io',
      token: 'rest-token',
    });
    expect(createClientMock).not.toHaveBeenCalled();
  });

  it('uses a local REDIS_URL when no hosted integration exists', async () => {
    const nodeClient = makeNodeRedisClient();
    createClientMock.mockReturnValue(nodeClient);

    const service = new RedisClientService(
      makeConfigService({
        REDIS_URL: 'redis://localhost:6379',
      }),
    );

    await expect(service.ping()).resolves.toBe('PONG');

    expect(createClientMock).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'redis://localhost:6379',
      }),
    );
  });
});

function makeConfigService(env: Record<string, string>) {
  return {
    get: jest.fn((key: string) => env[key]),
  } as unknown as ConfigService;
}

function makeNodeRedisClient() {
  return {
    connect: jest.fn().mockResolvedValue(undefined),
    ping: jest.fn().mockResolvedValue('PONG'),
    eval: jest.fn().mockResolvedValue('OK'),
    quit: jest.fn().mockResolvedValue('OK'),
    disconnect: jest.fn().mockResolvedValue(undefined),
    on: jest.fn(),
  };
}

function makeUpstashRedisClient() {
  return {
    ping: jest.fn().mockResolvedValue('PONG'),
    eval: jest.fn().mockResolvedValue('OK'),
    quit: jest.fn().mockResolvedValue(undefined),
  };
}
