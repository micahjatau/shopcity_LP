import { ActiveBalanceService } from './active-balance.service';

describe('ActiveBalanceService', () => {
  it('sums only active positive lots for one customer', async () => {
    const prisma = prismaStub({ aggregateBalance: 1_500n });
    const service = new ActiveBalanceService(prisma as never);
    const now = new Date('2026-07-26T12:00:00.000Z');

    await expect(
      service.getActiveBalanceKobo('tenant-id', 'customer-id', now),
    ).resolves.toBe(1_500n);

    expect(prisma.creditLot.aggregate).toHaveBeenCalledWith({
      where: {
        tenantId: 'tenant-id',
        customerId: 'customer-id',
        remainingAmountKobo: { gt: 0 },
        expiresAt: { gt: now },
      },
      _sum: { remainingAmountKobo: true },
    });
  });

  it('returns zero when active lots are absent', async () => {
    const service = new ActiveBalanceService(
      prismaStub({ aggregateBalance: null }) as never,
    );

    await expect(
      service.getActiveBalanceKobo('tenant-id', 'customer-id'),
    ).resolves.toBe(0n);
  });

  it('loads batch balances for a bounded customer page', async () => {
    const prisma = prismaStub({
      groupRows: [
        { customerId: 'customer-1', _sum: { remainingAmountKobo: 1_500n } },
        { customerId: 'customer-2', _sum: { remainingAmountKobo: 0n } },
        { customerId: 'customer-3', _sum: { remainingAmountKobo: 750n } },
      ],
    });
    const service = new ActiveBalanceService(prisma as never);
    const now = new Date('2026-07-26T12:00:00.000Z');

    const balances = await service.getActiveBalancesKobo(
      'tenant-id',
      ['customer-1', 'customer-2', 'customer-3', 'customer-1'],
      now,
    );

    expect([...balances.entries()]).toEqual([
      ['customer-1', 1_500n],
      ['customer-2', 0n],
      ['customer-3', 750n],
    ]);
    expect(prisma.creditLot.groupBy).toHaveBeenCalledWith({
      by: ['customerId'],
      where: {
        tenantId: 'tenant-id',
        customerId: { in: ['customer-1', 'customer-2', 'customer-3'] },
        remainingAmountKobo: { gt: 0 },
        expiresAt: { gt: now },
      },
      _sum: { remainingAmountKobo: true },
    });
  });

  it('does not query for empty batch input', async () => {
    const prisma = prismaStub();
    const service = new ActiveBalanceService(prisma as never);

    await expect(
      service.getActiveBalancesKobo('tenant-id', []),
    ).resolves.toEqual(new Map());

    expect(prisma.creditLot.groupBy).not.toHaveBeenCalled();
  });
});

function prismaStub({
  aggregateBalance = 0n,
  groupRows = [],
}: {
  aggregateBalance?: bigint | null;
  groupRows?: Array<{
    customerId: string;
    _sum: { remainingAmountKobo: bigint | null };
  }>;
} = {}) {
  return {
    creditLot: {
      aggregate: jest.fn().mockResolvedValue({
        _sum: { remainingAmountKobo: aggregateBalance },
      }),
      groupBy: jest.fn().mockResolvedValue(groupRows),
    },
  };
}
