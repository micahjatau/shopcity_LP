import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import {
  loyaltyControllerGetTransactionV1,
  loyaltyControllerSearchTransactionsByReceiptV1,
  reversalsControllerReverseV1,
} from '../lib/api/generated-client';
import { SupervisorTransactionsDashboard } from '../components/workflows/supervisor-transactions-dashboard';

jest.mock('../lib/api/generated-client', () => ({
  loyaltyControllerGetTransactionV1: jest.fn(),
  loyaltyControllerSearchTransactionsByReceiptV1: jest.fn(),
  reversalsControllerReverseV1: jest.fn(),
}));

const firstItem = {
  transactionId: 'ledger-1',
  receiptNumber: 'R-001',
  operation: 'EARN',
  amountKobo: 500,
  creditKobo: 500,
  customerName: 'Michael Adeyemi',
  purchaseAmountKobo: 10_000,
  status: 'CONFIRMED',
  occurredAt: '2026-09-29T12:00:00.000Z',
};

function searchResponse(
  items: (typeof firstItem)[],
  hasMore = false,
  nextCursor: string | null = null,
) {
  return {
    status: 200,
    data: {
      data: {
        items,
        staffOptions: [{ id: 'cashier-1', label: 'cashier@example.test' }],
        hasMore,
        nextCursor,
      },
    },
  } as never;
}

async function waitForInitialListLoad() {
  const refreshButton = screen.getByRole('button', {
    name: 'Refresh transactions',
  });
  await waitFor(() => expect(refreshButton).toBeEnabled());
}

function detailResponse(overrides: Record<string, unknown> = {}) {
  return {
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
        occurredAt: '2026-09-29T12:00:00.000Z',
        capturedAt: '2026-09-29T12:01:00.000Z',
        ...overrides,
      },
    },
  } as never;
}

describe('SupervisorTransactionsDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    document.cookie = 'shopcity_csrf=csrf-token';
  });

  afterEach(() => {
    jest.restoreAllMocks();
    document.cookie = 'shopcity_csrf=; Max-Age=0';
  });

  it('searches by receipt, loads verified detail, and submits a CSRF/idempotency-protected reversal', async () => {
    jest
      .mocked(loyaltyControllerSearchTransactionsByReceiptV1)
      .mockResolvedValue(searchResponse([firstItem]));
    jest
      .mocked(loyaltyControllerGetTransactionV1)
      .mockResolvedValue(detailResponse());
    jest.mocked(reversalsControllerReverseV1).mockResolvedValue({
      status: 201,
      data: { data: { id: 'reversal-1' } },
    } as never);
    jest.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue('idem-1');

    render(<SupervisorTransactionsDashboard />);
    await waitForInitialListLoad();
    expect(
      screen.getByRole('button', { name: 'Refresh transactions' }),
    ).toHaveClass('supervisor-customer-table__profile-link');
    expect(await screen.findByText('R-001')).toBeInTheDocument();
    expect(loyaltyControllerSearchTransactionsByReceiptV1).toHaveBeenCalledWith(
      { limit: 10, cursor: undefined },
      expect.objectContaining({ credentials: 'include' }),
    );
    expect(
      screen.queryByText('Results are limited to the authenticated branch.'),
    ).not.toBeInTheDocument();

    fireEvent.change(screen.getByRole('textbox', { name: 'Receipt number' }), {
      target: { value: ' R-001 ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    const receipt = await screen.findByText('R-001');
    expect(loyaltyControllerSearchTransactionsByReceiptV1).toHaveBeenCalledWith(
      { receiptNumber: 'R-001', limit: 10, cursor: undefined },
      expect.objectContaining({ credentials: 'include' }),
    );
    expect(
      screen.getByRole('columnheader', { name: 'Name' }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('columnheader')).toHaveLength(6);
    expect(
      screen.queryByRole('columnheader', { name: 'Eligible' }),
    ).not.toBeInTheDocument();
    expect(screen.getByText('Michael Adeyemi')).toBeInTheDocument();
    const table = screen.getByRole('table', {
      name: 'Supervisor branch transactions',
    });
    expect(table).toHaveClass('supervisor-customer-table');
    expect(receipt.closest('td')).toHaveAttribute('data-label', 'Receipt No.');
    expect(screen.getByText('Michael Adeyemi').closest('td')).toHaveAttribute(
      'data-label',
      'Name',
    );
    const row = receipt.closest('tr');
    expect(row).not.toBeNull();
    row!.focus();
    fireEvent.click(row!);

    const dialog = await screen.findByRole('dialog', { name: /R-001/ });
    expect(
      await screen.findByRole('heading', { name: 'Request reversal' }),
    ).toBeInTheDocument();
    expect(dialog).toHaveTextContent('₦25.00');
    expect(loyaltyControllerGetTransactionV1).toHaveBeenCalledWith(
      'ledger-1',
      expect.objectContaining({ credentials: 'include' }),
    );
    expect(screen.queryByText('customer-1')).not.toBeInTheDocument();

    fireEvent.change(screen.getByRole('textbox', { name: 'Reversal reason' }), {
      target: { value: 'Receipt was entered in error' },
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
      { reason: 'Receipt was entered in error' },
      expect.objectContaining({
        credentials: 'include',
        headers: expect.objectContaining({
          'x-csrf-token': 'csrf-token',
          'idempotency-key': 'idem-1',
        }),
      }),
    );
    expect(
      screen.queryByRole('button', { name: 'Confirm reversal' }),
    ).toBeNull();

    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    await waitFor(() => expect(document.activeElement).toBe(row));
  });

  it('opens the selected row in a transaction-specific, reference-styled dialog', async () => {
    const reversedItem = {
      ...firstItem,
      transactionId: 'ledger-2',
      receiptNumber: 'R-002',
      operation: 'REDEEM',
      amountKobo: -750,
      status: 'REVERSED',
    };
    jest
      .mocked(loyaltyControllerSearchTransactionsByReceiptV1)
      .mockResolvedValue(searchResponse([firstItem, reversedItem]));
    jest.mocked(loyaltyControllerGetTransactionV1).mockResolvedValue(
      detailResponse({
        transactionId: 'ledger-2',
        posReceiptNumber: 'R-002',
        type: 'REDEEM',
        state: 'REVERSED',
        creditKobo: 0,
        redeemedAmountKobo: 750,
      }),
    );

    render(<SupervisorTransactionsDashboard />);
    await waitForInitialListLoad();
    fireEvent.change(screen.getByRole('textbox', { name: 'Receipt number' }), {
      target: { value: 'R-002' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    const row = await screen.findByRole('row', {
      name: /open redeem transaction for receipt r-002/i,
    });
    expect(
      screen.getByRole('columnheader', { name: 'Status' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('columnheader', { name: 'Outcome' }),
    ).not.toBeInTheDocument();
    const confirmedLabel = screen
      .getAllByText('Confirmed')
      .find((element) => element.closest('.sc-badge'));
    expect(confirmedLabel?.closest<HTMLElement>('.sc-badge')).toHaveClass(
      'sc-badge--success',
    );
    const reversedLabel = screen
      .getAllByText('Reversed')
      .find((element) => element.closest('.sc-badge'));
    expect(reversedLabel?.closest<HTMLElement>('.sc-badge')).toHaveClass(
      'sc-badge--danger',
    );
    fireEvent.click(row);

    const dialog = await screen.findByRole('dialog', {
      name: 'Transaction R-002',
    });
    expect(dialog).toHaveTextContent('₦7.50');
    expect(dialog).toHaveTextContent('Captured at');
    expect(dialog).toHaveTextContent('Transaction timeline');
    expect(dialog).toHaveTextContent(
      'Receipt image is not provided by the transaction service.',
    );
    expect(dialog).not.toHaveTextContent('customer-2');
    expect(loyaltyControllerGetTransactionV1).toHaveBeenCalledWith(
      'ledger-2',
      expect.objectContaining({ credentials: 'include' }),
    );
  });

  it('prevents dialog dismissal while a reversal request is pending', async () => {
    jest
      .mocked(loyaltyControllerSearchTransactionsByReceiptV1)
      .mockResolvedValue(searchResponse([firstItem]));
    jest
      .mocked(loyaltyControllerGetTransactionV1)
      .mockResolvedValue(detailResponse());

    let resolveReversal!: (value: unknown) => void;
    const pendingReversal = new Promise((resolve) => {
      resolveReversal = resolve;
    });
    jest
      .mocked(reversalsControllerReverseV1)
      .mockReturnValueOnce(pendingReversal as never);
    jest.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue('idem-pending');

    render(<SupervisorTransactionsDashboard />);
    await waitForInitialListLoad();
    fireEvent.change(screen.getByRole('textbox', { name: 'Receipt number' }), {
      target: { value: 'R-001' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));
    const resultRow = await screen.findByText('R-001');
    fireEvent.click(resultRow.closest('tr')!);
    await screen.findByRole('heading', { name: 'Request reversal' });

    fireEvent.change(screen.getByRole('textbox', { name: 'Reversal reason' }), {
      target: { value: 'Duplicate receipt entry' },
    });
    fireEvent.change(
      screen.getByRole('textbox', { name: 'Type REVERSE to confirm' }),
      { target: { value: 'REVERSE' } },
    );
    fireEvent.click(screen.getByRole('button', { name: 'Confirm reversal' }));

    const closeButton = screen.getByRole('button', {
      name: 'Close transaction detail',
    });
    expect(closeButton).toBeDisabled();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    resolveReversal({ status: 201, data: { data: { id: 'reversal-1' } } });
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Reversal confirmed',
    );
    expect(closeButton).toBeEnabled();
  });

  it('applies status, staff, and exact kobo-converted minimum filters from the first page', async () => {
    jest
      .mocked(loyaltyControllerSearchTransactionsByReceiptV1)
      .mockResolvedValueOnce(searchResponse([]))
      .mockResolvedValueOnce(searchResponse([firstItem], true, 'next-page'))
      .mockResolvedValueOnce(searchResponse([firstItem], true, 'next-page-2'))
      .mockResolvedValueOnce(searchResponse([firstItem]));

    render(<SupervisorTransactionsDashboard />);
    await waitForInitialListLoad();
    fireEvent.change(screen.getByRole('textbox', { name: 'Receipt number' }), {
      target: { value: 'R-001' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));
    expect(await screen.findByText('Michael Adeyemi')).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: 'Next transactions page' }),
    );
    await waitFor(() =>
      expect(
        loyaltyControllerSearchTransactionsByReceiptV1,
      ).toHaveBeenCalledTimes(3),
    );

    const statusTrigger = screen.getByRole('button', {
      name: 'Status filter, All Statuses',
    });
    expect(statusTrigger).toHaveClass(
      'supervisor-customer-directory__filter',
      'supervisor-customer-directory__status-trigger',
    );
    fireEvent.click(statusTrigger);
    const statusOptions = screen.getByRole('listbox', {
      name: 'Status filter',
    });
    expect(statusOptions).toHaveClass(
      'supervisor-customer-directory__status-menu',
    );
    const allStatuses = within(statusOptions).getByRole('option', {
      name: 'All Statuses',
    });
    expect(allStatuses).toHaveFocus();
    fireEvent.keyDown(allStatuses, { key: 'ArrowDown' });
    const confirmedStatus = within(statusOptions).getByRole('option', {
      name: 'Confirmed',
    });
    expect(confirmedStatus).toHaveFocus();
    fireEvent.keyDown(confirmedStatus, { key: 'ArrowDown' });
    const reversedStatus = within(statusOptions).getByRole('option', {
      name: 'Reversed',
    });
    expect(reversedStatus).toHaveFocus();
    fireEvent.click(reversedStatus);
    const staffTrigger = screen.getByRole('button', {
      name: 'Staff filter, All Staff',
    });
    expect(staffTrigger).toHaveClass(
      'supervisor-customer-directory__filter',
      'supervisor-customer-directory__status-trigger',
    );
    fireEvent.click(staffTrigger);
    const staffOptions = screen.getByRole('listbox', { name: 'Staff filter' });
    expect(staffOptions).toHaveClass(
      'supervisor-customer-directory__status-menu',
    );
    fireEvent.click(
      within(staffOptions).getByRole('option', {
        name: 'cashier@example.test',
      }),
    );
    expect(screen.getByText('Minimum amount (₦)')).toBeInTheDocument();
    const minimumAmountInput =
      screen.getByPlaceholderText('Minimum amount (₦)');
    expect(minimumAmountInput).toHaveAccessibleName('Minimum amount (₦)');
    fireEvent.change(minimumAmountInput, {
      target: { value: '10000.01' },
    });
    expect(
      screen.getByRole('button', { name: 'Previous transactions page' }),
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Next transactions page' }),
    ).toBeDisabled();
    const applyFilters = screen.getByRole('button', { name: 'Apply filters' });
    expect(applyFilters).toHaveClass('supervisor-customer-directory__register');
    fireEvent.click(applyFilters);

    await waitFor(() =>
      expect(
        loyaltyControllerSearchTransactionsByReceiptV1,
      ).toHaveBeenLastCalledWith(
        {
          receiptNumber: 'R-001',
          limit: 10,
          cursor: undefined,
          status: 'REVERSED',
          staffId: 'cashier-1',
          minReceiptAmountKobo: '1000001',
        },
        expect.anything(),
      ),
    );
    expect(screen.getByText('Page 1')).toBeInTheDocument();
  });

  it('paginates bounded receipt results using the returned cursor', async () => {
    const secondItem = {
      ...firstItem,
      transactionId: 'ledger-2',
      receiptNumber: 'R-002',
    };
    jest
      .mocked(loyaltyControllerSearchTransactionsByReceiptV1)
      .mockResolvedValueOnce(searchResponse([]))
      .mockResolvedValueOnce(searchResponse([firstItem], true, 'next-page'))
      .mockResolvedValueOnce(searchResponse([secondItem]));

    render(<SupervisorTransactionsDashboard />);
    await waitForInitialListLoad();
    fireEvent.change(screen.getByRole('textbox', { name: 'Receipt number' }), {
      target: { value: 'R-001' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));
    expect(await screen.findByText('R-001')).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: 'Next transactions page' }),
    );
    expect(await screen.findByText('R-002')).toBeInTheDocument();
    expect(
      loyaltyControllerSearchTransactionsByReceiptV1,
    ).toHaveBeenLastCalledWith(
      { receiptNumber: 'R-001', limit: 10, cursor: 'next-page' },
      expect.anything(),
    );
    expect(screen.getByText('Page 2')).toBeInTheDocument();
  });

  it('preserves the API date-time order when rendering transaction rows', async () => {
    const newestItem = {
      ...firstItem,
      transactionId: 'ledger-newest',
      receiptNumber: 'R-NEWEST',
      occurredAt: '2030-01-02T12:00:00.000Z',
    };
    const olderItem = {
      ...firstItem,
      transactionId: 'ledger-older',
      receiptNumber: 'R-OLDER',
      occurredAt: '2030-01-01T12:00:00.000Z',
    };
    jest
      .mocked(loyaltyControllerSearchTransactionsByReceiptV1)
      .mockResolvedValue(searchResponse([newestItem, olderItem]));

    render(<SupervisorTransactionsDashboard />);
    await waitForInitialListLoad();
    fireEvent.change(screen.getByRole('textbox', { name: 'Receipt number' }), {
      target: { value: 'R-001' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));
    expect(await screen.findByText('R-NEWEST')).toBeInTheDocument();

    const transactionRows = screen.getAllByRole('row').slice(1);
    expect(
      transactionRows.map((row) => row.querySelector('td')?.textContent),
    ).toEqual(['R-NEWEST', 'R-OLDER']);
  });

  it('refreshes the current cursor page with its applied receipt filters', async () => {
    const filteredFirstItem = { ...firstItem, status: 'REVERSED' };
    const secondItem = {
      ...filteredFirstItem,
      transactionId: 'ledger-2',
      receiptNumber: 'R-002',
    };
    const refreshedItem = { ...secondItem, customerName: 'Updated customer' };
    jest
      .mocked(loyaltyControllerSearchTransactionsByReceiptV1)
      .mockResolvedValueOnce(searchResponse([]))
      .mockResolvedValueOnce(searchResponse([firstItem], true, 'initial-next'))
      .mockResolvedValueOnce(
        searchResponse([filteredFirstItem], true, 'filtered-next'),
      )
      .mockResolvedValueOnce(
        searchResponse([secondItem], true, 'filtered-next-2'),
      )
      .mockResolvedValueOnce(
        searchResponse([refreshedItem], true, 'filtered-next-3'),
      );

    render(<SupervisorTransactionsDashboard />);
    await waitForInitialListLoad();
    const refreshButton = screen.getByRole('button', {
      name: 'Refresh transactions',
    });
    expect(refreshButton).toBeEnabled();
    fireEvent.change(screen.getByRole('textbox', { name: 'Receipt number' }), {
      target: { value: 'R-001' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));
    expect(await screen.findByText('R-001')).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: 'Status filter, All Statuses' }),
    );
    fireEvent.click(screen.getByRole('option', { name: 'Reversed' }));
    expect(refreshButton).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Apply filters' }));
    await waitFor(() =>
      expect(
        loyaltyControllerSearchTransactionsByReceiptV1,
      ).toHaveBeenLastCalledWith(
        {
          receiptNumber: 'R-001',
          limit: 10,
          cursor: undefined,
          status: 'REVERSED',
        },
        expect.anything(),
      ),
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'Next transactions page' }),
    );
    expect(await screen.findByText('R-002')).toBeInTheDocument();
    fireEvent.click(refreshButton);
    expect(await screen.findByText('Updated customer')).toBeInTheDocument();
    expect(
      loyaltyControllerSearchTransactionsByReceiptV1,
    ).toHaveBeenLastCalledWith(
      {
        receiptNumber: 'R-001',
        limit: 10,
        cursor: 'filtered-next',
        status: 'REVERSED',
      },
      expect.anything(),
    );
    expect(screen.getByText('Page 2')).toBeInTheDocument();
  });

  it('does not expose reversal controls for a mismatched authoritative detail response', async () => {
    jest
      .mocked(loyaltyControllerSearchTransactionsByReceiptV1)
      .mockResolvedValue(searchResponse([firstItem]));
    jest
      .mocked(loyaltyControllerGetTransactionV1)
      .mockResolvedValue(
        detailResponse({ transactionId: 'different-ledger-id' }),
      );

    render(<SupervisorTransactionsDashboard />);
    await waitForInitialListLoad();
    fireEvent.change(screen.getByRole('textbox', { name: 'Receipt number' }), {
      target: { value: 'R-001' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));
    const row = await screen.findByText('R-001');
    fireEvent.click(row.closest('tr')!);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The selected result could not be verified.',
    );
    expect(
      screen.queryByRole('button', { name: 'Confirm reversal' }),
    ).toBeNull();
    expect(reversalsControllerReverseV1).not.toHaveBeenCalled();
  });

  it('shows an empty receipt search without inventing transactions', async () => {
    jest
      .mocked(loyaltyControllerSearchTransactionsByReceiptV1)
      .mockResolvedValue(searchResponse([]));

    render(<SupervisorTransactionsDashboard />);
    await waitForInitialListLoad();
    fireEvent.change(screen.getByRole('textbox', { name: 'Receipt number' }), {
      target: { value: 'R-MISSING' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    expect(
      await screen.findByText('No transactions found'),
    ).toBeInTheDocument();
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(
      screen.getByText(/No matching transactions were found/),
    ).toBeInTheDocument();
  });
});
