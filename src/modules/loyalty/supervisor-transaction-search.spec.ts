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

  function serviceWithFindMany(findMany: jest.Mock) {
    return new LoyaltyService(
      {
        loyaltyLedgerEntry: { findMany },
      } as never,
      {} as never,
      {} as never,
    );
  }

  it('returns bounded ledger IDs and scopes the exact receipt query to the session branch', async () => {
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
          receipt: { posReceiptNumber: 'R-001' },
        },
      ]);
    });
    const service = serviceWithFindMany(findMany);

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
    expect(capturedQuery.take).toBe(2);
    expect(result).toEqual({
      items: [
        {
          transactionId: 'ledger-1',
          receiptNumber: 'R-001',
          operation: 'EARN',
          amountKobo: 2500,
          status: LedgerEntryStatus.CONFIRMED,
          occurredAt: occurredAt.toISOString(),
        },
      ],
      nextCursor: null,
      hasMore: false,
    });
    expect(Object.keys(result.items[0])).not.toContain('customerPhone');
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

    expect(result.hasMore).toBe(true);
    expect(decodeCursor(result.nextCursor!)).toEqual({
      id: 'ledger-2',
      timestamp: occurredAt.toISOString(),
    });
  });

  it('fails closed for missing branch scope, other roles, and an empty receipt number', async () => {
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
    await expect(
      service.searchTransactionsByReceipt(
        'tenant-1',
        supervisorContext(),
        '  ',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(findMany).not.toHaveBeenCalled();
  });
});
