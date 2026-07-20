import { SetMetadata } from '@nestjs/common';
import { AuthenticatedRequest } from '../auth/session.types';
import { THROTTLE_KEY } from './throttle.constants';

export interface ThrottleOptions {
  bucket: string;
  limit: number;
  windowMs: number;
  keyFactory?: (request: AuthenticatedRequest) => string;
}

export const Throttle = (options: ThrottleOptions) =>
  SetMetadata(THROTTLE_KEY, options);
