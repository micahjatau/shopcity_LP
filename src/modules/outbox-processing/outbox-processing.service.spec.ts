import type { ConfigService } from '@nestjs/config';
import type { PrismaService } from '../../database/prisma.service';
import { FraudService } from '../fraud/fraud.service';
import { OutboxProcessingService } from './outbox-processing.service';

type RawQuery = { sql: string; values: unknown[] };

describe('OutboxProcessingService', () => {
  const config = (values: Record<string, number | string | Date>) =>
    ({
      get: (key: string, fallback?: number) => values[key] ?? fallback,
    }) as unknown as ConfigService;

  it('atomically claims a bounded batch and processes only fraud events', async () => {
    const claimed = [
      { tenantId: 'tenant-1', id: 'outbox-1' },
      { tenantId: 'tenant-2', id: 'outbox-2' },
    ];
    const queryRaw = jest
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(claimed);
    const executeRaw = jest.fn().mockResolvedValue(0);
    const tx = { $queryRaw: queryRaw, $executeRaw: executeRaw };
    const prisma = {
      $transaction: jest.fn(
        (callback: (value: typeof tx) => Promise<unknown>) => callback(tx),
      ),
    } as unknown as PrismaService;
    const processOutboxEvent = jest.fn().mockResolvedValue(1);
    const service = new OutboxProcessingService(
      prisma,
      config({ CRON_OUTBOX_BATCH_SIZE: 2 }),
      { processOutboxEvent } as unknown as FraudService,
    );

    await expect(service.processBatch()).resolves.toEqual({
      claimed: 2,
      completed: 2,
      retried: 0,
      deadLettered: 0,
    });
    expect(queryRaw).toHaveBeenCalledTimes(2);
    const queryCalls = queryRaw.mock.calls as unknown as Array<[RawQuery]>;
    const claimQuery = queryCalls[1]?.[0];
    expect(claimQuery?.sql).toContain('FOR UPDATE SKIP LOCKED');
    expect(claimQuery?.sql).toContain('"eventType" =');
    expect(claimQuery?.values).toContain('fraud.evaluate');
    expect(processOutboxEvent).toHaveBeenNthCalledWith(
      1,
      'tenant-1',
      'outbox-1',
    );
    expect(processOutboxEvent).toHaveBeenNthCalledWith(
      2,
      'tenant-2',
      'outbox-2',
    );
  });

  it('delegates one SMS event through the existing worker safety handler', async () => {
    const claimed = [{ tenantId: 'tenant-1', id: 'sms-outbox-1' }];
    const queryRaw = jest
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(claimed);
    const tx = {
      $queryRaw: queryRaw,
      $executeRaw: jest.fn().mockResolvedValue(0),
    };
    const prisma = {
      $transaction: jest.fn(
        (callback: (value: typeof tx) => Promise<unknown>) => callback(tx),
      ),
      outboxEvent: {
        findUnique: jest.fn().mockResolvedValue({
          status: 'COMPLETED',
          processedAt: new Date(),
          deadLetteredAt: null,
        }),
      },
    } as unknown as PrismaService;
    const processOutboxEvent = jest.fn().mockResolvedValue(undefined);
    const service = new OutboxProcessingService(
      prisma,
      config({
        CRON_OUTBOX_BATCH_SIZE: 25,
        SCHEDULED_SMS_NOT_BEFORE: '2026-11-15T00:00:00.000Z',
      }),
      { processOutboxEvent: jest.fn() } as unknown as FraudService,
      { processOutboxEvent } as never,
    );

    await expect(service.processBatch('sms.send')).resolves.toMatchObject({
      claimed: 1,
      completed: 1,
      retried: 0,
    });
    const calls = queryRaw.mock.calls as unknown as Array<[RawQuery]>;
    expect(calls[1]?.[0].values).toContain('sms.send');
    expect(
      calls[1]?.[0].values.some(
        (value) =>
          value instanceof Date &&
          value.toISOString() === '2026-11-15T00:00:00.000Z',
      ),
    ).toBe(true);
    expect(processOutboxEvent).toHaveBeenCalledWith({
      id: 'sms-outbox-1',
      tenantId: 'tenant-1',
    });
  });

  it('fails closed on SMS processing without an explicit not-before cutoff', async () => {
    const transaction = jest.fn();
    const service = new OutboxProcessingService(
      { $transaction: transaction } as never,
      config({}),
      {} as never,
      {} as never,
    );

    await expect(service.processBatch('sms.send')).rejects.toThrow(
      'Scheduled SMS cutoff is not configured',
    );
    expect(transaction).not.toHaveBeenCalled();
  });

  it('runs bounded recovery batches for each supported outbox event type', async () => {
    const service = new OutboxProcessingService(
      {} as never,
      config({ SCHEDULED_SMS_NOT_BEFORE: '2026-11-15T00:00:00.000Z' }),
      {} as never,
      { pollDeliveryReportsOnce: jest.fn().mockResolvedValue(3) } as never,
    );
    const processBatch = jest
      .spyOn(service, 'processBatch')
      .mockResolvedValueOnce({
        claimed: 1,
        completed: 1,
        retried: 0,
        deadLettered: 0,
      })
      .mockResolvedValueOnce({
        claimed: 2,
        completed: 2,
        retried: 0,
        deadLettered: 0,
      })
      .mockResolvedValueOnce({
        claimed: 3,
        completed: 2,
        retried: 1,
        deadLettered: 0,
      });

    await expect(service.processAllBatches()).resolves.toEqual({
      claimed: 6,
      completed: 5,
      retried: 1,
      deadLettered: 0,
    });
    expect(processBatch).toHaveBeenCalledWith('sms.send');
    expect(processBatch).toHaveBeenCalledWith('fraud.evaluate');
    expect(processBatch).toHaveBeenCalledWith('report.refresh');
  });

  it('fails closed before starting any recovery batch without an SMS cutoff', async () => {
    const service = new OutboxProcessingService(
      {} as never,
      config({}),
      {} as never,
      {} as never,
    );
    const processBatch = jest.spyOn(service, 'processBatch');

    await expect(service.processAllBatches()).rejects.toThrow(
      'Scheduled SMS cutoff is not configured',
    );
    expect(processBatch).not.toHaveBeenCalled();
  });

  it('delegates read-only delivery-report polling to the existing worker handler', async () => {
    const pollDeliveryReportsOnce = jest.fn().mockResolvedValue(4);
    const service = new OutboxProcessingService(
      {} as never,
      config({}),
      {} as never,
      { pollDeliveryReportsOnce } as never,
    );

    await expect(service.pollDeliveryReportsOnce()).resolves.toBe(4);
    expect(pollDeliveryReportsOnce).toHaveBeenCalledTimes(1);
  });

  it('persists a bounded retry for an evaluation failure', async () => {
    const tx = {
      $queryRaw: jest
        .fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ tenantId: 'tenant-1', id: 'outbox-failed' }]),
      $executeRaw: jest.fn().mockResolvedValue(0),
    };
    const updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const prisma = {
      $transaction: jest.fn(
        (callback: (value: typeof tx) => Promise<unknown>) => callback(tx),
      ),
      outboxEvent: {
        findUnique: jest.fn().mockResolvedValue({ attempts: 1 }),
        updateMany,
      },
    } as unknown as PrismaService;
    const service = new OutboxProcessingService(
      prisma,
      config({ CRON_OUTBOX_BATCH_SIZE: 1, OUTBOX_RETRY_DELAY_MS: 5_000 }),
      {
        processOutboxEvent: jest
          .fn()
          .mockRejectedValue(new Error('db unavailable')),
      } as unknown as FraudService,
    );

    await expect(service.processBatch()).resolves.toMatchObject({
      claimed: 1,
      retried: 1,
      deadLettered: 0,
    });
    const failureCalls = updateMany.mock.calls as unknown as Array<
      [
        {
          data: {
            status: string;
            failureCategory: string;
            nextAttemptAt: Date | null;
            deadLetteredAt: Date | null;
          };
        },
      ]
    >;
    const failureData = failureCalls[0]?.[0].data;
    expect(failureData?.status).toBe('FAILED');
    expect(failureData?.failureCategory).toBe('fraud-evaluation');
    expect(failureData?.nextAttemptAt).toBeInstanceOf(Date);
    expect(failureData?.deadLetteredAt).toBeNull();
  });

  it('dead-letters the event when the retry budget is exhausted', async () => {
    const queryRaw = jest.fn().mockResolvedValue([{ id: 'outbox-exhausted' }]);
    const tx = {
      $queryRaw: queryRaw,
      $executeRaw: jest.fn().mockResolvedValue(0),
    };
    const prisma = {
      $transaction: jest.fn(
        (callback: (value: typeof tx) => Promise<unknown>) => callback(tx),
      ),
    } as unknown as PrismaService;
    const service = new OutboxProcessingService(
      prisma,
      config({ CRON_OUTBOX_BATCH_SIZE: 1 }),
      {
        processOutboxEvent: jest
          .fn()
          .mockRejectedValue(new Error('invalid event')),
      } as unknown as FraudService,
    );

    await expect(service.processBatch()).resolves.toMatchObject({
      claimed: 1,
      completed: 0,
      retried: 0,
      deadLettered: 1,
    });
    const queryCalls = queryRaw.mock.calls as unknown as Array<[RawQuery]>;
    const deadLetterQuery = queryCalls[0]?.[0];
    expect(deadLetterQuery?.sql).toContain('retry-budget-exhausted');
    expect(deadLetterQuery?.sql).toContain('deadLetteredAt');
  });
});
