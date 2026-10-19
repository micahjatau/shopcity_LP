import { EventEmitter } from 'node:events';
import type { IncomingMessage } from 'node:http';
import type { NextRequest } from 'next/server';
import { request as httpRequest } from 'node:http';

class TestHeaders {
  private readonly values = new Map<string, string>();

  constructor(initial?: Record<string, string> | [string, string][]) {
    const entries = Array.isArray(initial)
      ? initial
      : Object.entries(initial ?? {});
    for (const [name, value] of entries) this.set(name, value);
  }

  set(name: string, value: string): void {
    this.values.set(name.toLowerCase(), value);
  }

  append(name: string, value: string): void {
    const key = name.toLowerCase();
    const existing = this.values.get(key);
    this.values.set(key, existing ? `${existing}, ${value}` : value);
  }

  get(name: string): string | null {
    return this.values.get(name.toLowerCase()) ?? null;
  }

  forEach(callback: (value: string, key: string) => void): void {
    for (const [key, value] of this.values) callback(value, key);
  }

  entries(): IterableIterator<[string, string]> {
    return this.values.entries();
  }
}

class TestResponse {
  readonly headers: TestHeaders;
  readonly status: number;

  constructor(
    _body: Uint8Array | string,
    init: { status: number; headers: TestHeaders | Record<string, string> },
  ) {
    this.status = init.status;
    this.headers =
      init.headers instanceof TestHeaders
        ? init.headers
        : new TestHeaders(init.headers);
  }
}

globalThis.Headers = TestHeaders as unknown as typeof Headers;
globalThis.Response = TestResponse as unknown as typeof Response;
const { POST } =
  require('../app/api/v1/[...path]/route') as typeof import('../app/api/v1/[...path]/route');

jest.mock('node:http', () => ({
  ...jest.requireActual('node:http'),
  request: jest.fn(),
}));

describe('same-origin API proxy device-cookie forwarding', () => {
  it('replaces untrusted request IDs while forwarding cookies/origin and preserving upstream Set-Cookie attributes', async () => {
    const setCookie =
      '__Host-shopcity_pos_device=opaque-token; Path=/; Max-Age=31536000; SameSite=Strict; HttpOnly; Secure';
    let forwardedHeaders: Record<string, string> | undefined;
    jest.mocked(httpRequest).mockImplementation(((_url, options, callback) => {
      forwardedHeaders = options?.headers as Record<string, string>;
      const backendRequest = new EventEmitter() as EventEmitter & {
        setTimeout: jest.Mock;
        write: jest.Mock;
        end: jest.Mock;
      };
      backendRequest.setTimeout = jest.fn();
      backendRequest.write = jest.fn();
      backendRequest.end = jest.fn(() => {
        const response = new EventEmitter() as EventEmitter & {
          statusCode: number;
          headers: Record<string, string | string[]>;
        };
        response.statusCode = 200;
        response.headers = { 'set-cookie': [setCookie] };
        callback?.(response as unknown as IncomingMessage);
        response.emit('data', Buffer.from('{"status":"success"}'));
        response.emit('end');
      });
      return backendRequest as never;
    }) as never);

    const request = {
      nextUrl: { pathname: '/api/v1/auth/login', search: '' },
      method: 'POST',
      headers: new TestHeaders({
        cookie: 'shopcity_csrf=csrf; __Host-shopcity_pos_device=opaque-token',
        origin: 'http://localhost:3000',
        referer: 'http://localhost:3000/login',
        'x-csrf-token': 'csrf',
        'content-type': 'application/json',
        'x-request-id': 'browser-selected-request-id',
      }),
      arrayBuffer: async () => Uint8Array.from(Buffer.from('{}')).buffer,
    } as unknown as NextRequest;
    const response = await POST(request);

    expect(forwardedHeaders).toMatchObject({
      cookie: 'shopcity_csrf=csrf; __Host-shopcity_pos_device=opaque-token',
      origin: 'http://localhost:3000',
      referer: 'http://localhost:3000/login',
      'x-csrf-token': 'csrf',
      'x-shopcity-deployment-environment': 'test',
    });
    expect(forwardedHeaders?.['x-shopcity-bff-token']).toBeUndefined();
    const requestId = forwardedHeaders?.['x-request-id'];
    expect(requestId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(requestId).not.toBe('browser-selected-request-id');
    expect(response.headers.get('x-request-id')).toBe(requestId);
    expect(response.headers.get('set-cookie')).toContain(setCookie);
  });

  it('replaces browser-supplied BFF identity with the server credential', async () => {
    const environmentKeys = [
      'NODE_ENV',
      'VERCEL_ENV',
      'VERCEL_TARGET_ENV',
      'SHOPCITY_DEPLOYMENT_ENV',
      'SHOPCITY_BFF_SHARED_SECRET',
      'SHOPCITY_BACKEND_URL',
      'SHOPCITY_API_BASE_URL',
      'SHOPCITY_WEB_ORIGINS',
    ] as const;
    const originalEnvironment = new Map(
      environmentKeys.map((key) => [key, process.env[key]]),
    );
    const serverSecret = Buffer.alloc(32, 31).toString('base64url');
    process.env.NODE_ENV = 'test';
    process.env.SHOPCITY_DEPLOYMENT_ENV = 'test';
    process.env.SHOPCITY_BFF_SHARED_SECRET = serverSecret;
    for (const key of [
      'VERCEL_ENV',
      'VERCEL_TARGET_ENV',
      'SHOPCITY_BACKEND_URL',
      'SHOPCITY_API_BASE_URL',
      'SHOPCITY_WEB_ORIGINS',
    ]) {
      delete process.env[key];
    }

    let forwardedHeaders: Record<string, string> | undefined;
    jest
      .mocked(httpRequest)
      .mockReset()
      .mockImplementation(((_url, options, callback) => {
        forwardedHeaders = options?.headers as Record<string, string>;
        const backendRequest = new EventEmitter() as EventEmitter & {
          setTimeout: jest.Mock;
          write: jest.Mock;
          end: jest.Mock;
        };
        backendRequest.setTimeout = jest.fn();
        backendRequest.write = jest.fn();
        backendRequest.end = jest.fn(() => {
          const response = new EventEmitter() as EventEmitter & {
            statusCode: number;
            headers: Record<string, string | string[]>;
          };
          response.statusCode = 200;
          response.headers = {};
          callback?.(response as unknown as IncomingMessage);
          response.emit('data', Buffer.from('{}'));
          response.emit('end');
        });
        return backendRequest as never;
      }) as never);

    try {
      const request = {
        nextUrl: { pathname: '/api/v1/auth/login', search: '' },
        method: 'POST',
        headers: new TestHeaders({
          origin: 'http://localhost:3000',
          'x-shopcity-bff-token': 'forged-browser-value',
          'x-shopcity-deployment-environment': 'production',
        }),
        arrayBuffer: async () => new Uint8Array().buffer,
      } as unknown as NextRequest;
      await POST(request);

      expect(forwardedHeaders?.['x-shopcity-bff-token']).toBe(serverSecret);
      expect(forwardedHeaders?.['x-shopcity-deployment-environment']).toBe(
        'test',
      );
      expect(forwardedHeaders?.['x-request-id']).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
    } finally {
      for (const key of environmentKeys) {
        const value = originalEnvironment.get(key);
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }
  });

  it('rejects untrusted auth origins before opening an upstream connection', async () => {
    jest.mocked(httpRequest).mockClear();
    const request = {
      nextUrl: { pathname: '/api/v1/auth/login', search: '' },
      method: 'POST',
      headers: new TestHeaders({ origin: 'https://attacker.example' }),
      arrayBuffer: async () => new Uint8Array().buffer,
    } as unknown as NextRequest;

    const response = await POST(request);

    expect(response.status).toBe(403);
    expect(response.headers.get('x-request-id')).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(jest.mocked(httpRequest)).not.toHaveBeenCalled();
  });
});
