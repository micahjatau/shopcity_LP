import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { CashierOverviewLookup } from '../components/workflows/cashier-overview-lookup';
import { CashierWorkflowRoute } from '../components/workflows/cashier-transaction-route';
import {
  cardsControllerLookupCardV1,
  reportsControllerListCashierTodayV1,
} from '../lib/api/generated-client';

jest.mock('../components/session-bootstrap', () => ({
  useSessionBootstrapState: () => ({
    status: 'ready',
    role: 'CASHIER',
    userId: 'cashier-1',
    branchId: 'branch-1',
    deviceId: 'device-1',
    sessionLabel: 'CASHIER · cashier',
    publicConfig: {
      tenant: { id: 'tenant-1', name: 'ShopCity' },
      branch: { id: 'branch-1', name: 'Main branch', timezone: 'Africa/Lagos' },
      policies: {},
    },
    configStatus: 'ready',
    configMessage: 'Public context loaded.',
    reset: jest.fn(),
  }),
}));

jest.mock('../components/offline', () => ({
  ConnectionStatus: () => <span>Online</span>,
  SyncQueueIndicator: () => <span>Sync queue clear</span>,
}));

jest.mock('../lib/api/generated-client', () => {
  const actual = jest.requireActual('../lib/api/generated-client');
  return {
    ...actual,
    cardsControllerLookupCardV1: jest.fn(),
    reportsControllerListCashierTodayV1: jest.fn(),
    customersControllerGetCustomerV1: jest.fn(),
    loyaltyControllerGetCustomerLedgerV1: jest.fn(),
  };
});

describe('Cashier lookup workflow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(reportsControllerListCashierTodayV1).mockResolvedValue({
      status: 200,
      data: {
        data: {
          branchId: 'branch-1',
          timezone: 'Africa/Lagos',
          items: [
            {
              id: 'receipt-1',
              occurredAt: '2026-08-25T10:00:00.000Z',
              operation: 'EARN',
              loyaltyAmountKobo: 42,
              receiptNumber: '1831',
              status: 'CONFIRMED',
            },
          ],
        },
      },
    } as never);
    jest.mocked(cardsControllerLookupCardV1).mockResolvedValue({
      status: 200,
      data: {
        data: {
          customer: { id: 'customer-1', fullName: 'Ada Shopper' },
          serialNumber: 'CARD-001',
          status: 'ACTIVE',
          availableBalanceKobo: 5500,
          branchId: 'branch-1',
        },
      },
    } as never);
  });

  it('looks up a card directly from the cashier overview', async () => {
    render(<CashierOverviewLookup />);

    const input = screen.getByRole('textbox', {
      name: 'Scan card or enter card number',
    });
    expect(input).toHaveFocus();
    fireEvent.change(input, { target: { value: 'CARD-001' } });
    fireEvent.submit(input.closest('form')!);

    await waitFor(() => {
      expect(screen.getByText('Ada Shopper')).toBeInTheDocument();
    });
    expect(screen.getByRole('link', { name: 'Earn credit' })).toHaveAttribute(
      'href',
      '/cashier/earn?card=CARD-001',
    );
    expect(
      screen.getByText('Customer verified. Choose the next action.'),
    ).toBeInTheDocument();
  });

  it('renders authenticated cashier activity', async () => {
    render(<CashierOverviewLookup />);

    expect(await screen.findByText('#1831')).toBeInTheDocument();
    expect(screen.getByText('EARN')).toBeInTheDocument();
    expect(screen.getByText('CONFIRMED')).toBeInTheDocument();
    expect(screen.getByText('+')).toBeInTheDocument();
    expect(reportsControllerListCashierTodayV1).toHaveBeenCalledWith(
      expect.any(Object),
    );
  });

  it('renders Redeem as a negative credit movement', async () => {
    jest.mocked(reportsControllerListCashierTodayV1).mockResolvedValueOnce({
      status: 200,
      data: {
        data: {
          branchId: 'branch-1',
          timezone: 'Africa/Lagos',
          items: [
            {
              id: 'receipt-redeem',
              occurredAt: '2026-08-25T10:00:00.000Z',
              operation: 'REDEEM',
              loyaltyAmountKobo: 450,
              receiptNumber: '1832',
              status: 'CONFIRMED',
            },
          ],
        },
      },
    } as never);

    render(<CashierOverviewLookup />);

    expect(await screen.findByText('#1832')).toBeInTheDocument();
    expect(screen.getByText('−')).toBeInTheDocument();
    expect(
      screen.getByLabelText('Credit redeemed: 450 kobo'),
    ).toBeInTheDocument();
  });

  it('renders pending Earn without a fabricated credit amount', async () => {
    jest.mocked(reportsControllerListCashierTodayV1).mockResolvedValueOnce({
      status: 200,
      data: {
        data: {
          branchId: 'branch-1',
          timezone: 'Africa/Lagos',
          items: [
            {
              id: 'receipt-pending',
              occurredAt: '2026-08-25T10:00:00.000Z',
              operation: 'EARN',
              loyaltyAmountKobo: null,
              receiptNumber: '1831-PENDING',
              status: 'PENDING',
            },
          ],
        },
      },
    } as never);

    render(<CashierOverviewLookup />);

    expect(await screen.findByText('Pending calculation')).toBeInTheDocument();
    expect(screen.queryByText('₦10,000.00')).not.toBeInTheDocument();
  });

  it('renders pending Earn with an authoritative credit amount', async () => {
    jest.mocked(reportsControllerListCashierTodayV1).mockResolvedValueOnce({
      status: 200,
      data: {
        data: {
          branchId: 'branch-1',
          timezone: 'Africa/Lagos',
          items: [
            {
              id: 'receipt-pending-authoritative',
              occurredAt: '2026-08-25T10:00:00.000Z',
              operation: 'EARN',
              loyaltyAmountKobo: 42,
              receiptNumber: '1831-AUTH',
              status: 'PENDING',
            },
          ],
        },
      },
    } as never);

    render(<CashierOverviewLookup />);

    expect(await screen.findByText('#1831-AUTH')).toBeInTheDocument();
    expect(screen.getByLabelText('Credit added: 42 kobo')).toBeInTheDocument();
    expect(screen.queryByText('Pending calculation')).not.toBeInTheDocument();
  });

  it('keeps lookup focused and preserves context for Earn and Redeem', async () => {
    render(
      <CashierWorkflowRoute
        kind="lookup"
        title="Cashier lookup"
        description="Find a customer"
      />,
    );

    fireEvent.change(screen.getByRole('textbox', { name: 'Lookup' }), {
      target: { value: 'CARD-001' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Lookup' }));

    await waitFor(() => {
      expect(screen.getByText('Ada Shopper')).toBeInTheDocument();
    });
    expect(screen.getByRole('link', { name: 'Earn' })).toHaveAttribute(
      'href',
      '/cashier/earn?card=CARD-001',
    );
    expect(screen.getByRole('link', { name: 'Redeem' })).toHaveAttribute(
      'href',
      '/cashier/redeem?card=CARD-001',
    );
    expect(
      screen.queryByRole('heading', { name: 'Policy context' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Customer detail' }),
    ).not.toBeInTheDocument();
  });
});
