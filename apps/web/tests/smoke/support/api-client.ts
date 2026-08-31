import { createHmac, randomUUID } from 'node:crypto';
import {
  request,
  type APIRequestContext,
  type APIResponse,
} from '@playwright/test';
import { CSRF_COOKIE_NAME } from '../../../lib/api/cookies';
import type { SmokeConfig } from '../config';

export type SmokeRole = 'admin' | 'supervisor' | 'cashier';

type SmokeCookie = { name: string; value: string };

type JsonRecord = Record<string, unknown>;

export function csrfHeaderFromCookies(cookies: SmokeCookie[]): string | null {
  return (
    cookies.find((cookie) => cookie.name === CSRF_COOKIE_NAME)?.value ?? null
  );
}

function deviceAttestation(deviceId: string, secret: string): string {
  const timestamp = Date.now();
  const nonce = randomUUID();
  const signature = createHmac('sha256', secret)
    .update(`${deviceId}.${timestamp}.${nonce}`)
    .digest('base64url');
  return `${timestamp}.${nonce}.${signature}`;
}

export class SmokeApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    public readonly detail?: string,
  ) {
    super(
      `Smoke API request failed (${status}): ${code}${detail ? ` (${detail})` : ''}`,
    );
    this.name = 'SmokeApiError';
  }
}

function safeError(
  status: number,
  payload: unknown,
  path?: string,
): SmokeApiError {
  const record =
    payload && typeof payload === 'object' ? (payload as JsonRecord) : {};
  const data =
    record.data && typeof record.data === 'object'
      ? (record.data as JsonRecord)
      : {};
  const error =
    record.error && typeof record.error === 'object'
      ? (record.error as JsonRecord)
      : {};
  const code =
    [record.code, error.code, data.code, record.errorCode].find(
      (value): value is string => typeof value === 'string',
    ) ?? 'UNKNOWN';
  const detail = [error.message, record.message, data.message].find(
    (value): value is string => typeof value === 'string',
  );
  return new SmokeApiError(
    status,
    code,
    path ? `${path}${detail ? `: ${detail}` : ''}` : detail,
  );
}

async function responsePayload(response: APIResponse): Promise<unknown> {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { code: 'INVALID_JSON' };
  }
}

function unwrap(payload: unknown): unknown {
  if (!payload || typeof payload !== 'object') return payload;
  const record = payload as JsonRecord;
  return 'data' in record ? record.data : payload;
}

export interface SmokeApiSession {
  context: APIRequestContext;
  get<T>(path: string): Promise<T>;
  post<T>(path: string, body: unknown, idempotencyKey?: string): Promise<T>;
  patch<T>(path: string, body: unknown, idempotencyKey?: string): Promise<T>;
  dispose(): Promise<void>;
}

export function createSmokeApiSession(
  context: APIRequestContext,
  smokeRunId: string,
): SmokeApiSession {
  async function send<T>(
    method: 'GET' | 'POST' | 'PATCH',
    path: string,
    body?: unknown,
    idempotencyKey?: string,
  ): Promise<T> {
    const cookies = (await context.storageState()).cookies;
    const csrf = csrfHeaderFromCookies(cookies);
    const response = await context.fetch(path, {
      method,
      headers: {
        Accept: 'application/json',
        ...(csrf ? { 'x-csrf-token': csrf } : {}),
        ...(method === 'GET'
          ? {}
          : {
              'Content-Type': 'application/json',
              'Idempotency-Key':
                idempotencyKey ?? `${smokeRunId}-${randomUUID()}`,
            }),
      },
      ...(method === 'GET' ? {} : { data: body }),
    });
    const payload = await responsePayload(response);
    if (!response.ok()) throw safeError(response.status(), payload, path);
    return unwrap(payload) as T;
  }

  return {
    context,
    get: <T>(path: string) => send<T>('GET', path),
    post: <T>(path: string, body: unknown, idempotencyKey?: string) =>
      send<T>('POST', path, body, idempotencyKey),
    patch: <T>(path: string, body: unknown, idempotencyKey?: string) =>
      send<T>('PATCH', path, body, idempotencyKey),
    dispose: () => context.dispose(),
  };
}

export async function createRoleApiSession(
  role: SmokeRole,
  config: SmokeConfig,
  smokeRunId = 'SMOKE-SETUP',
): Promise<SmokeApiSession> {
  const context = await request.newContext({ baseURL: config.frontendUrl });
  const credentials = config[role];
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'x-smoke-session-bootstrap-secret': config.sessionBootstrapSecret,
  };
  if (role === 'cashier') {
    headers['x-device-id'] = config.cashier.deviceId;
    headers['x-device-attestation'] = deviceAttestation(
      config.cashier.deviceId,
      config.cashier.deviceAttestationSecret,
    );
  }

  const response = await context.post('/api/v1/auth/smoke-session', {
    data: {
      tenantId: config.tenantId,
      username: credentials.username,
      role: role.toUpperCase(),
    },
    headers,
  });
  const payload = await responsePayload(response);
  if (!response.ok()) {
    await context.dispose();
    throw safeError(response.status(), payload);
  }

  return createSmokeApiSession(context, smokeRunId);
}
