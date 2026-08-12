import type { AuditService } from '../audit/audit.service';
import type { SystemActorService } from '../../common/system/system-actor.service';
import type { PrismaService } from '../../database/prisma.service';
import { CreditExpiryService } from './credit-expiry.service';

describe('CreditExpiryService', () => {
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
});

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
    loyaltyLedgerEntryCreate,
    creditExpiryCreate,
    creditLotUpdateMany,
    transaction,
  };
}
