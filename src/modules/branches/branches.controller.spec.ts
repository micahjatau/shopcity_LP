import { HTTP_CODE_METADATA } from '@nestjs/common/constants';
import { THROTTLE_KEY } from '../../common/throttle/throttle.constants';
import { BranchesController } from './branches.controller';

describe('BranchesController', () => {
  it('sets only the HttpOnly host-scoped token cookie after pairing succeeds', async () => {
    const service = {
      assertDeviceTokenBrowserOrigin: jest.fn(),
      pairDeviceToken: jest.fn().mockResolvedValue({
        token: 'one-time-token-value',
        pairedAt: new Date('2026-10-15T00:00:00.000Z'),
      }),
    };
    const controller = new BranchesController(service as never);
    const reply = { header: jest.fn() };
    const response = await controller.pairDeviceToken(
      { authContext: { user: { tenantId: 'tenant-id' } } } as never,
      'device-id',
      'https://pos.example.test',
      reply as never,
    );

    expect(service.assertDeviceTokenBrowserOrigin).toHaveBeenCalledWith(
      'https://pos.example.test',
    );
    expect(reply.header).toHaveBeenCalledWith(
      'Set-Cookie',
      expect.stringContaining(
        '__Host-shopcity_pos_device=one-time-token-value; Path=/; Max-Age=31536000; SameSite=Strict; HttpOnly; Secure',
      ),
    );
    expect(JSON.stringify(response)).not.toContain('one-time-token-value');
  });

  it('clears only the POS device token cookie after a successful reset', async () => {
    const service = {
      assertDeviceTokenBrowserOrigin: jest.fn(),
      resetDeviceToken: jest.fn().mockResolvedValue(true),
    };
    const controller = new BranchesController(service as never);
    const reply = { header: jest.fn() };
    const request = {
      authContext: { user: { tenantId: 'tenant-id' } },
      headers: { cookie: `__Host-shopcity_pos_device=${'a'.repeat(43)}` },
    };
    await controller.resetDeviceToken(
      request as never,
      'device-id',
      'https://pos.example.test',
      reply as never,
    );
    expect(service.resetDeviceToken).toHaveBeenCalledWith(
      'tenant-id',
      request.authContext,
      'device-id',
      'a'.repeat(43),
    );
    expect(reply.header).toHaveBeenCalledWith(
      'Set-Cookie',
      expect.stringContaining(
        '__Host-shopcity_pos_device=; Path=/; Max-Age=0; SameSite=Strict; HttpOnly; Secure',
      ),
    );
  });

  it('does not clear a different device token when reset from another browser', async () => {
    const service = {
      assertDeviceTokenBrowserOrigin: jest.fn(),
      resetDeviceToken: jest.fn().mockResolvedValue(false),
    };
    const controller = new BranchesController(service as never);
    const reply = { header: jest.fn() };

    await controller.resetDeviceToken(
      {
        authContext: { user: { tenantId: 'tenant-id' } },
        headers: { cookie: `__Host-shopcity_pos_device=${'b'.repeat(43)}` },
      } as never,
      'other-device-id',
      'https://pos.example.test',
      reply as never,
    );

    expect(reply.header).not.toHaveBeenCalled();
  });

  it('clears a deactivated device cookie only when the matching credential was present', async () => {
    const token = 'c'.repeat(43);
    const service = {
      updateDevice: jest.fn().mockResolvedValue({
        id: 'device-id',
        status: 'INACTIVE',
        clearDeviceTokenCookie: true,
      }),
    };
    const controller = new BranchesController(service as never);
    const reply = { header: jest.fn() };
    const request = {
      authContext: { user: { tenantId: 'tenant-id' } },
      headers: { cookie: `__Host-shopcity_pos_device=${token}` },
    };

    const response = await controller.updateDevice(
      request as never,
      'device-id',
      { status: 'INACTIVE' } as never,
      'idempotency-key',
      reply as never,
    );

    expect(service.updateDevice).toHaveBeenCalledWith(
      'tenant-id',
      request.authContext,
      'device-id',
      { status: 'INACTIVE' },
      'idempotency-key',
      token,
    );
    expect(reply.header).toHaveBeenCalledWith(
      'Set-Cookie',
      expect.stringContaining('__Host-shopcity_pos_device=; Path=/; Max-Age=0'),
    );
    expect(response).not.toHaveProperty('clearDeviceTokenCookie');
  });

  it('returns the documented HTTP 200 status for enrollment completion', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      BranchesController.prototype,
      'completeDeviceEnrollment',
    );

    if (!descriptor || typeof descriptor.value !== 'function') {
      throw new Error('completeDeviceEnrollment handler missing');
    }

    expect(
      Reflect.getMetadata(HTTP_CODE_METADATA, descriptor.value as object),
    ).toBe(200);
  });

  it('rate limits enrollment completion by source IP and device, not bearer token', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      BranchesController.prototype,
      'completeDeviceEnrollment',
    );

    if (!descriptor || typeof descriptor.value !== 'function') {
      throw new Error('completeDeviceEnrollment handler missing');
    }

    const options = Reflect.getMetadata(
      THROTTLE_KEY,
      descriptor.value as object,
    ) as {
      bucket: string;
      limit: number;
      windowMs: number;
      keyFactory: (request: unknown) => string[];
    };
    expect(options).toMatchObject({
      bucket: 'device.enrollment.complete',
      limit: 5,
      windowMs: 15 * 60 * 1000,
    });
    expect(
      options.keyFactory({
        ip: '192.0.2.5',
        params: { id: 'device-id' },
        body: { authorizationToken: 'never-in-throttle-key' },
      }),
    ).toEqual([
      'device-enrollment-complete:ip:192.0.2.5',
      'device-enrollment-complete:device:device-id',
    ]);
  });

  it('documents the stable generic enrollment failure response', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      BranchesController.prototype,
      'completeDeviceEnrollment',
    );

    if (!descriptor || typeof descriptor.value !== 'function') {
      throw new Error('completeDeviceEnrollment handler missing');
    }

    const responses = Reflect.getMetadata(
      'swagger/apiResponse',
      descriptor.value as object,
    ) as Record<string, unknown>;
    expect(responses['400']).toMatchObject({
      content: {
        'application/json': {
          examples: {
            deviceEnrollmentInvalid: {
              value: {
                error: {
                  statusCode: 400,
                  code: 'DEVICE_ENROLLMENT_INVALID',
                },
              },
            },
          },
        },
      },
    });
  });
});
