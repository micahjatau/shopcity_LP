import { AuditService } from '../audit/audit.service';
import { SystemActorService } from '../../common/system/system-actor.service';
import { CreditExpiryService } from './credit-expiry.service';

describe('CreditExpiryService', () => {
  it('returns an empty result when no due lots are found', async () => {
    const prisma = prismaStub({ lots: [] });
    const service = new CreditExpiryService(
      prisma as never,
      { recordWithClient: jest.fn() } as never,
      { getOrCreate: jest.fn() } as never,
    );

    await expect(
      service.expireDueCredit({
        now: new Date('2027-08-01T10:00:00.000Z'),
        batchSize: 10,
      }),
    ).resolves.toEqual({ examined: 0, expiredLots: 0, expiredAmountKobo: 0n });
  });

  it('expires locked due lots and reuses one system actor per tenant', async () => {
    const prisma = prismaStub({
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
    const auditService = { recordWithClient: jest.fn().mockResolvedValue({}) };
    const systemActorService = {
      getOrCreate: jest
        .fn()
        .mockResolvedValue({ id: 'system-user-id', tenantId: 'tenant-1' }),
    } satisfies Pick<SystemActorService, 'getOrCreate'>;
    const service = new CreditExpiryService(
      prisma as never,
      auditService as never,
      systemActorService as never,
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

    expect(systemActorService.getOrCreate).toHaveBeenCalledTimes(1);
    expect(prisma.loyaltyLedgerEntry.create).toHaveBeenCalledTimes(2);
    expect(prisma.creditExpiry.create).toHaveBeenCalledTimes(2);
    expect(prisma.creditLot.updateMany).toHaveBeenCalledTimes(2);
    expect(auditService.recordWithClient).toHaveBeenCalledTimes(2);
  });

  it('rejects invalid inputs before opening a transaction', async () => {
    const prisma = prismaStub({ lots: [] });
    const service = new CreditExpiryService(
      prisma as never,
      { recordWithClient: jest.fn() } as never,
      { getOrCreate: jest.fn() } as never,
    );

    await expect(
      service.expireDueCredit({ now: new Date('invalid'), batchSize: 1 }),
    ).rejects.toThrow(/valid Date/i);
    await expect(
      service.expireDueCredit({ now: new Date(), batchSize: 0 }),
    ).rejects.toThrow(/positive integer/i);
    expect(prisma.$transaction).not.toHaveBeenCalled();
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
  const tx = {
    $queryRaw: jest.fn().mockResolvedValue(lots),
    loyaltyLedgerEntry: {
      create: jest
        .fn()
        .mockImplementation(
          async ({ data }: { data: { correlationId: string } }) => ({
            id: `${data.correlationId}-ledger`,
          }),
        ),
    },
    creditExpiry: { create: jest.fn().mockResolvedValue({}) },
    creditLot: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
    user: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest
        .fn()
        .mockResolvedValue({ id: 'system-user-id', tenantId: 'tenant-1' }),
    },
    auditLog: { create: jest.fn().mockResolvedValue({}) },
  };

  return {
    $transaction: jest
      .fn()
      .mockImplementation(
        async (callback: (client: typeof tx) => Promise<unknown>) =>
          callback(tx),
      ),
    ...tx,
  };
}
