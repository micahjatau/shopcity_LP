import { HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DomainHttpException } from '../errors/domain.exception';

export interface FinancialRetryOptions<T> {
  attempts: number;
  conflictCode: string;
  conflictMessage: string;
  jitterMs?: number;
  onConflict?: () => Promise<T | null | undefined>;
}

export async function runWithBoundedFinancialRetries<T>(
  operation: () => Promise<T>,
  options: FinancialRetryOptions<T>,
): Promise<T> {
  for (let attempt = 1; attempt <= options.attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (!isFinancialTransactionConflict(error)) {
        throw error;
      }

      const replay = await options.onConflict?.();
      if (replay) {
        return replay;
      }

      if (attempt < options.attempts) {
        await waitForFinancialRetryJitter(options.jitterMs ?? 25);
        continue;
      }

      throw new DomainHttpException(
        HttpStatus.SERVICE_UNAVAILABLE,
        options.conflictCode,
        options.conflictMessage,
      );
    }
  }

  throw new DomainHttpException(
    HttpStatus.SERVICE_UNAVAILABLE,
    options.conflictCode,
    options.conflictMessage,
  );
}

export function isFinancialTransactionConflict(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code === 'P2034' || error.code === '40001';
  }

  return false;
}

async function waitForFinancialRetryJitter(maxJitterMs: number): Promise<void> {
  const delayMs = Math.floor(Math.random() * (maxJitterMs + 1));

  await new Promise((resolve) => setTimeout(resolve, delayMs));
}
