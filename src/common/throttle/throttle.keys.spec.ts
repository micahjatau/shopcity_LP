import {
  buildCardLookupThrottleKey,
  buildEarnThrottleKey,
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

    expect(buildLoginThrottleKey(baseRequest as never)).toEqual([
      'login:ip:127.0.0.1',
      'login:account:admin@shopcity.local',
      'login:pair:127.0.0.1:admin@shopcity.local',
    ]);
    expect(
      buildLoginThrottleKey({
        ...baseRequest,
        body: { username: 'admin@shopcity.local' },
      } as never),
    ).toEqual([
      'login:ip:127.0.0.1',
      'login:account:admin@shopcity.local',
      'login:pair:127.0.0.1:admin@shopcity.local',
    ]);
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

  it('keys earn throttling by tenant, staff user, and session device', () => {
    const request = {
      authContext: {
        user: {
          tenantId: 'tenant-id',
          id: 'user-id',
        },
        session: {
          deviceId: 'device-1',
        },
      },
    };

    const first = buildEarnThrottleKey(request as never);
    const second = buildEarnThrottleKey({
      authContext: {
        ...request.authContext,
        session: { deviceId: 'device-2' },
      },
    } as never);

    expect(first).toBe('earn:tenant-id:user-id:device-1');
    expect(second).toBe('earn:tenant-id:user-id:device-2');
  });
});
