import { PATH_METADATA } from '@nestjs/common/constants';
import { UserRole } from '@prisma/client';
import type { AuthenticatedRequest } from '../../common/auth/session.types';
import { ROLES_KEY } from '../../common/auth/auth.constants';
import { AdminTransactionsController } from './admin-transactions.controller';
import { AdminTransactionSearchService } from './admin-transaction-search.service';

describe('AdminTransactionsController', () => {
  it('is an Admin-only tenant transaction route', () => {
    const handler = Object.getOwnPropertyDescriptor(
      AdminTransactionsController.prototype,
      'searchTransactions',
    )?.value as object;

    expect(
      Reflect.getMetadata(PATH_METADATA, AdminTransactionsController),
    ).toBe('admin/transactions');
    expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe('/');
    expect(Reflect.getMetadata(ROLES_KEY, handler)).toEqual([UserRole.ADMIN]);
  });

  it('forwards the authenticated tenant and search filters to the Admin service', async () => {
    const result = {
      items: [],
      staffOptions: [],
      nextCursor: null,
      hasMore: false,
    };
    const searchTransactions = jest.fn().mockResolvedValue(result);
    const service = {
      searchTransactions,
    } as unknown as AdminTransactionSearchService;
    const controller = new AdminTransactionsController(service);
    const request = {
      authContext: {
        user: { tenantId: 'tenant-1', role: UserRole.ADMIN },
      },
    } as unknown as AuthenticatedRequest;

    await expect(
      controller.searchTransactions(
        request,
        'R-001',
        '10',
        'cursor-token',
        'CONFIRMED',
        'branch-1',
        'staff-1',
        '12500',
      ),
    ).resolves.toEqual(result);
    expect(searchTransactions).toHaveBeenCalledWith(
      'tenant-1',
      request.authContext,
      'R-001',
      '10',
      'cursor-token',
      {
        branchId: 'branch-1',
        status: 'CONFIRMED',
        staffId: 'staff-1',
        minReceiptAmountKobo: '12500',
      },
    );
  });
});
