import { isBffSecretValid, matchesBffCredential } from './bff-identity';

describe('BFF identity credential', () => {
  const secret = Buffer.alloc(32, 17).toString('base64url');

  it('accepts canonical 32-byte base64url secrets only', () => {
    expect(isBffSecretValid(secret)).toBe(true);
    expect(isBffSecretValid('short')).toBe(false);
    expect(isBffSecretValid('A'.repeat(43))).toBe(true);
    expect(isBffSecretValid(`${secret}=`)).toBe(false);
  });

  it('compares valid credentials without accepting malformed or different values', () => {
    expect(matchesBffCredential(secret, secret)).toBe(true);
    expect(
      matchesBffCredential(Buffer.alloc(32, 18).toString('base64url'), secret),
    ).toBe(false);
    expect(matchesBffCredential('short', secret)).toBe(false);
    expect(matchesBffCredential(secret, undefined)).toBe(false);
  });
});
