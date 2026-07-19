import { HttpException, HttpStatus } from '@nestjs/common';

export interface DomainErrorBody {
  code: string;
  message: string;
  details?: unknown;
}

export class DomainHttpException extends HttpException {
  constructor(
    status: HttpStatus,
    code: string,
    message: string,
    details?: unknown,
  ) {
    super({ code, message, details }, status);
  }
}

export function isDomainErrorBody(value: unknown): value is DomainErrorBody {
  return Boolean(
    value &&
    typeof value === 'object' &&
    'code' in value &&
    'message' in value &&
    typeof (value as { code?: unknown }).code === 'string' &&
    typeof (value as { message?: unknown }).message === 'string',
  );
}
