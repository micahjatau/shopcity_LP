import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import {
  adminTransactionsControllerSearchTransactionsV1,
  branchesControllerListBranchesV1,
  loyaltyControllerGetTransactionV1,
  loyaltyControllerSearchTransactionsByReceiptV1,
  reversalsControllerReverseV1,
} from '../lib/api/generated-client';
import { AdminTransactionsDashboard } from '../components/workflows/supervisor-transactions-dashboard';

jest.mock('../lib/api/generated-client', () => ({
  adminTransactionsControllerSearchTransactionsV1: jest.fn(),
  branchesControllerListBranchesV1: jest.fn(),
  loyaltyControllerGetTransactionV1: jest.fn(),
  loyaltyControllerSearchTransactionsByReceiptV1: jest.fn(),
  reversalsControllerReverseV1: jest.fn(),
}));

const item = {
  transactionId: 'ledger-1',
  receiptNumber: 'R-001',
  operation: 'EARN',
  amountKobo: 500,
  creditKobo: 500,
  customerName: 'Michael Adeyemi',
  purchaseAmountKobo: 10_000,
  status: 'CONFIRMED',
  occurredAt: '2026-11-12T10:00:00.000Z',
};

const searchResponse = {
  status: 200,
  data: {
    data: {
      items: [item],
      staffOptions: [{ id: 'staff-1', label: 'cashier@example.test' }],
      nextCursor: null,
      hasMore: false,
    },
  },
} as never;

const detailResponse = {
  status: 200,
  data: {
    data: {
      transactionId: 'ledger-1',
      posReceiptNumber: 'R-001',
      type: 'EARN',
      state: 'CONFIRMED',
      creditKobo: 500,
      redeemedAmountKobo: null,
      purchaseAmountKobo: 10_000,
      availableBalanceKobo: 2_500,
      occurredAt: '2026-11-12T10:00:00.000Z',
      capturedAt: '2026-11-12T10:01:00.000Z',
    },
  },
} as never;

describe('AdminTransactionsDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    document.cookie = 'shopcity_csrf=csrf-token';
    jest
      .mocked(adminTransactionsControllerSearchTransactionsV1)
      .mockResolvedValue(searchResponse);
    jest.mocked(branchesControllerListBranchesV1).mockResolvedValue({
      status: 200,
      data: {
        data: [
          { id: 'branch-1', name: 'Downtown' },
          { id: 'branch-2', name: 'Airport' },
        ],
      },
    } as never);
    jest
      .mocked(loyaltyControllerGetTransactionV1)
      .mockResolvedValue(detailResponse);
    jest.mocked(reversalsControllerReverseV1).mockResolvedValue({
      status: 201,
      data: { data: { id: 'reversal-1' } },
    } as never);
    jest.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue('idem-admin-1');
  });

  afterEach(() => {
    jest.restoreAllMocks();
    document.cookie = 'shopcity_csrf=; Max-Age=0';
  });

  it('resets the Admin cursor when a branch filter changes', async () => {
    jest
      .mocked(adminTransactionsControllerSearchTransactionsV1)
      .mockResolvedValueOnce({
        status: 200,
        data: {
          data: {
            items: [item],
            staffOptions: [{ id: 'staff-1', label: 'cashier@example.test' }],
            nextCursor: 'cursor-2',
            hasMore: true,
          },
        },
      } as never);
    render(<AdminTransactionsDashboard />);

    const nextPage = await screen.findByRole('button', {
      name: 'Next transactions page',
    });
    await waitFor(() => expect(nextPage).toBeEnabled());
    fireEvent.click(nextPage);
    await waitFor(() =>
      expect(
        adminTransactionsControllerSearchTransactionsV1,
      ).toHaveBeenLastCalledWith(
        { limit: 10, cursor: 'cursor-2' },
        expect.objectContaining({ credentials: 'include' }),
      ),
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'Branch filter, All branches' }),
    );
    fireEvent.click(screen.getByRole('option', { name: 'Downtown' }));
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    await waitFor(() =>
      expect(
        adminTransactionsControllerSearchTransactionsV1,
      ).toHaveBeenLastCalledWith(
        { limit: 10, cursor: undefined, branchId: 'branch-1' },
        expect.objectContaining({ credentials: 'include' }),
      ),
    );
  });

  it('uses the tenant-wide Admin endpoint, filters by branch, and retains the full workflow', async () => {
    render(
      <AdminTransactionsDashboard
        relatedRoutes={[
          ['/admin/approvals', 'Approvals'],
          ['/admin/fraud', 'Fraud'],
          ['/admin/reports', 'Reports'],
        ]}
      />,
    );

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Refresh transactions' }),
      ).toBeEnabled(),
    );
    expect(
      screen.getByRole('heading', { level: 1, name: 'Transactions' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Review tenant transactions and filter by receipt number.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('table', { name: 'Admin tenant transactions' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Approvals' })).toHaveAttribute(
      'href',
      '/admin/approvals',
    );
    expect(screen.getByRole('link', { name: 'Fraud' })).toHaveAttribute(
      'href',
      '/admin/fraud',
    );
    expect(screen.getByRole('link', { name: 'Reports' })).toHaveAttribute(
      'href',
      '/admin/reports',
    );
    expect(
      screen.queryByRole('link', { name: 'Back to admin' }),
    ).not.toBeInTheDocument();
    expect(
      adminTransactionsControllerSearchTransactionsV1,
    ).toHaveBeenCalledWith(
      { limit: 10, cursor: undefined },
      expect.objectContaining({ credentials: 'include' }),
    );
    expect(
      loyaltyControllerSearchTransactionsByReceiptV1,
    ).not.toHaveBeenCalled();

    fireEvent.change(screen.getByRole('textbox', { name: 'Receipt number' }), {
      target: { value: 'R-001' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    expect(await screen.findByText('Michael Adeyemi')).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: 'Branch filter, All branches' }),
    );
    fireEvent.click(screen.getByRole('option', { name: 'Downtown' }));
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    await waitFor(() =>
      expect(
        adminTransactionsControllerSearchTransactionsV1,
      ).toHaveBeenLastCalledWith(
        {
          receiptNumber: 'R-001',
          limit: 10,
          cursor: undefined,
          branchId: 'branch-1',
        },
        expect.objectContaining({ credentials: 'include' }),
      ),
    );
    fireEvent.change(
      screen.getByRole('textbox', { name: 'Minimum amount (₦)' }),
      { target: { value: '125.00' } },
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Status filter, All Statuses' }),
    );
    fireEvent.click(screen.getByRole('option', { name: 'Confirmed' }));
    fireEvent.click(
      screen.getByRole('button', { name: 'Staff filter, All Staff' }),
    );
    fireEvent.click(
      screen.getByRole('option', { name: 'cashier@example.test' }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

    await waitFor(() =>
      expect(
        adminTransactionsControllerSearchTransactionsV1,
      ).toHaveBeenLastCalledWith(
        {
          receiptNumber: 'R-001',
          limit: 10,
          cursor: undefined,
          branchId: 'branch-1',
          status: 'CONFIRMED',
          staffId: 'staff-1',
          minReceiptAmountKobo: '12500',
        },
        expect.objectContaining({ credentials: 'include' }),
      ),
    );
    expect(
      screen.getByRole('columnheader', { name: 'Receipt No.' }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('columnheader')).toHaveLength(6);
    expect(
      screen.getByRole('button', { name: 'Next transactions page' }),
    ).toBeDisabled();

    const row = screen.getByText('R-001').closest('tr');
    expect(row).not.toBeNull();
    fireEvent.click(row!);
    const dialog = await screen.findByRole('dialog', { name: /R-001/ });
    expect(dialog).toHaveTextContent('Transaction timeline');
    expect(dialog).toHaveTextContent('Request reversal');
    expect(loyaltyControllerGetTransactionV1).toHaveBeenCalledWith(
      'ledger-1',
      expect.objectContaining({ credentials: 'include' }),
    );

    fireEvent.change(screen.getByRole('textbox', { name: 'Reversal reason' }), {
      target: { value: 'Duplicate receipt entry' },
    });
    fireEvent.change(
      screen.getByRole('textbox', { name: 'Type REVERSE to confirm' }),
      { target: { value: 'REVERSE' } },
    );
    fireEvent.click(screen.getByRole('button', { name: 'Confirm reversal' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Reversal confirmed',
    );
    expect(reversalsControllerReverseV1).toHaveBeenCalledWith(
      'ledger-1',
      { reason: 'Duplicate receipt entry' },
      expect.objectContaining({
        credentials: 'include',
        headers: expect.objectContaining({
          'x-csrf-token': 'csrf-token',
          'idempotency-key': 'idem-admin-1',
        }),
      }),
    );
  });
});
