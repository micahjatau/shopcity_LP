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

    const purchase = screen.getByLabelText('Purchase amount');
    fireEvent.change(purchase, { target: { value: '10' } });
    fireEvent.blur(purchase);
    fireEvent.click(screen.getByRole('button', { name: 'Submit earn' }));

    await waitFor(() => {
      expect(
        screen.getByText('Earn confirmed by backend contract.'),
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
    const submit = screen.getByRole('button', { name: 'Submit redemption' });
    fireEvent.click(submit);
    fireEvent.click(submit);

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
        screen.getByText('Redemption confirmed by backend contract.'),
      ).toBeInTheDocument();
    });
  });
});
