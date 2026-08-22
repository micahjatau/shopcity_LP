import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { CashierWorkflowRoute } from '../components/workflows/cashier-transaction-route';
import { cardsControllerLookupCardV1 } from '../lib/api/generated-client';

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
    customersControllerGetCustomerV1: jest.fn(),
    loyaltyControllerGetCustomerLedgerV1: jest.fn(),
  };
});

describe('Cashier lookup workflow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
