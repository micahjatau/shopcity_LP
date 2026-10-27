import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import SupervisorPage from '../app/(shell)/supervisor/page';
import {
  approvalsControllerListApprovalsV1,
  reportsControllerGetExecutiveSnapshotV1,
} from '../lib/api/generated-client';
import {
  businessDateInTimezone,
  isReportForBusinessDate,
} from '../lib/reports/supervisor-overview-data';

jest.mock('../lib/api/generated-client', () => ({
  approvalsControllerListApprovalsV1: jest.fn(),
  reportsControllerGetExecutiveSnapshotV1: jest.fn(),
}));

const reportRow = (reportDate = businessDateInTimezone('Africa/Lagos')!) => ({
  reportDate: `${reportDate}T00:00:00.000Z`,
  materializedAt: new Date().toISOString(),
  transactionCount: 14,
  creditIssuedKobo: 14_000,
  creditRedeemedKobo: 6_000,
});

const approvals = [
  {
    id: 'approval-1',
    status: 'PENDING',
    targetType: 'EARN',
    reasonCode: 'PURCHASE_ABOVE_APPROVAL_THRESHOLD',
    requestedAmountKobo: 250_000,
    requestedAt: '2026-10-08T10:00:00.000Z',
    receiptId: 'receipt-1',
    customer: { id: 'customer-1', fullName: 'Ada Customer' },
    requester: { username: 'cashier-1', role: 'CASHIER' },
    receipt: { posReceiptNumber: 'POS-12' },
  },
  {
    id: 'approval-2',
    status: 'PENDING',
    targetType: 'REDEEM',
    reasonCode: 'REDEMPTION_ABOVE_LIMIT',
    requestedAmountKobo: 50_000,
    requestedAt: '2026-10-08T09:00:00.000Z',
    receiptId: 'receipt-2',
    customer: { id: 'customer-2', fullName: 'Bola Shopper' },
    requester: { username: 'cashier-2', role: 'CASHIER' },
    receipt: { posReceiptNumber: 'POS-13' },
  },
];

const approvalBeyondFirstPage = {
  ...approvals[0],
  id: 'approval-zara',
  receiptId: 'receipt-zara',
  customer: { id: 'customer-zara', fullName: 'Zara Customer' },
  requester: { username: 'cashier-zara', role: 'CASHIER' },
  receipt: { posReceiptNumber: 'POS-ZARA' },
};

function bolaApproval(index: number) {
  return {
    ...approvalBeyondFirstPage,
    id: `approval-bola-${index}`,
    receiptId: `receipt-bola-${index}`,
    customer: {
      id: `customer-bola-${index}`,
      fullName: `Bola Customer ${index}`,
    },
    requester: { username: `cashier-bola-${index}`, role: 'CASHIER' },
    receipt: { posReceiptNumber: `POS-BOLA-${index}` },
  };
}

function snapshotResponse(items: unknown[]) {
  return {
    status: 200,
    data: {
      data: {
        scope: 'BRANCH',
        scopeKey: 'branch-1',
        branchId: 'branch-1',
        timezone: 'Africa/Lagos',
        items,
      },
    },
  } as never;
}

function approvalsResponse(
  items = approvals,
  totalCount: number | undefined = 6,
  nextCursor: string | null = null,
  hasMore = false,
  scopeTotalCount: number | undefined = totalCount,
) {
  return {
    status: 200,
    data: {
      data: { items, totalCount, scopeTotalCount, nextCursor, hasMore },
    },
  } as never;
}

describe('Supervisor overview live reporting', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .mocked(reportsControllerGetExecutiveSnapshotV1)
      .mockResolvedValue(snapshotResponse([reportRow()]));
    jest
      .mocked(approvalsControllerListApprovalsV1)
      .mockResolvedValue(approvalsResponse());
  });

  it('loads branch report metrics and the first pending-approval page', async () => {
    render(<SupervisorPage />);

    expect(await screen.findByText(/140\.00/)).toBeInTheDocument();
    expect(screen.getByText(/60\.00/)).toBeInTheDocument();
    expect(screen.getByText('Ada Customer')).toBeInTheDocument();
    expect(screen.getByText('By cashier-1')).toBeInTheDocument();
    expect(screen.getByText(/Daily report materialized/)).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Open Approvals' }),
    ).toHaveAttribute('href', '/supervisor/approvals');

    const countCard = screen
      .getByRole('heading', { name: 'Pending approvals' })
      .closest('[data-metric-card]');
    expect(countCard).not.toBeNull();
    expect(within(countCard as HTMLElement).getByText('6')).toBeInTheDocument();
    expect(reportsControllerGetExecutiveSnapshotV1).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ credentials: 'include' }),
    );
    expect(approvalsControllerListApprovalsV1).toHaveBeenCalledWith(
      {
        limit: '5',
        cursor: '',
        status: 'PENDING',
        includeTotalCount: true,
      },
      expect.objectContaining({ credentials: 'include' }),
    );
  });

  it('shows loading states while both live sources are pending', () => {
    jest
      .mocked(reportsControllerGetExecutiveSnapshotV1)
      .mockReturnValue(new Promise(() => {}) as never);
    jest
      .mocked(approvalsControllerListApprovalsV1)
      .mockReturnValue(new Promise(() => {}) as never);

    render(<SupervisorPage />);

    expect(screen.getAllByText('Loading…')).toHaveLength(4);
    expect(screen.getByText('Loading approvals page 1…')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Refresh overview data' }),
    ).toBeDisabled();
  });

  it('does not reuse an older report or turn missing data into zero', async () => {
    const currentDate = businessDateInTimezone('Africa/Lagos')!;
    const previousDate = new Date(`${currentDate}T12:00:00.000Z`);
    previousDate.setUTCDate(previousDate.getUTCDate() - 1);
    const staleReportDate = previousDate.toISOString().slice(0, 10);
    jest
      .mocked(reportsControllerGetExecutiveSnapshotV1)
      .mockResolvedValue(snapshotResponse([reportRow(staleReportDate)]));
    jest
      .mocked(approvalsControllerListApprovalsV1)
      .mockResolvedValue(approvalsResponse([], 0, null, false));

    render(<SupervisorPage />);

    expect(
      await screen.findByText(/No report for today's branch date/),
    ).toBeInTheDocument();
    expect(screen.getByText(/Checked/)).toBeInTheDocument();
    expect(
      screen.queryByText(/Daily activity uses materialized reports/),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Pending approvals loaded/),
    ).not.toBeInTheDocument();
    const transactionsCard = screen
      .getByRole('heading', { name: 'Transactions today' })
      .closest('[data-metric-card]');
    const pendingCard = screen
      .getByRole('heading', { name: 'Pending approvals' })
      .closest('[data-metric-card]');
    expect(
      within(transactionsCard as HTMLElement).getByText('—'),
    ).toBeInTheDocument();
    expect(
      within(pendingCard as HTMLElement).getByText('0'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('No pending approvals right now.'),
    ).toBeInTheDocument();
  });

  it('keeps the approvals table usable when the report request fails', async () => {
    jest
      .mocked(reportsControllerGetExecutiveSnapshotV1)
      .mockRejectedValue(new Error('Service unavailable'));

    render(<SupervisorPage />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Daily reporting could not be refreshed',
    );
    expect(await screen.findByText('Ada Customer')).toBeInTheDocument();
  });

  it('keeps the report cards available when the approvals request fails', async () => {
    jest
      .mocked(approvalsControllerListApprovalsV1)
      .mockRejectedValue(new Error('Service unavailable'));

    render(<SupervisorPage />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Pending approvals could not be refreshed',
    );
    expect(await screen.findByText(/140\.00/)).toBeInTheDocument();
    expect(
      screen.getByText(
        'This approvals page is unavailable. Refresh or return to the previous page.',
      ),
    ).toBeInTheDocument();
  });

  it('searches approvals beyond the first page and keeps the global pending count', async () => {
    jest
      .mocked(approvalsControllerListApprovalsV1)
      .mockResolvedValueOnce(
        approvalsResponse(approvals, 6, 'cursor-2', true, 6),
      )
      .mockResolvedValueOnce(
        approvalsResponse([approvalBeyondFirstPage], 1, null, false, 6),
      )
      .mockResolvedValueOnce(
        approvalsResponse([approvalBeyondFirstPage], 1, null, false, 6),
      );

    render(<SupervisorPage />);
    await screen.findByText('Ada Customer');

    const search = screen.getByRole('searchbox', {
      name: 'Search all open approvals',
    });
    fireEvent.change(search, { target: { value: 'Zara' } });
    await waitFor(() =>
      expect(approvalsControllerListApprovalsV1).toHaveBeenNthCalledWith(
        2,
        {
          limit: '5',
          cursor: '',
          status: 'PENDING',
          includeTotalCount: true,
          search: 'Zara',
        },
        expect.objectContaining({ credentials: 'include' }),
      ),
    );
    expect(await screen.findByText('Zara Customer')).toBeInTheDocument();
    expect(screen.queryByText('Ada Customer')).not.toBeInTheDocument();
    expect(search).toHaveValue('Zara');
    expect(
      screen.getByText(
        'Showing 1 approval on page 1; 1 match across all open approvals; 6 pending overall. Search covers all authorized open approvals.',
      ),
    ).toBeInTheDocument();

    const pendingCard = screen
      .getByRole('heading', { name: 'Pending approvals' })
      .closest('[data-metric-card]');
    expect(
      within(pendingCard as HTMLElement).getByText('6'),
    ).toBeInTheDocument();

    const refreshButton = screen.getByRole('button', {
      name: 'Refresh overview data',
    });
    await waitFor(() => expect(refreshButton).toBeEnabled());
    fireEvent.click(refreshButton);
    await waitFor(() => {
      expect(reportsControllerGetExecutiveSnapshotV1).toHaveBeenCalledTimes(2);
      expect(approvalsControllerListApprovalsV1).toHaveBeenCalledTimes(3);
    });
  });

  it('shows only the zero-approval summary when the unfiltered queue and count are unavailable', async () => {
    jest.mocked(approvalsControllerListApprovalsV1).mockResolvedValueOnce({
      status: 200,
      data: {
        data: {
          items: [],
          nextCursor: null,
          hasMore: false,
        },
      },
    } as never);

    render(<SupervisorPage />);

    expect(await screen.findByText('Showing 0 approvals')).toBeInTheDocument();
    expect(
      screen.queryByText(/pending total unavailable/),
    ).not.toBeInTheDocument();
  });

  it('shows no-match search results without changing the pending metric', async () => {
    jest
      .mocked(approvalsControllerListApprovalsV1)
      .mockResolvedValueOnce(approvalsResponse(approvals, 6, null, false, 6))
      .mockResolvedValueOnce(approvalsResponse([], 0, null, false, 6));

    render(<SupervisorPage />);
    await screen.findByText('Ada Customer');
    fireEvent.change(
      screen.getByRole('searchbox', { name: 'Search all open approvals' }),
      { target: { value: 'Nobody' } },
    );

    expect(
      await screen.findByText(
        'No open approvals match “Nobody”. Clear the search to see all pending approvals.',
      ),
    ).toBeInTheDocument();
    const pendingCard = screen
      .getByRole('heading', { name: 'Pending approvals' })
      .closest('[data-metric-card]');
    expect(
      within(pendingCard as HTMLElement).getByText('6'),
    ).toBeInTheDocument();
    expect(screen.getByText('Showing 0 approvals')).toBeInTheDocument();
  });

  it('resets to the first result page when the search term changes', async () => {
    const firstBolaPage = Array.from({ length: 5 }, (_, index) =>
      bolaApproval(index + 1),
    );
    jest
      .mocked(approvalsControllerListApprovalsV1)
      .mockResolvedValueOnce(
        approvalsResponse(approvals, 6, 'cursor-2', true, 6),
      )
      .mockResolvedValueOnce(
        approvalsResponse(firstBolaPage, 6, 'search-next', true, 6),
      )
      .mockResolvedValueOnce(
        approvalsResponse([bolaApproval(6)], 6, null, false, 6),
      )
      .mockResolvedValueOnce(
        approvalsResponse([approvalBeyondFirstPage], 1, null, false, 6),
      );

    render(<SupervisorPage />);
    await screen.findByText('Ada Customer');
    const search = screen.getByRole('searchbox', {
      name: 'Search all open approvals',
    });
    fireEvent.change(search, { target: { value: 'Bola' } });
    await waitFor(() =>
      expect(approvalsControllerListApprovalsV1).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ cursor: '', search: 'Bola' }),
        expect.anything(),
      ),
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'Next approvals page' }),
    );
    await waitFor(() =>
      expect(approvalsControllerListApprovalsV1).toHaveBeenNthCalledWith(
        3,
        expect.objectContaining({ cursor: 'search-next', search: 'Bola' }),
        expect.anything(),
      ),
    );
    expect(await screen.findByText('Page 2 · 6 matches')).toBeInTheDocument();

    fireEvent.change(search, { target: { value: 'Zara' } });
    await waitFor(() =>
      expect(approvalsControllerListApprovalsV1).toHaveBeenNthCalledWith(
        4,
        expect.objectContaining({ cursor: '', search: 'Zara' }),
        expect.anything(),
      ),
    );
    expect(await screen.findByText('Page 1 · 1 match')).toBeInTheDocument();
    expect(search).toHaveValue('Zara');
    expect(
      screen.getByRole('button', { name: 'Previous approvals page' }),
    ).toBeDisabled();
  });

  it('keeps the search active while paging through matching approvals', async () => {
    jest
      .mocked(approvalsControllerListApprovalsV1)
      .mockResolvedValueOnce(
        approvalsResponse(approvals, 6, 'cursor-2', true, 6),
      )
      .mockResolvedValueOnce(
        approvalsResponse([approvals[1]], 2, 'search-next', true, 6),
      )
      .mockResolvedValueOnce(
        approvalsResponse([approvalBeyondFirstPage], 2, null, false, 6),
      )
      .mockResolvedValueOnce(
        approvalsResponse([approvals[1]], 2, 'search-next', true, 6),
      );

    render(<SupervisorPage />);
    await screen.findByText('Ada Customer');

    const previousButton = screen.getByRole('button', {
      name: 'Previous approvals page',
    });
    const nextButton = screen.getByRole('button', {
      name: 'Next approvals page',
    });
    expect(previousButton).toBeDisabled();
    expect(nextButton).toBeEnabled();

    const search = screen.getByRole('searchbox', {
      name: 'Search all open approvals',
    });
    fireEvent.change(search, { target: { value: 'Bola' } });
    await waitFor(() =>
      expect(approvalsControllerListApprovalsV1).toHaveBeenNthCalledWith(
        2,
        {
          limit: '5',
          cursor: '',
          status: 'PENDING',
          includeTotalCount: true,
          search: 'Bola',
        },
        expect.objectContaining({ credentials: 'include' }),
      ),
    );
    expect(
      await screen.findByRole('row', { name: /Bola Shopper/ }),
    ).toBeInTheDocument();
    expect(nextButton).toBeEnabled();

    fireEvent.click(nextButton);
    await waitFor(() =>
      expect(approvalsControllerListApprovalsV1).toHaveBeenNthCalledWith(
        3,
        {
          limit: '5',
          cursor: 'search-next',
          status: 'PENDING',
          includeTotalCount: true,
          search: 'Bola',
        },
        expect.objectContaining({ credentials: 'include' }),
      ),
    );
    expect(await screen.findByText('Zara Customer')).toBeInTheDocument();
    expect(search).toHaveValue('Bola');
    expect(screen.getByText('Page 2 · 2 matches')).toBeInTheDocument();
    expect(nextButton).toBeDisabled();
    expect(previousButton).toBeEnabled();

    fireEvent.click(previousButton);
    await waitFor(() =>
      expect(approvalsControllerListApprovalsV1).toHaveBeenNthCalledWith(
        4,
        {
          limit: '5',
          cursor: '',
          status: 'PENDING',
          includeTotalCount: true,
          search: 'Bola',
        },
        expect.objectContaining({ credentials: 'include' }),
      ),
    );
    expect(await screen.findByText('Bola Shopper')).toBeInTheDocument();
    expect(search).toHaveValue('Bola');
    expect(previousButton).toBeDisabled();
    expect(nextButton).toBeEnabled();
  });

  it('matches the report date using the branch timezone', () => {
    const instant = new Date('2026-10-07T23:30:00.000Z');
    expect(businessDateInTimezone('Africa/Lagos', instant)).toBe('2026-10-08');
    expect(businessDateInTimezone('UTC', instant)).toBe('2026-10-07');
    expect(businessDateInTimezone('Not/A_Timezone', instant)).toBeNull();
    expect(
      isReportForBusinessDate(
        '2026-10-08T00:00:00.000Z',
        'Africa/Lagos',
        instant,
      ),
    ).toBe(true);
    expect(
      isReportForBusinessDate(
        '2026-10-07T00:00:00.000Z',
        'Africa/Lagos',
        instant,
      ),
    ).toBe(false);
  });
});
