import { Injectable, OnModuleDestroy, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from 'redis';

@Injectable()
export class RedisClientService implements OnModuleDestroy {
  private clientPromise?: Promise<any>;

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
    const client = await this.clientPromise;
    if (client?.isOpen) {
      await client.quit();
    }
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

  private async connectClient(): Promise<any> {
    const redisUrl = this.configService.get<string>('REDIS_URL');
    if (!redisUrl) {
      throw new ServiceUnavailableException('Redis is unavailable');
    }

    const client = createClient({
      url: redisUrl,
      socket: {
        connectTimeout: 2_000,
        reconnectStrategy: () => false,
      },
    });

    client.on('error', () => undefined);
    await client.connect();
    return client as any;
  }
}
