import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { EarnTransactionForm } from '../components/workflows/earn-transaction-form';
import { RedeemTransactionForm } from '../components/workflows/redeem-transaction-form';
import {
  loyaltyControllerEarnV1,
  redemptionsControllerRedeemV1,
} from '../lib/api/generated-client';

const mockRouterRefresh = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRouterRefresh }),
}));

jest.mock('../lib/browser/offline-earn-queue', () => ({
  saveOfflineEarnRecord: jest.fn(),
}));

jest.mock('../lib/api/generated-client', () => {
  const actual = jest.requireActual('../lib/api/generated-client');
  return {
    ...actual,
    loyaltyControllerEarnV1: jest.fn(),
    redemptionsControllerRedeemV1: jest.fn(),
  };
});

const lookupContext = {
  cardSerialNumber: 'CARD-001',
  customerId: 'customer-1',
  customerName: 'Ada Shopper',
  availableBalanceKobo: 5500,
  branchId: 'branch-1',
};

const policyContext = {
  defaultEarnRateBps: 500,
  minRedemptionKobo: 100,
  maxRedemptionBasketPercent: 50,
  offlineRedemptionDisabled: false,
};

describe('cashier transaction forms', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.clear();
    jest.mocked(loyaltyControllerEarnV1).mockResolvedValue({
      status: 201,
      data: { data: { transactionId: 'earn-1' } },
    } as never);
    jest.mocked(redemptionsControllerRedeemV1).mockResolvedValue({
      status: 201,
      data: { data: { transactionId: 'redeem-1' } },
    } as never);
  });

  it('shows authoritative Earn confirmation and refreshes the shell', async () => {
    render(
      <EarnTransactionForm
        lookupContext={lookupContext}
        policyContext={policyContext}
        cashierId="cashier-1"
        deviceId="device-1"
        branchId="branch-1"
      />,
    );

    fireEvent.change(screen.getByLabelText('POS receipt number'), {
      target: { value: 'R-001' },
    });
    const purchase = screen.getByLabelText('Purchase amount');
    fireEvent.change(purchase, { target: { value: '10' } });
    fireEvent.blur(purchase);
    fireEvent.click(screen.getByRole('button', { name: 'Proceed to review' }));
    fireEvent.click(
      screen.getByRole('button', { name: 'Confirm & add credit' }),
    );

    await waitFor(() => {
      expect(
        screen.getByText('Purchase captured and credit added.'),
      ).toBeInTheDocument();
    });
    expect(loyaltyControllerEarnV1).toHaveBeenCalledTimes(1);
    const earnPayload = jest.mocked(loyaltyControllerEarnV1).mock
      .calls[0][0] as Record<string, unknown>;
    expect(Object.keys(earnPayload).sort()).toEqual([
      'cardSerialNumber',
      'occurredAt',
      'overrideReason',
      'posReceiptNumber',
      'purchaseAmountKobo',
    ]);
    expect(earnPayload).not.toHaveProperty('balanceKobo');
    expect(earnPayload).not.toHaveProperty('role');
    expect(earnPayload).not.toHaveProperty('approval');
    expect(mockRouterRefresh).toHaveBeenCalledTimes(1);
  });

  it('does not unlock Earn from customer name without verified card context', () => {
    render(
      <EarnTransactionForm
        lookupContext={{ customerName: 'Ada Shopper' }}
        policyContext={policyContext}
      />,
    );

    fireEvent.change(screen.getByLabelText('POS receipt number'), {
      target: { value: 'R-NO-CARD' },
    });
    fireEvent.change(screen.getByLabelText('Purchase amount'), {
      target: { value: '10' },
    });
    fireEvent.blur(screen.getByLabelText('Purchase amount'));

    expect(
      screen.getByRole('button', { name: 'Proceed to review' }),
    ).toBeDisabled();
    expect(screen.getByText('Awaiting lookup')).toBeInTheDocument();
  });

  it('requires receipt and uses ceiling rounding for the advisory preview', async () => {
    render(
      <EarnTransactionForm
        lookupContext={lookupContext}
        policyContext={policyContext}
      />,
    );

    const submit = screen.getByRole('button', { name: 'Proceed to review' });
    expect(submit).toBeDisabled();
    expect(screen.getByText('Receipt number is required')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('POS receipt number'), {
      target: { value: 'R-002' },
    });
    fireEvent.change(screen.getByLabelText('Purchase amount'), {
      target: { value: '1.01' },
    });
    fireEvent.blur(screen.getByLabelText('Purchase amount'));

    expect(screen.getByText('₦0.06')).toBeInTheDocument();
    expect(submit).toBeEnabled();
  });

  it('maps duplicate receipt errors to an actionable message', async () => {
    jest.mocked(loyaltyControllerEarnV1).mockResolvedValue({
      status: 409,
      data: { error: { code: 'RECEIPT_ALREADY_USED' } },
    } as never);
    render(
      <EarnTransactionForm
        lookupContext={lookupContext}
        policyContext={policyContext}
      />,
    );
    fireEvent.change(screen.getByLabelText('POS receipt number'), {
      target: { value: 'R-003' },
    });
    fireEvent.change(screen.getByLabelText('Purchase amount'), {
      target: { value: '10' },
    });
    fireEvent.blur(screen.getByLabelText('Purchase amount'));
    fireEvent.click(screen.getByRole('button', { name: 'Proceed to review' }));
    fireEvent.click(
      screen.getByRole('button', { name: 'Confirm & add credit' }),
    );

    await waitFor(() => {
      expect(
        screen.getByText(/receipt has already been used this week/i),
      ).toBeInTheDocument();
    });
  });

  it('renders an approval-pending Earn outcome from the backend', async () => {
    jest.mocked(loyaltyControllerEarnV1).mockResolvedValue({
      status: 202,
      data: { data: { transactionId: 'earn-pending' } },
    } as never);
    render(
      <EarnTransactionForm
        lookupContext={lookupContext}
        policyContext={policyContext}
      />,
    );
    fireEvent.change(screen.getByLabelText('POS receipt number'), {
      target: { value: 'R-PENDING' },
    });
    fireEvent.change(screen.getByLabelText('Purchase amount'), {
      target: { value: '10' },
    });
    fireEvent.blur(screen.getByLabelText('Purchase amount'));
    fireEvent.click(screen.getByRole('button', { name: 'Proceed to review' }));
    fireEvent.click(
      screen.getByRole('button', { name: 'Confirm & add credit' }),
    );

    await waitFor(() => {
      expect(
        screen.getByText('Purchase captured and waiting for approval.'),
      ).toBeInTheDocument();
    });
    expect(
      screen.getByRole('heading', { name: 'Purchase pending approval' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText('ShopCity Credit earned'),
    ).not.toBeInTheDocument();
  });

  it('shows remaining payable amount in the distinct redemption flow', () => {
    render(
      <RedeemTransactionForm
        lookupContext={lookupContext}
        policyContext={policyContext}
      />,
    );

    fireEvent.change(screen.getByLabelText('Basket amount'), {
      target: { value: '100' },
    });
    fireEvent.change(screen.getByLabelText('Requested redemption'), {
      target: { value: '10' },
    });
    fireEvent.blur(screen.getByLabelText('Basket amount'));
    fireEvent.blur(screen.getByLabelText('Requested redemption'));

    expect(screen.getByText('Remaining payable amount')).toBeInTheDocument();
    expect(screen.getAllByText('₦90.00').length).toBeGreaterThanOrEqual(1);
  });

  it('keeps a pending redemption outcome distinct from a completed debit', async () => {
    jest.mocked(redemptionsControllerRedeemV1).mockResolvedValue({
      status: 202,
      data: { data: { transactionId: 'redeem-pending' } },
    } as never);
    render(
      <RedeemTransactionForm
        lookupContext={lookupContext}
        policyContext={policyContext}
      />,
    );

    fireEvent.change(screen.getByLabelText('Basket amount'), {
      target: { value: '100' },
    });
    fireEvent.change(screen.getByLabelText('Requested redemption'), {
      target: { value: '10' },
    });
    fireEvent.blur(screen.getByLabelText('Basket amount'));
    fireEvent.blur(screen.getByLabelText('Requested redemption'));
    fireEvent.click(
      screen.getByRole('button', { name: 'Proceed to confirmation' }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Confirm redemption' }));

    await waitFor(() => {
      expect(
        screen.getByText('Redemption submitted and waiting for approval.'),
      ).toBeInTheDocument();
    });
    expect(
      screen.getByRole('heading', { name: 'Redemption pending approval' }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Redemption completed')).not.toBeInTheDocument();
  });

  it('does not unlock Redeem from customer name without verified card context', () => {
    render(
      <RedeemTransactionForm
        lookupContext={{ customerName: 'Ada Shopper' }}
        policyContext={policyContext}
      />,
    );

    fireEvent.change(screen.getByLabelText('Basket amount'), {
      target: { value: '100' },
    });
    fireEvent.change(screen.getByLabelText('Requested redemption'), {
      target: { value: '10' },
    });
    fireEvent.blur(screen.getByLabelText('Basket amount'));
    fireEvent.blur(screen.getByLabelText('Requested redemption'));

    expect(
      screen.getByRole('button', { name: 'Proceed to confirmation' }),
    ).toBeDisabled();
    expect(screen.getByText('Awaiting lookup')).toBeInTheDocument();
  });

  it('maps insufficient redemption balance to an actionable message', async () => {
    jest.mocked(redemptionsControllerRedeemV1).mockResolvedValue({
      status: 422,
      data: { error: { code: 'INSUFFICIENT_BALANCE' } },
    } as never);
    render(
      <RedeemTransactionForm
        lookupContext={{ ...lookupContext, availableBalanceKobo: 100000 }}
        policyContext={policyContext}
      />,
    );
    fireEvent.change(screen.getByLabelText('Basket amount'), {
      target: { value: '400' },
    });
    fireEvent.change(screen.getByLabelText('Requested redemption'), {
      target: { value: '120' },
    });
    fireEvent.blur(screen.getByLabelText('Basket amount'));
    fireEvent.blur(screen.getByLabelText('Requested redemption'));
    fireEvent.click(
      screen.getByRole('button', { name: 'Proceed to confirmation' }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Confirm redemption' }));

    await waitFor(() => {
      expect(
        screen.getByText('Available credit is lower than this redemption.'),
      ).toBeInTheDocument();
    });
  });

  it('prevents duplicate redemption submissions while the first request is pending', async () => {
    let resolveRequest!: (value: unknown) => void;
    jest.mocked(redemptionsControllerRedeemV1).mockReturnValue(
      new Promise((resolve) => {
        resolveRequest = resolve;
      }) as never,
    );

    render(
      <RedeemTransactionForm
        lookupContext={lookupContext}
        policyContext={policyContext}
        cashierId="cashier-1"
        branchId="branch-1"
      />,
    );

    fireEvent.change(screen.getByLabelText('Basket amount'), {
      target: { value: '100' },
    });
    const requested = screen.getByLabelText('Requested redemption');
    fireEvent.change(requested, { target: { value: '10' } });
    fireEvent.blur(screen.getByLabelText('Basket amount'));
    fireEvent.blur(requested);
    const submit = screen.getByRole('button', {
      name: 'Proceed to confirmation',
    });
    fireEvent.click(submit);
    const confirm = screen.getByRole('button', { name: 'Confirm redemption' });
    fireEvent.click(confirm);
    fireEvent.click(confirm);

    expect(redemptionsControllerRedeemV1).toHaveBeenCalledTimes(1);
    const redeemPayload = jest.mocked(redemptionsControllerRedeemV1).mock
      .calls[0][0] as Record<string, unknown>;
    expect(Object.keys(redeemPayload).sort()).toEqual([
      'basketAmountKobo',
      'cardSerialNumber',
      'occurredAt',
      'posReceiptNumber',
      'requestedRedemptionKobo',
    ]);
    expect(redeemPayload).not.toHaveProperty('availableBalanceKobo');
    expect(redeemPayload).not.toHaveProperty('approval');
    resolveRequest({
      status: 201,
      data: { data: { transactionId: 'redeem-1' } },
    });
    await waitFor(() => {
      expect(
        screen.getByText('Credit redeemed successfully.'),
      ).toBeInTheDocument();
    });
  });
});
