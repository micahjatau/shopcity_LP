import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { SupervisorCardManagement } from '../components/workflows/supervisor-card-management';
import { SupervisorCardWorkflows } from '../components/workflows/supervisor-card-workflows';
import {
  cardsControllerListIssuedManagementCardsV1,
  cardsControllerLookupManagementCardV1,
  cardsControllerReplaceCardV1,
  cardsControllerUpdateStatusV1,
} from '../lib/api/generated-client';

let query = new URLSearchParams();
const replaceUrl = jest.fn();
const pushUrl = jest.fn();
jest.mock('next/navigation', () => ({
  useSearchParams: () => query,
  useRouter: () => ({ replace: replaceUrl, push: pushUrl }),
}));
jest.mock('../components/workflows/supervisor-card-assignment', () => ({
  SupervisorCardAssignment: () => <div>Assignment workspace</div>,
}));
jest.mock('../components/workflows/supervisor-issue-date-range-picker', () => {
  const React = jest.requireActual('react');
  return {
    SupervisorIssueDateRangePicker: ({
      className,
      onChange,
    }: {
      className: string;
      onChange: (value: { startDate: string; endDate: string }) => void;
    }) =>
      React.createElement(
        React.Fragment,
        null,
        React.createElement(
          'button',
          {
            type: 'button',
            className: `${className} supervisor-customer-directory__filter`,
            'aria-label': 'Date issued',
            'data-testid': 'issue-date-range-picker',
            onClick: () =>
              onChange({ startDate: '10/10/2025', endDate: '10/31/2025' }),
          },
          'Date issued',
        ),
        React.createElement(
          'button',
          {
            type: 'button',
            hidden: true,
            'data-testid': 'clear-issued-date-range',
            onClick: () => onChange({ startDate: '', endDate: '' }),
          },
          'Clear',
        ),
      ),
  };
});
jest.mock('../lib/api/generated-client', () => ({
  cardsControllerListIssuedManagementCardsV1: jest.fn(),
  cardsControllerLookupManagementCardV1: jest.fn(),
  cardsControllerReplaceCardV1: jest.fn(),
  cardsControllerUpdateStatusV1: jest.fn(),
}));

const active = {
  id: 'card-1',
  serialNumber: 'SER-1',
  status: 'ACTIVE',
  issuedAt: '2026-01-01',
  blockedAt: null,
  replacedAt: null,
  customer: { id: 'customer-1', fullName: 'Ada Example', status: 'ACTIVE' },
};
const ok = (card: typeof active) => ({ status: 200, data: { data: card } });

beforeEach(() => {
  jest.clearAllMocks();
  document.cookie = 'shopcity_csrf=test-csrf';
  query = new URLSearchParams();
  jest
    .mocked(cardsControllerLookupManagementCardV1)
    .mockResolvedValue(ok(active) as never);
  jest
    .mocked(cardsControllerListIssuedManagementCardsV1)
    .mockImplementation(() => new Promise(() => {}) as never);
});

describe('Supervisor card management tabs', () => {
  it('defaults to the issued-card table and renders owner details with a Virtual Card profile link', async () => {
    jest
      .mocked(cardsControllerListIssuedManagementCardsV1)
      .mockResolvedValueOnce({
        status: 200,
        data: {
          data: {
            items: [
              {
                cardNumber: 'SER-1',
                status: 'ACTIVE',
                issuedAt: '2026-01-01T00:00:00.000Z',
                customer: { id: 'customer-1', fullName: 'Ada Example' },
              },
              {
                cardNumber: 'SER-2',
                status: 'BLOCKED',
                issuedAt: '2025-12-01T00:00:00.000Z',
                customer: { id: 'customer-2', fullName: 'Grace Example' },
              },
              {
                cardNumber: 'SER-3',
                status: 'REPLACED',
                issuedAt: '2025-11-01T00:00:00.000Z',
                customer: { id: 'customer-3', fullName: 'Morgan Example' },
              },
            ],
            nextCursor: null,
            hasMore: false,
          },
        },
      } as never);
    render(<SupervisorCardWorkflows />);

    expect(screen.queryByRole('button', { name: 'Issued cards' })).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Issued cards' })).toBeNull();
    expect(
      screen.getByLabelText('Search by card number or owner name'),
    ).toBeVisible();
    const statusFilter = screen.getByRole('button', {
      name: /Filter by status/,
    });
    expect(statusFilter).toHaveClass(
      'sc-button--secondary',
      'supervisor-customer-directory__filter',
      'supervisor-customer-directory__status-trigger',
    );
    fireEvent.click(statusFilter);
    const statusOptions = screen.getByRole('listbox', {
      name: 'Filter by status',
    });
    expect(statusOptions).toHaveClass(
      'supervisor-customer-directory__status-menu',
    );
    expect(within(statusOptions).getAllByRole('option')).toHaveLength(4);
    const allStatuses = within(statusOptions).getByRole('option', {
      name: 'All statuses',
    });
    expect(allStatuses).toHaveAttribute('aria-selected', 'true');
    expect(allStatuses).toHaveFocus();
    fireEvent.keyDown(allStatuses, { key: 'ArrowDown' });
    const activeStatus = within(statusOptions).getByRole('option', {
      name: 'Active',
    });
    expect(activeStatus).toHaveFocus();
    fireEvent.keyDown(activeStatus, { key: 'Escape' });
    expect(statusFilter).toHaveFocus();
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(screen.getByRole('button', { name: 'Date issued' })).toHaveClass(
      'supervisor-customer-directory__filter',
    );
    expect(screen.getByRole('button', { name: 'Assign card' })).toHaveClass(
      'sc-button--primary',
      'supervisor-customer-directory__register',
      'supervisor-issued-card-directory__assign-button',
    );
    const table = await screen.findByRole('table', { name: 'Issued cards' });
    const headers = within(table)
      .getAllByRole('columnheader')
      .map((header) => header.textContent?.trim());
    expect(headers).toEqual([
      'Card number',
      'Owner',
      'Status',
      'Date issued',
      'View card',
    ]);
    expect(table).toHaveClass(
      'supervisor-customer-table',
      'supervisor-issued-card-directory__table',
    );
    expect(table.parentElement).toHaveClass('supervisor-customer-table-wrap');
    expect(await within(table).findByText('SER-1')).toBeVisible();
    expect(within(table).getByText('Ada Example')).toBeVisible();
    expect(within(table).getByText('Active')).toBeVisible();
    expect(within(table).getByText('Active').parentElement).toHaveClass(
      'sc-badge--success',
    );
    expect(within(table).getByText('Grace Example')).toBeVisible();
    expect(within(table).getByText('Blocked')).toBeVisible();
    expect(within(table).getByText('Blocked').parentElement).toHaveClass(
      'sc-badge--danger',
    );
    expect(within(table).getByText('Morgan Example')).toBeVisible();
    expect(within(table).getByText('Replaced')).toBeVisible();
    expect(within(table).getByText('Replaced').parentElement).toHaveClass(
      'sc-badge--warning',
    );
    expect(
      within(within(table).getByRole('row', { name: /SER-1/ })).getByRole(
        'link',
        { name: 'View card' },
      ),
    ).toHaveAttribute(
      'href',
      '/supervisor/customers/customer-1?tab=virtual-card',
    );
    expect(
      within(within(table).getByRole('row', { name: /SER-1/ })).getByRole(
        'link',
        { name: 'View card' },
      ),
    ).toHaveClass('supervisor-customer-table__profile-link');
    expect(cardsControllerListIssuedManagementCardsV1).toHaveBeenCalledWith(
      { limit: '25', cursor: '' },
      expect.any(Object),
    );
  });

  it('reveals the search input from the search-icon control on compact layouts', async () => {
    render(<SupervisorCardWorkflows />);
    await screen.findByRole('table', { name: 'Issued cards' });
    const toggle = screen.getByRole('button', { name: 'Search cards' });
    expect(toggle).toHaveClass('supervisor-customer-directory__search-submit');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(
      screen.getByRole('searchbox', {
        name: 'Search by card number or owner name',
      }).parentElement,
    ).toHaveClass('is-open');
  });

  it('applies card/owner search, lifecycle status, and issue-date filters to API requests', async () => {
    jest.mocked(cardsControllerListIssuedManagementCardsV1).mockResolvedValue({
      status: 200,
      data: {
        data: { items: [], nextCursor: null, hasMore: false },
      },
    } as never);
    render(<SupervisorCardWorkflows />);
    await screen.findByRole('table', { name: 'Issued cards' });

    fireEvent.change(
      screen.getByLabelText('Search by card number or owner name'),
      {
        target: { value: 'CARD-42' },
      },
    );
    fireEvent.click(screen.getByRole('button', { name: /Filter by status/ }));
    fireEvent.click(screen.getByRole('option', { name: 'Replaced' }));
    fireEvent.click(screen.getByTestId('issue-date-range-picker'));

    await waitFor(() =>
      expect(
        cardsControllerListIssuedManagementCardsV1,
      ).toHaveBeenLastCalledWith(
        {
          limit: '25',
          cursor: '',
          q: 'CARD-42',
          status: 'REPLACED',
          issuedFrom: '2025-10-10',
          issuedTo: '2025-10-31',
        },
        expect.any(Object),
      ),
    );
  });

  it('preserves active filters when loading a cursor continuation', async () => {
    jest.mocked(cardsControllerListIssuedManagementCardsV1).mockResolvedValue({
      status: 200,
      data: {
        data: {
          items: [
            {
              cardNumber: 'REPLACED-1',
              status: 'REPLACED',
              issuedAt: '2025-01-01T00:00:00.000Z',
              customer: { id: 'owner-1', fullName: 'Owner One' },
            },
          ],
          nextCursor: 'next-page',
          hasMore: true,
        },
      },
    } as never);
    render(<SupervisorCardWorkflows />);
    await screen.findByRole('table', { name: 'Issued cards' });
    fireEvent.click(screen.getByRole('button', { name: /Filter by status/ }));
    fireEvent.click(screen.getByRole('option', { name: 'Replaced' }));
    await waitFor(() =>
      expect(
        cardsControllerListIssuedManagementCardsV1,
      ).toHaveBeenLastCalledWith(
        { limit: '25', cursor: '', status: 'REPLACED' },
        expect.any(Object),
      ),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Load more cards' }));
    await waitFor(() =>
      expect(
        cardsControllerListIssuedManagementCardsV1,
      ).toHaveBeenLastCalledWith(
        { limit: '25', cursor: 'next-page', status: 'REPLACED' },
        expect.any(Object),
      ),
    );
  });

  it('applies and clears the selected issue-date range in API requests', async () => {
    jest.mocked(cardsControllerListIssuedManagementCardsV1).mockResolvedValue({
      status: 200,
      data: { data: { items: [], nextCursor: null, hasMore: false } },
    } as never);
    render(<SupervisorCardWorkflows />);
    await screen.findByRole('table', { name: 'Issued cards' });

    fireEvent.click(screen.getByTestId('issue-date-range-picker'));
    await waitFor(() =>
      expect(
        cardsControllerListIssuedManagementCardsV1,
      ).toHaveBeenLastCalledWith(
        {
          limit: '25',
          cursor: '',
          issuedFrom: '2025-10-10',
          issuedTo: '2025-10-31',
        },
        expect.any(Object),
      ),
    );

    fireEvent.click(screen.getByTestId('clear-issued-date-range'));
    await waitFor(() =>
      expect(
        cardsControllerListIssuedManagementCardsV1,
      ).toHaveBeenLastCalledWith(
        { limit: '25', cursor: '' },
        expect.any(Object),
      ),
    );
  });

  it('renders an explicit empty state when the issued-card collection is empty', async () => {
    jest
      .mocked(cardsControllerListIssuedManagementCardsV1)
      .mockResolvedValueOnce({
        status: 200,
        data: { data: { items: [], nextCursor: null, hasMore: false } },
      } as never);
    render(<SupervisorCardWorkflows />);

    expect(
      await screen.findByText(
        'No previously issued cards match these filters.',
      ),
    ).toBeVisible();
    expect(screen.queryByRole('link', { name: 'View card' })).toBeNull();
  });

  it('shows loading, lets the user retry a failed first page, and recovers', async () => {
    jest
      .mocked(cardsControllerListIssuedManagementCardsV1)
      .mockRejectedValueOnce(new Error('temporary failure'))
      .mockResolvedValueOnce({
        status: 200,
        data: {
          data: {
            items: [
              {
                cardNumber: 'RETRY-SERIAL',
                status: 'ACTIVE',
                issuedAt: '2026-01-01T00:00:00.000Z',
                customer: { id: 'retry-owner', fullName: 'Retry Owner' },
              },
            ],
            nextCursor: null,
            hasMore: false,
          },
        },
      } as never);
    render(<SupervisorCardWorkflows />);

    expect(screen.getByRole('status')).toHaveTextContent(
      'Loading issued cards',
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Issued cards could not be loaded.',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('RETRY-SERIAL')).toBeVisible();
    expect(cardsControllerListIssuedManagementCardsV1).toHaveBeenCalledTimes(2);
  });

  it('loads further issued-card pages using the returned cursor', async () => {
    jest
      .mocked(cardsControllerListIssuedManagementCardsV1)
      .mockResolvedValueOnce({
        status: 200,
        data: {
          data: {
            items: [
              {
                cardNumber: 'FIRST-SERIAL',
                status: 'ACTIVE',
                issuedAt: '2026-01-01T00:00:00.000Z',
                customer: { id: 'first-owner', fullName: 'First Owner' },
              },
            ],
            nextCursor: 'cursor-page-two',
            hasMore: true,
          },
        },
      } as never)
      .mockResolvedValueOnce({
        status: 200,
        data: {
          data: {
            items: [
              {
                cardNumber: 'SECOND-SERIAL',
                status: 'BLOCKED',
                issuedAt: '2025-12-01T00:00:00.000Z',
                customer: { id: 'second-owner', fullName: 'Second Owner' },
              },
            ],
            nextCursor: null,
            hasMore: false,
          },
        },
      } as never);
    render(<SupervisorCardWorkflows />);

    expect(await screen.findByText('FIRST-SERIAL')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Load more cards' }));
    expect(await screen.findByText('SECOND-SERIAL')).toBeVisible();
    expect(cardsControllerListIssuedManagementCardsV1).toHaveBeenNthCalledWith(
      2,
      { limit: '25', cursor: 'cursor-page-two' },
      expect.any(Object),
    );
    expect(
      screen.queryByRole('button', { name: 'Load more cards' }),
    ).toBeNull();
  });

  it('preserves current rows when loading more fails and retries the next page', async () => {
    jest
      .mocked(cardsControllerListIssuedManagementCardsV1)
      .mockResolvedValueOnce({
        status: 200,
        data: {
          data: {
            items: [
              {
                cardNumber: 'PRESERVED-SERIAL',
                status: 'ACTIVE',
                issuedAt: '2026-01-01T00:00:00.000Z',
                customer: {
                  id: 'preserved-owner',
                  fullName: 'Preserved Owner',
                },
              },
            ],
            nextCursor: 'cursor-after-preserved',
            hasMore: true,
          },
        },
      } as never)
      .mockRejectedValueOnce(new Error('temporary failure'))
      .mockResolvedValueOnce({
        status: 200,
        data: {
          data: {
            items: [
              {
                cardNumber: 'RECOVERED-SERIAL',
                status: 'BLOCKED',
                issuedAt: '2025-12-01T00:00:00.000Z',
                customer: {
                  id: 'recovered-owner',
                  fullName: 'Recovered Owner',
                },
              },
            ],
            nextCursor: null,
            hasMore: false,
          },
        },
      } as never);
    render(<SupervisorCardWorkflows />);

    expect(await screen.findByText('PRESERVED-SERIAL')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Load more cards' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'More issued cards could not be loaded.',
    );
    expect(screen.getByText('PRESERVED-SERIAL')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Retry loading more' }));
    expect(await screen.findByText('RECOVERED-SERIAL')).toBeVisible();
    expect(screen.getByText('PRESERVED-SERIAL')).toBeVisible();
  });

  it('maps legacy directory URLs to the issued-card table without an Issued cards button', async () => {
    query = new URLSearchParams('tab=manage');
    render(<SupervisorCardWorkflows />);
    expect(
      await screen.findByRole('table', { name: 'Issued cards' }),
    ).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Issued cards' })).toBeNull();
  });

  it('opens assignment from the red action in a popup and leaves the directory in place', async () => {
    render(<SupervisorCardWorkflows />);
    expect(
      await screen.findByRole('table', { name: 'Issued cards' }),
    ).toBeVisible();
    const assign = screen.getByRole('button', { name: 'Assign card' });
    expect(assign).toHaveClass('sc-button--primary');
    fireEvent.click(assign);
    expect(pushUrl).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: 'Assign card' })).toBeVisible();
    expect(screen.getByText('Assignment workspace')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Close assignment' }));
    expect(screen.queryByRole('dialog', { name: 'Assign card' })).toBeNull();
    expect(screen.getByRole('table', { name: 'Issued cards' })).toBeVisible();
  });

  it('does not render raw card lookup response data after selection', async () => {
    const privateDebugField = 'CARD_LOOKUP_PRIVATE_DEBUG_7f3a';
    const responseData = {
      ...active,
      debugMetadata: { privateValue: privateDebugField },
    };
    const response = { status: 200, data: { data: responseData } };
    jest
      .mocked(cardsControllerLookupManagementCardV1)
      .mockResolvedValueOnce(response as never)
      .mockResolvedValueOnce(response as never);
    render(<SupervisorCardManagement />);
    fireEvent.change(screen.getByLabelText('Card serial'), {
      target: { value: 'SER-1' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Search card' }));
    fireEvent.click(
      await screen.findByRole('button', { name: 'Select and verify card' }),
    );
    expect(
      await screen.findByRole('button', { name: 'Block card' }),
    ).toBeInTheDocument();

    expect(screen.getByText('Card status')).toBeInTheDocument();
    expect(document.body.textContent).not.toContain(privateDebugField);
    expect(document.body.textContent).not.toContain(JSON.stringify(response));
  });

  it('shows only verified lifecycle buttons in the customer-profile popup', async () => {
    jest
      .mocked(cardsControllerLookupManagementCardV1)
      .mockResolvedValue(ok(active) as never);
    render(
      <SupervisorCardManagement
        initialSerial="SER-1"
        expectedCustomerId="customer-1"
        compact
      />,
    );

    expect(
      await screen.findByRole('group', { name: 'Card management actions' }),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: 'Block card' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Replace card' })).toBeVisible();
    expect(screen.queryByLabelText('Card serial')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Search card' })).toBeNull();
    expect(screen.queryByText('Card status')).toBeNull();
    expect(screen.queryByText('Customer status')).toBeNull();
    expect(cardsControllerLookupManagementCardV1).toHaveBeenCalledTimes(2);

    fireEvent.click(screen.getByRole('button', { name: 'Replace card' }));
    expect(screen.getByLabelText('New replacement serial')).toHaveValue('');
    expect(screen.getByLabelText('Type REPLACE to confirm')).toBeVisible();
  });

  it('does not expose popup management buttons when the card belongs to another customer', async () => {
    jest.mocked(cardsControllerLookupManagementCardV1).mockResolvedValue(
      ok({
        ...active,
        customer: { ...active.customer, id: 'other-customer' },
      }) as never,
    );
    render(
      <SupervisorCardManagement
        initialSerial="SER-1"
        expectedCustomerId="customer-1"
        compact
      />,
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Card controls could not be verified for this customer.',
    );
    expect(
      screen.queryByRole('group', { name: 'Card management actions' }),
    ).toBeNull();
    expect(screen.queryByRole('button', { name: 'Block card' })).toBeNull();
    expect(cardsControllerLookupManagementCardV1).toHaveBeenCalledTimes(1);
  });

  it('requires explicit candidate selection and authoritative ID verification before actions', async () => {
    jest
      .mocked(cardsControllerLookupManagementCardV1)
      .mockResolvedValueOnce(ok(active) as never)
      .mockResolvedValueOnce(ok(active) as never);
    render(<SupervisorCardManagement />);
    fireEvent.change(screen.getByLabelText('Card serial'), {
      target: { value: 'SER-1' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Search card' }));
    await screen.findByRole('button', { name: 'Select and verify card' });
    expect(
      screen.queryByRole('button', { name: 'Block card' }),
    ).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: 'Select and verify card' }),
    );
    expect(
      await screen.findByRole('button', { name: 'Block card' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Card status')).toBeInTheDocument();
    expect(screen.getByText('Customer status')).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(
      /Detail-led|Route-backed|Contract-driven|implementation note|route context|ledger history|earn ledger/i,
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(cardsControllerLookupManagementCardV1).toHaveBeenCalledTimes(2);
  });

  it.each(['ACTIVE', 'BLOCKED', 'REPLACED'] as const)(
    'shows verified card details without rendering the profile preview for %s status',
    async (status) => {
      const record = { ...active, status };
      jest
        .mocked(cardsControllerLookupManagementCardV1)
        .mockResolvedValue(ok(record) as never);
      render(<SupervisorCardManagement />);
      expect(
        screen.queryByRole('img', { name: /ShopCity card preview/ }),
      ).not.toBeInTheDocument();

      fireEvent.change(screen.getByLabelText('Card serial'), {
        target: { value: 'SER-1' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Search card' }));
      fireEvent.click(
        await screen.findByRole('button', { name: 'Select and verify card' }),
      );

      expect(
        screen.queryByRole('img', { name: /ShopCity card preview/ }),
      ).toBeNull();
      expect(await screen.findByText('Card status')).toBeVisible();
      expect(screen.getByText('SER-1')).toBeVisible();
      expect(screen.getByText('Ada Example')).toBeVisible();
      expect(
        screen.getByText('Card status').nextElementSibling,
      ).toHaveTextContent(status);
    },
  );

  it('blocks only after explicit confirmation, sends CSRF/idempotency request and refreshes authority', async () => {
    jest
      .mocked(cardsControllerUpdateStatusV1)
      .mockResolvedValue({ status: 200 } as never);
    jest
      .mocked(cardsControllerLookupManagementCardV1)
      .mockResolvedValueOnce(ok(active) as never)
      .mockResolvedValueOnce(ok(active) as never)
      .mockResolvedValueOnce(ok({ ...active, status: 'BLOCKED' }) as never);
    render(<SupervisorCardManagement />);
    fireEvent.change(screen.getByLabelText('Card serial'), {
      target: { value: 'SER-1' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Search card' }));
    fireEvent.click(
      await screen.findByRole('button', { name: 'Select and verify card' }),
    );
    fireEvent.click(await screen.findByRole('button', { name: 'Block card' }));
    fireEvent.change(screen.getByLabelText('Type BLOCK to confirm'), {
      target: { value: 'BLOCK' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm block' }));
    await waitFor(() =>
      expect(cardsControllerUpdateStatusV1).toHaveBeenCalledTimes(1),
    );
    const [id, body, options] = jest.mocked(cardsControllerUpdateStatusV1).mock
      .calls[0];
    expect(id).toBe('card-1');
    expect(body).toEqual({ status: 'BLOCKED' });
    expect(new Headers(options?.headers).get('x-csrf-token')).toBeTruthy();
    expect(new Headers(options?.headers).get('Idempotency-Key')).toBeTruthy();
    expect(cardsControllerLookupManagementCardV1).toHaveBeenCalledTimes(3);
    expect(
      screen.queryByRole('img', { name: /ShopCity card preview/ }),
    ).toBeNull();
    await waitFor(() =>
      expect(
        screen.getByText('Card status').nextElementSibling,
      ).toHaveTextContent('BLOCKED'),
    );
    expect(
      await screen.findByText(
        'Card status updated and current details refreshed.',
      ),
    ).toBeInTheDocument();
  });

  it('does not report success or retain actions when refreshed status differs from the requested status', async () => {
    jest
      .mocked(cardsControllerUpdateStatusV1)
      .mockResolvedValue({ status: 200 } as never);
    jest
      .mocked(cardsControllerLookupManagementCardV1)
      .mockResolvedValueOnce(ok(active) as never)
      .mockResolvedValueOnce(ok(active) as never)
      .mockResolvedValueOnce(ok(active) as never);
    render(<SupervisorCardManagement />);
    fireEvent.change(screen.getByLabelText('Card serial'), {
      target: { value: 'SER-1' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Search card' }));
    fireEvent.click(
      await screen.findByRole('button', { name: 'Select and verify card' }),
    );
    fireEvent.click(await screen.findByRole('button', { name: 'Block card' }));
    fireEvent.change(screen.getByLabelText('Type BLOCK to confirm'), {
      target: { value: 'BLOCK' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm block' }));

    expect(
      await screen.findByText(/status request could not be verified/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/refresh the card lookup and reconcile its status/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/status updated/i)).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Block card' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Reactivate card' }),
    ).not.toBeInTheDocument();
  });

  it('offers replacement only for active customer, starts with blank serial and never displays balance controls', async () => {
    render(<SupervisorCardManagement />);
    fireEvent.change(screen.getByLabelText('Card serial'), {
      target: { value: 'SER-1' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Search card' }));
    fireEvent.click(
      await screen.findByRole('button', { name: 'Select and verify card' }),
    );
    fireEvent.click(
      await screen.findByRole('button', { name: 'Replace card' }),
    );
    expect(screen.getByLabelText('New replacement serial')).toHaveValue('');
    expect(screen.queryByText(/balance|transfer/i)).not.toBeInTheDocument();
    expect(cardsControllerReplaceCardV1).not.toHaveBeenCalled();
  });

  it('keeps the serial and fails closed on no-match and lookup errors', async () => {
    jest
      .mocked(cardsControllerLookupManagementCardV1)
      .mockResolvedValueOnce({ status: 404 } as never);
    const { rerender } = render(<SupervisorCardManagement />);
    fireEvent.change(screen.getByLabelText('Card serial'), {
      target: { value: 'MISSING' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Search card' }));
    expect(await screen.findByText(/no matching card/i)).toBeInTheDocument();
    expect(screen.getByLabelText('Card serial')).toHaveValue('MISSING');
    expect(
      screen.queryByRole('button', { name: 'Select and verify card' }),
    ).not.toBeInTheDocument();
    jest
      .mocked(cardsControllerLookupManagementCardV1)
      .mockRejectedValueOnce(new Error('offline'));
    rerender(<SupervisorCardManagement />);
    fireEvent.click(screen.getByRole('button', { name: 'Search card' }));
    expect(await screen.findByText(/lookup failed/i)).toBeInTheDocument();
    expect(screen.getByLabelText('Card serial')).toHaveValue('MISSING');
  });

  it('verifies replacement ID and same customer without any balance operation', async () => {
    jest.mocked(cardsControllerReplaceCardV1).mockResolvedValue({
      status: 201,
      data: { data: { id: 'card-2' } },
    } as never);
    jest
      .mocked(cardsControllerLookupManagementCardV1)
      .mockResolvedValueOnce(ok(active) as never)
      .mockResolvedValueOnce(ok(active) as never)
      .mockResolvedValueOnce(ok({ ...active, status: 'REPLACED' }) as never)
      .mockResolvedValueOnce(
        ok({ ...active, id: 'card-2', serialNumber: 'SER-2' }) as never,
      );
    render(<SupervisorCardManagement />);
    fireEvent.change(screen.getByLabelText('Card serial'), {
      target: { value: 'SER-1' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Search card' }));
    fireEvent.click(
      await screen.findByRole('button', { name: 'Select and verify card' }),
    );
    fireEvent.click(
      await screen.findByRole('button', { name: 'Replace card' }),
    );
    fireEvent.change(screen.getByLabelText('New replacement serial'), {
      target: { value: 'SER-2' },
    });
    fireEvent.change(screen.getByLabelText('Type REPLACE to confirm'), {
      target: { value: 'REPLACE' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Confirm replacement' }),
    );
    await waitFor(() =>
      expect(cardsControllerReplaceCardV1).toHaveBeenCalledTimes(1),
    );
    expect(cardsControllerReplaceCardV1).toHaveBeenCalledWith(
      'card-1',
      { serialNumber: 'SER-2' },
      expect.objectContaining({ headers: expect.any(Object) }),
    );
    expect(
      screen.queryByRole('img', { name: /ShopCity card preview/ }),
    ).toBeNull();
    await screen.findByText('Replacement verified for the same customer.');
    expect(screen.getByText('SER-2')).toBeVisible();
    expect(
      screen.getByText('Card status').nextElementSibling,
    ).toHaveTextContent('ACTIVE');
    expect(
      screen.getByText('Replacement verified for the same customer.'),
    ).toBeInTheDocument();
    expect(cardsControllerUpdateStatusV1).not.toHaveBeenCalled();
  });

  it('prevents duplicate replacement submission and safely retries an uncertain response with the same key', async () => {
    jest
      .mocked(cardsControllerReplaceCardV1)
      .mockResolvedValueOnce({ status: 503 } as never)
      .mockResolvedValueOnce({
        status: 201,
        data: { data: { id: 'card-2' } },
      } as never);
    jest
      .mocked(cardsControllerLookupManagementCardV1)
      .mockResolvedValueOnce(ok(active) as never)
      .mockResolvedValueOnce(ok(active) as never)
      .mockResolvedValueOnce(ok({ ...active, status: 'REPLACED' }) as never)
      .mockResolvedValueOnce(
        ok({ ...active, id: 'card-2', serialNumber: 'SER-2' }) as never,
      );
    render(<SupervisorCardManagement />);
    fireEvent.change(screen.getByLabelText('Card serial'), {
      target: { value: 'SER-1' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Search card' }));
    fireEvent.click(
      await screen.findByRole('button', { name: 'Select and verify card' }),
    );
    fireEvent.click(
      await screen.findByRole('button', { name: 'Replace card' }),
    );
    fireEvent.change(screen.getByLabelText('New replacement serial'), {
      target: { value: 'SER-2' },
    });
    fireEvent.change(screen.getByLabelText('Type REPLACE to confirm'), {
      target: { value: 'REPLACE' },
    });
    const submit = screen.getByRole('button', { name: 'Confirm replacement' });
    fireEvent.click(submit);
    fireEvent.click(submit);
    expect(cardsControllerReplaceCardV1).toHaveBeenCalledTimes(1);
    expect(submit).toBeDisabled();
    expect(
      await screen.findByText(
        'The request was not confirmed (503). Review current details before retrying.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByText('Replacement verified for the same customer.'),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText('New replacement serial')).toHaveValue(
      'SER-2',
    );
    const firstKey = new Headers(
      jest.mocked(cardsControllerReplaceCardV1).mock.calls[0][2]?.headers,
    ).get('Idempotency-Key');
    fireEvent.click(
      screen.getByRole('button', { name: 'Confirm replacement' }),
    );
    await waitFor(() =>
      expect(cardsControllerReplaceCardV1).toHaveBeenCalledTimes(2),
    );
    const retryKey = new Headers(
      jest.mocked(cardsControllerReplaceCardV1).mock.calls[1][2]?.headers,
    ).get('Idempotency-Key');
    expect(retryKey).toBe(firstKey);
    expect(
      await screen.findByText('Replacement verified for the same customer.'),
    ).toBeInTheDocument();
  });

  it('offers only reactivation for blocked cards and no writes for inactive customers', async () => {
    jest
      .mocked(cardsControllerLookupManagementCardV1)
      .mockResolvedValue(ok({ ...active, status: 'BLOCKED' }) as never);
    const { rerender } = render(<SupervisorCardManagement />);
    fireEvent.change(screen.getByLabelText('Card serial'), {
      target: { value: 'SER-1' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Search card' }));
    fireEvent.click(
      await screen.findByRole('button', { name: 'Select and verify card' }),
    );
    expect(
      await screen.findByRole('button', { name: 'Reactivate card' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Replace card' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Block card' }),
    ).not.toBeInTheDocument();

    jest.mocked(cardsControllerLookupManagementCardV1).mockResolvedValue(
      ok({
        ...active,
        customer: { ...active.customer, status: 'INACTIVE' },
      }) as never,
    );
    rerender(<SupervisorCardManagement />);
    fireEvent.change(screen.getByLabelText('Card serial'), {
      target: { value: 'SER-1' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Search card' }));
    fireEvent.click(
      await screen.findByRole('button', { name: 'Select and verify card' }),
    );
    expect(
      await screen.findByText(/customer is not active/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Block card' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Replace card' }),
    ).not.toBeInTheDocument();
  });

  it('fails closed on changed identity and replaced cards', async () => {
    jest
      .mocked(cardsControllerLookupManagementCardV1)
      .mockResolvedValueOnce(ok(active) as never)
      .mockResolvedValueOnce(ok({ ...active, id: 'different-id' }) as never);
    const { rerender } = render(<SupervisorCardManagement />);
    fireEvent.change(screen.getByLabelText('Card serial'), {
      target: { value: 'SER-1' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Search card' }));
    fireEvent.click(
      await screen.findByRole('button', { name: 'Select and verify card' }),
    );
    expect(
      await screen.findByText(/changed or are unavailable/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Block card' }),
    ).not.toBeInTheDocument();

    jest
      .mocked(cardsControllerLookupManagementCardV1)
      .mockResolvedValue(ok({ ...active, status: 'REPLACED' }) as never);
    rerender(<SupervisorCardManagement />);
    fireEvent.change(screen.getByLabelText('Card serial'), {
      target: { value: 'SER-1' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Search card' }));
    fireEvent.click(
      await screen.findByRole('button', { name: 'Select and verify card' }),
    );
    expect(await screen.findByText(/read-only/i)).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Block card' }),
    ).not.toBeInTheDocument();
  });
});
