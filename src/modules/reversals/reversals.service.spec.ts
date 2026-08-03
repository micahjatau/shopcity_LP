import { HttpStatus } from '@nestjs/common';
import { IdempotencyRecordStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { ReversalsService } from './reversals.service';

describe('ReversalsService', () => {
  type IdempotencyCreateInput = {
    data: {
      actorId: string;
      endpoint: string;
      idempotencyKey: string;
      requestHash: string;
      responseJson: unknown;
      status: IdempotencyRecordStatus;
      tenantId: string;
    };
  };

  const actor = {
    user: { id: 'user-1', tenantId: 'tenant-1' },
    session: {},
  };

  function buildService(existing: unknown = null) {
    const prisma = {
      idempotencyRecord: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        findUnique: jest.fn().mockResolvedValue(existing),
        create: jest
          .fn<Promise<unknown>, [IdempotencyCreateInput]>()
          .mockResolvedValue({}),
      },
    };

    return {
      prisma,
      service: new ReversalsService(prisma as unknown as PrismaService),
    };
  }

  it('requires an idempotency key', async () => {
    const { service } = buildService();

    await expect(
      service.reverse('tenant-1', actor as never, 'transaction-1', undefined, {
        reason: 'Customer refund',
      }),
    ).rejects.toMatchObject({
      response: {
        code: 'VALIDATION_ERROR',
        message: 'Idempotency-Key header is required',
      },
      status: HttpStatus.BAD_REQUEST,
    });
  });

  it('requires a non-empty reason', async () => {
    const { service } = buildService();

    await expect(
      service.reverse('tenant-1', actor as never, 'transaction-1', 'idem-1', {
        reason: '   ',
      }),
    ).rejects.toMatchObject({
      response: {
        code: 'VALIDATION_ERROR',
        message: 'Reversal reason is required',
      },
      status: HttpStatus.BAD_REQUEST,
    });
  });

  it('records an idempotent review-required reversal boundary', async () => {
    const { prisma, service } = buildService();

    await expect(
      service.reverse('tenant-1', actor as never, 'transaction-1', ' idem-1 ', {
        reason: ' Customer refund ',
      }),
    ).resolves.toMatchObject({
      code: 'REVERSAL_REVIEW_REQUIRED',
      transactionId: 'transaction-1',
    });

    const createCall = prisma.idempotencyRecord.create.mock.calls[0][0];

    expect(createCall.data).toMatchObject({
      actorId: 'user-1',
      endpoint: 'POST /api/v1/transactions/:transactionId/reverse',
      idempotencyKey: 'idem-1',
      responseJson: {
        code: 'REVERSAL_REVIEW_REQUIRED',
        transactionId: 'transaction-1',
      },
      status: IdempotencyRecordStatus.COMPLETED,
      tenantId: 'tenant-1',
    });
  });

  it('rejects conflicting idempotency payloads', async () => {
    const { prisma, service } = buildService({
      requestHash: 'different-request-hash',
    });

    await expect(
      service.reverse('tenant-1', actor as never, 'transaction-1', 'idem-1', {
        reason: 'Customer refund',
      }),
    ).rejects.toMatchObject({
      response: {
        code: 'IDEMPOTENCY_CONFLICT',
        message: 'Idempotency key reused with different payload',
      },
      status: HttpStatus.CONFLICT,
    });

    expect(prisma.idempotencyRecord.create).not.toHaveBeenCalled();
  });

  it('replays the review-required outcome for matching idempotency payloads', async () => {
    const { prisma, service } = buildService();

    await expect(
      service.reverse('tenant-1', actor as never, 'transaction-1', 'idem-1', {
        reason: 'Customer refund',
      }),
    ).resolves.toMatchObject({
      code: 'REVERSAL_REVIEW_REQUIRED',
      transactionId: 'transaction-1',
    });

    const createCall = prisma.idempotencyRecord.create.mock.calls[0][0];

    prisma.idempotencyRecord.findUnique.mockResolvedValue({
      requestHash: createCall.data.requestHash,
      responseJson: createCall.data.responseJson,
    });
    prisma.idempotencyRecord.create.mockClear();

    await expect(
      service.reverse('tenant-1', actor as never, 'transaction-1', 'idem-1', {
        reason: 'Customer refund',
      }),
    ).resolves.toMatchObject({
      code: 'REVERSAL_REVIEW_REQUIRED',
      transactionId: 'transaction-1',
    });
    expect(prisma.idempotencyRecord.create).not.toHaveBeenCalled();
  });
});
