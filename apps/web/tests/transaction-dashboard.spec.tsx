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

const activityItems = [
  {
    id: 'txn-1',
    transactionId: 'txn-1',
    redeemedAmountKobo: null,
    netPaidAmountKobo: null,
    earnedAmountKobo: 500,
    receiptNumber: 'R-001',
    operation: 'EARN',
    status: 'APPROVED',
    customerName: 'Ada Akin',
    purchaseAmountKobo: 10000,
    loyaltyAmountKobo: 500,
    occurredAt: '2026-01-01T10:00:00.000Z',
  },
  {
    id: 'txn-2',
    transactionId: 'ledger-redeem-2',
    redeemedAmountKobo: 200,
    netPaidAmountKobo: 29800,
    earnedAmountKobo: 100,
    receiptNumber: 'R-002',
    operation: 'REDEEM',
    status: 'CONFIRMED',
    customerName: 'Kelechi Okafor',
    purchaseAmountKobo: 30000,
    loyaltyAmountKobo: 200,
    occurredAt: '2026-01-01T11:00:00.000Z',
  },
];

function mockActivity(items = activityItems, totalCount = items.length) {
  jest.mocked(reportsControllerListCashierTodayV1).mockResolvedValue({
    status: 200,
    data: { data: { items, page: 1, limit: 5, totalCount } },
  } as never);
}

function detailRecord(transactionId: string, state = 'POSTED') {
  return {
    id: transactionId,
    transactionId,
    type: 'EARN',
    direction: 'CREDIT',
    tenantId: 'tenant-1',
    branchId: 'branch-1',
    customerId: 'customer-1',
    deviceId: null,
    cardSerialNumber: 'SC-2670-7376',
    posReceiptNumber: 'R-001',
    purchaseAmountKobo: 10000,
    occurredAt: '2026-01-01T10:00:00.000Z',
    capturedAt: '2026-01-01T10:01:00.000Z',
    state,
    captureStatus: null,
    reviewStatus: null,
    approvalId: null,
    approvalStatus: null,
    ledgerEntryId: 'ledger-1',
    creditKobo: 500,
    redeemedAmountKobo: null,
    netPaidAmountKobo: null,
    redemptionId: null,
    availableBalanceKobo: 0,
    expiresAt: null,
    smsStatus: null,
    ledger: {},
    settlementEffects: [
      {
        transactionId: 'ledger-1',
        type: 'EARN',
        direction: 'CREDIT',
        amountKobo: 500,
        status: 'CONFIRMED',
      },
    ],
  };
}

describe('TransactionDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('filters the bounded cashier report and opens authoritative detail', async () => {
    mockActivity();
    jest.mocked(loyaltyControllerGetTransactionV1).mockResolvedValue({
      status: 200,
      data: { data: detailRecord('txn-1') },
    } as never);

    const { container } = render(<TransactionDashboard />);
    await waitFor(() => expect(screen.getByText('R-001')).toBeInTheDocument());
    expect(
      screen.getByText('Captured receipts and the credit issued against them.'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Operations · Live ledger')).toBeNull();
    expect(screen.queryByText('Today’s cashier activity')).toBeNull();

    const heading = container.querySelector(
      '[data-od-id="transactions-heading"]',
    );
    const filters = container.querySelector(
      '[data-od-id="transaction-filters"]',
    );
    const tableCard = container.querySelector(
      '[data-od-id="transactions-table"]',
    );
    expect(heading).not.toBeNull();
    expect(filters).not.toBeNull();
    expect(tableCard).not.toBeNull();
    const refreshButton = screen.getByRole('button', {
      name: 'Refresh transactions',
    });
    expect(refreshButton.querySelector('svg')).not.toBeNull();
    expect(heading).toContainElement(refreshButton);
    expect(heading!.compareDocumentPosition(tableCard!)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(filters!.closest('[data-od-id="transactions-table"]')).toBe(
      tableCard,
    );

    const search = screen.getByRole('searchbox', {
      name: 'Search receipt, customer name, or transaction ID',
    });
    fireEvent.change(search, { target: { value: 'Ada' } });
    expect(screen.getByText('R-001')).toBeInTheDocument();
    expect(screen.queryByText('R-002')).not.toBeInTheDocument();
    fireEvent.change(search, { target: { value: '' } });

    fireEvent.change(screen.getByLabelText('Filter by operation'), {
      target: { value: 'REDEEM' },
    });
    expect(screen.queryByText('R-001')).not.toBeInTheDocument();
    expect(screen.getByText('R-002')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Filter by operation'), {
      target: { value: '' },
    });

    const minimumAmount = screen.getByLabelText(
      'Minimum purchase amount in naira',
    );
    fireEvent.change(minimumAmount, { target: { value: '200' } });
    expect(screen.queryByText('R-001')).not.toBeInTheDocument();
    expect(screen.getByText('R-002')).toBeInTheDocument();
    fireEvent.change(minimumAmount, { target: { value: '' } });

    expect(screen.getByRole('contentinfo')).toHaveTextContent('Page 1 of 1');
    fireEvent.click(screen.getByText('R-001'));
    const dialog = await screen.findByRole('dialog', {
      name: 'Transaction R-001',
    });
    expect(dialog).toHaveTextContent('txn-1');
    expect(dialog).toHaveTextContent('Ada Akin');
    expect(dialog).toHaveTextContent('SC-2670-7376');
    expect(dialog).toHaveTextContent(
      'Receipt image not provided by the Cashier transaction service.',
    );
    expect(dialog).toHaveTextContent(
      'Audit events are not included in the Cashier transaction response.',
    );
    expect(dialog).not.toHaveTextContent('customer-1');
    expect(loyaltyControllerGetTransactionV1).toHaveBeenCalledWith(
      'txn-1',
      expect.anything(),
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('loads requested server pages and presents the shell table pagination', async () => {
    mockActivity(activityItems, 12);
    const secondPageItem = {
      ...activityItems[0],
      id: 'txn-page-2',
      receiptNumber: 'R-006',
    };
    jest
      .mocked(reportsControllerListCashierTodayV1)
      .mockResolvedValueOnce({
        status: 200,
        data: {
          data: { items: activityItems, page: 1, limit: 5, totalCount: 12 },
        },
      } as never)
      .mockResolvedValueOnce({
        status: 200,
        data: {
          data: { items: [secondPageItem], page: 2, limit: 5, totalCount: 12 },
        },
      } as never);

    render(<TransactionDashboard />);
    await waitFor(() => expect(screen.getByText('R-001')).toBeInTheDocument());
    expect(reportsControllerListCashierTodayV1).toHaveBeenNthCalledWith(
      1,
      { page: 1, limit: 5 },
      expect.anything(),
    );
    expect(
      screen.getByText('Page 1 · 12 transactions today'),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: 'Next transaction page' }),
    );
    expect(await screen.findByText('R-006')).toBeInTheDocument();
    expect(reportsControllerListCashierTodayV1).toHaveBeenNthCalledWith(
      2,
      { page: 2, limit: 5 },
      expect.anything(),
    );
    expect(screen.getByText('Page 2 of 3')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Filter by operation'), {
      target: { value: 'EARN' },
    });
    await waitFor(() =>
      expect(reportsControllerListCashierTodayV1).toHaveBeenNthCalledWith(
        3,
        { page: 1, limit: 5 },
        expect.anything(),
      ),
    );
    await waitFor(() =>
      expect(screen.getByText('Page 1 of 3')).toBeInTheDocument(),
    );
  });

  it('preserves the table composition for an empty bounded report', async () => {
    mockActivity([]);

    render(<TransactionDashboard />);

    expect(
      await screen.findByText('No transactions found'),
    ).toBeInTheDocument();
    expect(screen.getByRole('table')).toBeInTheDocument();
    for (const column of [
      'Receipt No.',
      'Name',
      'Receipt amount',
      'Credit',
      'Date & Time',
      'Outcome',
    ]) {
      expect(
        screen.getByRole('columnheader', { name: column }),
      ).toBeInTheDocument();
    }
    expect(
      screen.getByText(
        'Adjust the filters or refresh the bounded cashier activity feed.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('navigation', {
        name: 'Transaction results pagination',
      }),
    ).not.toBeInTheDocument();
  });

  it('contains focus and ignores stale detail responses', async () => {
    mockActivity();
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
      data: { data: detailRecord('txn-1') },
    });
    resolveSecond({
      status: 200,
      data: { data: detailRecord('txn-2', 'PENDING') },
    });

    const dialog = await screen.findByRole('dialog', {
      name: 'Transaction R-002',
    });
    await waitFor(() => expect(dialog).toHaveTextContent('txn-2'));
    expect(dialog).not.toHaveTextContent('txn-1');
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
