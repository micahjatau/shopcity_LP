import {
  createDeviceToken,
  hashDeviceToken,
  matchesDeviceTokenHash,
} from './device-token';
import { buildPosDeviceTokenCookie, clearPosDeviceTokenCookie } from './cookie';

describe('POS device token hashing and transport', () => {
  const key = Buffer.alloc(32, 17).toString('base64url');

  it('creates random 32-byte base64url credentials and stores only keyed hashes', () => {
    const token = createDeviceToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(Buffer.from(token, 'base64url')).toHaveLength(32);
    const hash = hashDeviceToken(token, key);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).not.toContain(token);
    expect(matchesDeviceTokenHash(token, hash, key)).toBe(true);
  });

  it('does not match another token or a token hashed with another key', () => {
    const token = createDeviceToken();
    const hash = hashDeviceToken(token, key);
    const otherKey = Buffer.alloc(32, 18).toString('base64url');
    expect(matchesDeviceTokenHash(createDeviceToken(), hash, key)).toBe(false);
    expect(matchesDeviceTokenHash(token, hash, otherKey)).toBe(false);
  });

  it('fails closed for missing, malformed, and non-32-byte keys/tokens', () => {
    const token = createDeviceToken();
    expect(() => hashDeviceToken(token, undefined)).toThrow();
    expect(() => hashDeviceToken(token, 'bad')).toThrow();
    expect(() =>
      hashDeviceToken(token, Buffer.alloc(31).toString('base64url')),
    ).toThrow();
    expect(matchesDeviceTokenHash('short', '0'.repeat(64), key)).toBe(false);
  });

  it('uses the exact host-only Secure HttpOnly cookie contract and clears it', () => {
    const cookie = buildPosDeviceTokenCookie(createDeviceToken());
    expect(cookie).toContain('Secure');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Strict');
    expect(cookie).toContain('Path=/');
    expect(cookie).toContain('Max-Age=31536000');
    expect(cookie).not.toContain('Domain=');
    expect(clearPosDeviceTokenCookie()).toContain('Max-Age=0');
  });
});
