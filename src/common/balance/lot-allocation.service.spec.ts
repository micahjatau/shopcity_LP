import { HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DomainHttpException } from '../errors/domain.exception';
import { LotAllocationService } from './lot-allocation.service';

describe('LotAllocationService', () => {
  it('persists FIFO allocations and conditionally decrements lots', async () => {
    const expiresAt = new Date('2027-01-15T10:00:00.000Z');
    const prisma = prismaStub({
      lots: [
        { id: 'lot-1', remainingAmountKobo: 300n, expiresAt },
        { id: 'lot-2', remainingAmountKobo: 500n, expiresAt },
      ],
    });
    const service = new LotAllocationService();

    await expect(
      service.allocateDebit(prisma, {
        tenantId: 'tenant-id',
        customerId: 'customer-id',
        debitLedgerEntryId: 'ledger-id',
        redemptionId: 'redemption-id',
        amountKobo: 650n,
        now: new Date('2026-07-26T12:00:00.000Z'),
      }),
    ).resolves.toEqual([
      {
        creditLotId: 'lot-1',
        amountKobo: 300n,
        allocationOrder: 1,
        expiresAt,
      },
      {
        creditLotId: 'lot-2',
        amountKobo: 350n,
        allocationOrder: 2,
        expiresAt,
      },
    ]);

    expect(prisma.redemptionAllocation.createMany).toHaveBeenCalledWith({
      data: [
        {
          tenantId: 'tenant-id',
          redemptionId: 'redemption-id',
          adjustmentId: undefined,
          redemptionLedgerEntryId: 'ledger-id',
          creditLotId: 'lot-1',
          amountKobo: 300n,
          allocationOrder: 1,
        },
        {
          tenantId: 'tenant-id',
          redemptionId: 'redemption-id',
          adjustmentId: undefined,
          redemptionLedgerEntryId: 'ledger-id',
          creditLotId: 'lot-2',
          amountKobo: 350n,
          allocationOrder: 2,
        },
      ],
    });
    expect(prisma.creditLot.updateMany).toHaveBeenCalledTimes(2);
  });

  it('allocates from a specific credit lot without FIFO fallback', async () => {
    const expiresAt = new Date('2027-01-15T10:00:00.000Z');
    const prisma = prismaStub({
      lots: [{ id: 'lot-2', remainingAmountKobo: 400n, expiresAt }],
    });
    const service = new LotAllocationService();

    await expect(
      service.allocateDebitFromExactLot(prisma, {
        tenantId: 'tenant-id',
        customerId: 'customer-id',
        creditLotId: 'lot-2',
        debitLedgerEntryId: 'ledger-id',
        adjustmentId: 'adjustment-id',
        amountKobo: 250n,
        now: new Date('2026-07-26T12:00:00.000Z'),
      }),
    ).resolves.toEqual([
      {
        creditLotId: 'lot-2',
        amountKobo: 250n,
        allocationOrder: 1,
        expiresAt,
      },
    ]);

    expect(prisma.redemptionAllocation.createMany).toHaveBeenCalledWith({
      data: [
        {
          tenantId: 'tenant-id',
          redemptionId: undefined,
          adjustmentId: 'adjustment-id',
          redemptionLedgerEntryId: 'ledger-id',
          creditLotId: 'lot-2',
          amountKobo: 250n,
          allocationOrder: 1,
        },
      ],
    });
    expect(prisma.creditLot.updateMany).toHaveBeenCalledTimes(1);
  });

  it('rejects insufficient active balance without writing allocations', async () => {
    const prisma = prismaStub({
      lots: [
        {
          id: 'lot-1',
          remainingAmountKobo: 300n,
          expiresAt: new Date('2027-01-15T10:00:00.000Z'),
        },
      ],
    });
    const service = new LotAllocationService();

    await expect(
      service.allocateDebit(prisma, {
        tenantId: 'tenant-id',
        customerId: 'customer-id',
        debitLedgerEntryId: 'ledger-id',
        adjustmentId: 'adjustment-id',
        amountKobo: 500n,
      }),
    ).rejects.toMatchObject({
      status: HttpStatus.UNPROCESSABLE_ENTITY,
      response: { code: 'INSUFFICIENT_BALANCE' },
    });
    expect(prisma.redemptionAllocation.createMany).not.toHaveBeenCalled();
  });

  it('rejects invalid allocation input', async () => {
    const service = new LotAllocationService();

    await expect(
      service.allocateDebit(prismaStub(), {
        tenantId: 'tenant-id',
        customerId: 'customer-id',
        debitLedgerEntryId: 'ledger-id',
        redemptionId: 'redemption-id',
        amountKobo: 0n,
      }),
    ).rejects.toBeInstanceOf(DomainHttpException);

    await expect(
      service.allocateDebit(prismaStub(), {
        tenantId: 'tenant-id',
        customerId: 'customer-id',
        debitLedgerEntryId: 'ledger-id',
        amountKobo: 100n,
      }),
    ).rejects.toMatchObject({
      response: { code: 'VALIDATION_ERROR' },
    });

    await expect(
      service.allocateDebit(prismaStub(), {
        tenantId: 'tenant-id',
        customerId: 'customer-id',
        debitLedgerEntryId: 'ledger-id',
        redemptionId: 'redemption-id',
        adjustmentId: 'adjustment-id',
        amountKobo: 100n,
      }),
    ).rejects.toMatchObject({
      response: { code: 'VALIDATION_ERROR' },
    });
  });

  it('maps conditional lot update miss to a transaction conflict', async () => {
    const prisma = prismaStub({
      lots: [
        {
          id: 'lot-1',
          remainingAmountKobo: 300n,
          expiresAt: new Date('2027-01-15T10:00:00.000Z'),
        },
      ],
      updateCount: 0,
    });
    const service = new LotAllocationService();

    await expect(
      service.allocateDebit(prisma, {
        tenantId: 'tenant-id',
        customerId: 'customer-id',
        debitLedgerEntryId: 'ledger-id',
        redemptionId: 'redemption-id',
        amountKobo: 300n,
      }),
    ).rejects.toMatchObject({
      status: HttpStatus.SERVICE_UNAVAILABLE,
      response: { code: 'REDEMPTION_TRANSACTION_CONFLICT' },
    });
  });

  it('plans restorations without mutating original allocations', async () => {
    const expiresAt = new Date('2027-01-15T10:00:00.000Z');
    const prisma = prismaStub({
      allocations: [
        {
          id: 'allocation-1',
          creditLotId: 'lot-1',
          amountKobo: 500n,
          creditLot: { expiresAt },
          restorations: [{ amountKobo: 200n }],
        },
      ],
    });
    const service = new LotAllocationService();

    await expect(
      service.planRestorations(prisma, {
        tenantId: 'tenant-id',
        debitLedgerEntryId: 'ledger-id',
        now: new Date('2026-07-26T12:00:00.000Z'),
      }),
    ).resolves.toEqual([
      {
        allocationId: 'allocation-1',
        creditLotId: 'lot-1',
        amountKobo: 300n,
        expiresAt,
      },
    ]);

    expect(prisma.redemptionAllocation.findMany).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-id', redemptionLedgerEntryId: 'ledger-id' },
      orderBy: { allocationOrder: 'asc' },
      select: {
        id: true,
        creditLotId: true,
        amountKobo: true,
        creditLot: { select: { expiresAt: true } },
        restorations: { select: { amountKobo: true } },
      },
    });
    expect(prisma.redemptionAllocation.createMany).not.toHaveBeenCalled();
  });

  it('requires review when a source lot is expired', async () => {
    const prisma = prismaStub({
      allocations: [
        {
          id: 'allocation-1',
          creditLotId: 'lot-1',
          amountKobo: 500n,
          creditLot: { expiresAt: new Date('2026-01-15T10:00:00.000Z') },
          restorations: [],
        },
      ],
    });
    const service = new LotAllocationService();

    await expect(
      service.planRestorations(prisma, {
        tenantId: 'tenant-id',
        debitLedgerEntryId: 'ledger-id',
        now: new Date('2026-07-26T12:00:00.000Z'),
      }),
    ).rejects.toMatchObject({
      status: HttpStatus.UNPROCESSABLE_ENTITY,
      response: { code: 'REVERSAL_REVIEW_REQUIRED' },
    });
  });

  it('locks eligible lots with FIFO ordering and positive-balance filtering', async () => {
    const prisma = prismaStub({
      lots: [
        {
          id: 'lot-1',
          remainingAmountKobo: 300n,
          expiresAt: new Date('2027-01-15T10:00:00.000Z'),
        },
      ],
    });
    const service = new LotAllocationService();

    await service.allocateDebit(prisma, {
      tenantId: 'tenant-id',
      customerId: 'customer-id',
      debitLedgerEntryId: 'ledger-id',
      adjustmentId: 'adjustment-id',
      amountKobo: 100n,
    });

    const queryRawMock = prisma.$queryRaw as unknown as {
      mock: { calls: Array<[Prisma.Sql]> };
    };
    const queryText = queryRawMock.mock.calls[0][0].strings.join(' ');

    expect(queryText).toContain('"remainingAmountKobo" > 0');
    expect(queryText).toContain(
      'ORDER BY "expiresAt" ASC, "earnedAt" ASC, "id" ASC',
    );
    expect(queryText).toContain('FOR UPDATE');
  });
});

type PrismaStub = {
  $queryRaw: jest.Mock;
  redemptionAllocation: {
    createMany: jest.Mock;
    findMany: jest.Mock;
  };
  creditLot: {
    updateMany: jest.Mock;
  };
};

function prismaStub({
  lots = [],
  updateCount = 1,
  allocations = [],
}: {
  lots?: Array<{ id: string; remainingAmountKobo: bigint; expiresAt: Date }>;
  updateCount?: number;
  allocations?: Array<{
    id: string;
    creditLotId: string;
    amountKobo: bigint;
    creditLot: { expiresAt: Date };
    restorations: Array<{ amountKobo: bigint }>;
  }>;
} = {}): PrismaStub {
  return {
    $queryRaw: jest.fn().mockResolvedValue(lots),
    redemptionAllocation: {
      createMany: jest.fn().mockResolvedValue({ count: lots.length }),
      findMany: jest.fn().mockResolvedValue(allocations),
    },
    creditLot: {
      updateMany: jest.fn().mockResolvedValue({ count: updateCount }),
    },
  };
}
