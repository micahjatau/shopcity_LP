import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { EarnTransactionForm } from '../components/workflows/earn-transaction-form';
import { RedeemTransactionForm } from '../components/workflows/redeem-transaction-form';

const mockRefresh = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));

function readStoredDraft(key: string) {
  const raw = window.localStorage.getItem(key);
  expect(raw).not.toBeNull();
  return JSON.parse(raw ?? '{}') as Record<string, unknown>;
}

describe('workflow draft persistence', () => {
  beforeEach(() => {
    window.localStorage.clear();
    mockRefresh.mockReset();
  });

  it('persists earn drafts across remounts', async () => {
    const lookupContext = { cardSerialNumber: 'CARD-123' };
    const { unmount } = render(
      <EarnTransactionForm lookupContext={lookupContext} />,
    );
    fireEvent.change(screen.getByLabelText('Receipt number *'), {
      target: { value: 'RCPT-9' },
    });
    fireEvent.change(screen.getByLabelText('Receipt amount (₦) *'), {
      target: { value: '12.50' },
    });
    fireEvent.blur(screen.getByLabelText('Receipt amount (₦) *'));
    fireEvent.change(screen.getByLabelText('Receipt date & time *'), {
      target: { value: '2030-01-01T10:15' },
    });

    await waitFor(() => {
      expect(readStoredDraft('shopcity-earnedraft-v1')).toMatchObject({
        cardSerialNumber: 'CARD-123',
        receiptNumber: 'RCPT-9',
        purchaseAmount: 1250,
      });
    });

    const firstDraft = readStoredDraft('shopcity-earnedraft-v1');
    unmount();

    render(<EarnTransactionForm lookupContext={lookupContext} />);

    await waitFor(() => {
      expect(readStoredDraft('shopcity-earnedraft-v1')).toMatchObject({
        cardSerialNumber: 'CARD-123',
      });
    });
    expect(screen.getByLabelText('Receipt number *')).toHaveValue('RCPT-9');
    expect(screen.getByLabelText('Receipt amount (₦) *')).toHaveValue('12.50');
    expect(readStoredDraft('shopcity-earnedraft-v1').idempotencyKey).toBe(
      firstDraft.idempotencyKey,
    );
  });

  it('persists redeem drafts across remounts', async () => {
    const lookupContext = {
      cardSerialNumber: 'CARD-456',
      availableBalanceKobo: 5000,
    };
    const { unmount } = render(
      <RedeemTransactionForm lookupContext={lookupContext} />,
    );

    fireEvent.change(screen.getByLabelText('POS receipt number'), {
      target: { value: 'RCPT-10' },
    });
    const basket = screen.getByLabelText('Basket subtotal (₦)');
    fireEvent.change(basket, { target: { value: '40.00' } });
    fireEvent.blur(basket);
    fireEvent.click(screen.getByRole('button', { name: 'Proceed' }));
    const requested = screen.getByLabelText('Redemption amount (₦)');
    fireEvent.change(requested, { target: { value: '10.00' } });
    fireEvent.blur(requested);
    fireEvent.click(screen.getByRole('button', { name: 'Proceed' }));
    fireEvent.click(screen.getByText('Transaction time'));
    fireEvent.change(screen.getByLabelText('Occurred at'), {
      target: { value: '2030-01-01T11:30' },
    });

    await waitFor(() => {
      expect(readStoredDraft('shopcity-redeemdraft-v1')).toMatchObject({
        cardSerialNumber: 'CARD-456',
        receiptNumber: 'RCPT-10',
        basketAmount: 4000,
        requestedRedemption: 1000,
      });
    });

    const firstDraft = readStoredDraft('shopcity-redeemdraft-v1');
    unmount();

    render(<RedeemTransactionForm lookupContext={lookupContext} />);

    await waitFor(() => {
      expect(screen.getByLabelText('Basket subtotal (₦)')).toHaveValue('40.00');
    });
    expect(screen.getByLabelText('POS receipt number')).toHaveValue('RCPT-10');
    expect(readStoredDraft('shopcity-redeemdraft-v1').idempotencyKey).toBe(
      firstDraft.idempotencyKey,
    );
  });
});
