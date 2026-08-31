import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { Buffer } from 'node:buffer';
import type { IncomingMessage } from 'node:http';
import type { NextRequest } from 'next/server';

const BACKEND_BASE_URL =
  process.env.SHOPCITY_BACKEND_URL ??
  process.env.SHOPCITY_API_BASE_URL ??
  'http://127.0.0.1:3000';

const BACKEND_REQUEST_TIMEOUT_MS = 10000;

const FORWARDED_HEADERS = new Set([
  'accept',
  'accept-language',
  'authorization',
  'content-type',
  'cookie',
  'idempotency-key',
  'origin',
  'referer',
  'user-agent',
  'x-csrf-token',
  'x-device-attestation',
  'x-device-id',
  'x-smoke-session-bootstrap-secret',
]);

export const runtime = 'nodejs';

async function proxyRequest(request: NextRequest) {
  const backendUrl = new URL(
    request.nextUrl.pathname + request.nextUrl.search,
    BACKEND_BASE_URL,
  );
  const method = request.method.toUpperCase();
  const body =
    method === 'GET' || method === 'HEAD'
      ? undefined
      : Buffer.from(await request.arrayBuffer());

  const headers = new Headers();
  request.headers.forEach((value, key) => {
    if (FORWARDED_HEADERS.has(key.toLowerCase())) {
      headers.set(key, value);
    }
  });
  headers.set('accept', headers.get('accept') ?? 'application/json');

  const transport =
    backendUrl.protocol === 'https:' ? httpsRequest : httpRequest;

  let response: {
    status: number;
    headers: Record<string, string | string[] | undefined>;
    body: Buffer;
  };

  try {
    response = await new Promise<{
      status: number;
      headers: Record<string, string | string[] | undefined>;
      body: Buffer;
    }>((resolve, reject) => {
      const backendRequest = transport(
        backendUrl,
        {
          method,
          headers: Object.fromEntries(headers.entries()),
        },
        (backendResponse: IncomingMessage) => {
          const chunks: Buffer[] = [];
          backendResponse.on('data', (chunk) => {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
          });
          backendResponse.on('end', () => {
            resolve({
              status: backendResponse.statusCode ?? 502,
              headers: backendResponse.headers,
              body: Buffer.concat(chunks),
            });
          });
        },
      );

      backendRequest.setTimeout(BACKEND_REQUEST_TIMEOUT_MS, () => {
        backendRequest.destroy(
          Object.assign(new Error('Backend request timed out'), {
            code: 'ETIMEDOUT',
          }),
        );
      });
      backendRequest.on('error', reject);
      if (body?.length) {
        backendRequest.write(body);
      }
      backendRequest.end();
    });
  } catch (error) {
    const code =
      error && typeof error === 'object' && 'code' in error
        ? String(error.code)
        : 'BACKEND_PROXY_ERROR';
    console.error('ShopCity backend proxy failed', {
      code,
      method,
      path: request.nextUrl.pathname,
    });
    return new Response(
      JSON.stringify({
        status: 'error',
        code: 'BACKEND_UNAVAILABLE',
        message: 'The ShopCity API is temporarily unavailable.',
      }),
      {
        status: 502,
        headers: { 'content-type': 'application/json' },
      },
    );
  }

  const responseHeaders = new Headers();
  for (const [key, value] of Object.entries(response.headers)) {
    if (value === undefined || key.toLowerCase() === 'transfer-encoding') {
      continue;
    }

    if (Array.isArray(value)) {
      for (const entry of value) {
        responseHeaders.append(key, entry);
      }
    } else {
      responseHeaders.set(key, value);
    }
  }

  return new Response(new Uint8Array(response.body), {
    status: response.status,
    headers: responseHeaders,
  });
}

export async function GET(request: NextRequest) {
  return proxyRequest(request);
}

export async function POST(request: NextRequest) {
  return proxyRequest(request);
}

export async function PUT(request: NextRequest) {
  return proxyRequest(request);
}

export async function PATCH(request: NextRequest) {
  return proxyRequest(request);
}

export async function DELETE(request: NextRequest) {
  return proxyRequest(request);
}

export async function OPTIONS(request: NextRequest) {
  return proxyRequest(request);
}

export async function HEAD(request: NextRequest) {
  return proxyRequest(request);
}
