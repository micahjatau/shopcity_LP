import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import {
  loyaltyControllerGetTransactionV1,
  reversalsControllerReverseV1,
} from '../lib/api/generated-client';
import { TransactionWorkspace } from '../components/workflows/transaction-workspace';

jest.mock('../lib/api/generated-client', () => ({
  loyaltyControllerGetTransactionV1: jest.fn(),
  reversalsControllerReverseV1: jest.fn(),
}));

describe('TransactionWorkspace', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads authoritative transaction detail and submits a confirmed reversal', async () => {
    jest.mocked(loyaltyControllerGetTransactionV1).mockResolvedValue({
      status: 200,
      data: {
        data: {
          transactionId: 'txn-1',
          state: 'POSTED',
          type: 'EARN',
          direction: 'CREDIT',
          customerId: 'customer-1',
          cardSerialNumber: 'CARD-1',
          amountKobo: 1000,
          availableBalanceKobo: 5000,
        },
      },
    } as never);
    jest.mocked(reversalsControllerReverseV1).mockResolvedValue({
      status: 201,
      data: { data: { transactionId: 'reversal-1' } },
    } as never);

    render(<TransactionWorkspace />);
    fireEvent.change(screen.getByLabelText('Transaction ID'), {
      target: { value: 'txn-1' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Load' }));

    await waitFor(() => {
      expect(screen.getAllByText('POSTED').length).toBeGreaterThan(0);
    });
    fireEvent.change(screen.getByLabelText('Reversal reason'), {
      target: { value: 'Duplicate capture' },
    });
    fireEvent.change(screen.getByLabelText('Reversal confirmation'), {
      target: { value: 'REVERSE' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Reverse transaction' }));

    await waitFor(() => {
      expect(reversalsControllerReverseV1).toHaveBeenCalledWith(
        'txn-1',
        { reason: 'Duplicate capture' },
        expect.objectContaining({ headers: expect.any(Object) }),
      );
    });
  });

  it('does not invent a supervisor destination for shared usage', () => {
    render(<TransactionWorkspace />);

    expect(
      screen.queryByRole('link', { name: /supervisor/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Transaction review' }),
    ).toBeInTheDocument();
  });

  it('accepts an explicit owning-workspace destination', () => {
    render(
      <TransactionWorkspace
        backHref="/admin"
        backLabel="Back to admin"
        relatedRoutes={[['/admin/approvals', 'Approvals']]}
      />,
    );

    expect(screen.getByRole('link', { name: 'Back to admin' })).toHaveAttribute(
      'href',
      '/admin',
    );
    expect(screen.getByRole('link', { name: 'Approvals' })).toHaveAttribute(
      'href',
      '/admin/approvals',
    );
  });
});
