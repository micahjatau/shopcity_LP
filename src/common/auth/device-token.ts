import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export const DEVICE_TOKEN_KEY_VERSION = 1;
export const DEVICE_TOKEN_COOKIE_NAME = '__Host-shopcity_pos_device';

export function configuredDeviceTokenKeyVersion(
  version: number | undefined,
): number {
  if (version === undefined) return DEVICE_TOKEN_KEY_VERSION;
  if (!Number.isSafeInteger(version) || version < 1) {
    throw new Error('POS device-token key version is invalid');
  }
  return version;
}
export const DEVICE_TOKEN_COOKIE_MAX_AGE_SECONDS = 31_536_000;

export function createDeviceToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashDeviceToken(
  token: string,
  keyValue: string | undefined,
): string {
  const key = parseDeviceTokenKey(keyValue);
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) {
    throw new Error('Invalid POS device token');
  }
  const rawToken = Buffer.from(token, 'base64url');
  if (rawToken.length !== 32 || rawToken.toString('base64url') !== token) {
    throw new Error('Invalid POS device token');
  }
  return createHmac('sha256', key).update(token, 'utf8').digest('hex');
}

export function matchesDeviceTokenHash(
  token: string,
  expectedHash: string,
  keyValue: string | undefined,
): boolean {
  try {
    const actual = Buffer.from(hashDeviceToken(token, keyValue), 'hex');
    const expected = Buffer.from(expectedHash, 'hex');
    return (
      actual.length === 32 &&
      expected.length === 32 &&
      timingSafeEqual(actual, expected)
    );
  } catch {
    return false;
  }
}

export function isValidDeviceTokenHmacKey(
  keyValue: string | undefined,
): boolean {
  try {
    parseDeviceTokenKey(keyValue);
    return true;
  } catch {
    return false;
  }
}

function parseDeviceTokenKey(keyValue: string | undefined): Buffer {
  if (!keyValue || !/^[A-Za-z0-9_-]{43}$/.test(keyValue)) {
    throw new Error('POS_DEVICE_TOKEN_HMAC_KEY is missing or invalid');
  }
  const key = Buffer.from(keyValue, 'base64url');
  if (key.length !== 32 || key.toString('base64url') !== keyValue) {
    throw new Error('POS_DEVICE_TOKEN_HMAC_KEY is missing or invalid');
  }
  return key;
}
