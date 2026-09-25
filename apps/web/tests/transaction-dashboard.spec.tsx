import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import {
  loyaltyControllerGetTransactionV1,
  reportsControllerListCashierTodayV1,
} from '../lib/api/generated-client';
import { TransactionDashboard } from '../components/workflows/transaction-dashboard';

jest.mock('../lib/api/generated-client', () => ({
  loyaltyControllerGetTransactionV1: jest.fn(),
  reportsControllerListCashierTodayV1: jest.fn(),
}));

describe('TransactionDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('filters bounded activity and loads authoritative detail', async () => {
    jest.mocked(reportsControllerListCashierTodayV1).mockResolvedValue({
      status: 200,
      data: {
        data: {
          items: [
            {
              id: 'txn-1',
              receiptNumber: 'R-001',
              operation: 'EARN',
              status: 'APPROVED',
              loyaltyAmountKobo: 500,
              occurredAt: '2026-01-01T10:00:00.000Z',
            },
            {
              id: 'txn-2',
              receiptNumber: 'R-002',
              operation: 'REDEEM',
              status: 'PENDING',
              loyaltyAmountKobo: 200,
              occurredAt: '2026-01-01T11:00:00.000Z',
            },
          ],
        },
      },
    } as never);
    jest.mocked(loyaltyControllerGetTransactionV1).mockResolvedValue({
      status: 200,
      data: {
        data: {
          transactionId: 'txn-1',
          state: 'POSTED',
          customerId: 'customer-1',
          amountKobo: 1000,
        },
      },
    } as never);

    const { container } = render(<TransactionDashboard />);
    await waitFor(() => expect(screen.getByText('R-001')).toBeInTheDocument());
    expect(screen.getByText('Today’s cashier activity')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Review purchases, redemptions and their current status.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Live ledger|credit issued against/)).toBeNull();
    const heading = container.querySelector(
      '[data-od-id="transactions-heading"]',
    );
    const filters = container.querySelector(
      '[data-od-id="transaction-filters"]',
    );
    const table = container.querySelector('[data-od-id="transactions-table"]');
    expect(heading).not.toBeNull();
    expect(filters).not.toBeNull();
    expect(table).not.toBeNull();
    expect(heading).toContainElement(
      screen.getByRole('button', { name: /Refresh data/ }),
    );
    expect(filters).not.toContainElement(
      screen.getByRole('button', { name: /Refresh data/ }),
    );
    expect(heading!.compareDocumentPosition(filters!)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(filters!.compareDocumentPosition(table!)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    fireEvent.change(screen.getByLabelText('Filter by operation'), {
      target: { value: 'REDEEM' },
    });
    expect(screen.queryByText('R-001')).not.toBeInTheDocument();
    expect(screen.getByText('R-002')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Filter by operation'), {
      target: { value: '' },
    });
    expect(screen.getByRole('contentinfo')).toHaveTextContent('Page 1 of 1');
    fireEvent.click(screen.getByText('R-001'));
    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: 'R-001' })).toBeInTheDocument(),
    );
    expect(screen.getByRole('dialog')).toHaveTextContent('txn-1');
    expect(screen.getByRole('dialog')).toHaveTextContent(
      'Receipt images are not included in this activity report.',
    );
    expect(screen.getByRole('dialog')).toHaveTextContent(
      'Not included in cashier report',
    );
    expect(screen.queryByText('customer-1')).not.toBeInTheDocument();
    expect(loyaltyControllerGetTransactionV1).toHaveBeenCalledWith(
      'txn-1',
      expect.anything(),
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('preserves the table composition for an empty bounded report', async () => {
    jest.mocked(reportsControllerListCashierTodayV1).mockResolvedValue({
      status: 200,
      data: { data: { items: [] } },
    } as never);

    render(<TransactionDashboard />);

    expect(
      await screen.findByText('No transactions found'),
    ).toBeInTheDocument();
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: 'Receipt no.' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: 'Operation' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: 'Credit' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: 'Status' }),
    ).toBeInTheDocument();
    expect(
      screen
        .getByText(
          'Adjust the filters or refresh the bounded cashier activity feed.',
        )
        .closest('[role="status"]'),
    ).toHaveTextContent(
      'Adjust the filters or refresh the bounded cashier activity feed.',
    );
    expect(screen.getByRole('contentinfo')).toHaveTextContent(
      '0 loaded transactions · bounded report scope',
    );
  });

  it('contains focus and ignores stale detail responses', async () => {
    jest.mocked(reportsControllerListCashierTodayV1).mockResolvedValue({
      status: 200,
      data: {
        data: {
          items: [
            {
              id: 'txn-1',
              receiptNumber: 'R-001',
              operation: 'EARN',
              status: 'APPROVED',
              loyaltyAmountKobo: 500,
              occurredAt: '2026-01-01T10:00:00.000Z',
            },
            {
              id: 'txn-2',
              receiptNumber: 'R-002',
              operation: 'REDEEM',
              status: 'PENDING',
              loyaltyAmountKobo: null,
              occurredAt: '2026-01-01T11:00:00.000Z',
            },
          ],
        },
      },
    } as never);

    let resolveFirst!: (value: unknown) => void;
    let resolveSecond!: (value: unknown) => void;
    const firstDetail = new Promise((resolve) => {
      resolveFirst = resolve;
    });
    const secondDetail = new Promise((resolve) => {
      resolveSecond = resolve;
    });
    jest
      .mocked(loyaltyControllerGetTransactionV1)
      .mockReturnValueOnce(firstDetail as never)
      .mockReturnValueOnce(secondDetail as never);

    render(<TransactionDashboard />);
    await waitFor(() => expect(screen.getByText('R-001')).toBeInTheDocument());
    const firstRow = screen.getByText('R-001').closest('tr');
    expect(firstRow).not.toBeNull();
    firstRow!.focus();
    fireEvent.click(firstRow!);
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
    expect(document.activeElement).toHaveAccessibleName(
      'Close transaction detail',
    );

    const secondRow = screen.getByText('R-002').closest('tr');
    expect(secondRow).not.toBeNull();
    fireEvent.click(secondRow!);
    resolveFirst({
      status: 200,
      data: { data: { transactionId: 'txn-1', state: 'POSTED' } },
    });
    resolveSecond({
      status: 200,
      data: { data: { transactionId: 'txn-2', state: 'PENDING' } },
    });

    await waitFor(() =>
      expect(screen.getByRole('dialog')).toHaveTextContent('txn-2'),
    );
    expect(screen.getByRole('dialog')).not.toHaveTextContent('txn-1');
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(document.activeElement).toHaveAccessibleName(
      'Close transaction detail',
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    await waitFor(() => expect(document.activeElement).toBe(secondRow));
  });
});
