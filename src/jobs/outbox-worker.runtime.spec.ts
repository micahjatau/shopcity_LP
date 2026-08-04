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
    expect(outboxEventUpdate).toHaveBeenCalledTimes(2);
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
    expect(prisma.outboxEventUpdate).toHaveBeenCalledTimes(2);
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
          payload: {
            version: 1,
            receiptId: 'receipt-1',
            transactionId: 'ledger-1',
            customerId: 'customer-1',
            phoneE164: '+2348000000000',
            template: 'earn-confirmed',
            creditKobo: '125050',
          },
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

  it('dead-letters unsupported outbox event types', async () => {
    const prisma = prismaStub({
      outboxEvent: {
        id: 'outbox-unsupported',
        tenantId: 'tenant-1',
        aggregateType: 'receipt',
        aggregateId: 'receipt-1',
        eventType: 'receipt.capture',
        payload: { receiptId: 'receipt-1' },
        publishedAt: null,
        smsMessage: {
          id: 'sms-1',
          tenantId: 'tenant-1',
          receiptId: 'receipt-1',
          outboxEventId: 'outbox-unsupported',
          phoneE164: '+2348000000000',
          template: 'earn-confirmed',
          payload: {},
          status: 'FAILED',
          attempts: 0,
        },
      },
    });
    const runtime = new OutboxWorkerRuntime(prisma, runtimeConfig(), {
      send: jest.fn(),
    });
    const job: TestJob = {
      data: { id: 'outbox-unsupported', tenantId: 'tenant-1' },
      discard: jest.fn(),
    };

    await runtimeWithHandleJob(runtime).handleJob(job);

    expect(job.discard).toHaveBeenCalledTimes(1);
    expect(prisma.outboxEventUpdate).toHaveBeenCalledTimes(2);
  });

  it('dead-letters malformed SMS payloads', async () => {
    const prisma = prismaStub({
      outboxEvent: {
        id: 'outbox-invalid',
        tenantId: 'tenant-1',
        aggregateType: 'receipt',
        aggregateId: 'receipt-1',
        eventType: 'sms.send',
        payload: { receiptId: 'receipt-1' },
        publishedAt: null,
        smsMessage: null,
      },
    });
    const smsProvider = { send: jest.fn() };
    const runtime = new OutboxWorkerRuntime(
      prisma,
      runtimeConfig(),
      smsProvider,
    );
    const job: TestJob = {
      data: { id: 'outbox-invalid', tenantId: 'tenant-1' },
      discard: jest.fn(),
    };

    await runtimeWithHandleJob(runtime).handleJob(job);

    expect(job.discard).toHaveBeenCalledTimes(1);
    expect(smsProvider.send).not.toHaveBeenCalled();
    expect(prisma.outboxEventUpdate).toHaveBeenCalledTimes(2);
  });

  it('dead-letters existing malformed SMS rows without retrying delivery', async () => {
    const prisma = prismaStub({
      outboxEvent: {
        id: 'outbox-existing-invalid',
        tenantId: 'tenant-1',
        aggregateType: 'receipt',
        aggregateId: 'receipt-1',
        eventType: 'sms.send',
        payload: { receiptId: 'receipt-1' },
        publishedAt: null,
        smsMessage: {
          id: 'sms-existing-invalid',
          tenantId: 'tenant-1',
          receiptId: 'receipt-1',
          outboxEventId: 'outbox-existing-invalid',
          phoneE164: '+2348000000000',
          template: 'earn-confirmed',
          payload: {
            version: 1,
            receiptId: 'receipt-1',
            transactionId: 'ledger-1',
            customerId: 'customer-1',
            phoneE164: '+2348000000000',
            template: 'earn-confirmed',
          },
          status: 'FAILED',
          attempts: 0,
        },
      },
    });
    const smsProvider = { send: jest.fn() };
    const runtime = new OutboxWorkerRuntime(
      prisma,
      runtimeConfig(),
      smsProvider,
    );
    const job: TestJob = {
      data: { id: 'outbox-existing-invalid', tenantId: 'tenant-1' },
      discard: jest.fn(),
    };

    await runtimeWithHandleJob(runtime).handleJob(job);

    expect(job.discard).toHaveBeenCalledTimes(1);
    expect(smsProvider.send).not.toHaveBeenCalled();
    const invalidPayloadUpdate = prisma.smsMessageUpdateCalls[0];

    expect(invalidPayloadUpdate?.data.status).toBe('FAILED');
    expect(invalidPayloadUpdate?.data.nextAttemptAt).toBeNull();
    expect(invalidPayloadUpdate?.data.deadLetteredAt).toBeInstanceOf(Date);
    expect(invalidPayloadUpdate?.data.failureCategory).toBe('invalid-payload');
    expect(prisma.outboxEventUpdate).toHaveBeenCalledTimes(2);
  });

  it('dead-letters reconstructed SMS payloads without receipt IDs', async () => {
    const prisma = prismaStub({
      outboxEvent: {
        id: 'outbox-missing-receipt',
        tenantId: 'tenant-1',
        aggregateType: 'receipt',
        aggregateId: 'receipt-1',
        eventType: 'sms.send',
        payload: {
          version: 1,
          phoneE164: '+2348000000000',
          transactionId: 'ledger-1',
          template: 'earn-confirmed',
        },
        publishedAt: null,
        smsMessage: null,
      },
    });
    const smsProvider = { send: jest.fn() };
    const runtime = new OutboxWorkerRuntime(
      prisma,
      runtimeConfig(),
      smsProvider,
    );
    const job: TestJob = {
      data: { id: 'outbox-missing-receipt', tenantId: 'tenant-1' },
      discard: jest.fn(),
    };

    await runtimeWithHandleJob(runtime).handleJob(job);

    expect(job.discard).toHaveBeenCalledTimes(1);
    expect(prisma.smsMessageUpsert).not.toHaveBeenCalled();
    expect(smsProvider.send).not.toHaveBeenCalled();
    expect(prisma.outboxEventUpdateCalls[1]).toMatchObject({
      data: {
        status: 'FAILED',
        nextAttemptAt: null,
        failureCategory: 'invalid-payload',
      },
    });
  });

  it('reconstructs receipt-less SMS messages from transaction references', async () => {
    const prisma = prismaStub({
      outboxEvent: {
        id: 'outbox-adjustment',
        tenantId: 'tenant-1',
        aggregateType: 'adjustment',
        aggregateId: 'adjustment-1',
        eventType: 'sms.send',
        payload: {
          version: 1,
          transactionId: 'ledger-1',
          adjustmentId: 'adjustment-1',
          kind: 'CREDIT',
          phoneE164: '+2348000000000',
          template: 'balance-adjusted',
          amountKobo: '1200',
        },
        publishedAt: null,
        smsMessage: null,
      },
    });
    prisma.smsMessageUpsert.mockResolvedValueOnce({
      id: 'sms-adjustment',
      tenantId: 'tenant-1',
      receiptId: null,
      ledgerEntryId: 'ledger-1',
      adjustmentId: 'adjustment-1',
      outboxEventId: 'outbox-adjustment',
      phoneE164: '+2348000000000',
      template: 'balance-adjusted',
      payload: {
        version: 1,
        receiptId: null,
        transactionId: 'ledger-1',
        adjustmentId: 'adjustment-1',
        kind: 'CREDIT',
        phoneE164: '+2348000000000',
        template: 'balance-adjusted',
        amountKobo: '1200',
      },
      status: 'QUEUED',
      attempts: 0,
    });
    const smsProvider = {
      send: jest.fn().mockResolvedValue({ status: 'SENT' }),
    };
    const runtime = new OutboxWorkerRuntime(
      prisma,
      runtimeConfig(),
      smsProvider,
    );

    await runtimeWithHandleJob(runtime).handleJob({
      data: { id: 'outbox-adjustment', tenantId: 'tenant-1' },
    });

    expect(prisma.smsMessageUpsert).toHaveBeenCalledWith({
      where: {
        tenantId_outboxEventId: {
          tenantId: 'tenant-1',
          outboxEventId: 'outbox-adjustment',
        },
      },
      create: expect.objectContaining({
        receiptId: null,
        ledgerEntryId: 'ledger-1',
        adjustmentId: 'adjustment-1',
        template: 'balance-adjusted',
      }) as Record<string, unknown>,
      update: {},
    });
    expect(smsProvider.send).toHaveBeenCalledWith(
      expect.objectContaining({
        receiptId: null,
        outboxEventId: 'outbox-adjustment',
      }),
    );
    expect(prisma.smsMessageUpdateCalls[0]).toMatchObject({
      where: {
        tenantId_outboxEventId: {
          tenantId: 'tenant-1',
          outboxEventId: 'outbox-adjustment',
        },
      },
    });
  });

  it('waits for active recovery before disconnecting during shutdown', async () => {
    const prisma = prismaStub({
      outboxEvent: {
        id: 'outbox-1',
        tenantId: 'tenant-1',
        aggregateType: 'receipt',
        aggregateId: 'receipt-1',
        eventType: 'sms.send',
        payload: { receiptId: 'receipt-1' },
        publishedAt: null,
        smsMessage: null,
      },
    });
    const runtime = runtimeWithInternals(
      new OutboxWorkerRuntime(prisma, runtimeConfig(), { send: jest.fn() }),
    );
    const recovery = deferred<void>();

    runtime.activeRecovery = recovery.promise;
    const stopPromise = runtime.stop();

    await Promise.resolve();
    expect(prisma.prismaDisconnect).not.toHaveBeenCalled();

    recovery.resolve();
    await stopPromise;

    expect(prisma.prismaDisconnect).not.toHaveBeenCalled();
  });
});

type TestJob = {
  data: Pick<OutboxJobPayload, 'id' | 'tenantId'>;
  discard?: jest.Mock;
};

type RuntimeWithHandleJob = {
  handleJob(job: TestJob): Promise<void>;
};

type RuntimeWithInternals = {
  activeRecovery?: Promise<void>;
  stop(): Promise<void>;
};

function runtimeWithHandleJob(
  runtime: OutboxWorkerRuntime,
): RuntimeWithHandleJob {
  return runtime as unknown as RuntimeWithHandleJob;
}

function runtimeWithInternals(
  runtime: OutboxWorkerRuntime,
): RuntimeWithInternals {
  return runtime as unknown as RuntimeWithInternals;
}

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });

  return { promise, resolve, reject };
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
      receiptId: string | null;
      ledgerEntryId?: string | null;
      redemptionId?: string | null;
      adjustmentId?: string | null;
      outboxEventId: string;
      phoneE164: string;
      template: string;
      payload: Record<string, unknown>;
      status: string;
      attempts: number;
      deadLetteredAt?: Date | null;
    } | null;
  };
  smsMessage?: {
    update?: jest.Mock;
  };
};

type SmsMessageUpdateArgs = {
  where?: unknown;
  data: {
    status?: string;
    deadLetteredAt?: Date;
    failureCategory?: string;
    nextAttemptAt?: null;
  };
};

type PrismaStub = PrismaService & {
  outboxEventUpdate: jest.Mock;
  outboxEventUpdateCalls: Array<unknown>;
  smsMessageUpdate: jest.Mock;
  smsMessageUpdateCalls: SmsMessageUpdateArgs[];
  smsMessageUpsert: jest.Mock;
  prismaDisconnect: jest.Mock;
};

function prismaStub(overrides: PrismaStubOverrides): PrismaStub {
  const { outboxEvent } = overrides;
  const outboxEventUpdateCalls: Array<unknown> = [];
  const outboxEventUpdate = jest.fn((args: unknown) => {
    outboxEventUpdateCalls.push(args);
    return Promise.resolve(undefined);
  });
  const smsMessageUpdateCalls: SmsMessageUpdateArgs[] = [];
  const smsMessageUpdate =
    overrides.smsMessage?.update ??
    jest.fn((args: SmsMessageUpdateArgs) => {
      smsMessageUpdateCalls.push(args);
      return Promise.resolve(undefined);
    });
  const smsMessageUpsert = jest.fn().mockResolvedValue(outboxEvent.smsMessage);
  const prismaDisconnect = jest.fn().mockResolvedValue(undefined);

  return {
    outboxEvent: {
      findUnique: jest.fn().mockResolvedValue(outboxEvent),
      update: outboxEventUpdate,
      updateMany: jest.fn().mockResolvedValue(undefined),
      findMany: jest.fn().mockResolvedValue([outboxEvent]),
    },
    smsMessage: {
      update: smsMessageUpdate,
      upsert: smsMessageUpsert,
    },
    $connect: jest.fn().mockResolvedValue(undefined),
    $disconnect: prismaDisconnect,
    $transaction: jest.fn(async (callback: (tx: never) => Promise<unknown>) =>
      callback(undefined as never),
    ),
    outboxEventUpdate,
    outboxEventUpdateCalls,
    smsMessageUpdate,
    smsMessageUpdateCalls,
    smsMessageUpsert,
    prismaDisconnect,
  } as unknown as PrismaStub;
}
