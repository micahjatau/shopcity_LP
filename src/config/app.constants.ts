export const API_PREFIX = 'api';
export const API_VERSION = '1';
export const DEFAULT_CORS_ORIGIN_ALLOWLIST = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
];

export function parseCsvList(value: string | undefined): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}
