import type { PrismaService } from '../database/prisma.service';
import { OutboxWorkerRuntime } from './outbox-worker.runtime';
import type { OutboxJobPayload } from './outbox.worker';

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
    const job: TestJob = {
      data: { id: 'outbox-1', tenantId: 'tenant-1' },
      discard: jest.fn(),
    };
    const runtime = new OutboxWorkerRuntime(
      prisma,
      runtimeConfig(),
      smsProvider,
    );
    const { outboxEventUpdate } = prisma;

    await runtimeWithHandleJob(runtime).handleJob(job);

    expect(smsProvider.send).not.toHaveBeenCalled();
    expect(job.discard).toHaveBeenCalledTimes(1);
    expect(outboxEventUpdate).toHaveBeenCalledTimes(1);
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
    const job: TestJob = {
      data: { id: 'outbox-1', tenantId: 'tenant-1' },
      discard: jest.fn(),
    };
    const runtime = new OutboxWorkerRuntime(
      prisma,
      runtimeConfig(),
      smsProvider,
    );

    await runtimeWithHandleJob(runtime).handleJob(job);

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
      prisma,
      runtimeConfig(),
      smsProvider,
    );

    await runtimeWithHandleJob(runtime).handleJob({
      data: { id: 'outbox-1', tenantId: 'tenant-1' },
    });

    expect(smsProvider.send).not.toHaveBeenCalled();
    expect(prisma.outboxEventUpdate).toHaveBeenCalledWith(
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
    });
    const smsProvider = {
      send: jest.fn().mockRejectedValue(new Error('provider down')),
    };
    const job: TestJob = {
      data: { id: 'outbox-1', tenantId: 'tenant-1' },
      discard: jest.fn(),
    };
    const runtime = new OutboxWorkerRuntime(
      prisma,
      runtimeConfig(),
      smsProvider,
    );

    await expect(runtimeWithHandleJob(runtime).handleJob(job)).rejects.toThrow(
      'provider down',
    );

    expect(prisma.smsMessageUpdateCalls[0]?.data.deadLetteredAt).toBeInstanceOf(
      Date,
    );
    expect(prisma.smsMessageUpdateCalls[0]?.data.failureCategory).toBe(
      'dead-lettered',
    );
    expect(prisma.smsMessageUpdateCalls[0]?.data.nextAttemptAt).toBeNull();
    expect(job.discard).toHaveBeenCalledTimes(1);
  });
});

type TestJob = {
  data: Pick<OutboxJobPayload, 'id' | 'tenantId'>;
  discard?: jest.Mock;
};

type RuntimeWithHandleJob = {
  handleJob(job: TestJob): Promise<void>;
};

function runtimeWithHandleJob(
  runtime: OutboxWorkerRuntime,
): RuntimeWithHandleJob {
  return runtime as unknown as RuntimeWithHandleJob;
}

function runtimeConfig() {
  return {
    redisUrl: 'redis://localhost:6379',
    publishBatchSize: 10,
    publishIntervalMs: 5_000,
    retryDelayMs: 30_000,
    recoveryThresholdMs: 60_000,
  };
}

type PrismaStubOverrides = {
  outboxEvent: {
    id: string;
    tenantId: string;
    aggregateType: string;
    aggregateId: string;
    eventType: string;
    payload: Record<string, unknown>;
    publishedAt: Date | null;
    smsMessage: {
      id: string;
      tenantId: string;
      receiptId: string;
      outboxEventId: string;
      phoneE164: string;
      template: string;
      payload: Record<string, unknown>;
      status: string;
      attempts: number;
      deadLetteredAt?: Date | null;
    };
  };
  smsMessage?: {
    update?: jest.Mock;
  };
};

type SmsMessageUpdateArgs = {
  data: {
    deadLetteredAt: Date;
    failureCategory: string;
    nextAttemptAt: null;
  };
};

type PrismaStub = PrismaService & {
  outboxEventUpdate: jest.Mock;
  smsMessageUpdate: jest.Mock;
  smsMessageUpdateCalls: SmsMessageUpdateArgs[];
};

function prismaStub(overrides: PrismaStubOverrides): PrismaStub {
  const { outboxEvent } = overrides;
  const outboxEventUpdate = jest.fn().mockResolvedValue(undefined);
  const smsMessageUpdateCalls: SmsMessageUpdateArgs[] = [];
  const smsMessageUpdate =
    overrides.smsMessage?.update ??
    jest.fn((args: SmsMessageUpdateArgs) => {
      smsMessageUpdateCalls.push(args);
      return Promise.resolve(undefined);
    });

  return {
    outboxEvent: {
      findUnique: jest.fn().mockResolvedValue(outboxEvent),
      update: outboxEventUpdate,
      updateMany: jest.fn().mockResolvedValue(undefined),
      findMany: jest.fn().mockResolvedValue([outboxEvent]),
    },
    smsMessage: {
      update: smsMessageUpdate,
      upsert: jest.fn().mockResolvedValue(outboxEvent.smsMessage),
    },
    $connect: jest.fn().mockResolvedValue(undefined),
    $disconnect: jest.fn().mockResolvedValue(undefined),
    $transaction: jest.fn(async (callback: (tx: never) => Promise<unknown>) =>
      callback(undefined as never),
    ),
    outboxEventUpdate,
    smsMessageUpdate,
    smsMessageUpdateCalls,
  } as unknown as PrismaStub;
}
