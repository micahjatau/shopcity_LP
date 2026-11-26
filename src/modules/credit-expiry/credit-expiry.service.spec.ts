import { Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { AuditService } from '../audit/audit.service';
import type { SystemActorService } from '../../common/system/system-actor.service';
import type { PrismaService } from '../../database/prisma.service';
import { CreditExpiryService } from './credit-expiry.service';

describe('CreditExpiryService', () => {
  afterEach(() => jest.restoreAllMocks());

  it('returns an empty result when no due lots are found', async () => {
    const { prisma } = prismaStub({ lots: [] });
    const auditService = {
      recordWithClient: jest.fn(),
    } as unknown as AuditService;
    const systemActorService = {
      getOrCreate: jest.fn(),
    } as unknown as SystemActorService;
    const service = new CreditExpiryService(
      prisma,
      auditService,
      systemActorService,
    );

    await expect(
      service.expireDueCredit({
        now: new Date('2027-08-01T10:00:00.000Z'),
        batchSize: 10,
      }),
    ).resolves.toEqual({ examined: 0, expiredLots: 0, expiredAmountKobo: 0n });
  });

  it('expires locked due lots and reuses one system actor per tenant', async () => {
    const {
      prisma,
      loyaltyLedgerEntryCreate,
      creditExpiryCreate,
      creditLotUpdateMany,
    } = prismaStub({
      lots: [
        {
          id: 'lot-1',
          tenantId: 'tenant-1',
          customerId: 'customer-1',
          remainingAmountKobo: 1000n,
          expiresAt: new Date('2027-08-01T10:00:00.000Z'),
        },
        {
          id: 'lot-2',
          tenantId: 'tenant-1',
          customerId: 'customer-2',
          remainingAmountKobo: 500n,
          expiresAt: new Date('2027-08-01T11:00:00.000Z'),
        },
      ],
    });
    const recordWithClient = jest.fn().mockResolvedValue({});
    const getOrCreate = jest
      .fn()
      .mockResolvedValue({ id: 'system-user-id', tenantId: 'tenant-1' });
    const auditService = {
      recordWithClient,
    } as unknown as AuditService;
    const systemActorService = {
      getOrCreate,
    } as unknown as SystemActorService;
    const service = new CreditExpiryService(
      prisma,
      auditService,
      systemActorService,
    );

    await expect(
      service.expireDueCredit({
        now: new Date('2027-08-01T12:00:00.000Z'),
        batchSize: 10,
      }),
    ).resolves.toEqual({
      examined: 2,
      expiredLots: 2,
      expiredAmountKobo: 1500n,
    });

    expect(getOrCreate).toHaveBeenCalledTimes(1);
    expect(loyaltyLedgerEntryCreate).toHaveBeenCalledTimes(2);
    expect(creditExpiryCreate).toHaveBeenCalledTimes(2);
    expect(creditLotUpdateMany).toHaveBeenCalledTimes(2);
    expect(recordWithClient).toHaveBeenCalledTimes(2);
  });

  it('rejects invalid inputs before opening a transaction', async () => {
    const { prisma, transaction } = prismaStub({ lots: [] });
    const auditService = {
      recordWithClient: jest.fn(),
    } as unknown as AuditService;
    const systemActorService = {
      getOrCreate: jest.fn(),
    } as unknown as SystemActorService;
    const service = new CreditExpiryService(
      prisma,
      auditService,
      systemActorService,
    );

    await expect(
      service.expireDueCredit({ now: new Date('invalid'), batchSize: 1 }),
    ).rejects.toThrow(/valid Date/i);
    await expect(
      service.expireDueCredit({ now: new Date(), batchSize: 0 }),
    ).rejects.toThrow(/positive integer/i);
    expect(transaction).not.toHaveBeenCalled();
  });

  it.each([
    'due_lot_selection',
    'system_actor_resolution',
    'ledger_entry_creation',
    'expiry_evidence_creation',
    'lot_balance_decrement',
    'audit_record_creation',
  ] as const)('logs sanitized failure diagnostics at %s', async (stage) => {
    const fixture = prismaStub({ lots: [dueLot()] });
    const error = Object.assign(
      new Error(
        'SQLSTATE 23503 constraint "CreditLot_tenantId_fkey"; alice@example.com +2348012345678 123e4567-e89b-12d3-a456-426614174000 SELECT * FROM "User" WHERE password=secret',
      ),
      {
        code: 'P2003',
        meta: {
          code: '23503',
          constraint: 'CreditLot_tenantId_fkey',
          modelName: 'CreditLot',
          query: 'INSERT ...',
          params: ['private-value'],
          password: 'private-value',
        },
      },
    );
    const recordWithClient = jest.fn().mockResolvedValue({});
    const getOrCreate = jest
      .fn()
      .mockResolvedValue({ id: 'system-user-id', tenantId: 'tenant-1' });

    switch (stage) {
      case 'due_lot_selection':
        fixture.tx.$queryRaw.mockRejectedValue(error);
        break;
      case 'system_actor_resolution':
        getOrCreate.mockRejectedValue(error);
        break;
      case 'ledger_entry_creation':
        fixture.loyaltyLedgerEntryCreate.mockRejectedValue(error);
        break;
      case 'expiry_evidence_creation':
        fixture.creditExpiryCreate.mockRejectedValue(error);
        break;
      case 'lot_balance_decrement':
        fixture.creditLotUpdateMany.mockRejectedValue(error);
        break;
      case 'audit_record_creation':
        recordWithClient.mockRejectedValue(error);
        break;
    }

    const service = new CreditExpiryService(
      fixture.prisma,
      { recordWithClient } as unknown as AuditService,
      { getOrCreate },
    );
    const loggerError = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);

    await expect(
      service.expireDueCredit({
        now: new Date('2027-08-01T12:00:00.000Z'),
        batchSize: 10,
      }),
    ).rejects.toBe(error);

    expect(loggerError).toHaveBeenCalledTimes(1);
    const diagnostic = parseDiagnostic(loggerError.mock.calls[0]?.[0]);
    expect(diagnostic).toMatchObject({
      event: 'credit_expiry_transaction_failed',
      attempt: 1,
      stage,
      phase: 'callback',
      errorClass: 'Error',
      reason: 'foreign_key_violation',
      prismaCode: 'P2003',
      sqlState: '23503',
      constraint: 'CreditLot_tenantId_fkey',
      model: 'CreditLot',
    });
    expect(diagnostic.durationMs).toEqual(expect.any(Number));
    expect(Object.keys(diagnostic).sort()).toEqual(
      [
        'attempt',
        'constraint',
        'durationMs',
        'errorClass',
        'event',
        'model',
        'phase',
        'prismaCode',
        'reason',
        'sqlState',
        'stage',
      ].sort(),
    );
    const serialized = JSON.stringify(diagnostic);
    for (const sensitiveValue of [
      'alice@example.com',
      '+2348012345678',
      '123e4567-e89b-12d3-a456-426614174000',
      'SELECT * FROM',
      'private-value',
      'password=secret',
    ]) {
      expect(serialized).not.toContain(sensitiveValue);
    }
    loggerError.mockRestore();
  });

  it('extracts only the SQLSTATE and routine from a database error message', async () => {
    const fixture = prismaStub({ lots: [dueLot()] });
    const error = Object.assign(
      new Error(
        'SQLSTATE 42883: function public.derive_credit_lot_expires_at(timestamp without time zone) does not exist; user@example.com query SELECT private_value',
      ),
      { name: 'PrismaClientUnknownRequestError' },
    );
    fixture.creditLotUpdateMany.mockRejectedValue(error);
    const loggerError = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    const service = new CreditExpiryService(
      fixture.prisma,
      {
        recordWithClient: jest.fn().mockResolvedValue({}),
      } as unknown as AuditService,
      {
        getOrCreate: jest
          .fn()
          .mockResolvedValue({ id: 'system-user-id', tenantId: 'tenant-1' }),
      },
    );

    await expect(
      service.expireDueCredit({
        now: new Date('2027-08-01T12:00:00.000Z'),
        batchSize: 10,
      }),
    ).rejects.toBe(error);

    const diagnostic = parseDiagnostic(loggerError.mock.calls[0]?.[0]);
    expect(diagnostic).toMatchObject({
      stage: 'lot_balance_decrement',
      phase: 'callback',
      errorClass: 'PrismaClientUnknownRequestError',
      sqlState: '42883',
      routine: 'derive_credit_lot_expires_at',
      reason: 'undefined_function',
    });
    expect(JSON.stringify(diagnostic)).not.toContain('user@example.com');
    expect(JSON.stringify(diagnostic)).not.toContain('SELECT private_value');
    loggerError.mockRestore();
  });

  it('classifies a failure after callback return as a commit failure', async () => {
    const fixture = prismaStub({ lots: [dueLot()] });
    const commitError = new Error('commit rejected');
    fixture.transaction.mockImplementationOnce(
      async (callback: (client: typeof fixture.tx) => Promise<unknown>) => {
        await callback(fixture.tx);
        throw commitError;
      },
    );
    const loggerError = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    const service = new CreditExpiryService(
      fixture.prisma,
      {
        recordWithClient: jest.fn().mockResolvedValue({}),
      } as unknown as AuditService,
      {
        getOrCreate: jest
          .fn()
          .mockResolvedValue({ id: 'system-user-id', tenantId: 'tenant-1' }),
      },
    );

    await expect(
      service.expireDueCredit({
        now: new Date('2027-08-01T12:00:00.000Z'),
        batchSize: 10,
      }),
    ).rejects.toBe(commitError);

    const diagnostic = parseDiagnostic(loggerError.mock.calls[0]?.[0]);
    expect(diagnostic).toMatchObject({
      stage: 'transaction_callback_return',
      phase: 'commit',
    });
    loggerError.mockRestore();
  });

  it('preserves bounded retry behavior for transaction conflicts', async () => {
    const fixture = prismaStub({ lots: [] });
    const conflict = new Prisma.PrismaClientKnownRequestError(
      'serialization conflict',
      { code: 'P2034', clientVersion: 'test' },
    );
    fixture.transaction.mockRejectedValueOnce(conflict);
    const loggerError = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    const service = new CreditExpiryService(
      fixture.prisma,
      { recordWithClient: jest.fn() } as unknown as AuditService,
      { getOrCreate: jest.fn() },
    );

    await expect(
      service.expireDueCredit({
        now: new Date('2027-08-01T12:00:00.000Z'),
        batchSize: 10,
      }),
    ).resolves.toEqual({ examined: 0, expiredLots: 0, expiredAmountKobo: 0n });

    expect(fixture.transaction).toHaveBeenCalledTimes(2);
    expect(loggerError).toHaveBeenCalledTimes(1);
    expect(parseDiagnostic(loggerError.mock.calls[0]?.[0])).toMatchObject({
      attempt: 1,
      stage: 'transaction_start',
      phase: 'callback',
      prismaCode: 'P2034',
      reason: 'transaction_conflict',
    });
    loggerError.mockRestore();
  });

  it('does not log a successful transaction', async () => {
    const fixture = prismaStub({ lots: [] });
    const loggerError = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    const service = new CreditExpiryService(
      fixture.prisma,
      { recordWithClient: jest.fn() } as unknown as AuditService,
      { getOrCreate: jest.fn() },
    );

    await service.expireDueCredit({
      now: new Date('2027-08-01T12:00:00.000Z'),
      batchSize: 10,
    });

    expect(loggerError).not.toHaveBeenCalled();
    loggerError.mockRestore();
  });

  it('preserves the original transaction error if logging fails', async () => {
    const fixture = prismaStub({ lots: [] });
    const transactionError = new Error('transaction failure');
    fixture.tx.$queryRaw.mockRejectedValue(transactionError);
    const loggerError = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => {
        throw new Error('logger failure');
      });
    const service = new CreditExpiryService(
      fixture.prisma,
      { recordWithClient: jest.fn() } as unknown as AuditService,
      { getOrCreate: jest.fn() },
    );

    await expect(
      service.expireDueCredit({
        now: new Date('2027-08-01T12:00:00.000Z'),
        batchSize: 10,
      }),
    ).rejects.toBe(transactionError);
    loggerError.mockRestore();
  });
});

function parseDiagnostic(entry: unknown): Record<string, unknown> {
  const parsed: unknown = JSON.parse(String(entry));
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new TypeError('Diagnostic log entry must be a JSON object');
  }
  return parsed as Record<string, unknown>;
}

function dueLot() {
  return {
    id: 'lot-1',
    tenantId: 'tenant-1',
    customerId: 'customer-1',
    remainingAmountKobo: 1000n,
    expiresAt: new Date('2027-08-01T10:00:00.000Z'),
  };
}

function prismaStub({
  lots,
}: {
  lots: Array<{
    id: string;
    tenantId: string;
    customerId: string;
    remainingAmountKobo: bigint;
    expiresAt: Date;
  }>;
}) {
  const loyaltyLedgerEntryCreate = jest
    .fn()
    .mockImplementation(({ data }: { data: { correlationId: string } }) => ({
      id: `${data.correlationId}-ledger`,
    }));
  const creditExpiryCreate = jest.fn().mockResolvedValue({});
  const creditLotUpdateMany = jest.fn().mockResolvedValue({ count: 1 });
  const tx = {
    $queryRaw: jest.fn().mockResolvedValue(lots),
    loyaltyLedgerEntry: {
      create: loyaltyLedgerEntryCreate,
    },
    creditExpiry: { create: creditExpiryCreate },
    creditLot: { updateMany: creditLotUpdateMany },
    user: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest
        .fn()
        .mockResolvedValue({ id: 'system-user-id', tenantId: 'tenant-1' }),
    },
    auditLog: { create: jest.fn().mockResolvedValue({}) },
  };
  const transaction = jest
    .fn()
    .mockImplementation(
      async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx),
    );

  const prisma = {
    $transaction: transaction,
    ...tx,
  } as unknown as PrismaService;

  return {
    prisma,
    tx,
    loyaltyLedgerEntryCreate,
    creditExpiryCreate,
    creditLotUpdateMany,
    transaction,
  };
}
