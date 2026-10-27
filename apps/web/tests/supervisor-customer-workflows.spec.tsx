import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { SupervisorCardWorkflows } from '../components/workflows/supervisor-card-workflows';
import {
  SupervisorCustomerProfile,
  SupervisorCustomerWorkflows,
} from '../components/workflows/supervisor-customer-workflows';
import {
  cardsControllerCreateCardV1,
  cardsControllerListIssuedManagementCardsV1,
  customersControllerGetCustomerV1,
  customersControllerListCustomersV1,
  customersControllerCreateCustomerV1,
  customersControllerUpdateCustomerV1,
  customersControllerUpdateStatusV1,
  customersControllerGetCustomerProfileProjectionV1,
} from '../lib/api/generated-client';

let query = new URLSearchParams();
const replace = jest.fn();
const push = jest.fn();

function expectNoImplementationFacingWorkflowUi() {
  const content = document.body.textContent ?? '';
  expect(content).not.toMatch(/Detail-led|Route-backed|Contract-driven/i);
  expect(content).not.toMatch(/implementation (?:note|details|context)/i);
  expect(content).not.toMatch(/route context/i);
  expect(content).not.toMatch(/ledger history|earn ledger/i);
  expect(content).not.toMatch(/\{\s*"(?:status|data|id)"\s*:/i);
  expect(document.querySelector('[role="alert"]')).not.toBeInTheDocument();
}

function assignmentSubmitButton() {
  return within(
    screen.getByRole('dialog', { name: 'Assignment eligibility' }),
  ).getByRole('button', { name: 'Assign card' });
}

async function openRegistrationDialog() {
  fireEvent.click(screen.getByRole('button', { name: 'Register customer' }));
  await screen.findByRole('dialog', { name: 'Register customer' });
}

async function confirmRegistrationInReview() {
  fireEvent.click(screen.getByRole('button', { name: 'Review details' }));
  const dialog = await screen.findByRole('dialog', {
    name: 'Review customer details',
  });
  fireEvent.click(
    within(dialog).getByRole('button', { name: 'Register customer' }),
  );
  return dialog;
}

jest.mock('next/navigation', () => ({
  useSearchParams: () => query,
  useRouter: () => ({ push, replace }),
}));

jest.mock('../lib/api/generated-client', () => ({
  cardsControllerCreateCardV1: jest.fn(),
  cardsControllerListIssuedManagementCardsV1: jest.fn(),
  customersControllerGetCustomerV1: jest.fn(),
  customersControllerListCustomersV1: jest.fn(),
  customersControllerCreateCustomerV1: jest.fn(),
  customersControllerUpdateCustomerV1: jest.fn(),
  customersControllerUpdateStatusV1: jest.fn(),
  loyaltyControllerGetCustomerLedgerV1: jest.fn().mockResolvedValue({
    status: 200,
    data: { data: { items: [] } },
  }),
  customersControllerGetCustomerProfileProjectionV1: jest
    .fn()
    .mockImplementation(async (id: string) => ({
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
    })),
}));

describe('SupervisorCardWorkflows', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    query = new URLSearchParams();
    jest
      .mocked(cardsControllerListIssuedManagementCardsV1)
      .mockImplementation(() => new Promise(() => {}) as never);
  });

  it('shows the issued-card table without an Issued cards navigation button', async () => {
    query = new URLSearchParams('tab=issued');
    render(<SupervisorCardWorkflows />);
    expect(
      await screen.findByRole('table', { name: 'Issued cards' }),
    ).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Issued cards' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Assign card' })).toHaveClass(
      'sc-button--primary',
    );
    expect(
      screen.queryByRole('heading', { name: 'Customers' }),
    ).not.toBeInTheDocument();
  });

  it('opens assignment in a popup without navigating and supports direct assignment links', async () => {
    query = new URLSearchParams();
    const view = render(<SupervisorCardWorkflows />);
    fireEvent.click(screen.getByRole('button', { name: 'Assign card' }));
    expect(push).not.toHaveBeenCalled();
    expect(
      await screen.findByRole('dialog', { name: 'Assign card' }),
    ).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Close assignment' }));
    expect(
      await screen.findByRole('table', { name: 'Issued cards' }),
    ).toBeVisible();

    query = new URLSearchParams('tab=assign');
    view.rerender(<SupervisorCardWorkflows />);
    expect(
      await screen.findByRole('dialog', { name: 'Assign card' }),
    ).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Close assignment' }));
    expect(replace).toHaveBeenLastCalledWith('/supervisor/cards', {
      scroll: false,
    });
    query = new URLSearchParams();
    view.rerender(<SupervisorCardWorkflows />);
    expect(
      await screen.findByRole('table', { name: 'Issued cards' }),
    ).toBeVisible();
  });

  it('loads verified assignment details directly after deliberate customer selection', async () => {
    jest.mocked(customersControllerListCustomersV1).mockResolvedValue({
      status: 200,
      data: {
        data: {
          items: [
            { id: 'cust-1', fullName: 'Ada Customer', phoneE164: '+2348' },
          ],
        },
      },
    } as never);
    const privateDebugField = 'ASSIGN_CUSTOMER_PRIVATE_DEBUG_91bc';
    const response = {
      status: 200,
      data: {
        data: {
          id: 'cust-1',
          fullName: 'Ada Customer',
          phoneE164: '+2348',
          status: 'ACTIVE',
          activeCardStatus: 'BLOCKED',
          debugMetadata: { privateValue: privateDebugField },
        },
      },
    };
    jest
      .mocked(customersControllerGetCustomerV1)
      .mockResolvedValue(response as never);
    query = new URLSearchParams('tab=assign');
    const view = render(<SupervisorCardWorkflows />);
    expect(
      screen.getByText('Search by customer name, phone number, or ID.'),
    ).toBeInTheDocument();
    expect(customersControllerGetCustomerV1).not.toHaveBeenCalled();
    fireEvent.change(
      screen.getByLabelText('Name, phone number, or customer ID'),
      { target: { value: 'Ada' } },
    );
    fireEvent.click(screen.getByRole('button', { name: 'Search customers' }));
    const result = await screen.findByRole('button', { name: /Ada Customer/ });
    expect(customersControllerGetCustomerV1).not.toHaveBeenCalled();
    expect(screen.queryByLabelText('New card serial')).not.toBeInTheDocument();
    fireEvent.click(result);
    expect(replace).toHaveBeenCalledWith(
      '/supervisor/cards?tab=assign&id=cust-1',
      { scroll: false },
    );
    query = new URLSearchParams('tab=assign&id=cust-1');
    view.rerender(<SupervisorCardWorkflows />);
    await waitFor(() =>
      expect(customersControllerGetCustomerV1).toHaveBeenCalledWith(
        'cust-1',
        expect.any(Object),
      ),
    );
    const assignmentDialog = await screen.findByRole('dialog', {
      name: 'Assignment eligibility',
    });
    expect(
      await within(assignmentDialog).findByLabelText('New card serial'),
    ).toHaveValue('');
    expect(document.body.textContent).toContain('Ada Customer');
    expect(assignmentDialog).toBeInTheDocument();
    expect(document.body.textContent).not.toContain(privateDebugField);
    expect(document.body.textContent).not.toContain(JSON.stringify(response));

    fireEvent.change(screen.getByLabelText('New card serial'), {
      target: { value: 'CARD-ASSIGN-001' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Review assignment' }));
    expect(
      screen.getByRole('heading', { name: 'Review card assignment' }),
    ).toBeInTheDocument();
    expect(screen.getByText('CARD-ASSIGN-001')).toBeInTheDocument();
    expect(cardsControllerCreateCardV1).not.toHaveBeenCalled();
  });

  it('keeps customer details hidden while authoritative eligibility is loading', async () => {
    query = new URLSearchParams('tab=assign&id=cust-1');
    let resolveDetails!: (value: unknown) => void;
    jest.mocked(customersControllerGetCustomerV1).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveDetails = resolve;
        }) as never,
    );
    render(<SupervisorCardWorkflows />);
    const dialog = await screen.findByRole('dialog', {
      name: 'Assignment eligibility',
    });
    expect(dialog).toHaveTextContent('Loading customer details');
    expect(within(dialog).queryByText('Ada Customer')).not.toBeInTheDocument();
    expect(
      within(dialog).queryByLabelText('New card serial'),
    ).not.toBeInTheDocument();

    await act(async () => {
      resolveDetails({
        status: 200,
        data: {
          data: {
            id: 'cust-1',
            fullName: 'Ada Customer',
            status: 'ACTIVE',
            activeCardStatus: 'BLOCKED',
          },
        },
      });
    });
    expect(await within(dialog).findByText('Ada Customer')).toBeInTheDocument();
    expect(await within(dialog).findByLabelText('New card serial')).toHaveValue(
      '',
    );
  });

  it('dismisses the assignment dialog back to preserved search without writing', async () => {
    query = new URLSearchParams('tab=assign');
    jest.mocked(customersControllerListCustomersV1).mockResolvedValue({
      status: 200,
      data: {
        data: {
          items: [
            { id: 'cust-1', fullName: 'Ada Customer', phoneE164: '+2348' },
          ],
        },
      },
    } as never);
    jest.mocked(customersControllerGetCustomerV1).mockResolvedValue({
      status: 200,
      data: {
        data: {
          id: 'cust-1',
          fullName: 'Ada Customer',
          phoneE164: '+2348',
          status: 'ACTIVE',
          activeCardStatus: 'BLOCKED',
        },
      },
    } as never);
    const view = render(<SupervisorCardWorkflows />);
    const searchInput = screen.getByLabelText(
      'Name, phone number, or customer ID',
    );
    fireEvent.change(searchInput, { target: { value: 'Ada' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search customers' }));
    fireEvent.click(
      await screen.findByRole('button', { name: /Ada Customer/ }),
    );
    query = new URLSearchParams('tab=assign&id=cust-1');
    view.rerender(<SupervisorCardWorkflows />);
    await screen.findByRole('dialog', { name: 'Assignment eligibility' });
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(
      screen.getByRole('dialog', { name: 'Assign card' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('dialog', { name: 'Assignment eligibility' }),
    ).not.toBeInTheDocument();
    expect(searchInput).toHaveValue('Ada');
    expect(
      screen.getByRole('button', { name: /Ada Customer/ }),
    ).toBeInTheDocument();
    expect(replace).toHaveBeenLastCalledWith('/supervisor/cards?tab=assign', {
      scroll: false,
    });
    expect(cardsControllerCreateCardV1).not.toHaveBeenCalled();
  });

  it('keeps card assignment unavailable for mismatched customer details', async () => {
    query = new URLSearchParams('tab=assign');
    jest.mocked(customersControllerListCustomersV1).mockResolvedValue({
      status: 200,
      data: { data: { items: [{ id: 'selected', fullName: 'Ada Customer' }] } },
    } as never);
    jest.mocked(customersControllerGetCustomerV1).mockResolvedValue({
      status: 200,
      data: { data: { id: 'different', fullName: 'Other Customer' } },
    } as never);
    const view = render(<SupervisorCardWorkflows />);
    fireEvent.change(
      screen.getByLabelText('Name, phone number, or customer ID'),
      { target: { value: 'Ada' } },
    );
    fireEvent.click(screen.getByRole('button', { name: 'Search customers' }));
    fireEvent.click(
      await screen.findByRole('button', { name: /Ada Customer/ }),
    );
    query = new URLSearchParams('tab=assign&id=selected');
    view.rerender(<SupervisorCardWorkflows />);
    const assignmentDialog = await screen.findByRole('dialog', {
      name: 'Assignment eligibility',
    });
    expect(
      await within(assignmentDialog).findByText(
        /Customer details could not be verified \(200\)/,
      ),
    ).toBeInTheDocument();
    expect(
      within(assignmentDialog).queryByLabelText('New card serial'),
    ).not.toBeInTheDocument();
  });

  it('reloads deep-linked customer details and fails closed for unavailable eligibility', async () => {
    query = new URLSearchParams('tab=assign&id=customer-1');
    jest.mocked(customersControllerGetCustomerV1).mockResolvedValue({
      status: 200,
      data: {
        data: {
          id: 'customer-1',
          fullName: 'Ada Customer',
          status: 'ACTIVE',
          activeCardStatus: 'ACTIVE',
        },
      },
    } as never);
    render(<SupervisorCardWorkflows />);
    await waitFor(() =>
      expect(customersControllerGetCustomerV1).toHaveBeenCalledWith(
        'customer-1',
        expect.any(Object),
      ),
    );
    const assignmentDialog = await screen.findByRole('dialog', {
      name: 'Assignment eligibility',
    });
    expect(
      await within(assignmentDialog).findByText(
        'This customer already has an active card.',
      ),
    ).toBeInTheDocument();
    expect(
      screen
        .getAllByRole('link', { name: 'View issued cards' })
        .some(
          (link) =>
            link.getAttribute('href') ===
            '/supervisor/cards?tab=issued&id=customer-1',
        ),
    ).toBe(true);
    expect(screen.queryByLabelText('New card serial')).not.toBeInTheDocument();

    jest
      .mocked(customersControllerGetCustomerV1)
      .mockResolvedValue({ status: 503, data: {} } as never);
    query = new URLSearchParams('tab=assign&id=unavailable');
    render(<SupervisorCardWorkflows />);
    expect(
      await screen.findByText(/Assignment is unavailable/),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText('New card serial')).not.toBeInTheDocument();
  });

  it('blocks inactive customers and routes active-card cases to the issued-card directory', async () => {
    query = new URLSearchParams('tab=assign&id=blocked');
    jest.mocked(customersControllerGetCustomerV1).mockResolvedValue({
      status: 200,
      data: {
        data: {
          id: 'blocked',
          fullName: 'Blocked Customer',
          status: 'BLOCKED',
          activeCardStatus: 'BLOCKED',
        },
      },
    } as never);
    render(<SupervisorCardWorkflows />);
    expect(
      await screen.findByText(
        'Assignment is unavailable because this customer is not active.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText('New card serial')).not.toBeInTheDocument();
    expect(cardsControllerCreateCardV1).not.toHaveBeenCalled();
  });

  it('reviews a new serial and submits the existing create-card request with CSRF and idempotency', async () => {
    query = new URLSearchParams('tab=assign&id=eligible');
    jest.mocked(customersControllerGetCustomerV1).mockResolvedValue({
      status: 200,
      data: {
        data: {
          id: 'eligible',
          fullName: 'Ada Customer',
          status: 'ACTIVE',
          activeCardStatus: 'BLOCKED',
        },
      },
    } as never);
    jest.mocked(cardsControllerCreateCardV1).mockResolvedValue({
      status: 201,
      data: { data: { id: 'card-1' } },
    } as never);
    render(<SupervisorCardWorkflows />);
    expect(await screen.findByLabelText('New card serial')).toHaveValue('');
    expect(screen.getByText('Customer status')).toBeInTheDocument();
    expect(screen.getByText('Current card status')).toBeInTheDocument();
    expect(screen.getByText('Ada Customer')).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(
      /Detail-led|Route-backed|Contract-driven|implementation note|route context|ledger history|earn ledger/i,
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('New card serial'), {
      target: { value: ' NEW-101 ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Review assignment' }));
    expect(
      screen.getByRole('heading', { name: 'Review card assignment' }),
    ).toBeInTheDocument();
    expect(screen.getByText('NEW-101')).toBeInTheDocument();
    fireEvent.click(assignmentSubmitButton());
    await waitFor(() =>
      expect(cardsControllerCreateCardV1).toHaveBeenCalledTimes(1),
    );
    expect(cardsControllerCreateCardV1).toHaveBeenCalledWith(
      { customerId: 'eligible', serialNumber: 'NEW-101' },
      expect.objectContaining({
        credentials: 'include',
        headers: expect.objectContaining({
          'idempotency-key': expect.any(String),
        }),
      }),
    );
    expect(
      await screen.findByText('Card assigned successfully.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Customer status')).toBeInTheDocument();
    expect(screen.getByText('Current card status')).toBeInTheDocument();
  });

  it.each([
    ['403', { status: 403, data: {} }],
    ['5xx', { status: 503, data: {} }],
    ['network timeout', new Error('timeout')],
  ])(
    'blocks duplicate assignment while pending and refreshes authority after %s',
    async (_failure, failure) => {
      query = new URLSearchParams('tab=assign&id=eligible');
      jest.mocked(customersControllerGetCustomerV1).mockResolvedValue({
        status: 200,
        data: {
          data: {
            id: 'eligible',
            fullName: 'Ada Customer',
            status: 'ACTIVE',
            activeCardStatus: 'BLOCKED',
          },
        },
      } as never);
      let rejectRequest!: (reason: unknown) => void;
      if (failure instanceof Error) {
        jest.mocked(cardsControllerCreateCardV1).mockImplementation(
          () =>
            new Promise((_resolve, reject) => {
              rejectRequest = reject;
            }) as never,
        );
      } else {
        jest.mocked(cardsControllerCreateCardV1).mockImplementation(
          () =>
            new Promise((resolve) => {
              rejectRequest = resolve;
            }) as never,
        );
      }
      render(<SupervisorCardWorkflows />);
      fireEvent.change(await screen.findByLabelText('New card serial'), {
        target: { value: 'RETRY-101' },
      });
      fireEvent.click(
        screen.getByRole('button', { name: 'Review assignment' }),
      );
      const submit = assignmentSubmitButton();
      fireEvent.click(submit);
      fireEvent.click(submit);
      expect(cardsControllerCreateCardV1).toHaveBeenCalledTimes(1);
      expect(submit).toBeDisabled();
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(
        screen.getByRole('dialog', { name: 'Assignment eligibility' }),
      ).toBeInTheDocument();
      if (failure instanceof Error) rejectRequest(failure);
      else rejectRequest(failure);
      expect(
        await screen.findByText(
          /could not be confirmed|not completed \((?:403|503)\)/i,
        ),
      ).toBeInTheDocument();
      expect(screen.getByLabelText('New card serial')).toHaveValue('RETRY-101');
      expect(
        screen.queryByText('Card assigned successfully.'),
      ).not.toBeInTheDocument();
      await waitFor(() =>
        expect(customersControllerGetCustomerV1).toHaveBeenCalledTimes(2),
      );
    },
  );

  it('reuses an idempotency key after an uncertain assignment and explicit re-review', async () => {
    query = new URLSearchParams('tab=assign&id=eligible');
    jest
      .mocked(customersControllerGetCustomerV1)
      .mockResolvedValueOnce({
        status: 200,
        data: {
          data: {
            id: 'eligible',
            fullName: 'Ada Customer',
            status: 'ACTIVE',
            activeCardStatus: 'BLOCKED',
          },
        },
      } as never)
      .mockResolvedValueOnce({
        status: 200,
        data: {
          data: {
            id: 'eligible',
            fullName: 'Ada Customer',
            status: 'ACTIVE',
            activeCardStatus: 'BLOCKED',
          },
        },
      } as never)
      .mockResolvedValueOnce({
        status: 200,
        data: {
          data: {
            id: 'eligible',
            fullName: 'Ada Customer',
            status: 'ACTIVE',
            activeCardStatus: 'ACTIVE',
          },
        },
      } as never);
    jest
      .mocked(cardsControllerCreateCardV1)
      .mockResolvedValueOnce({ status: 503, data: {} } as never)
      .mockResolvedValueOnce({
        status: 201,
        data: { data: { id: 'card-1' } },
      } as never);

    render(<SupervisorCardWorkflows />);
    const serialInput = await screen.findByLabelText('New card serial');
    fireEvent.change(serialInput, { target: { value: ' RETRY-101 ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Review assignment' }));
    fireEvent.click(assignmentSubmitButton());

    expect(
      await screen.findByText(/not completed \(503\)/i),
    ).toBeInTheDocument();
    expect(await screen.findByText('Customer status')).toBeInTheDocument();
    expect(serialInput).toHaveValue(' RETRY-101 ');
    expect(
      screen.getByRole('button', { name: 'Review assignment' }),
    ).toBeInTheDocument();
    expect(cardsControllerCreateCardV1).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Review assignment' }));
    expect(
      screen.getByRole('heading', { name: 'Review card assignment' }),
    ).toBeInTheDocument();
    fireEvent.click(assignmentSubmitButton());
    await waitFor(() =>
      expect(cardsControllerCreateCardV1).toHaveBeenCalledTimes(2),
    );

    const firstKey = jest.mocked(cardsControllerCreateCardV1).mock.calls[0][1]
      .headers?.['idempotency-key'];
    const retryKey = jest.mocked(cardsControllerCreateCardV1).mock.calls[1][1]
      .headers?.['idempotency-key'];
    expect(firstKey).toEqual(expect.any(String));
    expect(retryKey).toBe(firstKey);
    expect(
      await screen.findByText('Card assigned successfully.'),
    ).toBeInTheDocument();
    expect(
      await screen.findByText('This customer already has an active card.'),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText('New card serial')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Review assignment' }),
    ).not.toBeInTheDocument();
    expect(cardsControllerCreateCardV1).toHaveBeenCalledTimes(2);
  });

  it('uses a fresh idempotency key when the customer and canonical serial payload changes', async () => {
    query = new URLSearchParams('tab=assign&id=eligible');
    jest.mocked(customersControllerGetCustomerV1).mockResolvedValue({
      status: 200,
      data: {
        data: {
          id: 'eligible',
          fullName: 'Ada Customer',
          status: 'ACTIVE',
          activeCardStatus: 'BLOCKED',
        },
      },
    } as never);
    jest
      .mocked(cardsControllerCreateCardV1)
      .mockResolvedValueOnce({ status: 503, data: {} } as never)
      .mockResolvedValueOnce({ status: 503, data: {} } as never);
    render(<SupervisorCardWorkflows />);
    const serialInput = await screen.findByLabelText('New card serial');
    fireEvent.change(serialInput, { target: { value: 'RETRY-101' } });
    fireEvent.click(screen.getByRole('button', { name: 'Review assignment' }));
    fireEvent.click(assignmentSubmitButton());
    expect(
      await screen.findByText(/not completed \(503\)/i),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('New card serial')).toHaveValue('RETRY-101');

    fireEvent.change(screen.getByLabelText('New card serial'), {
      target: { value: 'RETRY-102' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Review assignment' }));
    fireEvent.click(assignmentSubmitButton());
    await waitFor(() =>
      expect(cardsControllerCreateCardV1).toHaveBeenCalledTimes(2),
    );
    const firstKey = jest.mocked(cardsControllerCreateCardV1).mock.calls[0][1]
      .headers?.['idempotency-key'];
    const changedPayloadKey = jest.mocked(cardsControllerCreateCardV1).mock
      .calls[1][1].headers?.['idempotency-key'];
    expect(changedPayloadKey).not.toBe(firstKey);
  });

  it('does not trust URL status or balance over freshly loaded customer details', async () => {
    query = new URLSearchParams(
      'tab=assign&id=eligible&status=BLOCKED&balance=999999',
    );
    jest.mocked(customersControllerGetCustomerV1).mockReset();
    jest.mocked(customersControllerGetCustomerV1).mockResolvedValue({
      status: 200,
      data: {
        data: {
          id: 'eligible',
          fullName: 'Authoritative Customer',
          status: 'ACTIVE',
          activeCardStatus: 'BLOCKED',
        },
      },
    } as never);
    render(<SupervisorCardWorkflows />);
    expect(await screen.findByLabelText('New card serial')).toBeInTheDocument();
    expect(screen.getByText('Authoritative Customer')).toBeInTheDocument();
    expect(document.body.textContent).not.toContain('999999');
    expect(document.body.textContent).not.toContain('BLOCKED · 999999');
  });

  it('retains the serial after a duplicate-serial conflict', async () => {
    query = new URLSearchParams('tab=assign&id=eligible');
    jest.mocked(customersControllerGetCustomerV1).mockResolvedValue({
      status: 200,
      data: {
        data: {
          id: 'eligible',
          fullName: 'Ada Customer',
          status: 'ACTIVE',
          activeCardStatus: 'BLOCKED',
        },
      },
    } as never);
    jest
      .mocked(cardsControllerCreateCardV1)
      .mockResolvedValue({ status: 409, data: {} } as never);
    render(<SupervisorCardWorkflows />);
    fireEvent.change(await screen.findByLabelText('New card serial'), {
      target: { value: 'DUP-1' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Review assignment' }));
    fireEvent.click(assignmentSubmitButton());
    expect(
      await screen.findByText(
        'This card serial is already assigned. Enter a different serial.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('New card serial')).toHaveValue('DUP-1');
    expect(cardsControllerCreateCardV1).toHaveBeenCalledTimes(1);
    expect(customersControllerGetCustomerV1).toHaveBeenCalledTimes(2);
  });

  it('refreshes eligibility after the server rejects a stale assignment', async () => {
    query = new URLSearchParams('tab=assign&id=eligible');
    jest
      .mocked(customersControllerGetCustomerV1)
      .mockResolvedValueOnce({
        status: 200,
        data: {
          data: {
            id: 'eligible',
            fullName: 'Ada Customer',
            status: 'ACTIVE',
            activeCardStatus: 'BLOCKED',
          },
        },
      } as never)
      .mockResolvedValueOnce({
        status: 200,
        data: {
          data: {
            id: 'eligible',
            fullName: 'Ada Customer',
            status: 'ACTIVE',
            activeCardStatus: 'ACTIVE',
          },
        },
      } as never);
    jest
      .mocked(cardsControllerCreateCardV1)
      .mockResolvedValue({ status: 400, data: {} } as never);
    render(<SupervisorCardWorkflows />);
    fireEvent.change(await screen.findByLabelText('New card serial'), {
      target: { value: 'NEW-102' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Review assignment' }));
    fireEvent.click(assignmentSubmitButton());
    expect(
      await screen.findByText(
        'Assignment was rejected because customer eligibility changed. Check the updated eligibility before retrying.',
      ),
    ).toBeInTheDocument();
    expect(
      await screen.findByText('This customer already has an active card.'),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText('New card serial')).not.toBeInTheDocument();
    expect(cardsControllerCreateCardV1).toHaveBeenCalledTimes(1);
    expect(customersControllerGetCustomerV1).toHaveBeenCalledTimes(2);
  });
});

describe('SupervisorCustomerWorkflows', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    query = new URLSearchParams();
  });

  it('keeps legacy tab and customer query parameters from opening registration or a profile', () => {
    query = new URLSearchParams('tab=register&id=previous-customer');
    render(<SupervisorCustomerWorkflows />);
    expect(
      screen.getByRole('heading', { name: 'Customers' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Register customer' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByLabelText('First card serial'),
    ).not.toBeInTheDocument();
    expect(customersControllerGetCustomerV1).not.toHaveBeenCalled();
    expect(customersControllerUpdateCustomerV1).not.toHaveBeenCalled();
  });

  it('uses directory results to link to a stable-ID customer profile', async () => {
    jest.mocked(customersControllerListCustomersV1).mockResolvedValue({
      status: 200,
      data: {
        data: {
          items: [
            {
              id: 'selected-customer',
              fullName: 'Selected Customer',
              phoneE164: '+234800000091',
            },
          ],
        },
      },
    } as never);
    render(<SupervisorCustomerWorkflows />);
    fireEvent.change(
      screen.getByLabelText(
        'Search by customer name, phone number, or card number',
      ),
      { target: { value: 'Selected Customer' } },
    );
    fireEvent.click(screen.getByRole('button', { name: 'Search customers' }));
    const profileLink = await screen.findByRole('link', {
      name: /Selected Customer/,
    });
    expect(profileLink).toHaveAttribute(
      'href',
      '/supervisor/customers/selected-customer',
    );
    expect(customersControllerGetCustomerV1).not.toHaveBeenCalled();
  });

  it('shows only the card summary supplied by the directory and links by stable ID', async () => {
    jest.mocked(customersControllerListCustomersV1).mockResolvedValue({
      status: 200,
      data: {
        data: {
          items: [
            {
              id: 'card-customer',
              fullName: 'Card Customer',
              phoneE164: '+234800000092',
              status: 'ACTIVE',
              activeCardStatus: 'ACTIVE',
              cardNumber: 'CARD-SECRET-92',
            },
          ],
        },
      },
    } as never);
    render(<SupervisorCustomerWorkflows />);
    fireEvent.change(
      screen.getByLabelText(
        'Search by customer name, phone number, or card number',
      ),
      { target: { value: 'Card Customer' } },
    );
    fireEvent.click(screen.getByRole('button', { name: 'Search customers' }));
    const profileLink = await screen.findByRole('link', {
      name: 'View profile for Card Customer',
    });
    expect(profileLink).toHaveAttribute(
      'href',
      '/supervisor/customers/card-customer',
    );
    expect(
      within(screen.getByRole('row', { name: /Card Customer/ })).getByText(
        'Active',
        { exact: true },
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('CARD-SECRET-92')).toBeInTheDocument();
    expect(screen.getAllByText('—')).toHaveLength(3);
  });

  it('fails closed for an inaccessible stable-ID profile', async () => {
    jest
      .mocked(customersControllerGetCustomerV1)
      .mockResolvedValue({ status: 404, data: {} } as never);
    render(<SupervisorCustomerProfile customerId="stale-customer" />);
    expect(
      await screen.findByText('Customer details could not be verified (404).'),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Save changes' }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Retry customer details' }),
    ).toBeInTheDocument();
    expect(customersControllerUpdateCustomerV1).not.toHaveBeenCalled();
    expect(customersControllerUpdateStatusV1).not.toHaveBeenCalled();
  });

  it('renders the table-first directory regardless of removed register/manage tab URLs', () => {
    query = new URLSearchParams('tab=register');
    render(<SupervisorCustomerWorkflows />);
    expect(
      screen.getByRole('heading', { name: 'Customers' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Register customer' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('search')).toBeInTheDocument();
    expect(
      screen.queryByRole('tablist', { name: 'Customer tasks' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText('First card serial'),
    ).not.toBeInTheDocument();
  });

  it('opens registration from the directory control rather than a register tab', async () => {
    render(<SupervisorCustomerWorkflows />);
    await openRegistrationDialog();
    expect(screen.getByLabelText('First card serial')).toBeInTheDocument();
    expect(
      screen.getByRole('dialog', { name: 'Register customer' }),
    ).toBeInTheDocument();
  });

  it('rejects blank required fields before creating a customer or first card', async () => {
    render(<SupervisorCustomerWorkflows />);
    await openRegistrationDialog();
    fireEvent.click(screen.getByRole('button', { name: 'Review details' }));
    expect(screen.getByLabelText('Full name')).toBeInvalid();
    expect(screen.getByLabelText('Phone number')).toBeInvalid();
    expect(screen.getByLabelText('First card serial')).toBeInvalid();
    expect(customersControllerCreateCustomerV1).not.toHaveBeenCalled();
  });

  it('reviews registration details locally and lets the supervisor edit or dismiss without creating', async () => {
    render(<SupervisorCustomerWorkflows />);
    await openRegistrationDialog();
    const consentGroup = screen.getByRole('group', {
      name: 'Customer consent · v1.2 · privacy v2.0',
    });
    expect(consentGroup).toHaveClass(
      'supervisor-customer-registration-consent',
    );
    for (const label of [
      'Loyalty service consent (required)',
      'Marketing opt-in (optional)',
    ]) {
      const checkbox = within(consentGroup).getByLabelText(label);
      expect(checkbox).toHaveClass('sc-checkbox');
      expect(checkbox).toHaveClass(
        'supervisor-customer-registration-consent__checkbox',
      );
      const option = checkbox.closest('label');
      if (!option) throw new Error(`Missing consent label: ${label}`);
      expect(option).toHaveClass(
        'supervisor-customer-registration-consent__option',
      );
    }
    fireEvent.change(screen.getByLabelText('Full name'), {
      target: { value: 'Test Customer' },
    });
    fireEvent.change(screen.getByLabelText('Phone number'), {
      target: { value: '0000000000' },
    });
    fireEvent.change(screen.getByLabelText('First card serial'), {
      target: { value: 'TEST-SERIAL-001' },
    });
    fireEvent.click(
      screen.getByLabelText('Loyalty service consent (required)'),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Review details' }));
    const reviewDialog = await screen.findByRole('dialog', {
      name: 'Review customer details',
    });
    expect(reviewDialog).toHaveTextContent('Test Customer');
    expect(reviewDialog).toHaveTextContent('0000000000');
    expect(reviewDialog).toHaveTextContent('Email');
    expect(reviewDialog).toHaveTextContent('Not provided');
    expect(reviewDialog).toHaveTextContent('TEST-SERIAL-001');
    expect(reviewDialog).toHaveTextContent('Granted');
    expect(reviewDialog).toHaveTextContent('Not opted in');
    expect(reviewDialog).not.toHaveTextContent(/customer status|card status/i);
    expect(reviewDialog).not.toHaveTextContent(
      /linked card|card tasks|active/i,
    );
    expect(customersControllerCreateCustomerV1).not.toHaveBeenCalled();

    fireEvent.click(
      within(reviewDialog).getByRole('button', { name: 'Edit details' }),
    );
    expect(
      screen.queryByRole('dialog', { name: 'Review customer details' }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('dialog', { name: 'Register customer' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Full name')).toHaveValue('Test Customer');
    expect(screen.getByLabelText('Phone number')).toHaveValue('0000000000');
    expect(screen.getByLabelText('First card serial')).toHaveValue(
      'TEST-SERIAL-001',
    );
    expect(
      screen.getByLabelText('Loyalty service consent (required)'),
    ).toBeChecked();
    await waitFor(() =>
      expect(screen.getByLabelText('Full name')).toHaveFocus(),
    );
    expect(customersControllerCreateCustomerV1).not.toHaveBeenCalled();

    fireEvent.click(screen.getByLabelText('Marketing opt-in (optional)'));
    expect(screen.getByLabelText('Marketing opt-in (optional)')).toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: 'Review details' }));
    const updatedReviewDialog = await screen.findByRole('dialog', {
      name: 'Review customer details',
    });
    expect(updatedReviewDialog).toHaveTextContent('Granted');
    expect(updatedReviewDialog).toHaveTextContent('Opted in');
    expect(customersControllerCreateCustomerV1).not.toHaveBeenCalled();

    fireEvent.keyDown(updatedReviewDialog, { key: 'Escape' });
    expect(
      await screen.findByRole('heading', { name: 'Discard registration?' }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Keep editing' }));
    expect(
      screen.getByRole('dialog', { name: 'Register customer' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Full name')).toHaveValue('Test Customer');
    expect(customersControllerCreateCustomerV1).not.toHaveBeenCalled();
  });

  it('prevents duplicate pending registration and retries an uncertain 503 with the same key', async () => {
    let resolveRequest!: (value: unknown) => void;
    jest
      .mocked(customersControllerCreateCustomerV1)
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveRequest = resolve;
          }) as never,
      )
      .mockResolvedValueOnce({
        status: 201,
        data: { data: { id: 'retry-customer' } },
      } as never);
    render(<SupervisorCustomerWorkflows />);
    await openRegistrationDialog();
    fireEvent.change(screen.getByLabelText('Full name'), {
      target: { value: 'Ada Customer' },
    });
    fireEvent.change(screen.getByLabelText('Phone number'), {
      target: { value: '+234800000030' },
    });
    fireEvent.change(screen.getByLabelText('First card serial'), {
      target: { value: 'CARD-030' },
    });
    fireEvent.click(
      screen.getByLabelText('Loyalty service consent (required)'),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Review details' }));
    expect(customersControllerCreateCustomerV1).not.toHaveBeenCalled();
    const reviewDialog = await screen.findByRole('dialog', {
      name: 'Review customer details',
    });
    const submit = within(reviewDialog).getByRole('button', {
      name: 'Register customer',
    });
    fireEvent.click(submit);
    fireEvent.click(submit);
    expect(customersControllerCreateCustomerV1).toHaveBeenCalledTimes(1);
    expect(submit).toBeDisabled();
    resolveRequest({ status: 503, data: {} });
    expect(
      await screen.findByText(/Registration was not confirmed \(503\)/),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(
        'Customer, first card, and consent were registered successfully.',
      ),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText('Full name')).toHaveValue('Ada Customer');
    expect(screen.getByLabelText('Phone number')).toHaveValue('+234800000030');
    expect(screen.getByLabelText('First card serial')).toHaveValue('CARD-030');
    const firstHeaders = jest.mocked(customersControllerCreateCustomerV1).mock
      .calls[0][1].headers as Record<string, string>;
    await confirmRegistrationInReview();
    expect(
      await screen.findByText('Customer registered successfully.'),
    ).toBeInTheDocument();
    expect(customersControllerCreateCustomerV1).toHaveBeenCalledTimes(2);
    const retryHeaders = jest.mocked(customersControllerCreateCustomerV1).mock
      .calls[1][1].headers as Record<string, string>;
    expect(retryHeaders['idempotency-key']).toBe(
      firstHeaders['idempotency-key'],
    );
    expect(screen.getByRole('link', { name: 'View customer' })).toHaveAttribute(
      'href',
      '/supervisor/customers/retry-customer',
    );
  });

  it('creates a customer and first card once with CSRF and idempotency, then links by ID', async () => {
    jest.mocked(customersControllerCreateCustomerV1).mockResolvedValue({
      status: 201,
      data: { data: { id: 'new-1' } },
    } as never);
    render(<SupervisorCustomerWorkflows />);
    expectNoImplementationFacingWorkflowUi();
    fireEvent.click(screen.getByRole('button', { name: 'Register customer' }));
    expect(
      screen
        .getAllByRole('status')
        .some((status) =>
          status.textContent?.includes(
            'Enter customer details and the serial number for their first card.',
          ),
        ),
    ).toBe(true);
    fireEvent.change(screen.getByLabelText('Full name'), {
      target: { value: 'Ada Customer' },
    });
    fireEvent.change(screen.getByLabelText('Phone number'), {
      target: { value: '+234800000001' },
    });
    fireEvent.change(screen.getByLabelText('First card serial'), {
      target: { value: 'CARD-001' },
    });
    fireEvent.click(
      screen.getByLabelText('Loyalty service consent (required)'),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Review details' }));
    const reviewDialog = await screen.findByRole('dialog', {
      name: 'Review customer details',
    });
    expect(customersControllerCreateCustomerV1).not.toHaveBeenCalled();
    expect(reviewDialog).toHaveTextContent('Ada Customer');
    expect(reviewDialog).toHaveTextContent('+234800000001');
    expect(reviewDialog).toHaveTextContent('CARD-001');
    expect(reviewDialog).not.toHaveTextContent(
      /status|linked card|card tasks/i,
    );
    fireEvent.click(
      within(reviewDialog).getByRole('button', { name: 'Register customer' }),
    );
    await waitFor(() =>
      expect(customersControllerCreateCustomerV1).toHaveBeenCalledTimes(1),
    );
    expect(customersControllerCreateCustomerV1).toHaveBeenCalledWith(
      {
        fullName: 'Ada Customer',
        phone: '+234800000001',
        cardSerialNumber: 'CARD-001',
        loyaltyConsent: true,
        marketingOptIn: false,
      },
      expect.objectContaining({
        credentials: 'include',
        headers: expect.objectContaining({
          'idempotency-key': expect.any(String),
        }),
      }),
    );
    expect(
      await screen.findByText('Customer registered successfully.'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('dialog', { name: 'Register customer' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Customer registered successfully.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View customer' })).toHaveAttribute(
      'href',
      '/supervisor/customers/new-1',
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Register another customer' }),
    );
    expect(screen.getByLabelText('Full name')).toHaveValue('');
    expect(screen.getByLabelText('Phone number')).toHaveValue('');
    expect(screen.getByLabelText('First card serial')).toHaveValue('');
    expect(
      screen.getByLabelText('Loyalty service consent (required)'),
    ).not.toBeChecked();
    await waitFor(() =>
      expect(screen.getByLabelText('Full name')).toHaveFocus(),
    );
  });

  it('does not show success when the create response has no customer ID', async () => {
    jest.mocked(customersControllerCreateCustomerV1).mockResolvedValue({
      status: 201,
      data: { data: {} },
    } as never);
    render(<SupervisorCustomerWorkflows />);
    await openRegistrationDialog();
    fireEvent.change(screen.getByLabelText('Full name'), {
      target: { value: 'Ada Customer' },
    });
    fireEvent.change(screen.getByLabelText('Phone number'), {
      target: { value: '+234800000099' },
    });
    fireEvent.change(screen.getByLabelText('First card serial'), {
      target: { value: 'CARD-099' },
    });
    fireEvent.click(
      screen.getByLabelText('Loyalty service consent (required)'),
    );

    await confirmRegistrationInReview();
    expect(
      await screen.findByText(
        'The registration response could not be verified. Check Manage customers before retrying.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Customer registered' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: 'View customer' }),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText('Full name')).toHaveValue('Ada Customer');
    expect(customersControllerCreateCustomerV1).toHaveBeenCalledTimes(1);
  });

  it('retains entered values after duplicate and offers phone search without trusting response identity', async () => {
    jest.mocked(customersControllerCreateCustomerV1).mockResolvedValue({
      status: 409,
      data: { data: { id: 'untrusted' } },
    } as never);
    render(<SupervisorCustomerWorkflows />);
    await openRegistrationDialog();
    fireEvent.change(screen.getByLabelText('Full name'), {
      target: { value: 'Ada Customer' },
    });
    fireEvent.change(screen.getByLabelText('Phone number'), {
      target: { value: '+234800000002' },
    });
    fireEvent.change(screen.getByLabelText('First card serial'), {
      target: { value: 'DUP-001' },
    });
    fireEvent.click(
      screen.getByLabelText('Loyalty service consent (required)'),
    );
    await confirmRegistrationInReview();
    expect(
      await screen.findByRole('button', {
        name: 'Search this phone in Manage customers',
      }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Full name')).toHaveValue('Ada Customer');
    expect(screen.getByLabelText('First card serial')).toHaveValue('DUP-001');
    expect(
      screen.queryByRole('link', { name: 'Manage customer untrusted' }),
    ).not.toBeInTheDocument();
  });

  it('highlights only the fields reported by a typed registration conflict', async () => {
    jest.mocked(customersControllerCreateCustomerV1).mockResolvedValue({
      status: 409,
      data: {
        success: false,
        error: {
          code: 'CUSTOMER_REGISTRATION_CONFLICT',
          details: { fields: ['email', 'cardSerialNumber'] },
        },
      },
    } as never);
    render(<SupervisorCustomerWorkflows />);
    await openRegistrationDialog();
    fireEvent.change(screen.getByLabelText('Full name'), {
      target: { value: 'Ada Customer' },
    });
    fireEvent.change(screen.getByLabelText('Phone number'), {
      target: { value: '+234800000003' },
    });
    fireEvent.change(screen.getByLabelText('Email (optional)'), {
      target: { value: 'ada@example.com' },
    });
    fireEvent.change(screen.getByLabelText('First card serial'), {
      target: { value: 'DUP-003' },
    });
    fireEvent.click(
      screen.getByLabelText('Loyalty service consent (required)'),
    );

    await confirmRegistrationInReview();

    expect(
      await screen.findByText('This email address is already registered.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('This card serial is already assigned.'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Email (optional)')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    expect(screen.getByLabelText('First card serial')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    expect(screen.getByLabelText('Phone number')).toHaveAttribute(
      'aria-invalid',
      'false',
    );
    expect(customersControllerListCustomersV1).not.toHaveBeenCalledWith(
      { q: '+234800000003', limit: '25', cursor: '' },
      expect.any(Object),
    );
    expect(screen.getByLabelText('Email (optional)')).toHaveValue(
      'ada@example.com',
    );
  });

  it('verifies an exact phone candidate by detail reload before handing off its ID', async () => {
    jest.mocked(customersControllerCreateCustomerV1).mockResolvedValue({
      status: 409,
      data: {
        success: false,
        error: {
          code: 'CUSTOMER_REGISTRATION_CONFLICT',
          details: { fields: ['phone'] },
        },
      },
    } as never);
    jest.mocked(customersControllerListCustomersV1).mockResolvedValue({
      status: 200,
      data: {
        data: {
          items: [
            { id: 'near-match', phoneE164: '+2348000000100' },
            { id: 'verified-customer', phoneE164: '+234 800-000-010' },
          ],
        },
      },
    } as never);
    jest.mocked(customersControllerGetCustomerV1).mockResolvedValue({
      status: 200,
      data: {
        data: {
          id: 'verified-customer',
          fullName: 'Verified Customer',
          phoneE164: '+234800000010',
          status: 'ACTIVE',
        },
      },
    } as never);
    const view = render(<SupervisorCustomerWorkflows />);
    await openRegistrationDialog();
    fireEvent.change(screen.getByLabelText('Full name'), {
      target: { value: 'Submitted Name' },
    });
    fireEvent.change(screen.getByLabelText('Phone number'), {
      target: { value: '+234800000010' },
    });
    fireEvent.change(screen.getByLabelText('First card serial'), {
      target: { value: 'DUP-010' },
    });
    fireEvent.click(
      screen.getByLabelText('Loyalty service consent (required)'),
    );
    await confirmRegistrationInReview();
    const verifiedLink = await screen.findByRole('link', {
      name: 'Manage customer verified-customer',
    });
    expect(customersControllerListCustomersV1).toHaveBeenCalledWith(
      { q: '+234800000010', limit: '25', cursor: '' },
      expect.any(Object),
    );
    expect(customersControllerGetCustomerV1).toHaveBeenCalledWith(
      'verified-customer',
      expect.any(Object),
    );
    expect(verifiedLink).toHaveAttribute(
      'href',
      '/supervisor/customers/verified-customer',
    );
    expect(screen.getByLabelText('Full name')).toHaveValue('Submitted Name');
    expect(screen.getByLabelText('First card serial')).toHaveValue('DUP-010');
    expect(
      screen.queryByRole('link', { name: /untrusted-conflict-id/ }),
    ).not.toBeInTheDocument();

    expect(verifiedLink).toHaveAttribute(
      'href',
      '/supervisor/customers/verified-customer',
    );
    view.unmount();
    render(<SupervisorCustomerProfile customerId="verified-customer" />);
    await waitFor(() =>
      expect(customersControllerGetCustomerV1).toHaveBeenCalledTimes(2),
    );
    const customerDetailsCard = document.querySelector<HTMLElement>(
      '.supervisor-profile-details-card',
    );
    expect(customerDetailsCard).toHaveTextContent('Verified Customer');
    fireEvent.click(
      screen.getByRole('button', { name: 'Edit customer details' }),
    );
    expect(await screen.findByLabelText('Full name')).toHaveValue(
      'Verified Customer',
    );
  });

  it('falls back to Manage customers with the submitted phone when no exact verified match exists', async () => {
    jest.mocked(customersControllerCreateCustomerV1).mockResolvedValue({
      status: 409,
      data: { data: { id: 'untrusted' } },
    } as never);
    jest.mocked(customersControllerListCustomersV1).mockResolvedValue({
      status: 200,
      data: {
        data: { items: [{ id: 'wrong-phone', phoneE164: '+234800000021' }] },
      },
    } as never);
    render(<SupervisorCustomerWorkflows />);
    await openRegistrationDialog();
    fireEvent.change(screen.getByLabelText('Full name'), {
      target: { value: 'Submitted Name' },
    });
    fireEvent.change(screen.getByLabelText('Phone number'), {
      target: { value: '+234800000020' },
    });
    fireEvent.change(screen.getByLabelText('First card serial'), {
      target: { value: 'DUP-020' },
    });
    fireEvent.click(
      screen.getByLabelText('Loyalty service consent (required)'),
    );
    await confirmRegistrationInReview();
    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Search this phone in Manage customers',
      }),
    );
    expect(replace).toHaveBeenCalledWith(
      '/supervisor/customers?q=%2B234800000020',
      { scroll: false },
    );
    expect(customersControllerGetCustomerV1).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Phone number')).toHaveValue('+234800000020');
    expect(screen.getByLabelText('First card serial')).toHaveValue('DUP-020');
  });

  it('falls back to Manage customers with the submitted phone when detail verification fails', async () => {
    jest
      .mocked(customersControllerCreateCustomerV1)
      .mockResolvedValue({ status: 409, data: {} } as never);
    jest.mocked(customersControllerListCustomersV1).mockResolvedValue({
      status: 200,
      data: {
        data: { items: [{ id: 'candidate', phoneE164: '+234800000022' }] },
      },
    } as never);
    jest.mocked(customersControllerGetCustomerV1).mockResolvedValue({
      status: 503,
      data: {},
    } as never);
    render(<SupervisorCustomerWorkflows />);
    await openRegistrationDialog();
    fireEvent.change(screen.getByLabelText('Full name'), {
      target: { value: 'Submitted Name' },
    });
    fireEvent.change(screen.getByLabelText('Phone number'), {
      target: { value: '+234800000022' },
    });
    fireEvent.change(screen.getByLabelText('First card serial'), {
      target: { value: 'DUP-022' },
    });
    fireEvent.click(
      screen.getByLabelText('Loyalty service consent (required)'),
    );
    await confirmRegistrationInReview();
    expect(
      await screen.findByRole('button', {
        name: 'Search this phone in Manage customers',
      }),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Search this phone in Manage customers',
      }),
    );
    expect(replace).toHaveBeenCalledWith(
      '/supervisor/customers?q=%2B234800000022',
      { scroll: false },
    );
    expect(screen.getByLabelText('First card serial')).toHaveValue('DUP-022');
  });

  it('requires explicit discard confirmation before closing a dirty profile edit', async () => {
    jest.mocked(customersControllerGetCustomerV1).mockResolvedValue({
      status: 200,
      data: {
        data: {
          id: 'dirty-customer',
          fullName: 'Safe Customer',
          phoneE164: '+234800000044',
          status: 'ACTIVE',
        },
      },
    } as never);
    render(<SupervisorCustomerProfile customerId="dirty-customer" />);
    fireEvent.click(
      await screen.findByRole('button', { name: 'Edit customer details' }),
    );
    fireEvent.change(await screen.findByLabelText('Full name'), {
      target: { value: 'Edited Customer' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(
      await screen.findByRole('heading', { name: 'Discard unsaved changes?' }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Keep editing' }));
    expect(screen.getByLabelText('Full name')).toHaveValue('Edited Customer');
    expect(push).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Discard' }));
    expect(screen.queryByLabelText('Full name')).not.toBeInTheDocument();
    expect(
      document.querySelector('.supervisor-profile-details-card'),
    ).toHaveTextContent('Safe Customer');
    expect(push).not.toHaveBeenCalled();
    expect(customersControllerUpdateCustomerV1).not.toHaveBeenCalled();
  });

  it('keeps profile edits when save succeeds but stable-ID refresh verification fails', async () => {
    jest
      .mocked(customersControllerGetCustomerV1)
      .mockResolvedValueOnce({
        status: 200,
        data: {
          data: {
            id: 'refresh-error-customer',
            fullName: 'Refresh Customer',
            phoneE164: '+234800000045',
            status: 'ACTIVE',
          },
        },
      } as never)
      .mockResolvedValueOnce({ status: 503, data: {} } as never);
    jest
      .mocked(customersControllerUpdateCustomerV1)
      .mockResolvedValue({ status: 200, data: { data: {} } } as never);
    render(<SupervisorCustomerProfile customerId="refresh-error-customer" />);
    fireEvent.click(
      await screen.findByRole('button', { name: 'Edit customer details' }),
    );
    fireEvent.change(await screen.findByLabelText('Full name'), {
      target: { value: 'Refresh Edited' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(
      await screen.findByText('Customer details could not be verified (503).'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Full name')).toHaveValue('Refresh Edited');
    expect(
      screen.queryByText('Customer changes saved'),
    ).not.toBeInTheDocument();
    expect(customersControllerGetCustomerV1).toHaveBeenCalledTimes(2);
    expect(customersControllerUpdateCustomerV1).toHaveBeenCalledWith(
      'refresh-error-customer',
      expect.objectContaining({ fullName: 'Refresh Edited' }),
      expect.objectContaining({
        credentials: 'include',
        headers: expect.objectContaining({
          'idempotency-key': expect.any(String),
        }),
      }),
    );
  });

  it('saves verified profile changes and requires explicit status confirmation', async () => {
    const initial = {
      id: 'cust-1',
      fullName: 'Ada Customer',
      phoneE164: '+234800000003',
      email: 'ada@example.com',
      status: 'ACTIVE',
      activeCardStatus: 'BLOCKED',
      cardNumber: 'CARD-0003',
    };
    const edited = { ...initial, fullName: 'Updated Customer' };
    const blocked = { ...edited, status: 'BLOCKED' };
    jest
      .mocked(customersControllerGetCustomerV1)
      .mockResolvedValueOnce({ status: 200, data: { data: initial } } as never)
      .mockResolvedValueOnce({ status: 200, data: { data: edited } } as never)
      .mockResolvedValueOnce({ status: 200, data: { data: blocked } } as never);
    jest
      .mocked(customersControllerUpdateCustomerV1)
      .mockResolvedValue({ status: 200, data: { data: {} } } as never);
    jest
      .mocked(customersControllerUpdateStatusV1)
      .mockResolvedValue({ status: 200, data: { data: {} } } as never);
    render(<SupervisorCustomerProfile customerId="cust-1" />);
    fireEvent.click(
      await screen.findByRole('button', { name: 'Edit customer details' }),
    );
    fireEvent.change(await screen.findByLabelText('Full name'), {
      target: { value: 'Updated Customer' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(
      await screen.findByText('Customer changes saved'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Card ending 0003')).not.toBeInTheDocument();
    expect(customersControllerUpdateCustomerV1).toHaveBeenCalledWith(
      'cust-1',
      {
        fullName: 'Updated Customer',
        phone: '+234800000003',
        email: 'ada@example.com',
      },
      expect.objectContaining({
        credentials: 'include',
        headers: expect.objectContaining({
          'idempotency-key': expect.any(String),
        }),
      }),
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Edit customer details' }),
    );
    expect(await screen.findByText('Card ending 0003')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Change status' }));
    expect(screen.getByLabelText('Type BLOCK to confirm')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Block customer' }));
    expect(customersControllerUpdateStatusV1).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Type BLOCK to confirm'), {
      target: { value: 'BLOCK' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Block customer' }));
    await waitFor(() =>
      expect(customersControllerUpdateStatusV1).toHaveBeenCalledWith(
        'cust-1',
        { status: 'BLOCKED' },
        expect.objectContaining({
          credentials: 'include',
          headers: expect.objectContaining({
            'idempotency-key': expect.any(String),
          }),
        }),
      ),
    );
    expect(
      await screen.findByText('Customer status updated.'),
    ).toBeInTheDocument();
    expect(customersControllerGetCustomerV1).toHaveBeenCalledTimes(3);
  });
});
