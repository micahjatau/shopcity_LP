import { Injectable, Logger, OnModuleDestroy, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, type RedisClientType } from 'redis';

@Injectable()
export class RedisClientService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisClientService.name);
  private clientPromise?: Promise<RedisClientType>;

  constructor(private readonly configService: ConfigService) {}

  async ping(): Promise<string> {
    const client = await this.getClient();
    return client.ping();
  }

  async eval<T>(
    script: string,
    keys: string[],
    args: Array<string | number>,
  ): Promise<T> {
    const client = await this.getClient();
    return client.eval(script, {
      keys,
      arguments: args.map((value) => String(value)),
    }) as Promise<T>;
  }

  async onModuleDestroy(): Promise<void> {
    const client = await this.clientPromise?.catch(() => undefined);
    if (client?.isOpen) {
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

  private async connectClient(): Promise<RedisClientType> {
    const redisUrl = this.configService.get<string>('REDIS_URL');
    if (!redisUrl) {
      throw new ServiceUnavailableException('Redis is unavailable');
    }

    const client = createClient({
      url: redisUrl,
      socket: {
        connectTimeout: 2_000,
        reconnectStrategy: this.reconnectStrategy(),
      },
    });

    client.on('error', (error) => {
      this.logger.error('Redis client error', error instanceof Error ? error.stack : String(error));
    });
    client.on('reconnecting', (delay) => {
      this.logger.warn(`Redis reconnecting in ${delay}ms`);
    });
    client.on('end', () => {
      this.logger.warn('Redis connection ended');
      this.clientPromise = undefined;
    });

    try {
      await client.connect();
      this.logger.log('Redis client connected');
      return client;
    } catch (error) {
      await client.disconnect().catch(() => undefined);
      this.logger.error(
        'Redis connection failed during startup',
        error instanceof Error ? error.stack : String(error),
      );
      this.clientPromise = undefined;
      throw new ServiceUnavailableException('Redis is unavailable');
    }
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
