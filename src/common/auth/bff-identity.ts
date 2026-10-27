import { timingSafeEqual } from 'node:crypto';

export function isBffSecretValid(secret: string | undefined): secret is string {
  if (!secret || !/^[A-Za-z0-9_-]{43}$/.test(secret)) return false;
  const decoded = Buffer.from(secret, 'base64url');
  return decoded.length === 32 && decoded.toString('base64url') === secret;
}

export function matchesBffCredential(
  presented: string | undefined,
  configured: string | undefined,
): boolean {
  if (!isBffSecretValid(presented) || !isBffSecretValid(configured)) {
    return false;
  }
  const presentedBytes = Buffer.from(presented, 'base64url');
  const configuredBytes = Buffer.from(configured, 'base64url');
  return timingSafeEqual(presentedBytes, configuredBytes);
}
