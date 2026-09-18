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

    render(<TransactionDashboard />);
    await waitFor(() => expect(screen.getByText('R-001')).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText('Filter by operation'), {
      target: { value: 'REDEEM' },
    });
    expect(screen.queryByText('R-001')).not.toBeInTheDocument();
    expect(screen.getByText('R-002')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Filter by operation'), {
      target: { value: '' },
    });
    fireEvent.click(screen.getByText('R-001'));
    await waitFor(() =>
      expect(screen.getByText('customer-1')).toBeInTheDocument(),
    );
    expect(loyaltyControllerGetTransactionV1).toHaveBeenCalledWith(
      'txn-1',
      expect.anything(),
    );
  });
});
