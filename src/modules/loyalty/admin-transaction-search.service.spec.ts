import { ForbiddenException } from '@nestjs/common';
import { LedgerEntryType, Prisma, UserRole } from '@prisma/client';
import type { AuthContext } from '../../common/auth/session.types';
import { encodeCursor } from '../../common/pagination/cursor-pagination';
import { PrismaService } from '../../database/prisma.service';
import { AdminTransactionSearchService } from './admin-transaction-search.service';

const adminActor = {
  user: {
    id: 'admin-1',
    tenantId: 'tenant-1',
    role: UserRole.ADMIN,
    branchId: null,
  },
} as AuthContext;

function makeEntry(id = 'ledger-1') {
  return {
    id,
    type: LedgerEntryType.EARN,
    amountKobo: 500n,
    effectiveAt: new Date('2026-11-12T10:00:00.000Z'),
    reversedByEntries: [],
    receipt: {
      posReceiptNumber: 'R-001',
      purchaseAmountKobo: 10_000n,
      customer: { fullName: 'Michael Adeyemi' },
    },
  };
}

function setup(entries = [makeEntry()]) {
  let capturedLedgerQuery: Prisma.LoyaltyLedgerEntryFindManyArgs | undefined;
  let capturedStaffQuery: Prisma.UserFindManyArgs | undefined;
  const findTransactions = jest.fn(
    (query: Prisma.LoyaltyLedgerEntryFindManyArgs) => {
      capturedLedgerQuery = query;
      return Promise.resolve(entries);
    },
  );
  const findStaff = jest.fn((query: Prisma.UserFindManyArgs) => {
    capturedStaffQuery = query;
    return Promise.resolve([
      { id: 'staff-1', username: 'cashier@example.test' },
    ]);
  });
  const prisma = {
    loyaltyLedgerEntry: { findMany: findTransactions },
    user: { findMany: findStaff },
  } as unknown as PrismaService;

  return {
    service: new AdminTransactionSearchService(prisma),
    findTransactions,
    findStaff,
    getLedgerQuery: () => capturedLedgerQuery,
    getStaffQuery: () => capturedStaffQuery,
  };
}

describe('AdminTransactionSearchService', () => {
  it('rejects non-Admin actors before querying', async () => {
    const { service, findTransactions, findStaff } = setup();
    const supervisor = {
      ...adminActor,
      user: { ...adminActor.user, role: UserRole.SUPERVISOR },
    } as AuthContext;

    await expect(
      service.searchTransactions('tenant-1', supervisor),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(findTransactions).not.toHaveBeenCalled();
    expect(findStaff).not.toHaveBeenCalled();
  });

  it('lists only tenant-owned receipt transactions across branches', async () => {
    const {
      service,
      getLedgerQuery,
      getStaffQuery,
      findTransactions,
      findStaff,
    } = setup();

    const result = await service.searchTransactions('tenant-1', adminActor);
    const ledgerQuery = getLedgerQuery();
    const staffQuery = getStaffQuery();

    expect(ledgerQuery?.where).toMatchObject({
      tenantId: 'tenant-1',
      type: { in: [LedgerEntryType.EARN, LedgerEntryType.REDEEM] },
      receipt: { is: { tenantId: 'tenant-1' } },
    });
    expect(ledgerQuery?.where).not.toHaveProperty('receipt.is.branchId');
    expect(staffQuery?.where).toMatchObject({
      tenantId: 'tenant-1',
      receiptsCaptured: { some: { tenantId: 'tenant-1' } },
    });
    expect(staffQuery?.where).not.toHaveProperty(
      'receiptsCaptured.some.branchId',
    );
    expect(findTransactions).toHaveBeenCalledWith(
      expect.objectContaining({ take: 11 }),
    );
    expect(findStaff).toHaveBeenCalledTimes(1);
    expect(result.items).toEqual([
      {
        transactionId: 'ledger-1',
        receiptNumber: 'R-001',
        operation: 'EARN',
        amountKobo: 500,
        creditKobo: 500,
        customerName: 'Michael Adeyemi',
        purchaseAmountKobo: 10_000,
        status: 'CONFIRMED',
        occurredAt: '2026-11-12T10:00:00.000Z',
      },
    ]);
    expect(Object.keys(result.items[0])).not.toContain('customerPhone');
    expect(Object.keys(result.items[0])).not.toContain('cardSerialNumber');
  });

  it('filters results and staff options to the requested tenant branch', async () => {
    const { service, getLedgerQuery, getStaffQuery } = setup();

    await service.searchTransactions(
      'tenant-1',
      adminActor,
      undefined,
      '10',
      undefined,
      {
        branchId: 'branch-1',
      },
    );

    expect(getLedgerQuery()?.where).toMatchObject({
      tenantId: 'tenant-1',
      receipt: { is: { tenantId: 'tenant-1', branchId: 'branch-1' } },
    });
    expect(getStaffQuery()?.where).toMatchObject({
      tenantId: 'tenant-1',
      receiptsCaptured: {
        some: { tenantId: 'tenant-1', branchId: 'branch-1' },
      },
    });
  });

  it('applies normalized filters and bounded cursor pagination server-side', async () => {
    const { service, getLedgerQuery, findTransactions } = setup([
      makeEntry('ledger-3'),
      makeEntry('ledger-2'),
      makeEntry('ledger-1'),
    ]);
    const cursor = encodeCursor('ledger-4', '2026-11-12T11:00:00.000Z');

    const result = await service.searchTransactions(
      'tenant-1',
      adminActor,
      ' r-001 ',
      '2',
      cursor,
      {
        branchId: ' branch-1 ',
        status: ' reversed ',
        staffId: ' staff-1 ',
        minReceiptAmountKobo: '1500',
      },
    );

    const query = getLedgerQuery();
    expect(query?.where).toMatchObject({
      tenantId: 'tenant-1',
      receipt: {
        is: {
          tenantId: 'tenant-1',
          branchId: 'branch-1',
          normalizedPosReceiptNumber: 'R-001',
          capturedBy: 'staff-1',
          purchaseAmountKobo: { gte: 1500n },
        },
      },
      reversedByEntries: { some: { tenantId: 'tenant-1' } },
      OR: [
        { effectiveAt: { lt: new Date('2026-11-12T11:00:00.000Z') } },
        {
          effectiveAt: new Date('2026-11-12T11:00:00.000Z'),
          id: { lt: 'ledger-4' },
        },
      ],
    });
    expect(findTransactions).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 3,
        orderBy: [{ effectiveAt: 'desc' }, { id: 'desc' }],
      }),
    );
    expect(result.items).toHaveLength(2);
    expect(result.hasMore).toBe(true);
    expect(result.nextCursor).toBe(
      encodeCursor('ledger-2', '2026-11-12T10:00:00.000Z'),
    );
  });
});
