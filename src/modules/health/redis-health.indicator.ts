import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
import { createConnection } from 'node:net';

@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  constructor(private readonly configService: ConfigService) {
    super();
  }

  async pingCheck(key: string): Promise<HealthIndicatorResult> {
    const redisUrl = this.configService.get<string>('REDIS_URL');
    if (!redisUrl) {
      throw new Error('REDIS_URL is required for readiness checks');
    }

    const url = new URL(redisUrl);

    await new Promise<void>((resolve, reject) => {
      const socket = createConnection({
        host: url.hostname,
        port: Number(url.port || 6379),
      });

      const timeout = setTimeout(() => {
        socket.destroy();
        reject(new Error('Redis readiness timed out'));
      }, 2000);

      socket.once('connect', () => {
        clearTimeout(timeout);
        socket.end();
        resolve();
      });

      socket.once('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });

      socket.once('close', () => {
        clearTimeout(timeout);
      });
    });

    return this.getStatus(key, true, {
      host: url.hostname,
      port: Number(url.port || 6379),
    });
  }
}
