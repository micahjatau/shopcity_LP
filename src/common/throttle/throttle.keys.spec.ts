import {
  buildCardLookupThrottleKey,
  buildLoginThrottleKey,
  normalizeThrottleIdentity,
} from './throttle.keys';

describe('throttle keys', () => {
  it('normalizes login identity buckets', () => {
    expect(normalizeThrottleIdentity('  Admin@ShopCity.Local ')).toBe(
      'admin@shopcity.local',
    );

    const baseRequest = {
      ip: '127.0.0.1',
      body: { username: '  Admin@ShopCity.Local ' },
    };

    expect(buildLoginThrottleKey(baseRequest as never)).toBe(
      'login:127.0.0.1:admin@shopcity.local',
    );
    expect(
      buildLoginThrottleKey({
        ...baseRequest,
        body: { username: 'admin@shopcity.local' },
      } as never),
    ).toBe('login:127.0.0.1:admin@shopcity.local');
  });

  it('keeps card lookup buckets stable across serial changes', () => {
    const request = {
      ip: '127.0.0.1',
      params: { barcode: '111111' },
      authContext: {
        user: {
          tenantId: 'tenant-id',
          id: 'user-id',
        },
      },
    };

    const first = buildCardLookupThrottleKey(request as never);
    const second = buildCardLookupThrottleKey({
      ...request,
      params: { barcode: '222222' },
    } as never);

    expect(first).toBe('card-lookup:tenant-id:user-id:127.0.0.1');
    expect(second).toBe(first);
  });
});
