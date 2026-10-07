import { HTTP_CODE_METADATA } from '@nestjs/common/constants';
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
});
