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

  it('evaluates fraud work from a dedicated outbox event', async () => {
    const prisma = prismaStub({
      outboxEvent: {
        id: 'outbox-fraud-evaluate',
        tenantId: 'tenant-1',
        aggregateType: 'receipt',
        aggregateId: 'receipt-fraud-1',
        eventType: 'fraud.evaluate',
        payload: {
          ruleCode: 'FR-DUP-001',
          originalReceiptId: 'receipt-fraud-1',
          duplicateReceiptId: 'duplicate-receipt-1',
          branchId: 'branch-1',
          cashierId: 'cashier-1',
          customerId: 'customer-1',
          normalizedPosReceiptNumber: 'POS-001',
          receiptWeekStart: '2026-08-10T00:00:00.000Z',
          occurredAt: '2026-08-10T10:00:00.000Z',
        },
        publishedAt: null,
        smsMessage: null,
      },
      receipt: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'receipt-fraud-1',
          tenantId: 'tenant-1',
          branchId: 'branch-1',
          customerId: 'customer-1',
          cardId: 'card-1',
          deviceId: 'device-1',
          posReceiptNumber: 'POS-001',
          normalizedPosReceiptNumber: 'POS-001',
          receiptWeekStart: new Date('2026-08-10T00:00:00.000Z'),
          purchaseAmountKobo: BigInt(125050),
          occurredAt: new Date('2026-08-10T10:00:00.000Z'),
          capturedBy: 'cashier-1',
        }),
        count: jest.fn().mockResolvedValue(2),
      },
    });
    const runtime = new OutboxWorkerRuntime(prisma, runtimeConfig(), {
      send: jest.fn(),
    });

    await runtimeWithHandleJob(runtime).handleJob({
      data: { id: 'outbox-fraud-evaluate', tenantId: 'tenant-1' },
    });

    expect(prisma.receiptFindUnique).not.toHaveBeenCalled();
    expect(prisma.receiptCount).not.toHaveBeenCalled();
    expect(prisma.fraudFlagUpsert).toHaveBeenCalledTimes(1);
    expect(prisma.fraudFlagUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          tenantId_dedupeKey: {
            tenantId: 'tenant-1',
            dedupeKey: 'FR-DUP-001:branch-1:POS-001:2026-08-10T00:00:00.000Z',
          },
        },
      }),
    );
    const duplicateOutboxUpdate = lastOutboxUpdate(
      prisma.outboxEventUpdateCalls,
    );
    expect(duplicateOutboxUpdate?.data.status).toBe('COMPLETED');
    expect(duplicateOutboxUpdate?.data.processedAt).toBeInstanceOf(Date);
  });

  it('evaluates high-value redemption fraud from a dedicated outbox event', async () => {
    const prisma = prismaStub({
      outboxEvent: {
        id: 'outbox-redemption-fraud-evaluate',
        tenantId: 'tenant-1',
        aggregateType: 'redemption',
        aggregateId: 'redemption-1',
        eventType: 'fraud.evaluate',
        payload: { redemptionId: 'redemption-1' },
        publishedAt: null,
        smsMessage: null,
      },
      redemption: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'redemption-1',
          tenantId: 'tenant-1',
          branchId: 'branch-1',
          customerId: 'customer-1',
          requestedBy: 'cashier-1',
          requestedAmountKobo: BigInt(600_000),
          requestedAt: new Date('2026-08-10T11:00:00.000Z'),
          receiptId: 'receipt-1',
        }),
      },
    });
    const runtime = new OutboxWorkerRuntime(prisma, runtimeConfig(), {
      send: jest.fn(),
    });

    await runtimeWithHandleJob(runtime).handleJob({
      data: { id: 'outbox-redemption-fraud-evaluate', tenantId: 'tenant-1' },
    });

    expect(prisma.fraudFlagUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          tenantId_dedupeKey: {
            tenantId: 'tenant-1',
            dedupeKey: 'FR-HV-003:redemption-1',
          },
        },
      }),
    );
    const redemptionOutboxUpdate = lastOutboxUpdate(
      prisma.outboxEventUpdateCalls,
    );
    expect(redemptionOutboxUpdate?.data.status).toBe('COMPLETED');
    expect(redemptionOutboxUpdate?.data.processedAt).toBeInstanceOf(Date);
  });

  it('processes report refresh events through the report materializer', async () => {
    const reportMaterializerService = {
      rebuildTenant: jest
        .fn<Promise<void>, [string, { materializedAt: Date }]>()
        .mockResolvedValue(undefined),
      materializeBranch: jest
        .fn<Promise<void>, [string, string, { materializedAt: Date }]>()
        .mockResolvedValue(undefined),
    };
    const prisma = prismaStub({
      outboxEvent: {
        id: 'outbox-report-refresh',
        tenantId: 'tenant-1',
        aggregateType: 'report',
        aggregateId: 'executive-summary',
        eventType: 'report.refresh',
        payload: {
          version: 1,
          report: 'executive-summary',
          branchId: null,
          timezone: 'Africa/Lagos',
        },
        publishedAt: null,
        smsMessage: null,
      },
    });
    const runtime = new OutboxWorkerRuntime(
      prisma,
      runtimeConfig(),
      { send: jest.fn() },
      undefined,
      reportMaterializerService as never,
    );

    await runtimeWithHandleJob(runtime).handleJob({
      data: { id: 'outbox-report-refresh', tenantId: 'tenant-1' },
    });

    const rebuildArgs = reportMaterializerService.rebuildTenant.mock.calls[0];
    if (!rebuildArgs) {
      throw new Error('expected report refresh to call rebuildTenant');
    }
    expect(rebuildArgs[0]).toBe('tenant-1');
    expect(rebuildArgs[1].materializedAt).toBeInstanceOf(Date);
    const reportOutboxUpdate = lastOutboxUpdate(prisma.outboxEventUpdateCalls);
    expect(reportOutboxUpdate?.data.status).toBe('COMPLETED');
    expect(reportOutboxUpdate?.data.processedAt).toBeInstanceOf(Date);
  });

  it('includes report.refresh in recovery eligibility', async () => {
    const prisma = prismaStub({
      outboxEvent: {
        id: 'outbox-report-refresh',
        tenantId: 'tenant-1',
        aggregateType: 'report',
        aggregateId: 'executive-summary',
        eventType: 'report.refresh',
        payload: {
          version: 1,
          report: 'executive-summary',
          branchId: null,
          timezone: 'Africa/Lagos',
        },
        publishedAt: null,
        smsMessage: null,
      },
    });
    const queryRaw = jest.fn((strings: TemplateStringsArray) => {
      void strings;
      return Promise.resolve([]);
    });
    const tx: RecoveryTx = {
      $queryRaw: queryRaw,
      outboxEvent: {
        updateMany: jest.fn().mockResolvedValue(undefined),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn().mockResolvedValue(undefined),
      },
    };
    const prismaWithTransaction = {
      ...prisma,
      $transaction: jest.fn(
        async (callback: (tx: RecoveryTx) => Promise<unknown>) => callback(tx),
      ),
    } as unknown as PrismaService;
    const runtime = new OutboxWorkerRuntime(
      prismaWithTransaction,
      runtimeConfig(),
      {
        send: jest.fn(),
      },
    );
    runtimeWithQueue(runtime).queue = {};

    await runtimeWithRecovery(runtime).recoverAndPublishOnce();

    expect(queryRaw).toHaveBeenCalled();
    const firstCall = queryRaw.mock.calls[0];
    if (!firstCall) {
      throw new Error('expected recovery query to be executed');
    }
    const querySql = firstCall[0];
    const sql = querySql.join('');
    expect(sql).toContain("'report.refresh'");
    expect(sql).toContain('"processedAt" IS NULL');
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

type RuntimeWithRecovery = {
  recoverAndPublishOnce(): Promise<void>;
};

type RecoveryTx = {
  $queryRaw: jest.Mock<Promise<unknown[]>, [TemplateStringsArray]>;
  outboxEvent: {
    updateMany: jest.Mock;
    findMany: jest.Mock;
    update: jest.Mock;
  };
};

type RuntimeWithInternals = {
  activeRecovery?: Promise<void>;
  stop(): Promise<void>;
};

type RuntimeWithQueue = {
  queue?: unknown;
};

function runtimeWithHandleJob(
  runtime: OutboxWorkerRuntime,
): RuntimeWithHandleJob {
  return runtime as unknown as RuntimeWithHandleJob;
}

function runtimeWithRecovery(
  runtime: OutboxWorkerRuntime,
): RuntimeWithRecovery {
  return runtime as unknown as RuntimeWithRecovery;
}

function runtimeWithInternals(
  runtime: OutboxWorkerRuntime,
): RuntimeWithInternals {
  return runtime as unknown as RuntimeWithInternals;
}

function runtimeWithQueue(runtime: OutboxWorkerRuntime): RuntimeWithQueue {
  return runtime as unknown as RuntimeWithQueue;
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

function lastOutboxUpdate(
  calls: OutboxEventUpdateArgs[],
): OutboxEventUpdateArgs | undefined {
  return calls[calls.length - 1];
}

function defaultReceipt(outboxEvent: PrismaStubOverrides['outboxEvent']) {
  return {
    id: outboxEvent.aggregateId,
    tenantId: outboxEvent.tenantId,
    branchId: 'branch-1',
    customerId: 'customer-1',
    cardId: 'card-1',
    deviceId: 'device-1',
    posReceiptNumber: 'POS-001',
    normalizedPosReceiptNumber: 'POS-001',
    receiptWeekStart: new Date('2026-08-10T00:00:00.000Z'),
    purchaseAmountKobo: BigInt(125050),
    occurredAt: new Date('2026-08-10T10:00:00.000Z'),
    capturedBy: 'cashier-1',
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
  receipt?: {
    findUnique?: jest.Mock;
    count?: jest.Mock;
  };
  redemption?: {
    findUnique?: jest.Mock;
  };
  fraudFlag?: {
    upsert?: jest.Mock;
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

type OutboxEventUpdateArgs = {
  data: {
    status?: string;
    processedAt?: Date;
    nextAttemptAt?: Date | null;
    failureCategory?: string;
    deadLetteredAt?: Date | null;
  };
};

type PrismaStub = PrismaService & {
  outboxEventUpdate: jest.Mock;
  outboxEventUpdateCalls: OutboxEventUpdateArgs[];
  receiptFindUnique: jest.Mock;
  receiptCount: jest.Mock;
  redemptionFindUnique: jest.Mock;
  fraudFlagUpsert: jest.Mock;
  smsMessageUpdate: jest.Mock;
  smsMessageUpdateCalls: SmsMessageUpdateArgs[];
  smsMessageUpsert: jest.Mock;
  prismaDisconnect: jest.Mock;
};

function prismaStub(overrides: PrismaStubOverrides): PrismaStub {
  const { outboxEvent } = overrides;
  const outboxEventUpdateCalls: OutboxEventUpdateArgs[] = [];
  const outboxEventUpdate = jest.fn((args: OutboxEventUpdateArgs) => {
    outboxEventUpdateCalls.push(args);
    return Promise.resolve(undefined);
  });
  const receiptFindUnique =
    overrides.receipt?.findUnique ??
    jest.fn().mockResolvedValue(defaultReceipt(outboxEvent));
  const receiptCount =
    overrides.receipt?.count ?? jest.fn().mockResolvedValue(1);
  const redemptionFindUnique =
    overrides.redemption?.findUnique ?? jest.fn().mockResolvedValue(null);
  const fraudFlagUpsert =
    overrides.fraudFlag?.upsert ?? jest.fn().mockResolvedValue(undefined);
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
    receipt: {
      findUnique: receiptFindUnique,
      count: receiptCount,
    },
    redemption: {
      findUnique: redemptionFindUnique,
    },
    fraudFlag: {
      upsert: fraudFlagUpsert,
    },
    smsMessage: {
      update: smsMessageUpdate,
      upsert: smsMessageUpsert,
    },
    $connect: jest.fn().mockResolvedValue(undefined),
    $disconnect: prismaDisconnect,
    $transaction: jest.fn(async (callback: (tx: never) => Promise<unknown>) =>
      callback({
        fraudFlag: { upsert: fraudFlagUpsert },
        outboxEvent: {
          findUnique: jest.fn().mockResolvedValue(outboxEvent),
          update: outboxEventUpdate,
        },
        $queryRaw: jest.fn().mockResolvedValue([{ one: 1 }]),
      } as never),
    ),
    outboxEventUpdate,
    outboxEventUpdateCalls,
    receiptFindUnique,
    receiptCount,
    redemptionFindUnique,
    fraudFlagUpsert,
    smsMessageUpdate,
    smsMessageUpdateCalls,
    smsMessageUpsert,
    prismaDisconnect,
  } as unknown as PrismaStub;
}
