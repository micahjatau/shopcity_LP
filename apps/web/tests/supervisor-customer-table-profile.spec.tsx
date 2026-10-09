import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import {
  SuccessPopUp,
  SupervisorCustomerProfile,
  SupervisorCustomerWorkflows,
} from '../components/workflows/supervisor-customer-workflows';
import {
  customersControllerCreateCustomerV1,
  customersControllerGetCustomerV1,
  customersControllerListCustomersV1,
  customersControllerGetCustomerProfileProjectionV1,
  loyaltyControllerGetCustomerLedgerV1,
} from '../lib/api/generated-client';

jest.mock('framer-motion', () => {
  const React = require('react');
  const motionComponent = (tag: string) =>
    function MotionComponent({
      initial,
      animate,
      transition,
      ...props
    }: Record<string, unknown>) {
      return React.createElement(
        tag,
        {
          ...props,
          'data-test-initial': JSON.stringify(initial),
          'data-test-animate': JSON.stringify(animate),
          'data-test-transition': JSON.stringify(transition),
        },
        props.children,
      );
    };
  return {
    motion: {
      section: motionComponent('section'),
      path: motionComponent('path'),
    },
  };
});

const push = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
jest.mock('../lib/api/generated-client', () => ({
  customersControllerGetCustomerV1: jest.fn(),
  customersControllerListCustomersV1: jest.fn(),
  customersControllerCreateCustomerV1: jest.fn(),
  customersControllerUpdateCustomerV1: jest.fn(),
  customersControllerUpdateStatusV1: jest.fn(),
  loyaltyControllerGetCustomerLedgerV1: jest.fn().mockResolvedValue({
    status: 200,
    data: { data: { items: [] } },
  }),
  customersControllerGetCustomerProfileProjectionV1: jest.fn(),
}));

describe('table-first customer workflow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(customersControllerListCustomersV1).mockResolvedValue({
      status: 200,
      data: { data: { items: [] } },
    } as never);
    jest
      .mocked(customersControllerGetCustomerProfileProjectionV1)
      .mockImplementation(
        async (id) =>
          ({
            status: 200,
            data: {
              data: {
                customerId: id,
                sourceErrors: [],
                memberSince: '2025-01-01T00:00:00.000Z',
                pendingApprovalsCount: 0,
                lifetimeEarnedKobo: 0,
                expirySchedule: [],
                expiryScheduleIsUpcomingWindow: true,
                expiryScheduleLimit: 12,
                recentActivity: [],
                transactions: [],
                redemptions: [],
                walletLedger: [],
                approvals: [],
                consent: null,
                card: null,
              },
            },
          }) as never,
      );
  });
  afterEach(() => jest.restoreAllMocks());

  async function submitRegistration() {
    fireEvent.click(screen.getByRole('button', { name: 'Register customer' }));
    fireEvent.change(screen.getByLabelText('Full name'), {
      target: { value: 'Ada Customer' },
    });
    fireEvent.change(screen.getByLabelText('Phone number'), {
      target: { value: '+2348000000000' },
    });
    fireEvent.change(screen.getByLabelText('First card serial'), {
      target: { value: 'CARD-001' },
    });
    fireEvent.click(
      screen.getByLabelText('Loyalty service consent (required)'),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Review details' }));
    const submitButtons = await screen.findAllByRole('button', {
      name: 'Register customer',
    });
    await act(async () => {
      fireEvent.click(submitButtons[submitButtons.length - 1]);
    });
  }

  it('requires an explicit discard decision for an unsaved registration', async () => {
    render(<SupervisorCustomerWorkflows />);
    const trigger = screen.getByRole('button', { name: 'Register customer' });
    trigger.focus();
    fireEvent.click(trigger);
    fireEvent.change(screen.getByLabelText('Full name'), {
      target: { value: 'Ada Customer' },
    });
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });

    expect(
      await screen.findByRole('heading', { name: 'Discard registration?' }),
    ).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Keep editing' }));
    expect(screen.getByLabelText('Full name')).toHaveValue('Ada Customer');
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    fireEvent.click(await screen.findByRole('button', { name: 'Discard' }));
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(customersControllerCreateCustomerV1).not.toHaveBeenCalled();
  });

  it('shows success only after a confirmed create response with a stable ID', async () => {
    jest.mocked(customersControllerCreateCustomerV1).mockResolvedValueOnce({
      status: 201,
      data: { data: { id: 'created-customer' } },
    } as never);
    render(<SupervisorCustomerWorkflows />);

    await submitRegistration();

    expect(
      await screen.findByText('Customer registered successfully.'),
    ).toBeVisible();
    expect(
      document.querySelector('.supervisor-registration-success'),
    ).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByRole('button', { name: 'Done' })).toBeEnabled();
  });

  it.each([
    [
      'failed',
      { status: 503, data: { data: {} } },
      'Registration was not confirmed (503). Check Manage customers before retrying.',
    ],
    [
      'uncertain',
      new Error('network failure'),
      'Registration outcome could not be confirmed. Check Manage customers before retrying.',
    ],
    [
      'unverified',
      { status: 201, data: { data: {} } },
      'The registration response could not be verified. Check Manage customers before retrying.',
    ],
  ])(
    'does not show success for %s create outcomes',
    async (_label, result, expectedMessage) => {
      if (result instanceof Error) {
        jest
          .mocked(customersControllerCreateCustomerV1)
          .mockRejectedValueOnce(result);
      } else {
        jest
          .mocked(customersControllerCreateCustomerV1)
          .mockResolvedValueOnce(result as never);
      }
      render(<SupervisorCustomerWorkflows />);

      await submitRegistration();

      expect(await screen.findByText(expectedMessage)).toBeVisible();
      expect(
        screen.queryByText('Customer registered successfully.'),
      ).not.toBeInTheDocument();
    },
  );

  it('renders the verified-success motion contract and clear completion copy', () => {
    window.matchMedia = jest.fn().mockReturnValue({
      matches: false,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    });
    render(
      <SuccessPopUp
        customerName="Ada Customer"
        onDone={jest.fn()}
        onRegisterAnother={jest.fn()}
        profileHref="/supervisor/customers/cust-1"
      />,
    );
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('data-spring-stiffness', '300');
    expect(status).toHaveAttribute('data-spring-damping', '20');
    expect(screen.getByText('Customer registered successfully.')).toBeVisible();
    const popup = status as HTMLElement & {
      dataset: DOMStringMap;
    };
    expect(popup.dataset.testInitial).toBe(
      JSON.stringify({ scale: 0.5, opacity: 0 }),
    );
    expect(popup.dataset.testAnimate).toBe(
      JSON.stringify({ scale: 1, opacity: 1 }),
    );
    expect(popup.dataset.testTransition).toBe(
      JSON.stringify({ type: 'spring', stiffness: 300, damping: 20 }),
    );
    expect(status.querySelector('path')).toHaveAttribute(
      'data-test-initial',
      JSON.stringify({ pathLength: 0 }),
    );
    expect(status.querySelector('path')).toHaveAttribute(
      'data-test-animate',
      JSON.stringify({ pathLength: 1 }),
    );
    expect(screen.getByRole('button', { name: 'Done' })).toBeEnabled();
  });

  it('uses a static success state when reduced motion is requested', async () => {
    window.matchMedia = jest.fn().mockReturnValue({
      matches: true,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    });
    render(
      <SuccessPopUp
        customerName="Ada"
        onDone={jest.fn()}
        onRegisterAnother={jest.fn()}
        profileHref="/supervisor/customers/cust-1"
      />,
    );
    const status = await screen.findByRole('status');
    expect(status).toHaveAttribute('data-reduced-motion', 'true');
    expect(status).toHaveAttribute('data-test-initial', 'false');
    expect(status).toHaveAttribute(
      'data-test-transition',
      JSON.stringify({ duration: 0 }),
    );
    expect(status.querySelector('path')).toHaveAttribute(
      'data-test-initial',
      'false',
    );
  });

  it('requires an explicit keep/discard decision before returning from a dirty profile', async () => {
    jest.mocked(customersControllerGetCustomerV1).mockResolvedValue({
      status: 200,
      data: {
        data: {
          id: 'profile-customer',
          fullName: 'Ada Customer',
          phoneE164: '+2348000000000',
          status: 'ACTIVE',
        },
      },
    } as never);
    render(
      <SupervisorCustomerProfile
        customerId="profile-customer"
        returnQuery="Ada Smith"
      />,
    );
    fireEvent.change(await screen.findByLabelText('Full name'), {
      target: { value: 'Edited Customer' },
    });

    fireEvent.click(
      screen.getByRole('button', { name: '← Back to customers' }),
    );
    expect(
      await screen.findByRole('heading', { name: 'Discard unsaved changes?' }),
    ).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Keep editing' }));
    expect(screen.getByLabelText('Full name')).toHaveValue('Edited Customer');
    expect(push).not.toHaveBeenCalled();

    fireEvent.click(
      screen.getByRole('button', { name: '← Back to customers' }),
    );
    fireEvent.click(await screen.findByRole('button', { name: 'Discard' }));
    expect(push).toHaveBeenCalledWith('/supervisor/customers?q=Ada%20Smith');
  });

  it('places explicit search left of the status and registration controls', async () => {
    const { container } = render(<SupervisorCustomerWorkflows />);
    const searchbox = screen.getByRole('searchbox', {
      name: 'Search by customer name, phone number, or card number',
    });
    await waitFor(() =>
      expect(customersControllerListCustomersV1).toHaveBeenCalledTimes(1),
    );

    const toolbar = container.querySelector(
      '.supervisor-customer-directory__toolbar',
    );
    expect(toolbar?.firstElementChild).toHaveClass(
      'supervisor-customer-directory__search',
    );
    const actions = toolbar?.children[1];
    expect(actions?.firstElementChild).toHaveClass(
      'supervisor-customer-directory__filter',
    );
    expect(actions?.lastElementChild).toHaveTextContent('Register customer');

    fireEvent.change(searchbox, { target: { value: 'VC-100' } });
    expect(customersControllerListCustomersV1).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Search customers' }));
    await waitFor(() =>
      expect(customersControllerListCustomersV1).toHaveBeenCalledTimes(2),
    );
    expect(customersControllerListCustomersV1).toHaveBeenLastCalledWith(
      { q: 'VC-100', limit: '25', cursor: '' },
      expect.any(Object),
    );
  });

  it('loads every customer directory page using the returned cursor', async () => {
    jest
      .mocked(customersControllerListCustomersV1)
      .mockResolvedValueOnce({
        status: 200,
        data: {
          data: {
            items: [{ id: 'first', fullName: 'First' }],
            hasMore: true,
            nextCursor: 'page-2',
          },
        },
      } as never)
      .mockResolvedValueOnce({
        status: 200,
        data: {
          data: {
            items: [{ id: 'second', fullName: 'Second' }],
            hasMore: false,
            nextCursor: null,
          },
        },
      } as never);
    render(<SupervisorCustomerWorkflows />);
    expect(await screen.findByText('First')).toBeVisible();
    expect(await screen.findByText('Second')).toBeVisible();
    expect(customersControllerListCustomersV1).toHaveBeenCalledWith(
      { q: '', limit: '25', cursor: 'page-2' },
      expect.any(Object),
    );
  });

  it('renders backend table values, filters every cursor page, and paginates by stable ID', async () => {
    jest
      .mocked(customersControllerListCustomersV1)
      .mockResolvedValueOnce({
        status: 200,
        data: {
          data: {
            items: [
              {
                id: 'active-1',
                fullName: 'Active One',
                phoneE164: '+234800000001',
                status: 'ACTIVE',
                cardNumber: 'VIRTUAL-001',
                availableBalanceKobo: 1250,
                lastPurchaseAmountKobo: 2_500,
                lifetimeEarnedKobo: 5_000,
              },
              {
                id: 'blocked-1',
                fullName: 'Blocked One',
                status: 'BLOCKED',
                cardSerialNumber: 'SERIAL-002',
              },
              { id: 'active-2', fullName: 'Active Two', status: 'ACTIVE' },
              { id: 'blocked-2', fullName: 'Blocked Two', status: 'BLOCKED' },
              { id: 'active-3', fullName: 'Active Three', status: 'ACTIVE' },
            ],
            hasMore: true,
            nextCursor: 'next-page',
          },
        },
      } as never)
      .mockResolvedValueOnce({
        status: 200,
        data: {
          data: {
            items: [
              { id: 'blocked-3', fullName: 'Blocked Three', status: 'BLOCKED' },
              { id: 'active-4', fullName: 'Active Four', status: 'ACTIVE' },
              { id: 'active-5', fullName: 'Active Five', status: 'ACTIVE' },
            ],
            hasMore: false,
            nextCursor: null,
          },
        },
      } as never);

    render(<SupervisorCustomerWorkflows />);

    expect(await screen.findByText('Active One')).toBeVisible();
    expect(
      screen.getByRole('columnheader', { name: 'Card number' }),
    ).toBeVisible();
    expect(
      screen.getByRole('columnheader', { name: 'Available' }),
    ).toBeVisible();
    expect(
      screen.getByRole('columnheader', { name: 'Last purchase' }),
    ).toBeVisible();
    expect(
      screen.getByRole('columnheader', { name: 'Lifetime earned' }),
    ).toBeVisible();
    expect(screen.getByText('VIRTUAL-001')).toBeVisible();
    expect(screen.getByText('SERIAL-002')).toBeVisible();
    expect(screen.getByText(/12\.50/)).toBeVisible();
    expect(screen.getByText(/25\.00/)).toBeVisible();
    expect(
      screen.getByRole('link', { name: 'View profile for Active One' }),
    ).toHaveAttribute('href', '/supervisor/customers/active-1');
    expect(screen.getByText('Page 1 · 8 customers')).toBeVisible();
    expect(customersControllerListCustomersV1).toHaveBeenCalledWith(
      { q: '', limit: '25', cursor: 'next-page' },
      expect.any(Object),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Next customer page' }));
    expect(await screen.findByText('Active Four')).toBeVisible();
    expect(screen.queryByText('Active One')).not.toBeInTheDocument();

    fireEvent.change(
      screen.getByRole('combobox', { name: 'Filter customers by status' }),
      {
        target: { value: 'BLOCKED' },
      },
    );
    expect(screen.getByText('Blocked One')).toBeVisible();
    expect(screen.getByText('Blocked Two')).toBeVisible();
    expect(screen.getByText('Blocked Three')).toBeVisible();
    expect(screen.queryByText('Active Four')).not.toBeInTheDocument();
    expect(screen.getByText('Page 1 · 3 blocked customers')).toBeVisible();
  });

  it('sorts numeric customer columns over every fetched row before pagination', async () => {
    const customers = [
      {
        id: 'c1',
        fullName: 'Customer 1',
        status: 'ACTIVE',
        availableBalanceKobo: 600,
        lastPurchaseAmountKobo: 700,
        lifetimeEarnedKobo: 500,
      },
      {
        id: 'c2',
        fullName: 'Customer 2',
        status: 'ACTIVE',
        availableBalanceKobo: 100,
        lastPurchaseAmountKobo: 200,
        lifetimeEarnedKobo: 900,
      },
      {
        id: 'c3',
        fullName: 'Customer 3',
        status: 'ACTIVE',
        availableBalanceKobo: 300,
        lifetimeEarnedKobo: 100,
      },
      {
        id: 'c4',
        fullName: 'Customer 4',
        status: 'ACTIVE',
        availableBalanceKobo: 700,
        lastPurchaseAmountKobo: 400,
      },
      {
        id: 'c5',
        fullName: 'Customer 5',
        status: 'ACTIVE',
        availableBalanceKobo: 500,
        lastPurchaseAmountKobo: 600,
        lifetimeEarnedKobo: 700,
      },
      {
        id: 'c6',
        fullName: 'Customer 6',
        status: 'ACTIVE',
        availableBalanceKobo: 200,
        lastPurchaseAmountKobo: 300,
        lifetimeEarnedKobo: 200,
      },
      {
        id: 'c7',
        fullName: 'Customer 7',
        status: 'ACTIVE',
        availableBalanceKobo: 400,
        lastPurchaseAmountKobo: 100,
        lifetimeEarnedKobo: 600,
      },
    ];
    jest
      .mocked(customersControllerListCustomersV1)
      .mockResolvedValueOnce({
        status: 200,
        data: {
          data: {
            items: customers.slice(0, 4),
            hasMore: true,
            nextCursor: 'page-two',
          },
        },
      } as never)
      .mockResolvedValueOnce({
        status: 200,
        data: {
          data: { items: customers.slice(4), hasMore: false, nextCursor: null },
        },
      } as never);
    render(<SupervisorCustomerWorkflows />);
    await screen.findByText('Customer 1');

    const rowNames = () =>
      screen
        .getAllByRole('row')
        .slice(1)
        .map((row) => row.querySelector('strong')?.textContent);
    const availableHeader = screen.getByRole('button', {
      name: /Sort by Available/,
    });
    fireEvent.click(availableHeader);
    await waitFor(() =>
      expect(rowNames()).toEqual([
        'Customer 2',
        'Customer 6',
        'Customer 3',
        'Customer 7',
        'Customer 5',
      ]),
    );
    expect(
      screen.getByRole('columnheader', { name: 'Available' }),
    ).toHaveAttribute('aria-sort', 'ascending');
    fireEvent.click(screen.getByRole('button', { name: 'Next customer page' }));
    expect(rowNames()).toEqual(['Customer 1', 'Customer 4']);
    fireEvent.click(screen.getByRole('button', { name: /Sort by Available/ }));
    expect(rowNames()).toEqual([
      'Customer 4',
      'Customer 1',
      'Customer 5',
      'Customer 7',
      'Customer 3',
    ]);

    fireEvent.click(
      screen.getByRole('button', { name: /Sort by Last purchase/ }),
    );
    expect(rowNames()).toEqual([
      'Customer 7',
      'Customer 2',
      'Customer 6',
      'Customer 4',
      'Customer 5',
    ]);
    fireEvent.click(
      screen.getByRole('button', { name: /Sort by Last purchase/ }),
    );
    expect(rowNames()).toEqual([
      'Customer 1',
      'Customer 5',
      'Customer 4',
      'Customer 6',
      'Customer 2',
    ]);
    fireEvent.click(screen.getByRole('button', { name: 'Next customer page' }));
    expect(rowNames()).toEqual(['Customer 7', 'Customer 3']);

    fireEvent.click(
      screen.getByRole('button', { name: /Sort by Lifetime earned/ }),
    );
    expect(rowNames()).toEqual([
      'Customer 3',
      'Customer 6',
      'Customer 1',
      'Customer 7',
      'Customer 5',
    ]);
    fireEvent.click(
      screen.getByRole('button', { name: /Sort by Lifetime earned/ }),
    );
    expect(rowNames()).toEqual([
      'Customer 2',
      'Customer 5',
      'Customer 7',
      'Customer 1',
      'Customer 6',
    ]);
    expect(
      screen.getByRole('columnheader', { name: 'Lifetime earned' }),
    ).toHaveAttribute('aria-sort', 'descending');
    fireEvent.click(screen.getByRole('button', { name: 'Next customer page' }));
    expect(rowNames()).toEqual(['Customer 3', 'Customer 4']);
  });

  it('shows verified profile summary, tabs, real card context, and returned ledger activity', async () => {
    jest.mocked(customersControllerGetCustomerV1).mockResolvedValue({
      status: 200,
      data: {
        data: {
          id: 'requested-id',
          fullName: 'Verified Customer',
          phoneE164: '+2348000000000',
          status: 'ACTIVE',
          availableBalanceKobo: 4200,
          lifetimeEarnedKobo: 9200,
          cardNumber: 'CARD-REAL-1',
          activeCardStatus: 'ACTIVE',
        },
      },
    } as never);
    jest
      .mocked(customersControllerGetCustomerProfileProjectionV1)
      .mockResolvedValue({
        status: 200,
        data: {
          data: {
            customerId: 'requested-id',
            sourceErrors: [],
            memberSince: '2024-01-02T00:00:00.000Z',
            pendingApprovalsCount: 3,
            lifetimeEarnedKobo: 9200,
            expirySchedule: [
              {
                expiresAt: '2026-12-31T00:00:00.000Z',
                remainingAmountKobo: 1200,
              },
            ],
            expiryScheduleIsUpcomingWindow: true,
            expiryScheduleLimit: 12,
            recentActivity: [
              {
                id: 'ledger-1',
                type: 'EARNING',
                status: 'CONFIRMED',
                amountKobo: 1200,
                occurredAt: '2025-01-02T00:00:00.000Z',
              },
              {
                id: 'approval-pending',
                type: 'APPROVAL_REQUEST',
                targetType: 'EARN',
                status: 'PENDING',
                amountKobo: null,
                occurredAt: '2025-01-03T00:00:00.000Z',
              },
              {
                id: 'approval-outcome',
                type: 'APPROVAL_OUTCOME',
                targetType: 'REDEEM',
                status: 'APPROVED',
                amountKobo: null,
                occurredAt: '2025-01-04T00:00:00.000Z',
              },
            ],
            transactions: [
              {
                id: 'receipt-real',
                occurredAt: '2025-02-03T00:00:00.000Z',
                purchaseAmountKobo: 5400,
                captureStatus: 'CAPTURED',
                reviewStatus: 'APPROVED',
              },
            ],
            redemptions: [
              {
                id: 'redemption-real',
                occurredAt: '2025-02-04T00:00:00.000Z',
                requestedAmountKobo: 2000,
                confirmedAmountKobo: 1800,
                status: 'CONFIRMED',
              },
            ],
            walletLedger: [
              {
                id: 'ledger-real',
                type: 'EARN',
                direction: 'CREDIT',
                amountKobo: 1200,
                status: 'CONFIRMED',
                effectiveAt: '2025-02-02T00:00:00.000Z',
              },
            ],
            approvals: [],
            consent: {
              loyaltyConsent: true,
              marketingOptIn: false,
              consentVersion: 'v1.2',
              privacyNoticeVersion: 'v2.0',
              capturedAt: '2024-01-02T00:00:00.000Z',
            },
            card: {
              identifier: 'CARD-REAL-1',
              status: 'ACTIVE',
              issuedAt: '2024-01-02T00:00:00.000Z',
              blockedAt: null,
            },
          },
        },
      } as never);
    render(<SupervisorCustomerProfile customerId="requested-id" />);
    expect(await screen.findByText('Verified Customer')).toBeVisible();
    expect(screen.getByText('Available balance')).toBeVisible();
    expect(screen.getByText('Pending approvals')).toBeVisible();
    expect(screen.getByText('Lifetime earned')).toBeVisible();
    expect(screen.getByText('Next expiry')).toBeVisible();
    expect(await screen.findByText('Credit earned')).toBeVisible();
    expect(
      screen.getByText('purchase credit approval requested'),
    ).toBeVisible();
    expect(
      screen.getByText('redemption credit approval decision'),
    ).toBeVisible();
    expect(screen.getByText(/Member since/)).toHaveTextContent('1/2/2024');
    expect(screen.getByText('3')).toBeVisible();
    expect(screen.getByText(/Credit expiry schedule/)).toBeVisible();
    expect(
      screen.getByRole('link', { name: 'Capture purchase' }),
    ).toHaveAttribute('href', '/cashier/earn?card=CARD-REAL-1');
    expect(screen.getByRole('link', { name: 'Redeem Credit' })).toHaveAttribute(
      'href',
      '/cashier/redeem?card=CARD-REAL-1',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Transactions' }));
    expect(screen.getByRole('heading', { name: 'Transactions' })).toBeVisible();
    expect(screen.getByText('Receipt')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Wallet Ledger' }));
    expect(screen.getByText('EARN')).toBeVisible();
    expect(screen.getByText(/2025/)).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Redemptions' }));
    expect(screen.getByText('CONFIRMED')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Virtual Card' }));
    expect(screen.getByText('Card CARD-REAL-1')).toBeVisible();
    expect(screen.getByText(/Issued/)).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Consent' }));
    expect(screen.getByText('Granted')).toBeVisible();
  });

  it('preserves the expiry calendar date in a timezone west of UTC', async () => {
    const originalTimezone = process.env.TZ;
    process.env.TZ = 'America/Los_Angeles';
    jest.mocked(customersControllerGetCustomerV1).mockResolvedValue({
      status: 200,
      data: {
        data: {
          id: 'requested-id',
          fullName: 'Verified Customer',
          phoneE164: '+2348000000000',
        },
      },
    } as never);
    jest
      .mocked(customersControllerGetCustomerProfileProjectionV1)
      .mockResolvedValue({
        status: 200,
        data: {
          data: {
            customerId: 'requested-id',
            sourceErrors: [],
            memberSince: '2024-01-01T00:00:00.000Z',
            pendingApprovalsCount: 0,
            lifetimeEarnedKobo: 0,
            expirySchedule: [
              {
                expiresAt: '2026-01-01T00:00:00.000Z',
                remainingAmountKobo: 500,
              },
            ],
            expiryScheduleIsUpcomingWindow: true,
            expiryScheduleLimit: 12,
            recentActivity: [],
            transactions: [],
            redemptions: [],
            walletLedger: [],
            approvals: [],
            consent: null,
            card: null,
          },
        },
      } as never);
    try {
      render(<SupervisorCustomerProfile customerId="requested-id" />);
      await screen.findByText('Credit expiry schedule');
      expect(screen.getByText('1/1/2026')).toBeVisible();
      expect(
        screen.getByText('Next expiry').closest('article'),
      ).toHaveTextContent('1/1/2026');
      expect(screen.queryByText(/12\/31\/2025/)).not.toBeInTheDocument();
    } finally {
      if (originalTimezone === undefined) delete process.env.TZ;
      else process.env.TZ = originalTimezone;
    }
  });

  it('keeps a failed tab distinct from an empty result and retries that section', async () => {
    jest.mocked(customersControllerGetCustomerV1).mockResolvedValue({
      status: 200,
      data: {
        data: {
          id: 'requested-id',
          fullName: 'Verified Customer',
          phoneE164: '+2348000000000',
        },
      },
    } as never);
    jest
      .mocked(customersControllerGetCustomerProfileProjectionV1)
      .mockResolvedValueOnce({
        status: 200,
        data: {
          data: {
            customerId: 'requested-id',
            sourceErrors: ['transactions'],
            memberSince: '2024-01-01T00:00:00.000Z',
            pendingApprovalsCount: 0,
            lifetimeEarnedKobo: 0,
            expirySchedule: [],
            expiryScheduleIsUpcomingWindow: true,
            expiryScheduleLimit: 12,
            recentActivity: [],
            transactions: [],
            redemptions: [],
            walletLedger: [],
            approvals: [],
            consent: null,
            card: null,
          },
        },
      } as never);
    render(<SupervisorCustomerProfile customerId="requested-id" />);
    await screen.findByText('Recent activity');
    fireEvent.click(screen.getByRole('button', { name: 'Transactions' }));
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Transactions could not be loaded',
    );
    expect(
      screen.queryByText('No transactions were returned.'),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry this section' }));
    expect(
      await screen.findByText('No transactions were returned.'),
    ).toBeVisible();
  });

  it('rejects a mismatched projection and offers a retry without exposing its values', async () => {
    jest.mocked(customersControllerGetCustomerV1).mockResolvedValue({
      status: 200,
      data: {
        data: {
          id: 'requested-id',
          fullName: 'Verified Customer',
          phoneE164: '+2348000000000',
        },
      },
    } as never);
    jest
      .mocked(customersControllerGetCustomerProfileProjectionV1)
      .mockResolvedValue({
        status: 200,
        data: {
          data: {
            customerId: 'other-customer',
            sourceErrors: [],
            memberSince: '2024-01-01T00:00:00.000Z',
            pendingApprovalsCount: 9,
            lifetimeEarnedKobo: 999999,
            expirySchedule: [],
            expiryScheduleIsUpcomingWindow: true,
            expiryScheduleLimit: 12,
            recentActivity: [],
            transactions: [],
            redemptions: [],
            walletLedger: [],
            approvals: [],
            consent: null,
            card: null,
          },
        },
      } as never);
    render(<SupervisorCustomerProfile customerId="requested-id" />);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'could not be loaded or verified',
    );
    expect(screen.queryByText('999999')).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Retry profile data' }),
    ).toBeEnabled();
  });

  it('rejects mismatched profile details and keeps writes unavailable', async () => {
    jest.mocked(customersControllerGetCustomerV1).mockResolvedValue({
      status: 200,
      data: { data: { id: 'different-id', fullName: 'Wrong Customer' } },
    } as never);
    render(<SupervisorCustomerProfile customerId="requested-id" />);
    expect(await screen.findByText(/could not be verified/i)).toBeVisible();
    expect(
      screen.queryByRole('button', { name: 'Save changes' }),
    ).not.toBeInTheDocument();
  });
});
