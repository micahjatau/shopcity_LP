import { Buffer } from 'node:buffer';
import { randomUUID } from 'node:crypto';
import type { IncomingMessage } from 'node:http';
import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import type { NextRequest } from 'next/server';
import {
  isTrustedShopcityBrowserOrigin,
  requiresShopcityBffIdentity,
  resolveShopcityBackendBaseUrl,
  resolveShopcityBffHeaders,
} from '../../../../lib/api-proxy-security';

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
  const method = request.method.toUpperCase();
  const path = request.nextUrl.pathname;
  const requestId = randomUUID();
  const backendBaseUrl = resolveShopcityBackendBaseUrl(process.env);
  if (!backendBaseUrl) {
    return proxyFailure(
      request,
      503,
      'BACKEND_UNAVAILABLE',
      'The ShopCity API is temporarily unavailable.',
      requestId,
    );
  }

  const requiresBff = requiresShopcityBffIdentity(path, method);
  if (
    requiresBff &&
    !isTrustedShopcityBrowserOrigin(
      request.headers.get('origin'),
      request.headers.get('referer'),
      process.env,
    )
  ) {
    return proxyFailure(
      request,
      403,
      'AUTH_ORIGIN_REJECTED',
      'Unable to sign in. Check your credentials or contact your administrator.',
      requestId,
    );
  }

  const bffHeaders = requiresBff
    ? resolveShopcityBffHeaders(process.env)
    : null;
  if (requiresBff && !bffHeaders) {
    return proxyFailure(
      request,
      503,
      'BFF_CONFIGURATION_INVALID',
      'The ShopCity sign-in service is temporarily unavailable.',
      requestId,
    );
  }

  const backendUrl = new URL(
    request.nextUrl.pathname + request.nextUrl.search,
    backendBaseUrl,
  );
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
  for (const [name, value] of Object.entries(bffHeaders ?? {})) {
    headers.set(name, value);
  }
  headers.set('x-request-id', requestId);
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
      requestId,
      code,
      method,
      path: request.nextUrl.pathname,
    });
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          statusCode: 502,
          code: 'BACKEND_UNAVAILABLE',
          message: 'The ShopCity API is temporarily unavailable.',
        },
        meta: {
          timestamp: new Date().toISOString(),
          path: request.nextUrl.pathname,
          requestId,
        },
      }),
      {
        status: 502,
        headers: {
          'content-type': 'application/json',
          'cache-control': 'no-store',
          'x-request-id': requestId,
        },
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

  // API resources include mutable tenant state; prevent Vercel rewrite caching
  // from serving stale customer, balance, or transaction data after a mutation.
  responseHeaders.set('cache-control', 'no-store, no-cache, max-age=0');
  responseHeaders.set('x-request-id', requestId);

  return new Response(new Uint8Array(response.body), {
    status: response.status,
    headers: responseHeaders,
  });
}

function proxyFailure(
  request: NextRequest,
  statusCode: number,
  code: string,
  message: string,
  requestId: string,
): Response {
  console.warn('ShopCity BFF request rejected', {
    requestId,
    statusCode,
    code,
    path: request.nextUrl.pathname,
  });
  return new Response(
    JSON.stringify({
      success: false,
      error: { statusCode, code, message },
      meta: {
        timestamp: new Date().toISOString(),
        path: request.nextUrl.pathname,
        requestId,
      },
    }),
    {
      status: statusCode,
      headers: {
        'content-type': 'application/json',
        'cache-control': 'no-store',
        'x-request-id': requestId,
      },
    },
  );
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
