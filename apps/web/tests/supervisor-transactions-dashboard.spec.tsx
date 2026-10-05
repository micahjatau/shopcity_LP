import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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
    data: { data: { items, hasMore, nextCursor } },
  } as never;
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
    expect(
      loyaltyControllerSearchTransactionsByReceiptV1,
    ).not.toHaveBeenCalled();

    fireEvent.change(screen.getByRole('textbox', { name: 'Receipt number' }), {
      target: { value: ' R-001 ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    const receipt = await screen.findByText('R-001');
    expect(loyaltyControllerSearchTransactionsByReceiptV1).toHaveBeenCalledWith(
      { receiptNumber: 'R-001', limit: 10, cursor: undefined },
      expect.objectContaining({ credentials: 'include' }),
    );
    const row = receipt.closest('tr');
    expect(row).not.toBeNull();
    row!.focus();
    fireEvent.click(row!);

    const dialog = await screen.findByRole('dialog', { name: 'R-001' });
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

  it('paginates bounded receipt results using the returned cursor', async () => {
    const secondItem = {
      ...firstItem,
      transactionId: 'ledger-2',
      receiptNumber: 'R-002',
    };
    jest
      .mocked(loyaltyControllerSearchTransactionsByReceiptV1)
      .mockResolvedValueOnce(searchResponse([firstItem], true, 'next-page'))
      .mockResolvedValueOnce(searchResponse([secondItem]));

    render(<SupervisorTransactionsDashboard />);
    fireEvent.change(screen.getByRole('textbox', { name: 'Receipt number' }), {
      target: { value: 'R-001' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));
    expect(await screen.findByText('R-001')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(await screen.findByText('R-002')).toBeInTheDocument();
    expect(
      loyaltyControllerSearchTransactionsByReceiptV1,
    ).toHaveBeenLastCalledWith(
      { receiptNumber: 'R-001', limit: 10, cursor: 'next-page' },
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
