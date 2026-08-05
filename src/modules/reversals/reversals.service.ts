import { HttpStatus, Injectable } from '@nestjs/common';
import type { AuthContext } from '../../common/auth/session.types';
import { DomainHttpException } from '../../common/errors/domain.exception';
import { ReverseTransactionDto } from './reversals.dto';

@Injectable()
export class ReversalsService {
  constructor() {}

  async reverse(
    tenantId: string,
    actor: AuthContext,
    transactionId: string,
    idempotencyKey: string | undefined,
    dto: ReverseTransactionDto,
  ): Promise<never> {
    void tenantId;
    void actor;
    void transactionId;
    normalizeIdempotencyKey(idempotencyKey);
    normalizeReason(dto.reason);
    await Promise.resolve();

    throw new DomainHttpException(
      HttpStatus.SERVICE_UNAVAILABLE,
      'REVERSAL_UNAVAILABLE',
      'Transaction reversal is not available in this release',
    );
  }
}

function normalizeIdempotencyKey(value: string | undefined): string {
  const normalized = value?.trim();

  if (!normalized) {
    throw new DomainHttpException(
      HttpStatus.BAD_REQUEST,
      'VALIDATION_ERROR',
      'Idempotency-Key header is required',
    );
  }

  return normalized;
}

function normalizeReason(value: string): string {
  const normalized = value.trim();

  if (!normalized) {
    throw new DomainHttpException(
      HttpStatus.BAD_REQUEST,
      'VALIDATION_ERROR',
      'Reversal reason is required',
    );
  }

  if (normalized.length > 500) {
    throw new DomainHttpException(
      HttpStatus.BAD_REQUEST,
      'VALIDATION_ERROR',
      'Reversal reason must be at most 500 characters',
    );
  }

  return normalized;
}
