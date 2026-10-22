import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import {
  approvalsControllerDecideApprovalV1,
  approvalsControllerListApprovalsV1,
  customersControllerGetCustomerProfileProjectionV1,
  customersControllerGetCustomerV1,
} from '../lib/api/generated-client';
import { ApprovalsPanel } from '../components/workflows/approvals-panel';

jest.mock('../lib/api/generated-client', () => ({
  ApprovalsControllerListApprovalsV1Category: {
    HIGH_VALUE_TRANSACTION: 'HIGH_VALUE_TRANSACTION',
    LATE_RECEIPT_CLAIM: 'LATE_RECEIPT_CLAIM',
  },
  approvalsControllerDecideApprovalV1: jest.fn(),
  approvalsControllerListApprovalsV1: jest.fn(),
  customersControllerGetCustomerProfileProjectionV1: jest.fn(),
  customersControllerGetCustomerV1: jest.fn(),
}));

const pendingApproval = {
  id: 'approval-1',
  status: 'PENDING',
  targetType: 'EARN',
  requestedAmountKobo: 250000,
  requestedAt: '2026-09-30T10:00:00.000Z',
  expiresAt: '2026-09-30T12:00:00.000Z',
  reasonCode: 'PURCHASE_ABOVE_APPROVAL_THRESHOLD',
  category: 'HIGH_VALUE_TRANSACTION',
  requester: { username: 'cashier.one', role: 'CASHIER' },
  customer: { id: 'customer-1', fullName: 'Ada Customer' },
  receipt: {
    posReceiptNumber: 'POS-12',
    purchaseAmountKobo: 250000,
    occurredAt: '2026-09-30T10:00:00.000Z',
  },
};

function listResponse(
  items = [pendingApproval],
  nextCursor: string | null = null,
  categoryCountsOverride?: {
    HIGH_VALUE_TRANSACTION: number;
    LATE_RECEIPT_CLAIM: number;
  },
) {
  const categoryCounts = items.reduce(
    (counts, item) => {
      if (item.category === 'HIGH_VALUE_TRANSACTION') {
        counts.HIGH_VALUE_TRANSACTION += 1;
      } else if (item.category === 'LATE_RECEIPT_CLAIM') {
        counts.LATE_RECEIPT_CLAIM += 1;
      }
      return counts;
    },
    { HIGH_VALUE_TRANSACTION: 0, LATE_RECEIPT_CLAIM: 0 },
  );
  return {
    status: 200,
    data: {
      data: {
        items,
        nextCursor,
        hasMore: Boolean(nextCursor),
        totalCount: items.length,
        scopeTotalCount: items.length,
        categoryCounts: categoryCountsOverride ?? categoryCounts,
      },
    },
  } as never;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

async function waitForQueueLoad() {
  await waitFor(() =>
    expect(screen.getByRole('button', { name: /^Refresh/ })).not.toBeDisabled(),
  );
}

describe('ApprovalsPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .mocked(approvalsControllerListApprovalsV1)
      .mockResolvedValue(listResponse());
    jest.mocked(customersControllerGetCustomerV1).mockImplementation(
      async (id) =>
        ({
          status: 200,
          data: {
            data: { id, availableBalanceKobo: 4_500_000 },
          },
        }) as never,
    );
    jest
      .mocked(customersControllerGetCustomerProfileProjectionV1)
      .mockImplementation(
        async (id) =>
          ({
            status: 200,
            data: { data: { customerId: id, lifetimeEarnedKobo: 8_250_000 } },
          }) as never,
      );
  });

  it('shows clean results and opens a decision dialog with preset reasons', async () => {
    jest.mocked(approvalsControllerDecideApprovalV1).mockResolvedValue({
      status: 200,
      data: { data: { id: 'approval-1', status: 'EXECUTED' } },
    } as never);
    render(<ApprovalsPanel />);
    const reviewButton = await screen.findByRole('button', {
      name: /Ada Customer/,
    });
    await waitForQueueLoad();

    expect(
      screen.getByRole('heading', {
        name: 'Transactions awaiting approval',
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('1 result')).toBeInTheDocument();
    for (const label of [
      'Transaction',
      'Customer',
      'Type',
      'Amount',
      'Status',
      'Action',
    ]) {
      expect(
        screen.getByRole('columnheader', { name: label }),
      ).toBeInTheDocument();
    }
    expect(screen.queryByText('Awaiting review')).not.toBeInTheDocument();
    expect(screen.queryByText('1 shown')).not.toBeInTheDocument();

    fireEvent.click(reviewButton);
    expect(
      screen.getByRole('dialog', { name: 'Review approval' }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: 'Reject' }));
    fireEvent.change(screen.getByLabelText('Decision reason'), {
      target: { value: 'Does not meet approval policy' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Submit rejection' }));

    await waitFor(() => {
      expect(approvalsControllerDecideApprovalV1).toHaveBeenCalledWith(
        'approval-1',
        { decision: 'REJECTED', reason: 'Does not meet approval policy' },
        expect.objectContaining({ headers: expect.any(Object) }),
      );
    });
  });

  it('sends status filters to the server and paginates without truncating rows', async () => {
    jest
      .mocked(approvalsControllerListApprovalsV1)
      .mockResolvedValueOnce(
        listResponse(
          [pendingApproval, { ...pendingApproval, id: 'approval-2' }],
          'cursor-2',
        ),
      )
      .mockResolvedValueOnce(
        listResponse([{ ...pendingApproval, id: 'approval-3' }]),
      );
    render(<ApprovalsPanel />);
    await screen.findByRole('heading', {
      name: 'Transactions awaiting approval',
    });
    await waitForQueueLoad();
    expect(screen.getByText('2 results')).toBeInTheDocument();
    expect(
      (await screen.findAllByRole('button', { name: /Ada Customer/ })).length,
    ).toBe(2);

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    await waitFor(() => {
      expect(approvalsControllerListApprovalsV1).toHaveBeenLastCalledWith(
        { limit: '10', cursor: 'cursor-2', status: 'PENDING' },
        expect.objectContaining({ headers: expect.any(Object) }),
      );
    });
    await waitForQueueLoad();
  });

  it('keeps the labeled results table visible when there are no approvals', async () => {
    jest
      .mocked(approvalsControllerListApprovalsV1)
      .mockResolvedValue(listResponse([]));
    render(<ApprovalsPanel />);

    expect(await screen.findByRole('table')).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: 'Transaction' }),
    ).toBeInTheDocument();
    expect(
      await screen.findByText(
        'No approvals found. Try another status or refresh the list.',
      ),
    ).toBeInTheDocument();
  });

  it('renders Supervisor category tabs with API counts and selects queue details', async () => {
    render(<ApprovalsPanel variant="supervisor" />);
    await screen.findByRole('heading', { name: 'Recent customers' });
    await waitForQueueLoad();

    expect(
      screen.getByRole('heading', { name: 'Decision' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('tab', {
        name: 'High-value transaction, 1 matching request',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('tab', {
        name: 'Late receipt claim, 0 matching requests',
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('tab', { name: /OTP override/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('tab', { name: /Manual adjustment/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: 'Name' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: 'Amount' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('columnheader', { name: 'Receipt Age' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Select an item to review' }),
    ).not.toBeInTheDocument();
    const selectedRow = await screen.findByRole('button', {
      name: /Ada Customer/,
    });
    expect(selectedRow).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Not provided')).toBeInTheDocument();
    expect(screen.queryByText('approval-1')).not.toBeInTheDocument();
    expect(await screen.findByText('₦45,000.00')).toBeInTheDocument();
    expect(await screen.findByText('₦82,500.00')).toBeInTheDocument();
    expect(screen.getByText('cashier.one')).toBeInTheDocument();
    expect(screen.getByText('Date & Time')).toBeInTheDocument();
    expect(screen.getByText('Reason submitted')).toBeInTheDocument();
    expect(
      screen.getByRole('textbox', { name: 'Decision reason (required)' }),
    ).toHaveAttribute('placeholder', 'Enter reason');
    expect(screen.getByRole('link', { name: 'View Customer' })).toHaveAttribute(
      'href',
      '/supervisor/customers/customer-1',
    );
  });

  it('shows each metric as soon as its own customer read completes', async () => {
    const lifetimeEarnedResponse = deferred<unknown>();
    jest
      .mocked(customersControllerGetCustomerProfileProjectionV1)
      .mockReturnValue(lifetimeEarnedResponse.promise as never);

    render(<ApprovalsPanel variant="supervisor" />);
    const walletBalance = await screen.findByText('₦45,000.00');
    const evidence = walletBalance.closest('dl');
    expect(evidence).not.toBeNull();
    expect(within(evidence!).getByText('Loading…')).toBeInTheDocument();

    await act(async () => {
      lifetimeEarnedResponse.resolve({
        status: 200,
        data: {
          data: { customerId: 'customer-1', lifetimeEarnedKobo: 8_250_000 },
        },
      });
      await Promise.resolve();
    });
    expect(await screen.findByText('₦82,500.00')).toBeInTheDocument();
  });

  it('does not replace the selected customer metrics with late responses', async () => {
    const walletForAda = deferred<unknown>();
    const earnedForAda = deferred<unknown>();
    const nextApproval = {
      ...pendingApproval,
      id: 'approval-2',
      customer: { id: 'customer-2', fullName: 'Bea Customer' },
    };
    jest
      .mocked(approvalsControllerListApprovalsV1)
      .mockResolvedValue(listResponse([pendingApproval, nextApproval]));
    jest.mocked(customersControllerGetCustomerV1).mockImplementation((id) =>
      id === 'customer-1'
        ? (walletForAda.promise as never)
        : Promise.resolve({
            status: 200,
            data: {
              data: { id, availableBalanceKobo: 6_000_000 },
            },
          } as never),
    );
    jest
      .mocked(customersControllerGetCustomerProfileProjectionV1)
      .mockImplementation((id) =>
        id === 'customer-1'
          ? (earnedForAda.promise as never)
          : Promise.resolve({
              status: 200,
              data: { data: { customerId: id, lifetimeEarnedKobo: 7_000_000 } },
            } as never),
      );

    render(<ApprovalsPanel variant="supervisor" />);
    await screen.findByRole('button', { name: /Ada Customer/ });
    fireEvent.click(screen.getByRole('button', { name: /Bea Customer/ }));
    expect(await screen.findByText('₦60,000.00')).toBeInTheDocument();
    expect(await screen.findByText('₦70,000.00')).toBeInTheDocument();

    await act(async () => {
      walletForAda.resolve({
        status: 200,
        data: {
          data: { id: 'customer-1', availableBalanceKobo: 1_000_000 },
        },
      });
      earnedForAda.resolve({
        status: 200,
        data: {
          data: { customerId: 'customer-1', lifetimeEarnedKobo: 2_000_000 },
        },
      });
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(screen.getByText('₦60,000.00')).toBeInTheDocument();
      expect(screen.getByText('₦70,000.00')).toBeInTheDocument();
      expect(screen.queryByText('₦10,000.00')).not.toBeInTheDocument();
      expect(screen.queryByText('₦20,000.00')).not.toBeInTheDocument();
    });
  });

  it('shows independently unavailable customer metrics without exposing the request ID', async () => {
    jest.mocked(customersControllerGetCustomerV1).mockResolvedValue({
      status: 503,
      data: {},
    } as never);
    jest
      .mocked(customersControllerGetCustomerProfileProjectionV1)
      .mockImplementation(
        async (id) =>
          ({
            status: 200,
            data: { data: { customerId: id, lifetimeEarnedKobo: 325_000 } },
          }) as never,
      );
    render(<ApprovalsPanel variant="supervisor" />);
    await screen.findByRole('heading', { name: 'Recent customers' });
    await waitFor(() => {
      expect(screen.getByText('Unavailable')).toBeInTheDocument();
      expect(screen.getByText('₦3,250.00')).toBeInTheDocument();
    });
    expect(screen.queryByText('approval-1')).not.toBeInTheDocument();
  });

  it('shows metrics as zero NGN when both authoritative customer values are zero', async () => {
    jest.mocked(customersControllerGetCustomerV1).mockImplementation(
      async (id) =>
        ({
          status: 200,
          data: { data: { id, availableBalanceKobo: 0 } },
        }) as never,
    );
    jest
      .mocked(customersControllerGetCustomerProfileProjectionV1)
      .mockImplementation(
        async (id) =>
          ({
            status: 200,
            data: { data: { customerId: id, lifetimeEarnedKobo: 0 } },
          }) as never,
      );
    render(<ApprovalsPanel variant="supervisor" />);
    expect(await screen.findAllByText('₦0.00')).toHaveLength(2);
  });

  it('does not query metrics without a real customer ID', async () => {
    jest
      .mocked(approvalsControllerListApprovalsV1)
      .mockResolvedValue(
        listResponse([
          { ...pendingApproval, customer: { fullName: 'Unlinked' } },
        ]),
      );
    render(<ApprovalsPanel variant="supervisor" />);
    await screen.findByRole('button', { name: /Unlinked/ });
    expect(screen.getAllByText('Not provided')).toHaveLength(3);
    expect(customersControllerGetCustomerV1).not.toHaveBeenCalled();
    expect(
      customersControllerGetCustomerProfileProjectionV1,
    ).not.toHaveBeenCalled();
  });

  it('requests late receipt claims from the API and uses server category counts', async () => {
    const lateApproval = {
      ...pendingApproval,
      id: 'late-approval-1',
      reasonCode: 'LATE_RECEIPT_CLAIM',
      category: 'LATE_RECEIPT_CLAIM',
      receipt: {
        ...pendingApproval.receipt,
        occurredAt: '2026-09-21T10:00:00.000Z',
      },
    };
    jest
      .mocked(approvalsControllerListApprovalsV1)
      .mockResolvedValueOnce(
        listResponse([pendingApproval], null, {
          HIGH_VALUE_TRANSACTION: 1,
          LATE_RECEIPT_CLAIM: 1,
        }),
      )
      .mockResolvedValueOnce(
        listResponse([lateApproval], null, {
          HIGH_VALUE_TRANSACTION: 1,
          LATE_RECEIPT_CLAIM: 1,
        }),
      );
    render(<ApprovalsPanel variant="supervisor" />);
    await screen.findByRole('heading', { name: 'Recent customers' });
    await waitForQueueLoad();

    fireEvent.click(
      screen.getByRole('tab', {
        name: 'Late receipt claim, 1 matching request',
      }),
    );
    expect(
      await screen.findByRole('button', { name: /Ada Customer/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: 'Name' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: 'Receipt Age' }),
    ).toBeInTheDocument();
    expect(screen.getByText('9 days')).toBeInTheDocument();
    await waitFor(() => {
      expect(approvalsControllerListApprovalsV1).toHaveBeenLastCalledWith(
        expect.objectContaining({
          category: 'LATE_RECEIPT_CLAIM',
          includeTotalCount: true,
        }),
        expect.objectContaining({ headers: expect.any(Object) }),
      );
    });
    expect(
      screen.getByRole('tab', {
        name: 'High-value transaction, 1 matching request',
      }),
    ).toBeInTheDocument();
  });

  it('keeps the empty-category placeholder inside a native table cell', async () => {
    jest
      .mocked(approvalsControllerListApprovalsV1)
      .mockResolvedValueOnce(listResponse([]));
    render(<ApprovalsPanel variant="supervisor" />);

    const placeholder = await screen.findByText(
      'No requests in this category on the loaded page.',
    );
    expect(placeholder).toHaveClass('approval-queue__list-empty');
    expect(placeholder.closest('td')).toHaveClass(
      'approval-queue__list-empty-cell',
    );
  });

  it('matches the Cards filter menu style and supports keyboard selection', async () => {
    render(<ApprovalsPanel variant="supervisor" />);
    await screen.findByRole('heading', { name: 'Recent customers' });
    await waitForQueueLoad();

    const statusFilter = screen.getByRole('button', {
      name: 'Approval status filter, Needs review',
    });
    fireEvent.keyDown(statusFilter, { key: 'ArrowDown' });
    const menu = screen.getByRole('listbox', {
      name: 'Approval status filter options',
    });
    expect(menu).toHaveClass('supervisor-customer-directory__status-menu');

    const approvedOption = screen.getByRole('option', { name: 'Approved' });
    expect(approvedOption).toHaveClass(
      'supervisor-customer-directory__status-option',
    );
    fireEvent.click(approvedOption);

    await waitFor(() => {
      expect(approvalsControllerListApprovalsV1).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: 'APPROVED' }),
        expect.objectContaining({ headers: expect.any(Object) }),
      );
    });
    expect(
      screen.getByRole('button', {
        name: 'Approval status filter, Approved',
      }),
    ).toBeInTheDocument();
  });

  it('requires a decision reason and submits the audited approval action', async () => {
    jest.mocked(approvalsControllerDecideApprovalV1).mockResolvedValue({
      status: 200,
      data: { data: { id: 'approval-1', status: 'EXECUTED' } },
    } as never);
    jest
      .mocked(approvalsControllerListApprovalsV1)
      .mockResolvedValueOnce(listResponse())
      .mockResolvedValueOnce(listResponse([]));
    render(<ApprovalsPanel variant="supervisor" />);
    await screen.findByRole('heading', { name: 'Recent customers' });
    await waitForQueueLoad();

    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Enter a decision reason.',
    );
    expect(approvalsControllerDecideApprovalV1).not.toHaveBeenCalled();

    fireEvent.change(
      screen.getByRole('textbox', { name: 'Decision reason (required)' }),
      { target: { value: 'Reviewed and validated' } },
    );
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
    await waitFor(() => {
      expect(approvalsControllerDecideApprovalV1).toHaveBeenCalledWith(
        'approval-1',
        { decision: 'APPROVED', reason: 'Reviewed and validated' },
        expect.objectContaining({ headers: expect.any(Object) }),
      );
    });
    expect(await screen.findByText('Decision submitted.')).toBeInTheDocument();
    expect(screen.queryByText('approval-1')).not.toBeInTheDocument();
  });

  it('submits rejection directly and auto-selects the next pending request', async () => {
    const nextApproval = {
      ...pendingApproval,
      id: 'approval-2',
      customer: { id: 'customer-2', fullName: 'Bea Customer' },
    };
    jest
      .mocked(approvalsControllerListApprovalsV1)
      .mockResolvedValueOnce(listResponse([pendingApproval, nextApproval]))
      .mockResolvedValueOnce(listResponse([nextApproval]));
    jest.mocked(approvalsControllerDecideApprovalV1).mockResolvedValue({
      status: 200,
      data: { data: { id: 'approval-1', status: 'REJECTED' } },
    } as never);
    render(<ApprovalsPanel variant="supervisor" />);
    await screen.findByRole('heading', { name: 'Recent customers' });
    await waitForQueueLoad();
    fireEvent.change(
      screen.getByRole('textbox', { name: 'Decision reason (required)' }),
      { target: { value: 'Evidence is incomplete' } },
    );
    fireEvent.click(screen.getByRole('button', { name: 'Reject' }));

    await waitFor(() => {
      expect(approvalsControllerDecideApprovalV1).toHaveBeenCalledWith(
        'approval-1',
        { decision: 'REJECTED', reason: 'Evidence is incomplete' },
        expect.objectContaining({ headers: expect.any(Object) }),
      );
    });
    expect(
      await screen.findByRole('button', { name: /Bea Customer/ }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(
      screen.queryByRole('button', { name: /Ada Customer/ }),
    ).not.toBeInTheDocument();
  });

  it('opens decided approvals read-only', async () => {
    jest.mocked(approvalsControllerListApprovalsV1).mockResolvedValue(
      listResponse([
        {
          ...pendingApproval,
          status: 'REJECTED',
          decidedAt: '2026-09-30T11:00:00.000Z',
        },
      ]),
    );
    render(<ApprovalsPanel />);
    fireEvent.change(screen.getByLabelText('Approval status filter'), {
      target: { value: 'REJECTED' },
    });
    await screen.findByRole('heading', { name: 'Rejected transactions' });
    const reviewButton = await screen.findByRole('button', {
      name: /Ada Customer/,
    });
    await waitForQueueLoad();
    fireEvent.click(reviewButton);

    expect(
      screen.getByRole('dialog', { name: 'Approval details' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Decision already recorded')).toBeInTheDocument();
    expect(
      screen.queryByRole('radio', { name: 'Approve' }),
    ).not.toBeInTheDocument();
  });
});
