import { HTTP_CODE_METADATA } from '@nestjs/common/constants';
import { THROTTLE_KEY } from '../../common/throttle/throttle.constants';
import { BranchesController } from './branches.controller';

describe('BranchesController', () => {
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
