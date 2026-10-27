import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import {
  OperationalReportsDashboard,
  SupervisorOperationalReports,
} from '../components/workflows/supervisor-operational-reports';
import {
  reportsControllerListCashierActivityV1,
  reportsControllerListExecutiveSummaryV1,
  reportsControllerListMaterializationStateV1,
  reportsControllerListRedemptionSummaryV1,
  reportsControllerListSmsOperationsV1,
  reportsControllerRefreshReportV1,
  reportsControllerRefreshSupervisorDashboardV1,
} from '../lib/api/generated-client';
import { recentReportPeriod } from '../lib/reports/supervisor-report-metrics';

jest.mock('../components/session-bootstrap', () => ({
  useSessionBootstrapState: () => ({
    publicConfig: {
      branch: { id: 'supervisor-branch', name: 'Main Branch' },
    },
  }),
}));

jest.mock('../lib/api/generated-client', () => ({
  reportsControllerListCashierActivityV1: jest.fn(),
  reportsControllerListExecutiveSummaryV1: jest.fn(),
  reportsControllerListMaterializationStateV1: jest.fn(),
  reportsControllerListRedemptionSummaryV1: jest.fn(),
  reportsControllerListSmsOperationsV1: jest.fn(),
  reportsControllerRefreshReportV1: jest.fn(),
  reportsControllerRefreshSupervisorDashboardV1: jest.fn(),
}));

jest.mock('../components/workflows/reports-workspace', () => ({
  ReportsWorkspace: ({
    period,
    hideScopeInputs,
  }: {
    period: { from: string; to: string };
    hideScopeInputs: boolean;
  }) => (
    <div data-testid="report-builder">
      {period.from} — {period.to} — {hideScopeInputs ? 'branch-scoped' : 'all'}
    </div>
  ),
}));

const response = (items: unknown[]) =>
  ({
    status: 200,
    data: {
      data: {
        scope: 'BRANCH',
        branchId: 'supervisor-branch',
        timezone: 'Africa/Lagos',
        items,
      },
    },
  }) as never;

describe('SupervisorOperationalReports', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/supervisor/reports');
    jest.clearAllMocks();
    jest.mocked(reportsControllerListExecutiveSummaryV1).mockResolvedValue(
      response([
        {
          reportDate: '2026-09-29T00:00:00.000Z',
          materializedAt: '2026-09-30T08:00:00.000Z',
          loyaltyPurchaseValueKobo: 700000,
          creditIssuedKobo: 14000,
          creditRedeemedKobo: 6000,
          outstandingLiabilityKobo: 230000,
          activeCustomers: 21,
          transactionCount: 14,
        },
      ]),
    );
    jest.mocked(reportsControllerListCashierActivityV1).mockResolvedValue(
      response([
        {
          cashierId: 'A',
          duplicateAttempts: 2,
          fraudFlagCount: 0,
        },
      ]),
    );
    jest.mocked(reportsControllerListRedemptionSummaryV1).mockResolvedValue(
      response([
        {
          redemptionCount: 4,
          confirmedKobo: 6000,
          pendingApprovalCount: 1,
        },
      ]),
    );
    jest
      .mocked(reportsControllerListSmsOperationsV1)
      .mockResolvedValue(
        response([{ queuedCount: 10, sentCount: 8, failedCount: 2 }]),
      );
  });

  it('shows four financial KPIs and loads only branch-authorized report APIs', async () => {
    render(<SupervisorOperationalReports />);

    expect(
      await screen.findByRole('region', {
        name: 'Operational key performance indicators',
      }),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getAllByText(/7,000\.00/).length).toBeGreaterThan(0),
    );
    expect(screen.getByText(/140\.00/)).toBeInTheDocument();
    expect(screen.getByText(/60\.00/)).toBeInTheDocument();
    expect(screen.getByText(/2,300\.00/)).toBeInTheDocument();
    expect(
      screen.getByRole('region', { name: 'Filtered operational summaries' }),
    ).toBeInTheDocument();
    expect(screen.getAllByText('21', { exact: true }).length).toBeGreaterThan(
      0,
    );
    expect(
      screen.getByText('· Main Branch', { exact: true }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Insights' }));
    const trendBar = screen.getByRole('button', { name: /7,000\.00/ });
    fireEvent.click(trendBar);
    expect(trendBar).toHaveAttribute('aria-pressed', 'true');
    const period = recentReportPeriod(7);
    fireEvent.click(screen.getByRole('tab', { name: 'Reports' }));
    expect(reportsControllerListExecutiveSummaryV1).toHaveBeenCalledWith(
      { from: period.from, to: period.to },
      expect.any(Object),
    );
    expect(screen.getByTestId('report-builder')).toHaveTextContent(period.from);
    expect(screen.getByTestId('report-builder')).toHaveTextContent(
      'branch-scoped',
    );
  });

  it('queues a branch refresh and reloads after materialization completes', async () => {
    const stateResponse = (updatedAt: string) =>
      ({
        status: 200,
        data: {
          data: {
            scope: 'BRANCH',
            scopeKey: 'supervisor-branch',
            branchId: 'supervisor-branch',
            timezone: 'Africa/Lagos',
            items: [
              {
                scope: 'BRANCH',
                scopeKey: 'supervisor-branch',
                status: 'COMPLETED',
                updatedAt,
              },
            ],
          },
        },
      }) as never;
    jest
      .mocked(reportsControllerListMaterializationStateV1)
      .mockResolvedValueOnce(stateResponse('2026-09-30T08:00:00.000Z'))
      .mockResolvedValueOnce(stateResponse('2099-01-01T00:00:00.000Z'));
    jest
      .mocked(reportsControllerRefreshSupervisorDashboardV1)
      .mockResolvedValue({ status: 202 } as never);
    render(<SupervisorOperationalReports />);

    const refreshButton = await screen.findByRole('button', {
      name: 'Refresh dashboard data',
    });
    await waitFor(() => expect(refreshButton).toBeEnabled());
    fireEvent.click(refreshButton);

    expect(
      await screen.findByText('Branch snapshot updated. Reloading reports…'),
    ).toBeInTheDocument();
    expect(reportsControllerRefreshSupervisorDashboardV1).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: expect.objectContaining({
          'idempotency-key': expect.any(String),
        }),
      }),
    );
    await waitFor(() =>
      expect(reportsControllerListExecutiveSummaryV1).toHaveBeenCalledTimes(2),
    );
  });

  it('reanchors the preset range to today when refresh crosses the business-date boundary', async () => {
    jest.useFakeTimers({
      now: new Date('2026-10-20T20:30:00.000Z'),
      doNotFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'],
    });
    try {
      const stateResponse = (updatedAt: string) =>
        ({
          status: 200,
          data: {
            data: {
              scope: 'BRANCH',
              scopeKey: 'supervisor-branch',
              branchId: 'supervisor-branch',
              timezone: 'Africa/Lagos',
              items: [
                {
                  scope: 'BRANCH',
                  scopeKey: 'supervisor-branch',
                  status: 'COMPLETED',
                  updatedAt,
                },
              ],
            },
          },
        }) as never;
      jest
        .mocked(reportsControllerListMaterializationStateV1)
        .mockResolvedValueOnce(stateResponse('2026-10-20T20:00:00.000Z'))
        .mockResolvedValueOnce(stateResponse('2026-10-20T23:31:00.000Z'));
      jest
        .mocked(reportsControllerRefreshSupervisorDashboardV1)
        .mockResolvedValue({ status: 202 } as never);
      render(<SupervisorOperationalReports />);

      await waitFor(() =>
        expect(reportsControllerListExecutiveSummaryV1).toHaveBeenCalledWith(
          { from: '2026-10-14', to: '2026-10-20' },
          expect.any(Object),
        ),
      );
      await waitFor(() =>
        expect(screen.getByLabelText('Operational reports')).toHaveAttribute(
          'aria-busy',
          'false',
        ),
      );
      jest.setSystemTime(new Date('2026-10-20T23:30:00.000Z'));
      const refreshButton = screen.getByRole('button', {
        name: 'Refresh dashboard data',
      });
      await waitFor(() => expect(refreshButton).toBeEnabled());
      fireEvent.click(refreshButton);

      await waitFor(() =>
        expect(reportsControllerListExecutiveSummaryV1).toHaveBeenCalledWith(
          { from: '2026-10-15', to: '2026-10-21' },
          expect.any(Object),
        ),
      );
      expect(
        await screen.findByText('Branch snapshot updated. Reloading reports…'),
      ).toBeInTheDocument();
      await waitFor(() =>
        expect(screen.getByLabelText('Operational reports')).toHaveAttribute(
          'aria-busy',
          'false',
        ),
      );
    } finally {
      jest.useRealTimers();
    }
  });

  it('preserves an explicitly selected custom range when refresh crosses midnight', async () => {
    jest.useFakeTimers({
      now: new Date('2026-10-20T20:30:00.000Z'),
      doNotFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'],
    });
    try {
      const stateResponse = (updatedAt: string) =>
        ({
          status: 200,
          data: {
            data: {
              scope: 'BRANCH',
              scopeKey: 'supervisor-branch',
              branchId: 'supervisor-branch',
              timezone: 'Africa/Lagos',
              items: [
                {
                  scope: 'BRANCH',
                  scopeKey: 'supervisor-branch',
                  status: 'COMPLETED',
                  updatedAt,
                },
              ],
            },
          },
        }) as never;
      jest
        .mocked(reportsControllerListMaterializationStateV1)
        .mockResolvedValueOnce(stateResponse('2026-10-20T20:00:00.000Z'))
        .mockResolvedValueOnce(stateResponse('2026-10-20T23:31:00.000Z'));
      jest
        .mocked(reportsControllerRefreshSupervisorDashboardV1)
        .mockResolvedValue({ status: 202 } as never);
      render(<SupervisorOperationalReports />);
      await waitFor(() =>
        expect(screen.getByLabelText('Operational reports')).toHaveAttribute(
          'aria-busy',
          'false',
        ),
      );

      fireEvent.click(screen.getByRole('button', { name: 'Custom dates' }));
      fireEvent.change(screen.getByLabelText('Summary from date'), {
        target: { value: '2026-08-01' },
      });
      fireEvent.change(screen.getByLabelText('Summary to date'), {
        target: { value: '2026-08-31' },
      });
      fireEvent.click(screen.getByText('Apply dates'));
      await waitFor(() =>
        expect(reportsControllerListExecutiveSummaryV1).toHaveBeenCalledWith(
          { from: '2026-08-01', to: '2026-08-31' },
          expect.any(Object),
        ),
      );
      await waitFor(() =>
        expect(screen.getByLabelText('Operational reports')).toHaveAttribute(
          'aria-busy',
          'false',
        ),
      );

      jest.setSystemTime(new Date('2026-10-20T23:30:00.000Z'));
      const refreshButton = screen.getByRole('button', {
        name: 'Refresh dashboard data',
      });
      await waitFor(() => expect(refreshButton).toBeEnabled());
      fireEvent.click(refreshButton);

      await waitFor(() =>
        expect(reportsControllerListExecutiveSummaryV1).toHaveBeenCalledTimes(
          3,
        ),
      );
      expect(reportsControllerListExecutiveSummaryV1).toHaveBeenLastCalledWith(
        { from: '2026-08-01', to: '2026-08-31' },
        expect.any(Object),
      );
      await waitFor(() =>
        expect(screen.getByLabelText('Operational reports')).toHaveAttribute(
          'aria-busy',
          'false',
        ),
      );
    } finally {
      jest.useRealTimers();
    }
  });

  it('queues tenant-wide Admin materialization and reloads reports when it completes', async () => {
    jest.useFakeTimers({
      now: new Date('2026-10-20T20:30:00.000Z'),
      doNotFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'],
    });
    try {
      const stateResponse = (updatedAt: string) =>
        ({
          status: 200,
          data: {
            data: {
              scope: 'TENANT',
              scopeKey: 'tenant-123',
              timezone: 'Africa/Lagos',
              items: [
                {
                  scope: 'TENANT',
                  scopeKey: 'tenant-123',
                  status: 'COMPLETED',
                  updatedAt,
                },
              ],
            },
          },
        }) as never;
      jest
        .mocked(reportsControllerListMaterializationStateV1)
        .mockResolvedValueOnce(stateResponse('2026-10-20T08:00:00.000Z'))
        .mockResolvedValueOnce(stateResponse('2026-10-20T08:05:00.000Z'));
      jest
        .mocked(reportsControllerRefreshReportV1)
        .mockResolvedValue({ status: 202 } as never);
      render(<OperationalReportsDashboard audience="admin" />);
      await waitFor(() =>
        expect(screen.getByLabelText('Operational reports')).toHaveAttribute(
          'aria-busy',
          'false',
        ),
      );
      await waitFor(() =>
        expect(reportsControllerListExecutiveSummaryV1).toHaveBeenCalledWith(
          expect.objectContaining({
            from: '2026-10-14',
            to: '2026-10-20',
          }),
          expect.any(Object),
        ),
      );

      jest.setSystemTime(new Date('2026-10-20T23:30:00.000Z'));
      fireEvent.click(
        screen.getByRole('button', { name: 'Refresh dashboard data' }),
      );
      await waitFor(() =>
        expect(reportsControllerListExecutiveSummaryV1).toHaveBeenCalledWith(
          expect.objectContaining({
            from: '2026-10-15',
            to: '2026-10-21',
          }),
          expect.any(Object),
        ),
      );
      expect(
        await screen.findByText('Tenant snapshot updated. Reloading reports…'),
      ).toBeInTheDocument();
      expect(reportsControllerRefreshReportV1).toHaveBeenCalledWith(
        'executive-summary',
        { branchId: undefined, timezone: 'Africa/Lagos' },
        expect.objectContaining({
          headers: expect.objectContaining({
            'idempotency-key': expect.any(String),
          }),
        }),
      );
      expect(
        reportsControllerListMaterializationStateV1,
      ).toHaveBeenNthCalledWith(
        1,
        { branchId: undefined, timezone: 'Africa/Lagos' },
        expect.any(Object),
      );
      await waitFor(() =>
        expect(reportsControllerListExecutiveSummaryV1).toHaveBeenCalledTimes(
          3,
        ),
      );
      await waitFor(() =>
        expect(screen.getByLabelText('Operational reports')).toHaveAttribute(
          'aria-busy',
          'false',
        ),
      );
    } finally {
      jest.useRealTimers();
    }
  });

  it('keeps Admin materialization branch-scoped when a branch filter is selected', async () => {
    const stateResponse = (updatedAt: string) =>
      ({
        status: 200,
        data: {
          data: {
            scope: 'BRANCH',
            scopeKey: 'branch-123',
            branchId: 'branch-123',
            timezone: 'Africa/Lagos',
            items: [
              {
                scope: 'BRANCH',
                scopeKey: 'branch-123',
                status: 'COMPLETED',
                updatedAt,
              },
            ],
          },
        },
      }) as never;
    jest
      .mocked(reportsControllerListMaterializationStateV1)
      .mockResolvedValueOnce(stateResponse('2026-10-20T08:00:00.000Z'))
      .mockResolvedValueOnce(stateResponse('2026-10-20T08:05:00.000Z'));
    jest
      .mocked(reportsControllerRefreshReportV1)
      .mockResolvedValue({ status: 202 } as never);
    render(<OperationalReportsDashboard audience="admin" />);
    await waitFor(() =>
      expect(screen.getByLabelText('Operational reports')).toHaveAttribute(
        'aria-busy',
        'false',
      ),
    );

    fireEvent.click(screen.getByText('Admin scope filters'));
    fireEvent.change(screen.getByLabelText('Admin branch filter'), {
      target: { value: 'branch-123' },
    });
    fireEvent.change(screen.getByLabelText('Admin timezone filter'), {
      target: { value: 'Africa/Lagos' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Apply scope' }));
    await waitFor(() =>
      expect(reportsControllerListExecutiveSummaryV1).toHaveBeenLastCalledWith(
        expect.objectContaining({
          branchId: 'branch-123',
          timezone: 'Africa/Lagos',
        }),
        expect.any(Object),
      ),
    );
    await waitFor(() =>
      expect(screen.getByLabelText('Operational reports')).toHaveAttribute(
        'aria-busy',
        'false',
      ),
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'Refresh dashboard data' }),
    );
    expect(
      await screen.findByText('Branch snapshot updated. Reloading reports…'),
    ).toBeInTheDocument();
    expect(reportsControllerRefreshReportV1).toHaveBeenCalledWith(
      'executive-summary',
      { branchId: 'branch-123', timezone: 'Africa/Lagos' },
      expect.objectContaining({
        headers: expect.objectContaining({
          'idempotency-key': expect.any(String),
        }),
      }),
    );
    expect(reportsControllerListMaterializationStateV1).toHaveBeenNthCalledWith(
      1,
      { branchId: 'branch-123', timezone: 'Africa/Lagos' },
      expect.any(Object),
    );
    await waitFor(() =>
      expect(reportsControllerListExecutiveSummaryV1).toHaveBeenCalledTimes(3),
    );
    await waitFor(() =>
      expect(screen.getByLabelText('Operational reports')).toHaveAttribute(
        'aria-busy',
        'false',
      ),
    );
  });

  it('applies custom dates to every category and the report builder', async () => {
    render(<SupervisorOperationalReports />);
    fireEvent.click(screen.getByRole('button', { name: 'Custom dates' }));
    fireEvent.change(screen.getByLabelText('Summary from date'), {
      target: { value: '2026-08-01' },
    });
    fireEvent.change(screen.getByLabelText('Summary to date'), {
      target: { value: '2026-08-31' },
    });
    fireEvent.click(screen.getByText('Apply dates'));
    await waitFor(() =>
      expect(reportsControllerListRedemptionSummaryV1).toHaveBeenCalledWith(
        { from: '2026-08-01', to: '2026-08-31' },
        expect.any(Object),
      ),
    );
    fireEvent.click(screen.getByRole('tab', { name: 'Reports' }));
    expect(screen.getByTestId('report-builder')).toHaveTextContent(
      '2026-08-01 — 2026-08-31',
    );
    fireEvent.click(screen.getByRole('tab', { name: 'Overview' }));
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Summary category: Overall activity',
      }),
    );
    fireEvent.click(
      screen.getByRole('option', { name: 'Cashier performance' }),
    );
    expect(screen.getByText('Duplicate attempts')).toBeInTheDocument();
    expect(screen.getByText('Fraud flags')).toBeInTheDocument();
  });

  it('rejects an inverted date range without triggering new report requests', async () => {
    render(<SupervisorOperationalReports />);
    await screen.findAllByText(/7,000\.00/);
    fireEvent.click(screen.getByRole('button', { name: 'Custom dates' }));
    fireEvent.change(screen.getByLabelText('Summary from date'), {
      target: { value: '2026-09-30' },
    });
    fireEvent.change(screen.getByLabelText('Summary to date'), {
      target: { value: '2026-09-01' },
    });
    fireEvent.click(screen.getByText('Apply dates'));
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Choose a valid start date',
    );
    expect(reportsControllerListExecutiveSummaryV1).toHaveBeenCalledTimes(1);
  });

  it('does not fabricate financial values on a failed report response', async () => {
    jest
      .mocked(reportsControllerListExecutiveSummaryV1)
      .mockRejectedValue(new Error('Service unavailable'));
    render(<SupervisorOperationalReports />);
    expect(await screen.findAllByText("Couldn't load")).toHaveLength(4);
    expect(
      await screen.findAllByText('Reporting service unavailable'),
    ).not.toHaveLength(0);
    expect(screen.queryByText('₦0.00')).not.toBeInTheDocument();
  });

  it('shows a confirmed empty response as no data rather than a zero value', async () => {
    jest
      .mocked(reportsControllerListExecutiveSummaryV1)
      .mockResolvedValue(response([]));
    render(<SupervisorOperationalReports />);

    expect(await screen.findAllByText('No data yet')).not.toHaveLength(0);
    expect(screen.queryByText('₦0.00')).not.toBeInTheDocument();
  });

  it('displays a 429 retry countdown and disables report refresh actions', async () => {
    jest.mocked(reportsControllerListExecutiveSummaryV1).mockResolvedValue({
      status: 429,
      headers: new Headers(),
      data: {
        success: false,
        error: {
          statusCode: 429,
          code: 'RATE_LIMITED',
          message: 'Too many requests',
        },
        meta: { requestId: 'req-rate-limited' },
      },
    } as never);
    render(<SupervisorOperationalReports />);

    expect(
      await screen.findAllByText('Try again in 60 seconds.'),
    ).not.toHaveLength(0);
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Refresh dashboard data' }),
      ).toBeDisabled(),
    );
    expect(screen.getAllByText('req-rate-limited').length).toBeGreaterThan(0);
  });

  it('supports deep links and keeps report sections URL-backed and stateful', async () => {
    window.history.replaceState({}, '', '/supervisor/reports?tab=insights');
    render(<SupervisorOperationalReports />);

    const insightsTab = screen.getByRole('tab', { name: 'Insights' });
    expect(insightsTab).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel', { name: 'Insights' })).toBeVisible();
    fireEvent.click(screen.getByRole('tab', { name: 'Reports' }));
    expect(window.location.search).toBe('?tab=reports');
    expect(screen.getByTestId('report-builder')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Overview' }));
    expect(window.location.search).toBe('');
    expect(screen.getByTestId('report-builder')).toBeInTheDocument();
    window.history.replaceState({}, '', '/');
  });
});
