import { Prisma } from '@prisma/client';
import {
  isFinancialTransactionConflict,
  runWithBoundedFinancialRetries,
} from './financial-transaction-retry';

describe('financial transaction retry helpers', () => {
  it('retries recognized transaction conflicts until success', async () => {
    const operation = jest
      .fn<Promise<string>, []>()
      .mockRejectedValueOnce(prismaKnownRequestError('P2034'))
      .mockResolvedValue('ok');

    await expect(
      runWithBoundedFinancialRetries(operation, {
        attempts: 2,
        conflictCode: 'REDEMPTION_TRANSACTION_CONFLICT',
        conflictMessage: 'Try again',
        jitterMs: 0,
      }),
    ).resolves.toBe('ok');
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it('returns replay response from conflict hook', async () => {
    const operation = jest
      .fn<Promise<string>, []>()
      .mockRejectedValue(prismaKnownRequestError('P2034'));

    await expect(
      runWithBoundedFinancialRetries(operation, {
        attempts: 3,
        conflictCode: 'REDEMPTION_TRANSACTION_CONFLICT',
        conflictMessage: 'Try again',
        jitterMs: 0,
        onConflict: () => Promise.resolve('replay'),
      }),
    ).resolves.toBe('replay');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('maps exhausted conflicts to configured domain error', async () => {
    await expect(
      runWithBoundedFinancialRetries(
        () => Promise.reject(prismaKnownRequestError('P2034')),
        {
          attempts: 1,
          conflictCode: 'REDEMPTION_TRANSACTION_CONFLICT',
          conflictMessage: 'Try again',
          jitterMs: 0,
        },
      ),
    ).rejects.toMatchObject({
      status: 503,
      response: { code: 'REDEMPTION_TRANSACTION_CONFLICT' },
    });
  });

  it('does not retry non-conflict errors', async () => {
    const error = new Error('boom');
    const operation = jest.fn<Promise<string>, []>().mockRejectedValue(error);

    await expect(
      runWithBoundedFinancialRetries(operation, {
        attempts: 3,
        conflictCode: 'REDEMPTION_TRANSACTION_CONFLICT',
        conflictMessage: 'Try again',
        jitterMs: 0,
      }),
    ).rejects.toBe(error);
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('classifies Prisma P2034 as a financial transaction conflict', () => {
    expect(
      isFinancialTransactionConflict(prismaKnownRequestError('P2034')),
    ).toBe(true);
    expect(
      isFinancialTransactionConflict(prismaKnownRequestError('P2002')),
    ).toBe(false);
  });
});

function prismaKnownRequestError(code: string) {
  return new Prisma.PrismaClientKnownRequestError('Prisma error', {
    code,
    clientVersion: 'test',
  });
}
