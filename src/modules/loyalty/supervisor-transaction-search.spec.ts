import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { LedgerEntryStatus, LedgerEntryType, UserRole } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import type { AuthContext } from '../../common/auth/session.types';
import { decodeCursor } from '../../common/pagination/cursor-pagination';
import { LoyaltyService } from './loyalty.service';

describe('LoyaltyService.searchTransactionsByReceipt', () => {
  const supervisorContext = (branchId: string | null = 'branch-1') =>
    ({
      user: {
        id: 'supervisor-1',
        tenantId: 'tenant-1',
        branchId,
        role: UserRole.SUPERVISOR,
      },
    }) as AuthContext;

  function serviceWithFindMany(
    findMany: jest.Mock,
    userFindMany: jest.Mock = jest.fn().mockResolvedValue([]),
  ) {
    return new LoyaltyService(
      {
        loyaltyLedgerEntry: { findMany },
        user: { findMany: userFindMany },
      } as never,
      {} as never,
      {} as never,
    );
  }

  it('returns bounded ledger IDs and scopes the exact receipt query to the session branch', async () => {
    const occurredAt = new Date('2026-09-29T12:00:00.000Z');
    let capturedQuery: Prisma.LoyaltyLedgerEntryFindManyArgs | undefined;
    const userFindMany = jest
      .fn()
      .mockResolvedValue([
        { id: 'cashier-1', username: 'cashier@example.test' },
      ]);
    const findMany = jest.fn((query: Prisma.LoyaltyLedgerEntryFindManyArgs) => {
      capturedQuery = query;
      return Promise.resolve([
        {
          id: 'ledger-1',
          type: LedgerEntryType.EARN,
          amountKobo: 2500n,
          status: LedgerEntryStatus.CONFIRMED,
          effectiveAt: occurredAt,
          reversedByEntries: [],
          receipt: {
            posReceiptNumber: 'R-001',
            purchaseAmountKobo: 10_000n,
            customer: { fullName: 'Michael Adeyemi' },
          },
        },
      ]);
    });
    const service = serviceWithFindMany(findMany, userFindMany);

    const result = await service.searchTransactionsByReceipt(
      'tenant-1',
      supervisorContext(),
      ' r-001 ',
      '1',
    );

    if (!capturedQuery) throw new Error('Receipt query was not issued');
    expect(capturedQuery.where).toMatchObject({
      tenantId: 'tenant-1',
      type: { in: [LedgerEntryType.EARN, LedgerEntryType.REDEEM] },
      receipt: {
        is: {
          tenantId: 'tenant-1',
          branchId: 'branch-1',
          normalizedPosReceiptNumber: 'R-001',
        },
      },
    });
    expect(capturedQuery.orderBy).toEqual([
      { effectiveAt: 'desc' },
      { id: 'desc' },
    ]);
    expect(capturedQuery.take).toBe(2);
    expect(result).toEqual({
      items: [
        {
          transactionId: 'ledger-1',
          receiptNumber: 'R-001',
          operation: 'EARN',
          amountKobo: 2500,
          creditKobo: 2500,
          customerName: 'Michael Adeyemi',
          purchaseAmountKobo: 10_000,
          status: 'CONFIRMED',
          occurredAt: occurredAt.toISOString(),
        },
      ],
      staffOptions: [{ id: 'cashier-1', label: 'cashier@example.test' }],
      nextCursor: null,
      hasMore: false,
    });
    expect(userFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          tenantId: 'tenant-1',
          receiptsCaptured: {
            some: {
              tenantId: 'tenant-1',
              branchId: 'branch-1',
              normalizedPosReceiptNumber: 'R-001',
            },
          },
        },
      }),
    );
    expect(Object.keys(result.items[0])).not.toContain('customerPhone');
  });

  it('lists all receipt-backed transactions in the session branch when no receipt filter is supplied', async () => {
    const occurredAt = new Date('2026-09-29T12:00:00.000Z');
    let capturedQuery: Prisma.LoyaltyLedgerEntryFindManyArgs | undefined;
    let capturedStaffQuery: Prisma.UserFindManyArgs | undefined;
    const findMany = jest.fn((query: Prisma.LoyaltyLedgerEntryFindManyArgs) => {
      capturedQuery = query;
      return Promise.resolve([
        {
          id: 'ledger-1',
          type: LedgerEntryType.EARN,
          amountKobo: 2500n,
          status: LedgerEntryStatus.CONFIRMED,
          effectiveAt: occurredAt,
          reversedByEntries: [],
          receipt: {
            posReceiptNumber: 'R-001',
            purchaseAmountKobo: 10_000n,
            customer: { fullName: 'Michael Adeyemi' },
          },
        },
      ]);
    });
    const userFindMany = jest.fn((query: Prisma.UserFindManyArgs) => {
      capturedStaffQuery = query;
      return Promise.resolve([{ id: 'cashier-1', username: 'cashier-one' }]);
    });
    const service = serviceWithFindMany(findMany, userFindMany);

    const result = await service.searchTransactionsByReceipt(
      'tenant-1',
      supervisorContext(),
      undefined,
      '10',
    );

    expect(capturedQuery?.where).toMatchObject({
      tenantId: 'tenant-1',
      type: { in: [LedgerEntryType.EARN, LedgerEntryType.REDEEM] },
      receipt: { is: { tenantId: 'tenant-1', branchId: 'branch-1' } },
    });
    expect(capturedQuery?.where).not.toHaveProperty(
      'receipt.is.normalizedPosReceiptNumber',
    );
    expect(capturedQuery?.take).toBe(11);
    expect(capturedStaffQuery?.where).toMatchObject({
      tenantId: 'tenant-1',
      receiptsCaptured: {
        some: { tenantId: 'tenant-1', branchId: 'branch-1' },
      },
    });
    expect(capturedStaffQuery?.where).not.toHaveProperty(
      'receiptsCaptured.some.normalizedPosReceiptNumber',
    );
    expect(result.items[0].receiptNumber).toBe('R-001');
    expect(result.staffOptions).toEqual([
      { id: 'cashier-1', label: 'cashier-one' },
    ]);
  });

  it('applies status, staff, and minimum amount filters before pagination', async () => {
    const occurredAt = new Date('2026-09-29T12:00:00.000Z');
    let capturedQuery: Prisma.LoyaltyLedgerEntryFindManyArgs | undefined;
    const findMany = jest.fn((query: Prisma.LoyaltyLedgerEntryFindManyArgs) => {
      capturedQuery = query;
      return Promise.resolve([
        {
          id: 'ledger-1',
          type: LedgerEntryType.EARN,
          amountKobo: 2500n,
          status: LedgerEntryStatus.CONFIRMED,
          effectiveAt: occurredAt,
          reversedByEntries: [{ id: 'reversal-1' }],
          receipt: {
            posReceiptNumber: 'R-001',
            purchaseAmountKobo: 3_000_000n,
            customer: { fullName: 'Michael Adeyemi' },
          },
        },
      ]);
    });
    const service = serviceWithFindMany(findMany);

    const result = await service.searchTransactionsByReceipt(
      'tenant-1',
      supervisorContext(),
      'R-001',
      '10',
      undefined,
      {
        status: 'REVERSED',
        staffId: 'cashier-1',
        minReceiptAmountKobo: '2500000',
      },
    );

    expect(capturedQuery?.where).toMatchObject({
      tenantId: 'tenant-1',
      receipt: {
        is: {
          tenantId: 'tenant-1',
          branchId: 'branch-1',
          normalizedPosReceiptNumber: 'R-001',
          capturedBy: 'cashier-1',
          purchaseAmountKobo: { gte: 2_500_000n },
        },
      },
      reversedByEntries: { some: { tenantId: 'tenant-1' } },
    });
    expect(capturedQuery?.take).toBe(11);
    expect(result.items[0]).toMatchObject({
      status: 'REVERSED',
      purchaseAmountKobo: 3_000_000,
      creditKobo: 2500,
    });
  });

  it('rejects unsupported outcomes and invalid integer-kobo amounts', async () => {
    const findMany = jest.fn();
    const service = serviceWithFindMany(findMany);
    const search = (filters: {
      status?: string;
      minReceiptAmountKobo?: string;
    }) =>
      service.searchTransactionsByReceipt(
        'tenant-1',
        supervisorContext(),
        'R-001',
        undefined,
        undefined,
        filters,
      );

    await expect(search({ status: 'PENDING' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(search({ minReceiptAmountKobo: '-1' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(
      search({ minReceiptAmountKobo: '9223372036854775808' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(findMany).not.toHaveBeenCalled();
  });

  it('returns a cursor when another bounded page is available', async () => {
    const occurredAt = new Date('2026-09-29T12:00:00.000Z');
    const findMany = jest.fn().mockResolvedValue([
      {
        id: 'ledger-2',
        type: LedgerEntryType.REDEEM,
        amountKobo: 500n,
        status: LedgerEntryStatus.CONFIRMED,
        effectiveAt: occurredAt,
        receipt: { posReceiptNumber: 'R-001' },
      },
      {
        id: 'ledger-1',
        type: LedgerEntryType.EARN,
        amountKobo: 1000n,
        status: LedgerEntryStatus.CONFIRMED,
        effectiveAt: occurredAt,
        receipt: { posReceiptNumber: 'R-001' },
      },
    ]);
    const service = serviceWithFindMany(findMany);

    const result = await service.searchTransactionsByReceipt(
      'tenant-1',
      supervisorContext(),
      'R-001',
      '1',
    );

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ effectiveAt: 'desc' }, { id: 'desc' }],
      }),
    );
    expect(result.hasMore).toBe(true);
    expect(decodeCursor(result.nextCursor!)).toEqual({
      id: 'ledger-2',
      timestamp: occurredAt.toISOString(),
    });
  });

  it('fails closed for missing branch scope and other roles', async () => {
    const findMany = jest.fn();
    const service = serviceWithFindMany(findMany);

    await expect(
      service.searchTransactionsByReceipt(
        'tenant-1',
        supervisorContext(null),
        'R-001',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      service.searchTransactionsByReceipt(
        'tenant-1',
        {
          user: { role: UserRole.CASHIER, branchId: 'branch-1' },
        } as AuthContext,
        'R-001',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(findMany).not.toHaveBeenCalled();
  });
});
