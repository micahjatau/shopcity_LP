import { expect, test } from '@playwright/test';
import { createApiRequest } from '../lib/api/request';

test('createApiRequest exposes CSRF and idempotency headers to generated clients', () => {
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: { cookie: 'shopcity_csrf=csrf-123' },
  });

  const request = createApiRequest({ csrf: true, idempotencyKey: 'idem-123' });
  const generatedHeaders = {
    'Content-Type': 'application/json',
    ...request.headers,
  } as Record<string, string>;

  expect(request.headers).not.toBeInstanceOf(Headers);
  expect(generatedHeaders['x-csrf-token']).toBe('csrf-123');
  expect(generatedHeaders['idempotency-key']).toBe('idem-123');
});
