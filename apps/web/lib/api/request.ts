import { CSRF_COOKIE_NAME, readCookie } from './cookies';

export type ApiRequestOptions = RequestInit & {
  csrf?: boolean;
  idempotencyKey?: string;
};

export function createApiRequest(options: ApiRequestOptions = {}): RequestInit {
  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');

  if (options.csrf) {
    const csrfToken = readCookie(CSRF_COOKIE_NAME);
    if (csrfToken) {
      headers.set('x-csrf-token', csrfToken);
    }
  }

  if (options.idempotencyKey) {
    headers.set('Idempotency-Key', options.idempotencyKey);
  }

  return {
    ...options,
    credentials: 'include',
    headers,
  };
}
