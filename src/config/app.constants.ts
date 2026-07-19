export const API_PREFIX = 'api';
export const API_VERSION = '1';
export const DEFAULT_CORS_ORIGIN_ALLOWLIST = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
];

export const SESSION_COOKIE_NAME = 'shopcity_session';
export const CSRF_COOKIE_NAME = 'shopcity_csrf';
export const DEFAULT_PUBLIC_TENANT_NAME = 'ShopCity';
export const DEFAULT_PUBLIC_BRANCH_NAME = 'Main Branch';

export function parseCsvList(value: string | undefined): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}
