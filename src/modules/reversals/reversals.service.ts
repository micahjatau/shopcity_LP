import { createHash } from 'node:crypto';
import { HttpStatus, Injectable } from '@nestjs/common';
import { IdempotencyRecordStatus } from '@prisma/client';
import type { AuthContext } from '../../common/auth/session.types';
import { DomainHttpException } from '../../common/errors/domain.exception';
import { PrismaService } from '../../database/prisma.service';
import { ReverseTransactionDto } from './reversals.dto';

const REVERSE_ENDPOINT = 'POST /api/v1/transactions/:transactionId/reverse';
const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;

export type ReversalReviewRequiredResponse = {
  code: 'REVERSAL_REVIEW_REQUIRED';
  transactionId: string;
};

@Injectable()
export class ReversalsService {
  constructor(private readonly prismaService: PrismaService) {}

  async reverse(
    tenantId: string,
    actor: AuthContext,
    transactionId: string,
    idempotencyKey: string | undefined,
    dto: ReverseTransactionDto,
  ): Promise<ReversalReviewRequiredResponse> {
    const normalizedKey = normalizeIdempotencyKey(idempotencyKey);
    const reason = normalizeReason(dto.reason);
    const response: ReversalReviewRequiredResponse = {
      code: 'REVERSAL_REVIEW_REQUIRED',
      transactionId,
    };
    const requestHash = hashRequest({
      tenantId,
      actorId: actor.user.id,
      transactionId,
      reason,
    });

    await this.prismaService.idempotencyRecord.deleteMany({
      where: {
        tenantId,
        actorId: actor.user.id,
        endpoint: REVERSE_ENDPOINT,
        idempotencyKey: normalizedKey,
        expiresAt: { lte: new Date() },
      },
    });

    const existing = await this.prismaService.idempotencyRecord.findUnique({
      where: {
        tenantId_actorId_endpoint_idempotencyKey: {
          tenantId,
          actorId: actor.user.id,
          endpoint: REVERSE_ENDPOINT,
          idempotencyKey: normalizedKey,
        },
      },
    });

    if (existing && existing.requestHash !== requestHash) {
      throw new DomainHttpException(
        HttpStatus.CONFLICT,
        'IDEMPOTENCY_CONFLICT',
        'Idempotency key reused with different payload',
      );
    }

    if (existing?.requestHash === requestHash && existing.responseJson) {
      return existing.responseJson as ReversalReviewRequiredResponse;
    }

    if (existing) {
      throw new DomainHttpException(
        HttpStatus.CONFLICT,
        'IDEMPOTENCY_IN_PROGRESS',
        'Idempotency key is still being processed',
      );
    }

    await this.prismaService.idempotencyRecord.create({
      data: {
        tenantId,
        actorId: actor.user.id,
        endpoint: REVERSE_ENDPOINT,
        idempotencyKey: normalizedKey,
        requestHash,
        responseJson: response,
        status: IdempotencyRecordStatus.COMPLETED,
        expiresAt: new Date(Date.now() + IDEMPOTENCY_TTL_MS),
      },
    });

    return response;
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

function hashRequest(payload: Record<string, unknown>): string {
  return createHash('sha256')
    .update(JSON.stringify(payload, Object.keys(payload).sort()))
    .digest('hex');
}
