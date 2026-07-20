import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createConnection } from 'node:net';

@Injectable()
export class RequestThrottleService {
  constructor(private readonly configService: ConfigService) {}

  async consume(key: string, limit: number, windowMs: number) {
    const redisUrl = this.configService.get<string>('REDIS_URL');
    if (!redisUrl) {
      throw new ServiceUnavailableException('Redis throttling is unavailable');
    }

    let count: number;
    let ttlMs: number;

    try {
      [count, ttlMs] = await evalThrottleScript(redisUrl, key, windowMs);
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

async function evalThrottleScript(
  redisUrl: string,
  key: string,
  windowMs: number,
): Promise<[number, number]> {
  const url = new URL(redisUrl);
  const payload = encodeCommand('EVAL', [THROTTLE_SCRIPT, 1, key, windowMs]);

  return new Promise<[number, number]>((resolve, reject) => {
    const socket = createConnection({
      host: url.hostname,
      port: Number(url.port || 6379),
    });

    const timeout = setTimeout(() => {
      socket.destroy();
      reject(new Error('Redis throttling timed out'));
    }, 2000);

    let responseBuffer = Buffer.alloc(0);

    socket.once('connect', () => {
      socket.write(payload);
    });

    socket.on('data', (chunk) => {
      responseBuffer = Buffer.concat([responseBuffer, chunk]);
      try {
        const parsed = parseRedisReply(responseBuffer);
        if (!parsed) {
          return;
        }

        clearTimeout(timeout);
        socket.end();

        if (!Array.isArray(parsed.value) || parsed.value.length < 2) {
          reject(new Error('Redis throttling failed'));
          return;
        }

        resolve([toInteger(parsed.value[0]), toInteger(parsed.value[1])]);
      } catch (error) {
        clearTimeout(timeout);
        socket.destroy();
        reject(
          error instanceof Error ? error : new Error('Redis throttling failed'),
        );
      }
    });

    socket.once('error', () => {
      clearTimeout(timeout);
      reject(new Error('Redis throttling is unavailable'));
    });

    socket.once('close', () => {
      clearTimeout(timeout);
    });
  });
}

function encodeCommand(command: string, args: Array<string | number>): Buffer {
  const parts = [command, ...args.map((value) => String(value))];
  const chunks = [`*${parts.length}\r\n`];

  for (const part of parts) {
    chunks.push(`$${Buffer.byteLength(part)}\r\n${part}\r\n`);
  }

  return Buffer.from(chunks.join(''), 'utf8');
}

function parseRedisReply(
  buffer: Buffer,
): { value: unknown; bytesRead: number } | null {
  if (buffer.length === 0) {
    return null;
  }

  const prefix = String.fromCharCode(buffer[0]);
  switch (prefix) {
    case '+':
    case '-':
    case ':': {
      const end = buffer.indexOf('\r\n');
      if (end === -1) {
        return null;
      }

      const payload = buffer.subarray(1, end).toString('utf8');
      if (prefix === ':') {
        return { value: Number(payload), bytesRead: end + 2 };
      }

      if (prefix === '-') {
        throw new Error(payload);
      }

      return { value: payload, bytesRead: end + 2 };
    }
    case '$': {
      const headerEnd = buffer.indexOf('\r\n');
      if (headerEnd === -1) {
        return null;
      }

      const size = Number(buffer.subarray(1, headerEnd).toString('utf8'));
      if (size === -1) {
        return { value: null, bytesRead: headerEnd + 2 };
      }

      const bodyStart = headerEnd + 2;
      const bodyEnd = bodyStart + size;
      if (buffer.length < bodyEnd + 2) {
        return null;
      }

      return {
        value: buffer.subarray(bodyStart, bodyEnd).toString('utf8'),
        bytesRead: bodyEnd + 2,
      };
    }
    case '*': {
      const headerEnd = buffer.indexOf('\r\n');
      if (headerEnd === -1) {
        return null;
      }

      const count = Number(buffer.subarray(1, headerEnd).toString('utf8'));
      let offset = headerEnd + 2;
      const values: unknown[] = [];

      for (let index = 0; index < count; index += 1) {
        const parsed = parseRedisReply(buffer.subarray(offset));
        if (!parsed) {
          return null;
        }

        values.push(parsed.value);
        offset += parsed.bytesRead;
      }

      return { value: values, bytesRead: offset };
    }
    default:
      return null;
  }
}

function toInteger(value: unknown): number {
  if (typeof value === 'number') {
    return value;
  }

  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    throw new Error('Invalid Redis integer response');
  }

  return parsed;
}

const THROTTLE_SCRIPT = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
end
local ttl = redis.call('PTTL', KEYS[1])
return {count, ttl}
`;
