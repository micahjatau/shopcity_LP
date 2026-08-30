import { expect, test } from '@playwright/test';
import type { APIRequestContext } from '@playwright/test';
import {
  createSmokeApiSession,
  csrfHeaderFromCookies,
} from './support/api-client';

test('extracts the CSRF token from the application cookie', () => {
  expect(
    csrfHeaderFromCookies([{ name: 'shopcity_csrf', value: 'csrf-123' }]),
  ).toBe('csrf-123');
});

test('mutation requests include CSRF and run-scoped idempotency headers', async () => {
  let captured: { headers?: Record<string, string> } | undefined;
  const context = {
    storageState: async () => ({
      cookies: [{ name: 'shopcity_csrf', value: 'csrf-123' }],
      origins: [],
    }),
    fetch: async (
      _path: string,
      options: { headers?: Record<string, string> },
    ) => {
      captured = options;
      return {
        ok: () => true,
        status: () => 200,
        text: async () => JSON.stringify({ data: { accepted: true } }),
      };
    },
    dispose: async () => undefined,
  } as unknown as APIRequestContext;

  await createSmokeApiSession(context, 'SMOKE-20260826-143000-abc123').post(
    '/api/v1/smoke-fixture/reset',
    { status: 'ACTIVE' },
    'SMOKE-20260826-143000-abc123-fixture-reset',
  );

  expect(captured?.headers).toMatchObject({
    'x-csrf-token': 'csrf-123',
    'Idempotency-Key': 'SMOKE-20260826-143000-abc123-fixture-reset',
  });
});

test('API errors expose status and safe code without secret values', async () => {
  const context = {
    storageState: async () => ({ cookies: [], origins: [] }),
    fetch: async () => ({
      ok: () => false,
      status: () => 403,
      text: async () =>
        JSON.stringify({
          code: 'FORBIDDEN',
          password: 'must-not-leak',
          secret: 'must-not-leak',
        }),
    }),
    dispose: async () => undefined,
  } as unknown as APIRequestContext;

  await expect(
    createSmokeApiSession(context, 'SMOKE-TEST').get('/api/v1/auth/me'),
  ).rejects.toThrow('Smoke API request failed (403): FORBIDDEN');
  await expect(
    createSmokeApiSession(context, 'SMOKE-TEST').get('/api/v1/auth/me'),
  ).rejects.not.toThrow(/must-not-leak/);
});
