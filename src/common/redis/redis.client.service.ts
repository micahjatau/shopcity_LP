import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis as UpstashRedis } from '@upstash/redis';
import { createClient } from 'redis';

type RedisAdapter = {
  ping(): Promise<string>;
  eval<T>(
    script: string,
    keys: string[],
    args: Array<string | number>,
  ): Promise<T>;
  quit?(): Promise<void>;
};

@Injectable()
export class RedisClientService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisClientService.name);
  private clientPromise?: Promise<RedisAdapter>;
  private lastConnectionFailure?: string;
  private lastClientError?: string;

  constructor(private readonly configService: ConfigService) {}

  async ping(): Promise<string> {
    try {
      const client = await this.getClient();
      return await client.ping();
    } catch (error) {
      throw new Error(this.describeAvailabilityError(error));
    }
  }

  async eval<T>(
    script: string,
    keys: string[],
    args: Array<string | number>,
  ): Promise<T> {
    try {
      const client = await this.getClient();
      return await client.eval<T>(script, keys, args);
    } catch (error) {
      throw new Error(this.describeAvailabilityError(error));
    }
  }

  async onModuleDestroy(): Promise<void> {
    const client = await this.clientPromise?.catch(() => undefined);
    if (!client) {
      this.clientPromise = undefined;
      return;
    }

    if ('quit' in client && typeof client.quit === 'function') {
      await client.quit();
    }

    this.clientPromise = undefined;
  }

  private async getClient() {
    if (!this.clientPromise) {
      this.clientPromise = this.connectClient().catch((error) => {
        this.clientPromise = undefined;
        throw error;
      });
    }

    return this.clientPromise;
  }

  private async connectClient(): Promise<RedisAdapter> {
    const redisUrl = this.configService.get<string>('REDIS_URL');
    const upstashCredentials = this.getUpstashCredentials();

    if (upstashCredentials) {
      this.logger.log('Redis client using Upstash REST integration');
      this.lastConnectionFailure = undefined;
      return new UpstashRedis(upstashCredentials);
    }

    if (redisUrl) {
      this.logger.log(
        this.isLocalRedisUrl(redisUrl)
          ? 'Redis client using local REDIS_URL'
          : 'Redis client using REDIS_URL',
      );
      this.lastConnectionFailure = undefined;
      return this.connectNodeRedis(redisUrl);
    }

    this.lastConnectionFailure = 'Redis URL is not configured';
    throw new Error(this.lastConnectionFailure);
  }

  private async connectNodeRedis(redisUrl: string): Promise<RedisAdapter> {
    const client = createClient({
      url: redisUrl,
      socket: {
        connectTimeout: 2_000,
        reconnectStrategy: this.reconnectStrategy(),
      },
    });

    client.on('error', (error) => {
      this.lastClientError = `Redis client error: ${this.describeError(error)}`;
      this.logger.error(
        'Redis client error',
        error instanceof Error ? error.stack : String(error),
      );
    });
    client.on('reconnecting', (delay) => {
      this.logger.warn(`Redis reconnecting in ${delay}ms`);
    });
    client.on('end', () => {
      this.lastClientError = this.lastClientError ?? 'Redis connection ended';
      this.logger.warn('Redis connection ended');
      this.clientPromise = undefined;
    });

    try {
      await client.connect();
      this.logger.log('Redis client connected');
      return {
        ping: () => client.ping(),
        eval: async <T>(
          script: string,
          keys: string[],
          args: Array<string | number>,
        ) =>
          (await client.eval(script, {
            keys,
            arguments: args.map((value) => String(value)),
          })) as T,
        quit: async () => {
          await client.quit();
        },
      };
    } catch (error) {
      await client.disconnect().catch(() => undefined);
      this.logger.error(
        'Redis connection failed during startup',
        error instanceof Error ? error.stack : String(error),
      );
      this.clientPromise = undefined;
      this.lastConnectionFailure = `Redis connection failed: ${this.describeError(error)}`;
      throw new Error(this.lastConnectionFailure);
    }
  }

  private isLocalRedisUrl(redisUrl: string): boolean {
    try {
      const url = new URL(redisUrl);
      return ['localhost', '127.0.0.1', '::1', '0.0.0.0'].includes(
        url.hostname,
      );
    } catch {
      return false;
    }
  }

  private getUpstashCredentials(): { url: string; token: string } | undefined {
    const candidates = [
      ['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN'],
      ['UPSTASH_REDIS_REST_API_URL', 'UPSTASH_REDIS_REST_API_TOKEN'],
      ['UPSTASH_KV_REST_API_URL', 'UPSTASH_KV_REST_API_TOKEN'],
      ['KV_REST_API_URL', 'KV_REST_API_TOKEN'],
    ] as const;

    for (const [urlKey, tokenKey] of candidates) {
      const url = this.configService.get<string>(urlKey);
      const token = this.configService.get<string>(tokenKey);
      if (url && token) {
        return { url, token };
      }
    }

    return undefined;
  }

  private describeAvailabilityError(error: unknown): string {
    const message = this.describeError(error);
    return this.lastConnectionFailure ?? this.lastClientError ?? message;
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

  private reconnectStrategy() {
    return (retries: number) => {
      if (retries >= 5) {
        this.logger.warn(`Redis reconnect stopped after ${retries} retries`);
        return false;
      }

      return Math.min(100 * 2 ** retries, 5_000);
    };
  }
}
