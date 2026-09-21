import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { CashierOverviewLookup } from '../components/workflows/cashier-overview-lookup';
import { CashierWorkflowRoute } from '../components/workflows/cashier-transaction-route';
import {
  cardsControllerLookupCardV1,
  customersControllerListCustomersV1,
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
    customersControllerListCustomersV1: jest.fn(),
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

  it('renders the Figma-aligned cashier overview activity dashboard', async () => {
    render(<CashierOverviewLookup />);

    expect(screen.getByText("Today's Activity")).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Recent Transactions' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('searchbox', { name: 'Search recent transactions' }),
    ).toHaveValue('');

    await waitFor(() => {
      expect(reportsControllerListCashierTodayV1).toHaveBeenCalledWith(
        expect.any(Object),
      );
    });
    expect(cardsControllerLookupCardV1).not.toHaveBeenCalled();
  });

  it('filters the bounded activity feed locally by receipt number', async () => {
    render(<CashierOverviewLookup />);

    const search = screen.getByRole('searchbox', {
      name: 'Search recent transactions',
    });
    await screen.findByText('#1831');
    fireEvent.change(search, { target: { value: 'missing' } });

    expect(screen.queryByText('#1831')).not.toBeInTheDocument();
    expect(screen.getByText('No matching transactions.')).toBeInTheDocument();
    expect(reportsControllerListCashierTodayV1).toHaveBeenCalledTimes(1);
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

  it('reconstructs the committed Find Customer presentation landmarks', () => {
    render(
      <CashierWorkflowRoute
        kind="lookup"
        title="Cashier lookup"
        description="Find a customer"
      />,
    );

    expect(
      document.querySelector('[data-od-id="customer-search"]'),
    ).toBeInTheDocument();
    expect(
      document.querySelector('[data-od-id="recent-customers"]'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('searchbox', { name: 'Customer search' }),
    ).toHaveAttribute('placeholder', 'Search');
    expect(screen.getByRole('button', { name: 'Scan' })).toBeInTheDocument();
    expect(screen.getByText('No customers found')).toBeInTheDocument();
  });

  it('keeps discovery results masked and prevents unverified workflow selection', async () => {
    jest.mocked(customersControllerListCustomersV1).mockResolvedValue({
      status: 200,
      data: {
        data: {
          items: [
            {
              id: 'customer-name',
              fullName: 'Ada Shopper',
              maskedPhone: '+234801* *** 5678',
              cardStatus: 'ACTIVE',
              availableBalanceKobo: 5500,
            },
          ],
        },
      },
    } as never);

    render(
      <CashierWorkflowRoute
        kind="lookup"
        title="Cashier lookup"
        description="Find a customer"
      />,
    );
    fireEvent.change(
      screen.getByRole('searchbox', { name: 'Customer search' }),
      {
        target: { value: 'Ada Shopper' },
      },
    );
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    expect(await screen.findByText('Ada Shopper')).toBeInTheDocument();
    expect(screen.getByText('+234801* *** 5678')).toBeInTheDocument();
    expect(screen.getByText('Active card')).toBeInTheDocument();
    expect(
      screen.getByText('Scan an active card to continue'),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: 'Capture Purchase' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: 'Redeem Credit' }),
    ).not.toBeInTheDocument();
  });

  it('keeps lookup focused and preserves context for Earn and Redeem', async () => {
    render(
      <CashierWorkflowRoute
        kind="lookup"
        title="Cashier lookup"
        description="Find a customer"
      />,
    );

    fireEvent.change(
      screen.getByRole('searchbox', { name: 'Customer search' }),
      {
        target: { value: 'CARD-001' },
      },
    );
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    await waitFor(() => {
      expect(screen.getByText('Ada Shopper')).toBeInTheDocument();
    });
    expect(
      screen.getByRole('link', { name: 'Capture Purchase' }),
    ).toHaveAttribute('href', '/cashier/earn?card=CARD-001');
    expect(screen.getByRole('link', { name: 'Redeem Credit' })).toHaveAttribute(
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
