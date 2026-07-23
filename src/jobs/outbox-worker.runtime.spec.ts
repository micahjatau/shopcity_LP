import { OutboxWorkerRuntime } from './outbox-worker.runtime';

describe('OutboxWorkerRuntime', () => {
  it('stops retrying when an SMS row is already dead-lettered', async () => {
    const prisma = prismaStub({
      outboxEvent: {
        id: 'outbox-1',
        tenantId: 'tenant-1',
        aggregateType: 'receipt',
        aggregateId: 'receipt-1',
        eventType: 'sms.send',
        payload: { receiptId: 'receipt-1' },
        publishedAt: null,
        smsMessage: {
          id: 'sms-1',
          tenantId: 'tenant-1',
          receiptId: 'receipt-1',
          outboxEventId: 'outbox-1',
          phoneE164: '+2348000000000',
          template: 'earn-confirmed',
          payload: {},
          status: 'FAILED',
          attempts: 4,
          deadLetteredAt: new Date(),
        },
      },
    });
    const smsProvider = { send: jest.fn() };
    const job = { data: { id: 'outbox-1', tenantId: 'tenant-1' }, discard: jest.fn() };
    const runtime = new OutboxWorkerRuntime(
      prisma as never,
      runtimeConfig(),
      smsProvider as never,
    );

    await (runtime as any).handleJob(job);

    expect(smsProvider.send).not.toHaveBeenCalled();
    expect(job.discard).toHaveBeenCalledTimes(1);
  });

  it('stops retrying when the persisted retry budget is exhausted', async () => {
    const prisma = prismaStub({
      outboxEvent: {
        id: 'outbox-1',
        tenantId: 'tenant-1',
        aggregateType: 'receipt',
        aggregateId: 'receipt-1',
        eventType: 'sms.send',
        payload: { receiptId: 'receipt-1' },
        publishedAt: null,
        smsMessage: {
          id: 'sms-1',
          tenantId: 'tenant-1',
          receiptId: 'receipt-1',
          outboxEventId: 'outbox-1',
          phoneE164: '+2348000000000',
          template: 'earn-confirmed',
          payload: {},
          status: 'FAILED',
          attempts: 5,
        },
      },
    });
    const smsProvider = { send: jest.fn() };
    const job = { data: { id: 'outbox-1', tenantId: 'tenant-1' }, discard: jest.fn() };
    const runtime = new OutboxWorkerRuntime(
      prisma as never,
      runtimeConfig(),
      smsProvider as never,
    );

    await (runtime as any).handleJob(job);

    expect(smsProvider.send).not.toHaveBeenCalled();
    expect(job.discard).toHaveBeenCalledTimes(1);
  });

  it('does not resend SMS messages that are already SENT', async () => {
    const prisma = prismaStub({
      outboxEvent: {
        id: 'outbox-1',
        tenantId: 'tenant-1',
        aggregateType: 'receipt',
        aggregateId: 'receipt-1',
        eventType: 'sms.send',
        payload: { receiptId: 'receipt-1' },
        publishedAt: null,
        smsMessage: {
          id: 'sms-1',
          tenantId: 'tenant-1',
          receiptId: 'receipt-1',
          outboxEventId: 'outbox-1',
          phoneE164: '+2348000000000',
          template: 'earn-confirmed',
          payload: {},
          status: 'SENT',
          attempts: 1,
        },
      },
    });
    const smsProvider = { send: jest.fn() };
    const runtime = new OutboxWorkerRuntime(
      prisma as never,
      runtimeConfig(),
      smsProvider as never,
    );

    await (runtime as any).handleJob({
      data: { id: 'outbox-1', tenantId: 'tenant-1' },
    });

    expect(smsProvider.send).not.toHaveBeenCalled();
    expect(prisma.outboxEvent.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          tenantId_id: { tenantId: 'tenant-1', id: 'outbox-1' },
        },
      }),
    );
  });

  it('dead-letters exhausted SMS retries', async () => {
    const prisma = prismaStub({
      outboxEvent: {
        id: 'outbox-1',
        tenantId: 'tenant-1',
        aggregateType: 'receipt',
        aggregateId: 'receipt-1',
        eventType: 'sms.send',
        payload: { receiptId: 'receipt-1' },
        publishedAt: null,
        smsMessage: {
          id: 'sms-1',
          tenantId: 'tenant-1',
          receiptId: 'receipt-1',
          outboxEventId: 'outbox-1',
          phoneE164: '+2348000000000',
          template: 'earn-confirmed',
          payload: {},
          status: 'FAILED',
          attempts: 4,
        },
      },
      smsMessage: {
        update: jest.fn().mockResolvedValue(undefined),
      },
    });
    const smsProvider = {
      send: jest.fn().mockRejectedValue(new Error('provider down')),
    };
    const job = {
      data: { id: 'outbox-1', tenantId: 'tenant-1' },
      discard: jest.fn(),
    };
    const runtime = new OutboxWorkerRuntime(
      prisma as never,
      runtimeConfig(),
      smsProvider as never,
    );

    await expect((runtime as any).handleJob(job)).rejects.toThrow(
      'provider down',
    );

    expect(prisma.smsMessage.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          deadLetteredAt: expect.any(Date),
          failureCategory: 'dead-lettered',
          nextAttemptAt: null,
        }),
      }),
    );
    expect(job.discard).toHaveBeenCalledTimes(1);
  });
});

function runtimeConfig() {
  return {
    redisUrl: 'redis://localhost:6379',
    publishBatchSize: 10,
    publishIntervalMs: 5_000,
    retryDelayMs: 30_000,
    recoveryThresholdMs: 60_000,
  };
}

function prismaStub(overrides: any) {
  const outboxEvent = overrides.outboxEvent as any;

  return {
    outboxEvent: {
      findUnique: jest.fn().mockResolvedValue(outboxEvent),
      update: jest.fn().mockResolvedValue(undefined),
      updateMany: jest.fn().mockResolvedValue(undefined),
      findMany: jest.fn().mockResolvedValue([outboxEvent]),
    },
    smsMessage: {
      update: jest.fn().mockResolvedValue(undefined),
      upsert: jest.fn().mockResolvedValue(outboxEvent.smsMessage),
    },
    $connect: jest.fn().mockResolvedValue(undefined),
    $disconnect: jest.fn().mockResolvedValue(undefined),
    $transaction: jest.fn(async (callback: (tx: any) => Promise<unknown>) =>
      callback({} as any),
    ),
  };
}
