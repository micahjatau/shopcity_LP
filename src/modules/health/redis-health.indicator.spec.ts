import { createServer } from 'node:net';
import type { AddressInfo } from 'node:net';
import { ConfigService } from '@nestjs/config';
import { RedisHealthIndicator } from './redis-health.indicator';

describe('RedisHealthIndicator', () => {
  it('issues a Redis PING', async () => {
    const chunks: Buffer[] = [];
    const server = createServer((socket) => {
      socket.on('data', (chunk) => {
        chunks.push(chunk);
        socket.write('+PONG\r\n');
      });
    });

    await new Promise<void>((resolve) => server.listen(0, resolve));
    const address = server.address();
    if (!isAddressInfo(address)) {
      throw new Error('Test server did not bind a port');
    }

    const indicator = new RedisHealthIndicator({
      get: (key: string) =>
        key === 'REDIS_URL' ? `redis://127.0.0.1:${address.port}` : undefined,
    } as ConfigService);

    const result = await indicator.pingCheck('redis');
    expect(result.redis.status).toBe('up');

    await new Promise<void>((resolve) => server.close(() => resolve()));
    expect(Buffer.concat(chunks).toString('utf8')).toContain('PING');
  });
});

function isAddressInfo(
  address: string | AddressInfo | null,
): address is AddressInfo {
  return Boolean(address && typeof address !== 'string');
}
