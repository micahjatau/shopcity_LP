import { PosDeviceTokenKeyHealthIndicator } from './pos-device-token-key.health.indicator';

describe('PosDeviceTokenKeyHealthIndicator', () => {
  const validKey = Buffer.alloc(32, 17).toString('base64url');

  const makeIndicator = (policy: boolean, key?: string) =>
    new PosDeviceTokenKeyHealthIndicator({
      get: (name: string) =>
        name === 'PILOT_CASHIER_DEVICE_TOKEN_ONLY'
          ? policy
          : name === 'POS_DEVICE_TOKEN_HMAC_KEY'
            ? key
            : undefined,
    } as never);

  it('reports down when token-only mode requires a missing or invalid key', async () => {
    const missing = await makeIndicator(true).check();
    expect(missing.posDeviceTokenKey).toEqual({
      status: 'down',
      message: 'POS_DEVICE_TOKEN_HMAC_KEY is missing or invalid',
    });

    const invalidKey = 'not-a-valid-key-value';
    const invalid = await makeIndicator(true, invalidKey).check();
    expect(invalid.posDeviceTokenKey).toEqual({
      status: 'down',
      message: 'POS_DEVICE_TOKEN_HMAC_KEY is missing or invalid',
    });
    expect(JSON.stringify(invalid)).not.toContain(invalidKey);
  });

  it('reports up for a valid key and does not require it when token-only mode is off', async () => {
    expect(
      (await makeIndicator(true, validKey).check()).posDeviceTokenKey,
    ).toEqual({ status: 'up' });
    expect((await makeIndicator(false).check()).posDeviceTokenKey).toEqual({
      status: 'up',
    });
  });
});
