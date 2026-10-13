import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { EarnTransactionForm } from '../components/workflows/earn-transaction-form';
import { RedeemTransactionForm } from '../components/workflows/redeem-transaction-form';
import { saveOfflineEarnRecord } from '../lib/browser/offline-earn-queue';
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
      data: {
        success: true,
        data: {
          id: 'receipt-1',
          transactionId: 'earn-1',
          state: 'CONFIRMED',
          receiptId: 'receipt-1',
          tenantId: 'tenant-1',
          branchId: 'branch-1',
          deviceId: 'device-1',
          customerId: 'customer-1',
          cardSerialNumber: 'CARD-001',
          posReceiptNumber: 'R-001',
          purchaseAmountKobo: 1000,
          creditKobo: 50,
          captureStatus: 'CAPTURED',
          availableBalanceKobo: 6150,
          expiresAt: '2026-10-05T12:00:00.000Z',
          smsStatus: 'QUEUED',
          occurredAt: '2026-09-05T11:28:00.000Z',
          capturedAt: '2026-09-05T12:00:00.000Z',
          reviewStatus: 'APPROVED',
        },
        meta: {
          timestamp: '2026-09-05T12:00:00.000Z',
          path: '/api/v1/transactions/earn',
          requestId: 'req-earn-1',
        },
      },
    } as never);
    jest.mocked(redemptionsControllerRedeemV1).mockResolvedValue({
      status: 201,
      data: { data: { transactionId: 'redeem-1' } },
    } as never);
  });

  it('shows authoritative Earn confirmation and refreshes the shell', async () => {
    const onFlowStepChange = jest.fn();
    render(
      <EarnTransactionForm
        lookupContext={lookupContext}
        policyContext={policyContext}
        cashierId="cashier-1"
        deviceId="device-1"
        branchId="branch-1"
        onFlowStepChange={onFlowStepChange}
      />,
    );

    fireEvent.change(screen.getByLabelText('Receipt number *'), {
      target: { value: 'R-001' },
    });
    const purchase = screen.getByLabelText('Receipt amount (₦) *');
    fireEvent.change(purchase, { target: { value: '10' } });
    fireEvent.blur(purchase);
    fireEvent.click(screen.getByRole('button', { name: 'Proceed to review' }));
    fireEvent.click(
      screen.getByRole('button', { name: 'Confirm & add credit' }),
    );

    await waitFor(() => {
      expect(
        screen.getByRole('heading', {
          level: 2,
          name: 'ShopCity Credit earned',
        }),
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
    expect(earnPayload.purchaseAmountKobo).toBe(1000);
    expect(earnPayload).not.toHaveProperty('balanceKobo');
    expect(earnPayload).not.toHaveProperty('role');
    expect(earnPayload).not.toHaveProperty('approval');
    expect(screen.getByText('+₦0.50')).toBeInTheDocument();
    expect(screen.getByText('₦61.50')).toBeInTheDocument();
    expect(screen.getByText('5%')).toBeInTheDocument();
    expect(screen.getAllByText('₦10.00')).toHaveLength(2);
    expect(screen.getByText('R-001')).toBeInTheDocument();
    expect(screen.getByText('Approved')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Redeem Now' })).toHaveAttribute(
      'href',
      '/cashier/redeem?card=CARD-001',
    );
    expect(screen.getByRole('link', { name: 'View Customer' })).toHaveAttribute(
      'href',
      '/cashier/customers?id=customer-1',
    );
    expect(
      screen.getByRole('button', { name: 'Capture Another' }),
    ).toBeInTheDocument();
    const copyButton = screen.getByRole('button', {
      name: 'Copy cashier name Cashier',
    });
    expect(copyButton).toBeInTheDocument();
    const previousClipboard = Object.getOwnPropertyDescriptor(
      navigator,
      'clipboard',
    );
    const writeClipboardText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: writeClipboardText },
    });
    try {
      fireEvent.click(copyButton);
      await waitFor(() => {
        expect(writeClipboardText).toHaveBeenCalledWith('Cashier');
        expect(screen.getByText('Cashier name copied.')).toBeInTheDocument();
      });
    } finally {
      if (previousClipboard) {
        Object.defineProperty(navigator, 'clipboard', previousClipboard);
      } else {
        Reflect.deleteProperty(navigator, 'clipboard');
      }
    }
    expect(mockRouterRefresh).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(onFlowStepChange).toHaveBeenLastCalledWith(4);
    });
  });

  it('does not unlock Earn from customer name without verified card context', () => {
    render(
      <EarnTransactionForm
        lookupContext={{ customerName: 'Ada Shopper' }}
        policyContext={policyContext}
      />,
    );

    fireEvent.change(screen.getByLabelText('Receipt number *'), {
      target: { value: 'R-NO-CARD' },
    });
    fireEvent.change(screen.getByLabelText('Receipt amount (₦) *'), {
      target: { value: '10' },
    });
    fireEvent.blur(screen.getByLabelText('Receipt amount (₦) *'));

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
    expect(screen.getByLabelText('Receipt number *')).toBeRequired();

    fireEvent.change(screen.getByLabelText('Receipt number *'), {
      target: { value: 'R-002' },
    });
    fireEvent.change(screen.getByLabelText('Receipt amount (₦) *'), {
      target: { value: '1.01' },
    });
    fireEvent.blur(screen.getByLabelText('Receipt amount (₦) *'));

    expect(screen.getByText('₦0.06')).toBeInTheDocument();
    expect(submit).toBeEnabled();
  });

  it('requires a valid occurred-at timestamp before allowing Earn review', () => {
    render(
      <EarnTransactionForm
        lookupContext={lookupContext}
        policyContext={policyContext}
      />,
    );

    const occurredAt = screen.getByLabelText('Receipt date & time *');
    expect(occurredAt).toBeRequired();
    fireEvent.change(screen.getByLabelText('Receipt number *'), {
      target: { value: 'R-REQUIRED-TIMESTAMP' },
    });
    fireEvent.change(screen.getByLabelText('Receipt amount (₦) *'), {
      target: { value: '10' },
    });
    fireEvent.blur(screen.getByLabelText('Receipt amount (₦) *'));

    const proceedButton = screen.getByRole('button', {
      name: 'Proceed to review',
    });
    expect(proceedButton).toBeEnabled();
    fireEvent.change(occurredAt, { target: { value: '' } });

    expect(occurredAt).toHaveValue('');
    expect(
      screen.getByText('Receipt date and time is required.'),
    ).toBeInTheDocument();
    expect(proceedButton).toBeDisabled();
    expect(loyaltyControllerEarnV1).not.toHaveBeenCalled();
  });

  it('renders the receipt-details design with an authoritative credit estimate', () => {
    render(
      <EarnTransactionForm
        lookupContext={lookupContext}
        policyContext={policyContext}
      />,
    );

    expect(
      screen.getByRole('heading', { name: 'Step 3 — Receipt details' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Receipt number *')).toBeRequired();
    expect(screen.getByLabelText('Receipt amount (₦) *')).toBeInTheDocument();
    expect(screen.getByLabelText('Receipt date & time *')).toBeRequired();
    expect(
      screen.queryByRole('textbox', { name: /till|cashier reference/i }),
    ).not.toBeInTheDocument();

    const receiptAmount = screen.getByLabelText('Receipt amount (₦) *');
    fireEvent.change(receiptAmount, { target: { value: '10' } });
    fireEvent.blur(receiptAmount);

    expect(screen.getByText('₦0.50')).toBeInTheDocument();
    const creditLabel = screen.getByText('Estimated ShopCity credit');
    expect(creditLabel.parentElement).toHaveClass(
      'cashier-earn-receipt-estimate-field',
    );
    expect(creditLabel.closest('.cashier-earn-receipt-estimate')).toBeNull();
    expect(
      screen.queryByText(/final credit amount is calculated by ShopCity/i),
    ).not.toBeInTheDocument();
  });

  it('renders an Earn review with the Figma summary and non-authoritative estimates', () => {
    render(
      <EarnTransactionForm
        lookupContext={lookupContext}
        policyContext={policyContext}
      />,
    );

    fireEvent.change(screen.getByLabelText('Receipt number *'), {
      target: { value: 'R-REVIEW' },
    });
    const receiptAmount = screen.getByLabelText('Receipt amount (₦) *');
    fireEvent.change(receiptAmount, { target: { value: '10' } });
    fireEvent.blur(receiptAmount);
    fireEvent.click(screen.getByRole('button', { name: 'Proceed to review' }));

    expect(
      screen.getByRole('heading', { name: 'Step 4 — Review' }),
    ).toBeInTheDocument();
    for (const label of [
      'Customer',
      'Receipt number',
      'Receipt amount',
      'Eligible amount',
      'Cashback rate',
      'Receipt date',
      'Estimated ShopCity Credit',
      'Balance before',
      'Estimated new balance',
    ]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    expect(screen.getByText('5%')).toBeInTheDocument();
    expect(screen.getByText('+₦0.50')).toBeInTheDocument();
    expect(screen.getByText('Receipt amount').parentElement).toHaveTextContent(
      '₦10.00',
    );
    expect(screen.getByText('Eligible amount').parentElement).toHaveTextContent(
      '₦10.00',
    );
    expect(screen.getByText('₦55.00')).toBeInTheDocument();
    expect(screen.getByText('₦55.50')).toBeInTheDocument();
    expect(screen.queryByText('Till reference')).not.toBeInTheDocument();
    expect(
      screen.queryByText('ShopCity Credit earned'),
    ).not.toBeInTheDocument();
    expect(screen.getByText('Back')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Confirm & add credit' }),
    ).toBeEnabled();
    expect(loyaltyControllerEarnV1).not.toHaveBeenCalled();
  });

  it('uses the TRD 2% policy rate and full receipt amount as eligible in review', () => {
    render(
      <EarnTransactionForm
        lookupContext={lookupContext}
        policyContext={{ ...policyContext, defaultEarnRateBps: 200 }}
      />,
    );

    fireEvent.change(screen.getByLabelText('Receipt number *'), {
      target: { value: 'R-TRD-RATE' },
    });
    const receiptAmount = screen.getByLabelText('Receipt amount (₦) *');
    fireEvent.change(receiptAmount, { target: { value: '10' } });
    fireEvent.blur(receiptAmount);
    fireEvent.click(screen.getByRole('button', { name: 'Proceed to review' }));

    expect(screen.getByText('2%')).toBeInTheDocument();
    expect(screen.getByText('+₦0.20')).toBeInTheDocument();
    expect(screen.getByText('₦55.20')).toBeInTheDocument();
    expect(screen.getAllByText('₦10.00')).toHaveLength(2);
    expect(loyaltyControllerEarnV1).not.toHaveBeenCalled();
  });

  it('uses the current wallet balance for the Earn review projection', () => {
    render(
      <EarnTransactionForm
        lookupContext={lookupContext}
        currentWalletBalanceKobo={7600}
        policyContext={policyContext}
      />,
    );

    fireEvent.change(screen.getByLabelText('Receipt number *'), {
      target: { value: 'R-CURRENT-BALANCE' },
    });
    const receiptAmount = screen.getByLabelText('Receipt amount (₦) *');
    fireEvent.change(receiptAmount, { target: { value: '10' } });
    fireEvent.blur(receiptAmount);
    fireEvent.click(screen.getByRole('button', { name: 'Proceed to review' }));

    expect(screen.getByText('₦76.00')).toBeInTheDocument();
    expect(screen.getByText('₦76.50')).toBeInTheDocument();
    expect(screen.queryByText('₦55.00')).not.toBeInTheDocument();
  });

  it('returns from receipt details to customer confirmation when Back is used', () => {
    const onBackToCustomerConfirmation = jest.fn();
    render(
      <EarnTransactionForm
        lookupContext={lookupContext}
        policyContext={policyContext}
        onBackToCustomerConfirmation={onBackToCustomerConfirmation}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Back' }));

    expect(onBackToCustomerConfirmation).toHaveBeenCalledTimes(1);
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
    fireEvent.change(screen.getByLabelText('Receipt number *'), {
      target: { value: 'R-003' },
    });
    fireEvent.change(screen.getByLabelText('Receipt amount (₦) *'), {
      target: { value: '10' },
    });
    fireEvent.blur(screen.getByLabelText('Receipt amount (₦) *'));
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

  it.each([
    {
      code: 'SESSION_DEVICE_REQUIRED',
      message:
        'Your cashier session needs an assigned device. Sign in again with your cashier device or contact a supervisor.',
    },
    {
      code: 'DEVICE_NOT_ACTIVE',
      message:
        'This cashier device is inactive. Contact a supervisor before capturing a purchase.',
    },
    {
      code: 'DEVICE_BRANCH_MISMATCH',
      message:
        'This cashier device is assigned to a different branch. Contact a supervisor.',
    },
    {
      code: 'BRANCH_CONTEXT_REQUIRED',
      message:
        'Your cashier session is missing a branch assignment. Sign in again or contact a supervisor.',
    },
    {
      code: 'VALIDATION_ERROR',
      message:
        'ShopCity rejected the receipt details. Check the receipt number, amount, and date/time.',
    },
    {
      code: 'UNEXPECTED_BAD_REQUEST',
      message:
        'ShopCity rejected the earn request (UNEXPECTED_BAD_REQUEST). Check the receipt details and cashier device, then try again.',
    },
  ])('maps $code to an actionable Earn message', async ({ code, message }) => {
    jest.mocked(loyaltyControllerEarnV1).mockResolvedValue({
      status: 400,
      data: { error: { code } },
    } as never);
    render(
      <EarnTransactionForm
        lookupContext={lookupContext}
        policyContext={policyContext}
      />,
    );

    fireEvent.change(screen.getByLabelText('Receipt number *'), {
      target: { value: 'R-400' },
    });
    const purchase = screen.getByLabelText('Receipt amount (₦) *');
    fireEvent.change(purchase, { target: { value: '10' } });
    fireEvent.blur(purchase);
    fireEvent.click(screen.getByRole('button', { name: 'Proceed to review' }));
    fireEvent.click(
      screen.getByRole('button', { name: 'Confirm & add credit' }),
    );

    await waitFor(() => {
      expect(screen.getByText(message, { exact: true })).toBeInTheDocument();
    });
    expect(screen.queryByText(/status 400/i)).not.toBeInTheDocument();
    expect(jest.mocked(saveOfflineEarnRecord)).not.toHaveBeenCalled();
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
    fireEvent.change(screen.getByLabelText('Receipt number *'), {
      target: { value: 'R-PENDING' },
    });
    fireEvent.change(screen.getByLabelText('Receipt amount (₦) *'), {
      target: { value: '10' },
    });
    fireEvent.blur(screen.getByLabelText('Receipt amount (₦) *'));
    fireEvent.click(screen.getByRole('button', { name: 'Proceed to review' }));
    fireEvent.click(
      screen.getByRole('button', { name: 'Confirm & add credit' }),
    );

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'Purchase pending approval' }),
      ).toBeInTheDocument();
    });
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
