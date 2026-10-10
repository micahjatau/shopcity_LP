import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
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
  customersControllerUpdateCustomerV1,
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
    jest.mocked(loyaltyControllerGetCustomerLedgerV1).mockImplementation(
      async (id) =>
        ({
          status: 200,
          data: {
            data: {
              customerId: id,
              items: [],
              nextCursor: null,
              hasMore: false,
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

  it('renders customer details read-only and keeps verified edits in a dialog', async () => {
    const verifiedCustomer = {
      id: 'profile-customer',
      fullName: 'Ada Customer',
      phoneE164: '+2348000000000',
      email: 'ada@example.com',
      createdAt: '2025-01-01T00:00:00.000Z',
      status: 'ACTIVE',
    };
    jest
      .mocked(customersControllerGetCustomerV1)
      .mockResolvedValueOnce({
        status: 200,
        data: { data: verifiedCustomer },
      } as never)
      .mockResolvedValueOnce({
        status: 200,
        data: {
          data: { ...verifiedCustomer, fullName: 'Edited Customer' },
        },
      } as never);
    jest
      .mocked(customersControllerUpdateCustomerV1)
      .mockResolvedValueOnce({ status: 200 } as never);

    render(
      <SupervisorCustomerProfile
        customerId="profile-customer"
        returnQuery="Ada Smith"
      />,
    );
    await screen.findByRole('heading', { name: 'Customer details' });
    const detailsCard = document.querySelector<HTMLElement>(
      '.supervisor-profile-details-card',
    );
    if (!detailsCard) throw new Error('Missing read-only customer details');
    expect(within(detailsCard).getByText('Ada Customer')).toBeVisible();
    expect(
      within(detailsCard).getByText('Phone').parentElement,
    ).toHaveTextContent('+2348000000000');
    expect(within(detailsCard).getAllByText('Not provided')).toHaveLength(3);
    expect(screen.queryByLabelText('Full name')).not.toBeInTheDocument();

    fireEvent.click(
      within(detailsCard as HTMLElement).getByRole('button', {
        name: 'Edit customer details',
      }),
    );
    const editDialog = await screen.findByRole('dialog', {
      name: 'Edit customer details',
    });
    expect(within(editDialog).getByLabelText('Full name')).toHaveValue(
      'Ada Customer',
    );
    fireEvent.change(within(editDialog).getByLabelText('Full name'), {
      target: { value: 'Edited Customer' },
    });
    fireEvent.click(
      within(editDialog).getByRole('button', { name: 'Save changes' }),
    );

    await waitFor(() =>
      expect(customersControllerUpdateCustomerV1).toHaveBeenCalledWith(
        'profile-customer',
        {
          fullName: 'Edited Customer',
          phone: '+2348000000000',
          email: 'ada@example.com',
        },
        expect.objectContaining({}),
      ),
    );
    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', { name: 'Edit customer details' }),
      ).not.toBeInTheDocument(),
    );
    expect(
      within(
        document.querySelector(
          '.supervisor-profile-details-card',
        ) as HTMLElement,
      ).getByText('Edited Customer'),
    ).toBeVisible();
    expect(push).not.toHaveBeenCalled();
  });

  it('requires an explicit keep/discard decision before cancelling a dirty profile edit', async () => {
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
    fireEvent.click(
      await screen.findByRole('button', { name: 'Edit customer details' }),
    );
    fireEvent.change(await screen.findByLabelText('Full name'), {
      target: { value: 'Edited Customer' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(
      await screen.findByRole('heading', { name: 'Discard unsaved changes?' }),
    ).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Keep editing' }));
    expect(screen.getByLabelText('Full name')).toHaveValue('Edited Customer');
    expect(push).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Discard' }));
    expect(screen.queryByLabelText('Full name')).not.toBeInTheDocument();
    expect(
      within(
        document.querySelector(
          '.supervisor-profile-details-card',
        ) as HTMLElement,
      ).getByText('Ada Customer'),
    ).toBeVisible();
    expect(push).not.toHaveBeenCalled();
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
    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Verified Customer',
      }),
    ).toBeVisible();
    expect(
      screen.queryByRole('heading', { level: 1, name: 'Customer profile' }),
    ).not.toBeInTheDocument();
    const profileHeader = screen
      .getByRole('heading', { name: 'Verified Customer' })
      .closest('header');
    expect(profileHeader).toContainElement(
      screen.getByRole('link', { name: 'Capture Purchase' }),
    );
    expect(profileHeader).toContainElement(
      screen.getByRole('link', { name: 'Redeem Credit' }),
    );
    expect(screen.getByText('Available balance')).toBeVisible();
    expect(screen.getByText('Pending approvals')).toBeVisible();
    expect(screen.getByText('Lifetime earned')).toBeVisible();
    const annualPurchasesCard = screen
      .getByText('Annual Purchases')
      .closest('article');
    expect(annualPurchasesCard).toHaveTextContent('Not provided');
    expect(await screen.findByText('Credit earned')).toBeVisible();
    expect(screen.getByText('Confirmed')).toHaveClass(
      'supervisor-profile-recent-activity__status--success',
    );
    expect(screen.getByText('Pending')).toHaveClass(
      'supervisor-profile-recent-activity__status--pending',
    );
    expect(
      screen.getByText('purchase credit approval requested'),
    ).toBeVisible();
    expect(
      screen.getByText('redemption credit approval decision'),
    ).toBeVisible();
    expect(screen.getByText(/Member since/)).toHaveTextContent('2024');
    expect(screen.getByText(/Member since/)).not.toHaveTextContent(/12:00/);
    expect(screen.getByText('3')).toBeVisible();
    expect(screen.getByText(/Credit expiry schedule/)).toBeVisible();
    expect(
      screen.getByRole('link', { name: 'Capture Purchase' }),
    ).toHaveAttribute('href', '/cashier/earn?card=CARD-REAL-1');
    expect(screen.getByRole('link', { name: 'Redeem Credit' })).toHaveAttribute(
      'href',
      '/cashier/redeem?card=CARD-REAL-1',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Transactions' }));
    expect(screen.getByRole('heading', { name: 'Transactions' })).toBeVisible();
    const transactionTable = screen.getByRole('table', {
      name: 'Customer transactions',
    });
    expect(within(transactionTable).getAllByText('Not provided')).toHaveLength(
      2,
    );
    expect(within(transactionTable).getByText(/2025/)).toBeVisible();
    expect(within(transactionTable).getByText(/54\.00/)).toBeVisible();
    expect(within(transactionTable).getByText('Captured')).toBeVisible();
    expect(within(transactionTable).getByText('Approved')).toBeVisible();
    jest.mocked(loyaltyControllerGetCustomerLedgerV1).mockResolvedValueOnce({
      status: 200,
      data: {
        data: {
          customerId: 'requested-id',
          items: [
            {
              id: 'ledger-real',
              receiptId: 'receipt-real',
              source: 'RC-8807-001',
              staffUsername: 'cashier.one',
              type: 'EARN',
              direction: 'CREDIT',
              amountKobo: 1200,
              status: 'CONFIRMED',
              effectiveAt: '2025-02-02T00:00:00.000Z',
              smsStatus: null,
              allocations: [],
              creditLot: {
                id: 'lot-real',
                originalAmountKobo: 1200,
                remainingAmountKobo: 1200,
                earnedAt: '2025-02-02T00:00:00.000Z',
                expiresAt: '2027-03-27T23:59:59.000Z',
              },
              restorations: [],
            },
          ],
          nextCursor: null,
          hasMore: false,
        },
      },
    } as never);
    fireEvent.click(screen.getByRole('button', { name: 'Wallet Ledger' }));
    const walletLedger = screen.getByRole('table', {
      name: 'Customer wallet ledger',
    });
    await within(walletLedger).findByText('RC-8807-001');
    const walletLedgerRow = within(walletLedger).getAllByRole('row')[1];
    expect(within(walletLedger).getByText('RC-8807-001')).toBeVisible();
    expect(within(walletLedger).getByText('Earned')).toBeVisible();
    expect(within(walletLedger).getByText('cashier.one')).toBeVisible();
    expect(within(walletLedger).getByText(/12\.00/)).toBeVisible();
    expect(within(walletLedger).getByText('27 Mar 2027')).toBeVisible();
    expect(walletLedgerRow.querySelectorAll('td')[4]).toHaveTextContent(
      'Not provided',
    );
    expect(walletLedger).not.toHaveTextContent('ledger-real');
    expect(walletLedger).not.toHaveTextContent('receipt-real');
    expect(loyaltyControllerGetCustomerLedgerV1).toHaveBeenCalledWith(
      'requested-id',
      { limit: '25', cursor: '' },
      expect.any(Object),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Redemptions' }));
    expect(screen.getByText('CONFIRMED')).toBeVisible();
    expect(
      screen.queryByRole('img', { name: /ShopCity card preview/ }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Virtual Card' }));
    const virtualCardPreview = screen.getByRole('img', {
      name: 'ShopCity card preview for Verified Customer; serial CARD-REAL-1; status ACTIVE',
    });
    expect(
      virtualCardPreview.querySelector('img')?.getAttribute('src'),
    ).toContain('IMG-20260802-WA0001.jpg');
    expect(virtualCardPreview).toHaveTextContent('CARD-REAL-1');
    expect(virtualCardPreview).toHaveTextContent('Verified Customer');
    expect(virtualCardPreview).toHaveTextContent('ACTIVE');
    expect(screen.getByText('Card CARD-REAL-1')).toBeVisible();
    expect(screen.getByText(/Issued/)).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Consent' }));
    expect(screen.getByText('Granted')).toBeVisible();
    expect(
      document.querySelector('.sc-customer-details__form'),
    ).not.toBeInTheDocument();
  });

  it('keeps Transactions table headings visible in an honest empty state', async () => {
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
    render(<SupervisorCustomerProfile customerId="requested-id" />);

    await screen.findByRole('heading', {
      level: 1,
      name: 'Verified Customer',
    });
    fireEvent.click(screen.getByRole('button', { name: 'Transactions' }));

    const transactionTable = screen.getByRole('table', {
      name: 'Customer transactions',
    });
    for (const heading of [
      'Receipt No.',
      'Date & Time',
      'Amount',
      'Credit',
      'Outcome',
    ]) {
      expect(
        within(transactionTable).getByRole('columnheader', { name: heading }),
      ).toBeVisible();
    }
    expect(within(transactionTable).getAllByRole('row')).toHaveLength(2);
    expect(
      within(transactionTable).getByRole('cell', {
        name: 'No transactions were returned.',
      }),
    ).toHaveAttribute('colspan', '5');

    fireEvent.click(screen.getByRole('button', { name: 'Wallet Ledger' }));
    const walletLedgerTable = screen.getByRole('table', {
      name: 'Customer wallet ledger',
    });
    for (const heading of [
      'Source',
      'Date & Time',
      'Type',
      'Amount',
      'Balance After',
      'Expiry',
      'Staff',
    ]) {
      expect(
        within(walletLedgerTable).getByRole('columnheader', { name: heading }),
      ).toBeVisible();
    }
    expect(
      await within(walletLedgerTable).findByRole('cell', {
        name: 'No wallet ledger entries were returned.',
      }),
    ).toHaveAttribute('colspan', '7');

    fireEvent.click(screen.getByRole('button', { name: 'Virtual Card' }));
    expect(screen.getByText('No assigned card was provided.')).toBeVisible();
    expect(
      screen.queryByRole('img', { name: /ShopCity card preview/ }),
    ).not.toBeInTheDocument();
  });

  it('loads older wallet ledger rows with the returned cursor', async () => {
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
      .mocked(loyaltyControllerGetCustomerLedgerV1)
      .mockResolvedValueOnce({
        status: 200,
        data: {
          data: {
            customerId: 'requested-id',
            items: [
              {
                id: 'ledger-first',
                source: 'RC-FIRST',
                type: 'EARN',
                direction: 'CREDIT',
                amountKobo: 100,
                status: 'CONFIRMED',
                effectiveAt: '2025-02-02T00:00:00.000Z',
                creditLot: null,
              },
            ],
            nextCursor: 'cursor-next',
            hasMore: true,
          },
        },
      } as never)
      .mockResolvedValueOnce({
        status: 200,
        data: {
          data: {
            customerId: 'requested-id',
            items: [
              {
                id: 'ledger-second',
                source: 'RC-SECOND',
                type: 'REDEEM',
                direction: 'DEBIT',
                amountKobo: 50,
                status: 'CONFIRMED',
                effectiveAt: '2025-02-01T00:00:00.000Z',
                creditLot: null,
              },
            ],
            nextCursor: null,
            hasMore: false,
          },
        },
      } as never);
    render(<SupervisorCustomerProfile customerId="requested-id" />);
    await screen.findByRole('heading', {
      level: 1,
      name: 'Verified Customer',
    });
    fireEvent.click(screen.getByRole('button', { name: 'Wallet Ledger' }));
    const walletLedgerTable = screen.getByRole('table', {
      name: 'Customer wallet ledger',
    });
    await within(walletLedgerTable).findByText('RC-FIRST');
    fireEvent.click(screen.getByRole('button', { name: 'Load older entries' }));
    await within(walletLedgerTable).findByText('RC-SECOND');
    expect(within(walletLedgerTable).getByText('RC-FIRST')).toBeVisible();
    expect(within(walletLedgerTable).getByText('Redeemed')).toBeVisible();
    expect(within(walletLedgerTable).getByText(/-₦0\.50/)).toBeVisible();
    expect(loyaltyControllerGetCustomerLedgerV1).toHaveBeenNthCalledWith(
      1,
      'requested-id',
      { limit: '25', cursor: '' },
      expect.any(Object),
    );
    expect(loyaltyControllerGetCustomerLedgerV1).toHaveBeenNthCalledWith(
      2,
      'requested-id',
      { limit: '25', cursor: 'cursor-next' },
      expect.any(Object),
    );
    expect(
      screen.queryByRole('button', { name: 'Load older entries' }),
    ).not.toBeInTheDocument();
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
        screen.getByText('Annual Purchases').closest('article'),
      ).toHaveTextContent('Not provided');
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
