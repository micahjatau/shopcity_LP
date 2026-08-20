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
    const { unmount } = render(<EarnTransactionForm />);

    fireEvent.change(screen.getByLabelText('Card serial number'), {
      target: { value: 'CARD-123' },
    });
    fireEvent.change(screen.getByLabelText('POS receipt number'), {
      target: { value: 'RCPT-9' },
    });
    fireEvent.change(screen.getByLabelText('Purchase amount'), {
      target: { value: '12.50' },
    });
    fireEvent.blur(screen.getByLabelText('Purchase amount'));
    fireEvent.change(screen.getByLabelText('Occurred at'), {
      target: { value: '2030-01-01T10:15' },
    });
    fireEvent.change(screen.getByLabelText('Override reason'), {
      target: { value: 'Supervisor override' },
    });

    await waitFor(() => {
      expect(readStoredDraft('shopcity-earnedraft-v1')).toMatchObject({
        cardSerialNumber: 'CARD-123',
        receiptNumber: 'RCPT-9',
        purchaseAmount: 1250,
        overrideReason: 'Supervisor override',
      });
    });

    const firstDraft = readStoredDraft('shopcity-earnedraft-v1');
    unmount();

    render(<EarnTransactionForm />);

    await waitFor(() => {
      expect(screen.getByLabelText('Card serial number')).toHaveValue(
        'CARD-123',
      );
    });
    expect(screen.getByLabelText('POS receipt number')).toHaveValue('RCPT-9');
    expect(screen.getByLabelText('Override reason')).toHaveValue(
      'Supervisor override',
    );
    expect(readStoredDraft('shopcity-earnedraft-v1').idempotencyKey).toBe(
      firstDraft.idempotencyKey,
    );
  });

  it('persists redeem drafts across remounts', async () => {
    const { unmount } = render(<RedeemTransactionForm />);

    fireEvent.change(screen.getByLabelText('Card serial number'), {
      target: { value: 'CARD-456' },
    });
    fireEvent.change(screen.getByLabelText('POS receipt number'), {
      target: { value: 'RCPT-10' },
    });
    fireEvent.change(screen.getByLabelText('Basket amount'), {
      target: { value: '40.00' },
    });
    fireEvent.blur(screen.getByLabelText('Basket amount'));
    fireEvent.change(screen.getByLabelText('Requested redemption'), {
      target: { value: '10.00' },
    });
    fireEvent.blur(screen.getByLabelText('Requested redemption'));
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

    render(<RedeemTransactionForm />);

    await waitFor(() => {
      expect(screen.getByLabelText('Card serial number')).toHaveValue(
        'CARD-456',
      );
    });
    expect(screen.getByLabelText('POS receipt number')).toHaveValue('RCPT-10');
    expect(readStoredDraft('shopcity-redeemdraft-v1').idempotencyKey).toBe(
      firstDraft.idempotencyKey,
    );
  });
});
