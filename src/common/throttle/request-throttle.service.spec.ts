import { createServer } from 'node:net';
import type { AddressInfo } from 'node:net';
import { ConfigService } from '@nestjs/config';
import { RequestThrottleService } from './request-throttle.service';

describe('RequestThrottleService', () => {
  it('uses Redis-backed counters for throttling decisions', async () => {
    const commands: string[] = [];
    let requestCount = 0;
    const server = createServer((socket) => {
      socket.on('data', (chunk) => {
        commands.push(chunk.toString('utf8'));
        requestCount += 1;
        socket.write(
          requestCount === 1
            ? '*2\r\n:1\r\n:15000\r\n'
            : '*2\r\n:2\r\n:14999\r\n',
        );
        socket.end();
      });
    });

    await new Promise<void>((resolve) => server.listen(0, resolve));
    const address = server.address();
    if (!isAddressInfo(address)) {
      throw new Error('Test server did not bind a port');
    }

    const service = new RequestThrottleService({
      get: (key: string) =>
        key === 'REDIS_URL' ? `redis://127.0.0.1:${address.port}` : undefined,
    } as ConfigService);

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
    expect(commands[0]).toContain('EVAL');
    expect(commands[0]).toContain('auth.login:bucket');
    expect(commands[0]).toContain('15000');

    await new Promise<void>((resolve) => server.close(() => resolve()));
  });
});

function isAddressInfo(
  address: string | AddressInfo | null,
): address is AddressInfo {
  return Boolean(address && typeof address !== 'string');
}
