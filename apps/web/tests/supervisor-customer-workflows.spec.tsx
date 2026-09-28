import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { SupervisorCardWorkflows } from '../components/workflows/supervisor-card-workflows';
import { SupervisorCustomerWorkflows } from '../components/workflows/supervisor-customer-workflows';
import {
  cardsControllerCreateCardV1,
  customersControllerGetCustomerV1,
  customersControllerListCustomersV1,
  customersControllerCreateCustomerV1,
  customersControllerUpdateCustomerV1,
  customersControllerUpdateStatusV1,
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

jest.mock('next/navigation', () => ({
  useSearchParams: () => query,
  useRouter: () => ({ push, replace }),
}));

jest.mock('../lib/api/generated-client', () => ({
  cardsControllerCreateCardV1: jest.fn(),
  customersControllerGetCustomerV1: jest.fn(),
  customersControllerListCustomersV1: jest.fn(),
  customersControllerCreateCustomerV1: jest.fn(),
  customersControllerUpdateCustomerV1: jest.fn(),
  customersControllerUpdateStatusV1: jest.fn(),
}));

describe('SupervisorCardWorkflows', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    query = new URLSearchParams();
  });

  it('provides directly addressable card tabs without customer workflows', () => {
    query = new URLSearchParams('tab=manage');
    render(<SupervisorCardWorkflows />);
    expect(screen.getByRole('tab', { name: 'Manage cards' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('tab', { name: 'Assign card' })).toHaveAttribute(
      'aria-selected',
      'false',
    );
    expect(
      screen.getByRole('region', { name: 'Manage cards' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Customers' }),
    ).not.toBeInTheDocument();
  });

  it('records card-task tab selections in browser history', () => {
    query = new URLSearchParams('tab=assign');
    const view = render(<SupervisorCardWorkflows />);
    fireEvent.click(screen.getByRole('tab', { name: 'Manage cards' }));
    expect(push).toHaveBeenCalledWith('/supervisor/cards?tab=manage', {
      scroll: false,
    });
    query = new URLSearchParams('tab=manage');
    view.rerender(<SupervisorCardWorkflows />);
    expect(screen.getByRole('tab', { name: 'Manage cards' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it('does not select the first search result and requires deliberate selection', async () => {
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
      screen.getByText('Select a customer before assigning a card.'),
    ).toBeInTheDocument();
    expect(customersControllerGetCustomerV1).not.toHaveBeenCalled();
    fireEvent.change(
      screen.getByLabelText('Name, phone number, or customer ID'),
      { target: { value: 'Ada' } },
    );
    fireEvent.click(screen.getByRole('button', { name: 'Search customers' }));
    expect(
      await screen.findByRole('button', { name: /Ada Customer/ }),
    ).toBeInTheDocument();
    expect(customersControllerGetCustomerV1).not.toHaveBeenCalled();
    expect(screen.queryByLabelText('New card serial')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Ada Customer/ }));
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
    const preview = await screen.findByRole('dialog', {
      name: 'Customer preview',
    });
    expect(preview).toHaveTextContent('Ada Customer');
    expect(preview).toHaveTextContent('BLOCKED');
    expect(
      within(preview).getByRole('link', { name: 'Call Ada Customer' }),
    ).toHaveAttribute('href', 'tel:+2348');
    fireEvent.click(
      within(preview).getByRole('button', {
        name: 'Continue to assignment',
      }),
    );
    expect(await screen.findByLabelText('New card serial')).toHaveValue('');
    expect(document.body.textContent).not.toContain(privateDebugField);
    expect(document.body.textContent).not.toContain(JSON.stringify(response));
  });

  it('does not open the card-assignment preview for a mismatched detail response', async () => {
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
    expect(
      await screen.findByText(/Customer details could not be verified \(200\)/),
    ).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('New card serial')).not.toBeInTheDocument();
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
    expect(
      await screen.findByText('This customer already has an active card.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(
      screen
        .getAllByRole('link', { name: 'Manage cards' })
        .some(
          (link) =>
            link.getAttribute('href') ===
            '/supervisor/cards?tab=manage&id=customer-1',
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

  it('blocks inactive customers and routes active-card cases to Manage cards', async () => {
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
    fireEvent.click(screen.getByRole('button', { name: 'Assign card' }));
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
      const submit = screen.getByRole('button', { name: 'Assign card' });
      fireEvent.click(submit);
      fireEvent.click(submit);
      expect(cardsControllerCreateCardV1).toHaveBeenCalledTimes(1);
      expect(submit).toBeDisabled();
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
    fireEvent.click(screen.getByRole('button', { name: 'Assign card' }));

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
    fireEvent.click(screen.getByRole('button', { name: 'Assign card' }));
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
    fireEvent.click(screen.getByRole('button', { name: 'Assign card' }));
    expect(
      await screen.findByText(/not completed \(503\)/i),
    ).toBeInTheDocument();
    expect(
      await screen.findByText('Customer details loaded.'),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('New card serial'), {
      target: { value: 'RETRY-102' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Review assignment' }));
    fireEvent.click(screen.getByRole('button', { name: 'Assign card' }));
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
    fireEvent.click(screen.getByRole('button', { name: 'Assign card' }));
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
    fireEvent.click(screen.getByRole('button', { name: 'Assign card' }));
    expect(
      await screen.findByText(
        'Assignment was rejected because customer eligibility changed. Customer details were refreshed.',
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

  it('keeps registration blank when URL context contains a previously selected customer', () => {
    query = new URLSearchParams('tab=register&id=previous-customer');
    render(<SupervisorCustomerWorkflows />);
    expect(screen.getByLabelText('Full name')).toHaveValue('');
    expect(screen.getByLabelText('Phone number')).toHaveValue('');
    expect(screen.getByLabelText('First card serial')).toHaveValue('');
    expect(customersControllerGetCustomerV1).not.toHaveBeenCalled();
    expect(customersControllerUpdateCustomerV1).not.toHaveBeenCalled();
  });

  it('keeps registration blank after selecting a customer in Manage customers', async () => {
    query = new URLSearchParams('tab=manage');
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
    jest.mocked(customersControllerGetCustomerV1).mockResolvedValue({
      status: 200,
      data: {
        data: {
          id: 'selected-customer',
          fullName: 'Selected Customer',
          phoneE164: '+234800000091',
          email: 'selected@example.com',
          status: 'ACTIVE',
          activeCardStatus: 'BLOCKED',
          activeCardSerialNumber: 'CARD-SELECTED-91',
        },
      },
    } as never);

    const view = render(<SupervisorCustomerWorkflows />);
    fireEvent.change(
      screen.getByLabelText('Name, phone number, or customer ID'),
      { target: { value: 'Selected Customer' } },
    );
    fireEvent.click(screen.getByRole('button', { name: 'Search customers' }));
    const resultButton = await screen.findByRole('button', {
      name: /Selected Customer/,
    });
    resultButton.focus();
    fireEvent.click(resultButton);
    expect(replace).toHaveBeenCalledWith(
      '/supervisor/customers?tab=manage&id=selected-customer',
      { scroll: false },
    );

    query = new URLSearchParams('tab=manage&id=selected-customer');
    view.rerender(<SupervisorCustomerWorkflows />);
    const preview = await screen.findByRole('dialog', {
      name: 'Customer preview',
    });
    expect(preview).toHaveTextContent('Selected Customer');
    expect(preview).toHaveTextContent('CARD-SELECTED-91');
    expect(
      within(preview).getByRole('link', { name: 'Call Selected Customer' }),
    ).toHaveAttribute('href', 'tel:+234800000091');
    expect(
      within(preview).getByRole('link', { name: 'Email Selected Customer' }),
    ).toHaveAttribute('href', 'mailto:selected@example.com');
    expect(
      within(preview).getByRole('link', { name: 'Open card tasks' }),
    ).toHaveAttribute(
      'href',
      '/supervisor/cards?tab=assign&id=selected-customer',
    );
    fireEvent.click(
      within(preview).getByRole('button', {
        name: 'Close customer preview',
      }),
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    fireEvent.click(resultButton);
    await screen.findByRole('dialog', { name: 'Customer preview' });
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await waitFor(() => expect(resultButton).toHaveFocus());
    expect(screen.getByLabelText('Full name')).toHaveValue('Selected Customer');

    const registerTab = screen.getByRole('tab', { name: 'Register customer' });
    expect(registerTab).toHaveAttribute(
      'href',
      '/supervisor/customers?tab=register&id=selected-customer',
    );
    registerTab.addEventListener('click', (event) => event.preventDefault());
    fireEvent.click(registerTab);
    query = new URLSearchParams('tab=register&id=selected-customer');
    view.rerender(<SupervisorCustomerWorkflows />);

    expect(
      screen.getByRole('tab', { name: 'Register customer' }),
    ).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByLabelText('Full name')).toHaveValue('');
    expect(screen.getByLabelText('Phone number')).toHaveValue('');
    expect(screen.getByLabelText('First card serial')).toHaveValue('');
    expect(customersControllerGetCustomerV1).toHaveBeenCalledTimes(1);
  });

  it('does not open a Manage customers preview for a mismatched detail response', async () => {
    query = new URLSearchParams('tab=manage');
    jest.mocked(customersControllerListCustomersV1).mockResolvedValue({
      status: 200,
      data: { data: { items: [{ id: 'selected', fullName: 'Ada Customer' }] } },
    } as never);
    jest.mocked(customersControllerGetCustomerV1).mockResolvedValue({
      status: 200,
      data: { data: { id: 'different', fullName: 'Other Customer' } },
    } as never);
    const view = render(<SupervisorCustomerWorkflows />);
    fireEvent.change(
      screen.getByLabelText('Name, phone number, or customer ID'),
      { target: { value: 'Ada' } },
    );
    fireEvent.click(screen.getByRole('button', { name: 'Search customers' }));
    fireEvent.click(
      await screen.findByRole('button', { name: /Ada Customer/ }),
    );
    query = new URLSearchParams('tab=manage&id=selected');
    view.rerender(<SupervisorCustomerWorkflows />);
    expect(
      await screen.findByText('Customer details could not be verified (200).'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Save profile' }),
    ).not.toBeInTheDocument();
  });

  it('fails closed for an inaccessible Manage customers ID', async () => {
    query = new URLSearchParams('tab=manage&id=stale-customer');
    jest.mocked(customersControllerGetCustomerV1).mockResolvedValue({
      status: 404,
      data: {},
    } as never);
    render(<SupervisorCustomerWorkflows />);
    expect(
      await screen.findByText('Customer details could not be verified (404).'),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Save profile' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Update customer status' }),
    ).not.toBeInTheDocument();
    expect(customersControllerUpdateCustomerV1).not.toHaveBeenCalled();
    expect(customersControllerUpdateStatusV1).not.toHaveBeenCalled();
  });

  it('renders directly linkable customer tabs and only the selected task', () => {
    query = new URLSearchParams('tab=register');
    const view = render(<SupervisorCustomerWorkflows />);
    expect(
      screen.getByRole('tab', { name: 'Manage customers' }),
    ).toHaveAttribute('href', '/supervisor/customers?tab=manage');
    const registerTab = screen.getByRole('tab', { name: 'Register customer' });
    const manageTab = screen.getByRole('tab', { name: 'Manage customers' });
    expect(
      screen.getByRole('tablist', { name: 'Customer tasks' }),
    ).toBeInTheDocument();
    expect(registerTab).toHaveAttribute('aria-selected', 'true');
    expect(registerTab).toHaveAttribute('tabindex', '0');
    expect(manageTab).toHaveAttribute('aria-selected', 'false');
    expect(manageTab).toHaveAttribute('tabindex', '-1');
    expect(registerTab).toHaveAttribute(
      'aria-controls',
      'customer-panel-register',
    );
    expect(screen.getByRole('tabpanel')).toHaveAttribute(
      'id',
      'customer-panel-register',
    );
    expect(screen.getByRole('tabpanel')).toHaveAttribute(
      'aria-labelledby',
      'customer-tab-register',
    );
    expect(
      screen.queryByRole('region', { name: 'Find a customer' }),
    ).not.toBeInTheDocument();
    query = new URLSearchParams('tab=manage');
    view.rerender(<SupervisorCustomerWorkflows />);
    expect(screen.getByRole('tabpanel')).toHaveAttribute(
      'id',
      'customer-panel-manage',
    );
    expect(
      screen.getByRole('tab', { name: 'Manage customers' }),
    ).toHaveAttribute('aria-selected', 'true');
    expect(
      screen.getByRole('region', { name: 'Find a customer' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByLabelText('First card serial'),
    ).not.toBeInTheDocument();
  });

  it('supports arrow, Home, and End keyboard tab navigation with URL updates', () => {
    render(<SupervisorCustomerWorkflows />);
    const register = screen.getByRole('tab', { name: 'Register customer' });
    const manage = screen.getByRole('tab', { name: 'Manage customers' });
    fireEvent.keyDown(register, { key: 'ArrowRight' });
    expect(manage).toHaveFocus();
    expect(manage).toHaveAttribute('aria-selected', 'true');
    expect(replace).toHaveBeenLastCalledWith(
      '/supervisor/customers?tab=manage',
      { scroll: false },
    );
    fireEvent.keyDown(manage, { key: 'Home' });
    expect(register).toHaveFocus();
    expect(register).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(register, { key: 'End' });
    expect(manage).toHaveFocus();
    expect(manage).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(manage, { key: 'ArrowRight' });
    expect(register).toHaveFocus();
    expect(register).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel')).toHaveAttribute(
      'id',
      'customer-panel-register',
    );
  });

  it('rejects blank required fields before creating a customer or first card', () => {
    render(<SupervisorCustomerWorkflows />);
    const form = document.querySelector('form');
    expect(form).not.toBeNull();
    fireEvent.submit(form!);
    expect(screen.getByRole('status')).toHaveTextContent(
      'Full name, phone number, and first card serial are required.',
    );
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
    fireEvent.change(screen.getByLabelText('Full name'), {
      target: { value: 'Ada Customer' },
    });
    fireEvent.change(screen.getByLabelText('Phone number'), {
      target: { value: '+234800000030' },
    });
    fireEvent.change(screen.getByLabelText('First card serial'), {
      target: { value: 'CARD-030' },
    });
    const submit = screen.getByRole('button', {
      name: 'Register customer and first card',
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
        'Customer and first card were registered successfully.',
      ),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText('Full name')).toHaveValue('Ada Customer');
    expect(screen.getByLabelText('Phone number')).toHaveValue('+234800000030');
    expect(screen.getByLabelText('First card serial')).toHaveValue('CARD-030');
    const firstHeaders = jest.mocked(customersControllerCreateCustomerV1).mock
      .calls[0][1].headers as Record<string, string>;
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Register customer and first card',
      }),
    );
    expect(
      await screen.findByText(
        'Customer and first card were registered successfully.',
      ),
    ).toBeInTheDocument();
    expect(customersControllerCreateCustomerV1).toHaveBeenCalledTimes(2);
    const retryHeaders = jest.mocked(customersControllerCreateCustomerV1).mock
      .calls[1][1].headers as Record<string, string>;
    expect(retryHeaders['idempotency-key']).toBe(
      firstHeaders['idempotency-key'],
    );
    expect(
      screen.getByRole('link', { name: 'Manage customer retry-customer' }),
    ).toHaveAttribute(
      'href',
      '/supervisor/customers?tab=manage&id=retry-customer',
    );
  });

  it('creates a customer and first card once with CSRF and idempotency, then links by ID', async () => {
    jest.mocked(customersControllerCreateCustomerV1).mockResolvedValue({
      status: 201,
      data: { data: { id: 'new-1' } },
    } as never);
    render(<SupervisorCustomerWorkflows />);
    expectNoImplementationFacingWorkflowUi();
    expect(screen.getByRole('status')).toHaveTextContent(
      'Enter customer details and the serial number for their first card.',
    );
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
      screen.getByRole('button', { name: 'Register customer and first card' }),
    );
    await waitFor(() =>
      expect(customersControllerCreateCustomerV1).toHaveBeenCalledTimes(1),
    );
    expect(customersControllerCreateCustomerV1).toHaveBeenCalledWith(
      {
        fullName: 'Ada Customer',
        phone: '+234800000001',
        cardSerialNumber: 'CARD-001',
      },
      expect.objectContaining({
        credentials: 'include',
        headers: expect.objectContaining({
          'idempotency-key': expect.any(String),
        }),
      }),
    );
    expect(
      await screen.findByText(
        'Customer and first card were registered successfully.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Manage customer new-1' }),
    ).toHaveAttribute('href', '/supervisor/customers?tab=manage&id=new-1');
  });

  it('retains entered values after duplicate and offers phone search without trusting response identity', async () => {
    jest.mocked(customersControllerCreateCustomerV1).mockResolvedValue({
      status: 409,
      data: { data: { id: 'untrusted' } },
    } as never);
    render(<SupervisorCustomerWorkflows />);
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
      screen.getByRole('button', { name: 'Register customer and first card' }),
    );
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

  it('verifies an exact phone candidate by detail reload before handing off its ID', async () => {
    jest.mocked(customersControllerCreateCustomerV1).mockResolvedValue({
      status: 409,
      data: { data: { id: 'untrusted-conflict-id' } },
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
      screen.getByRole('button', { name: 'Register customer and first card' }),
    );
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
      '/supervisor/customers?tab=manage&id=verified-customer',
    );
    expect(screen.getByLabelText('Full name')).toHaveValue('Submitted Name');
    expect(screen.getByLabelText('First card serial')).toHaveValue('DUP-010');
    expect(
      screen.queryByRole('link', { name: /untrusted-conflict-id/ }),
    ).not.toBeInTheDocument();

    verifiedLink.addEventListener('click', (event) => event.preventDefault());
    fireEvent.click(verifiedLink);
    query = new URLSearchParams('tab=manage&id=verified-customer');
    view.rerender(<SupervisorCustomerWorkflows />);
    await waitFor(() =>
      expect(customersControllerGetCustomerV1).toHaveBeenCalledTimes(2),
    );
    expect(await screen.findByLabelText('Full name')).toHaveValue(
      'Verified Customer',
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
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
      screen.getByRole('button', { name: 'Register customer and first card' }),
    );
    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Search this phone in Manage customers',
      }),
    );
    expect(replace).toHaveBeenCalledWith(
      '/supervisor/customers?tab=manage&q=%2B234800000020',
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
      screen.getByRole('button', { name: 'Register customer and first card' }),
    );
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
      '/supervisor/customers?tab=manage&q=%2B234800000022',
      { scroll: false },
    );
    expect(screen.getByLabelText('First card serial')).toHaveValue('DUP-022');
  });

  it('does not auto-select search results and reloads details before profile and status changes', async () => {
    query = new URLSearchParams('tab=manage');
    jest.mocked(customersControllerListCustomersV1).mockResolvedValue({
      status: 200,
      data: { data: { items: [{ id: 'cust-1', fullName: 'Ada Customer' }] } },
    } as never);
    jest.mocked(customersControllerGetCustomerV1).mockResolvedValue({
      status: 200,
      data: {
        data: {
          id: 'cust-1',
          fullName: 'Ada Customer',
          phoneE164: '+234800000003',
          status: 'ACTIVE',
          activeCardStatus: 'BLOCKED',
          activeCardSerialNumber: 'CARD-003',
        },
      },
    } as never);
    jest
      .mocked(customersControllerUpdateCustomerV1)
      .mockResolvedValue({ status: 200, data: { data: {} } } as never);
    jest
      .mocked(customersControllerUpdateStatusV1)
      .mockResolvedValue({ status: 200, data: { data: {} } } as never);
    const view = render(<SupervisorCustomerWorkflows />);
    fireEvent.change(
      screen.getByLabelText('Name, phone number, or customer ID'),
      { target: { value: 'Ada' } },
    );
    fireEvent.click(screen.getByRole('button', { name: 'Search customers' }));
    expect(
      await screen.findByRole('button', { name: /Ada Customer/ }),
    ).toBeInTheDocument();
    expect(customersControllerGetCustomerV1).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /Ada Customer/ }));
    expect(replace).toHaveBeenCalledWith(
      '/supervisor/customers?tab=manage&id=cust-1',
      { scroll: false },
    );
    query = new URLSearchParams('tab=manage&id=cust-1');
    view.rerender(<SupervisorCustomerWorkflows />);
    const preview = await screen.findByRole('dialog', {
      name: 'Customer preview',
    });
    expect(preview).toHaveTextContent('CARD-003');
    fireEvent.click(
      within(preview).getByRole('button', {
        name: 'Continue to customer profile',
      }),
    );
    expect(await screen.findByText('BLOCKED · CARD-003')).toBeInTheDocument();
    expect(screen.getByLabelText('Customer status')).toBeInTheDocument();
    expect(screen.getByText('Active card')).toBeInTheDocument();
    expectNoImplementationFacingWorkflowUi();
    fireEvent.click(screen.getByRole('button', { name: 'Save profile' }));
    await waitFor(() =>
      expect(customersControllerUpdateCustomerV1).toHaveBeenCalledWith(
        'cust-1',
        expect.objectContaining({
          fullName: 'Ada Customer',
          phone: '+234800000003',
        }),
        expect.objectContaining({
          credentials: 'include',
          headers: expect.objectContaining({
            'idempotency-key': expect.any(String),
          }),
        }),
      ),
    );
    fireEvent.change(screen.getByLabelText('Customer status'), {
      target: { value: 'BLOCKED' },
    });
    fireEvent.change(screen.getByLabelText('Type UPDATE to confirm'), {
      target: { value: 'UPDATE' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Update customer status' }),
    );
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
  });
});
