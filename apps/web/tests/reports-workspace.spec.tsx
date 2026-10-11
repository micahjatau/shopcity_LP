import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ReportsWorkspace } from '../components/workflows/reports-workspace';
import { formatReportBusinessDate } from '../components/workflows/report-ui';
import {
  reportsControllerListExecutiveSummaryV1,
  reportsControllerRefreshReportV1,
} from '../lib/api/generated-client';

jest.mock('../lib/api/generated-client', () => ({
  getReportsControllerExportReportV1Url: jest.fn(() => '/api/export.csv'),
  notificationsControllerListTransactionSmsV1: jest.fn(),
  reportsControllerGetPilotOperationsSummaryV1: jest.fn(),
  reportsControllerListAuditReportV1: jest.fn(),
  reportsControllerListCashierActivityV1: jest.fn(),
  reportsControllerListCustomerPerformanceV1: jest.fn(),
  reportsControllerListExecutiveSummaryV1: jest.fn(),
  reportsControllerListLiabilityAgeingV1: jest.fn(),
  reportsControllerListMaterializationStateV1: jest.fn(),
  reportsControllerListRedemptionSummaryV1: jest.fn(),
  reportsControllerListSmsOperationsV1: jest.fn(),
  reportsControllerRefreshReportV1: jest.fn(),
}));

describe('ReportsWorkspace', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(reportsControllerListExecutiveSummaryV1).mockResolvedValue({
      status: 200,
      data: {
        data: {
          scope: 'TENANT',
          scopeKey: 'tenant-1',
          branchId: null,
          timezone: 'Africa/Lagos',
          items: [],
        },
      },
    } as never);
  });

  it('uses the shared supervisor period without exposing raw branch controls', async () => {
    const { rerender } = render(
      <ReportsWorkspace
        period={{ from: '2026-09-01', to: '2026-09-07' }}
        hideScopeInputs
      />,
    );

    await waitFor(() => {
      expect(reportsControllerListExecutiveSummaryV1).toHaveBeenCalledWith(
        expect.objectContaining({
          from: '2026-09-01',
          to: '2026-09-07',
          branchId: undefined,
        }),
        expect.any(Object),
      );
    });
    expect(screen.queryByLabelText('Branch filter')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('From date')).not.toBeInTheDocument();

    rerender(
      <ReportsWorkspace
        period={{ from: '2026-09-08', to: '2026-09-30' }}
        hideScopeInputs
      />,
    );
    await waitFor(() => {
      expect(reportsControllerListExecutiveSummaryV1).toHaveBeenCalledWith(
        expect.objectContaining({
          from: '2026-09-08',
          to: '2026-09-30',
          branchId: undefined,
        }),
        expect.any(Object),
      );
    });
  });

  it('renders an explicit empty state for reports without rows', async () => {
    render(<ReportsWorkspace />);

    await waitFor(() => {
      expect(screen.getByText('No report rows')).toBeInTheDocument();
    });
    expect(
      screen.getByText(
        'The selected report returned no rows for the current filters.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('region', { name: 'Detailed report builder' }),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText('Branch filter')).toBeInTheDocument();
    expect(
      screen.getByRole('option', { name: 'Audit report' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('option', { name: 'Pilot operations summary' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Refresh materialization' }),
    ).toBeEnabled();
  });

  it('uses the Supervisor presentation, server scope, and only role-exposed report options', async () => {
    jest.mocked(reportsControllerListExecutiveSummaryV1).mockResolvedValue({
      status: 200,
      data: {
        data: {
          scope: 'BRANCH',
          branchId: 'branch-123',
          timezone: 'Africa/Lagos',
          items: [],
        },
      },
    } as never);
    render(
      <ReportsWorkspace
        presentation="supervisor"
        period={{ from: '2026-09-01', to: '2026-09-07' }}
        hideScopeInputs
        canRefreshReports={false}
        canUseAuditReport={false}
        canUsePilotOperationsSummary={false}
        canUseMaterializationState
      />,
    );

    await screen.findByText('No report rows');
    const reportPicker = screen.getByRole('combobox', { name: 'Report' });
    expect(reportPicker).toHaveValue('executive-summary');
    expect(
      screen.queryByRole('option', { name: 'Audit report' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('option', { name: 'Pilot operations summary' }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('option', { name: 'Materialization state' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Copy Branch ID: branch-123' }),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText('Branch filter')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Refresh materialization' }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Export CSV' })).toBeDisabled();
  });

  it('formats report values, selects rows accessibly, and paginates loaded results', async () => {
    const items = Array.from({ length: 11 }, (_, index) => ({
      customerId: `customer-${index}`,
      purchaseValueKobo: index === 1 ? 0 : 123456,
      reportDate: `2026-09-${String(index + 1).padStart(2, '0')}T00:00:00.000Z`,
      createdAt: '2026-09-01T10:00:00.000Z',
      attributes: { state: 'ACTIVE' },
      unavailable: null,
    }));
    jest.mocked(reportsControllerListExecutiveSummaryV1).mockResolvedValue({
      status: 200,
      data: {
        data: {
          scope: 'BRANCH',
          branchId: 'branch-123',
          timezone: 'Africa/Lagos',
          items,
        },
      },
    } as never);
    render(
      <ReportsWorkspace
        presentation="supervisor"
        period={{ from: '2026-09-01', to: '2026-09-30' }}
        hideScopeInputs
        canRefreshReports={false}
        canUseAuditReport={false}
        canUsePilotOperationsSummary={false}
      />,
    );

    expect(
      await screen.findByText('Showing 1–10 of 11 loaded rows'),
    ).toBeInTheDocument();
    const firstRowButton = screen.getAllByRole('button', {
      name: /^View details for /,
    })[0];
    expect(firstRowButton).toHaveAccessibleName(
      `View details for ${formatReportBusinessDate(items[0].reportDate)}`,
    );
    expect(screen.getAllByText('₦1,234.56').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Sep/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/WAT/).length).toBeGreaterThan(0);
    expect(screen.queryByText('Unavailable')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Export CSV' })).toBeEnabled();

    fireEvent.click(
      screen.getAllByRole('button', { name: /^View details for / })[1],
    );
    expect(screen.getAllByText('₦0.00').length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: 'Next report page' }));
    expect(
      screen.getByText('Showing 11–11 of 11 loaded rows'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: `View details for ${formatReportBusinessDate(items[10].reportDate)}`,
      }),
    ).toBeInTheDocument();
  });

  it('exposes Admin reports and refresh while applying dashboard scope', async () => {
    jest.mocked(reportsControllerListExecutiveSummaryV1).mockResolvedValue({
      status: 200,
      data: {
        data: {
          scope: 'BRANCH',
          branchId: 'branch-123',
          timezone: 'Africa/Lagos',
          items: [{ reportDate: '2026-09-07T00:00:00.000Z' }],
        },
      },
    } as never);
    jest.mocked(reportsControllerRefreshReportV1).mockResolvedValue({
      status: 202,
      data: { data: { status: 'accepted' } },
    } as never);
    render(
      <ReportsWorkspace
        presentation="admin"
        period={{ from: '2026-09-01', to: '2026-09-07' }}
        hideScopeInputs
        scopeFilters={{ branchId: 'branch-123', timezone: 'Africa/Lagos' }}
      />,
    );

    await waitFor(() =>
      expect(reportsControllerListExecutiveSummaryV1).toHaveBeenCalledWith(
        expect.objectContaining({
          branchId: 'branch-123',
          timezone: 'Africa/Lagos',
          from: '2026-09-01',
          to: '2026-09-07',
        }),
        expect.any(Object),
      ),
    );
    await screen.findByRole('button', {
      name: 'Copy Branch ID: branch-123',
    });
    expect(
      screen.getByRole('option', { name: 'Audit report' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('option', { name: 'Pilot operations summary' }),
    ).toBeInTheDocument();
    const refreshButton = screen.getByRole('button', {
      name: 'Refresh materialization',
    });
    expect(refreshButton).toBeEnabled();
    fireEvent.click(refreshButton);
    await waitFor(() =>
      expect(reportsControllerRefreshReportV1).toHaveBeenCalledWith(
        'executive-summary',
        expect.objectContaining({
          branchId: 'branch-123',
          timezone: 'Africa/Lagos',
        }),
        expect.any(Object),
      ),
    );
  });

  it('shows a per-report 429 countdown and disables reporting actions', async () => {
    const onRateLimited = jest.fn();
    jest.mocked(reportsControllerListExecutiveSummaryV1).mockResolvedValue({
      status: 429,
      headers: new Headers({ 'Retry-After': '12' }),
      data: {
        success: false,
        error: {
          statusCode: 429,
          code: 'RATE_LIMITED',
          message: 'Too many requests',
        },
        meta: { requestId: 'req-report-limit' },
      },
    } as never);
    render(
      <ReportsWorkspace
        presentation="supervisor"
        hideScopeInputs
        canRefreshReports={false}
        canUseAuditReport={false}
        canUsePilotOperationsSummary={false}
        rateLimitSeconds={12}
        onRateLimited={onRateLimited}
      />,
    );

    expect(
      await screen.findByRole('heading', {
        name: 'Report request limit reached',
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('Try again in 12 seconds.')).toBeInTheDocument();
    expect(onRateLimited).toHaveBeenCalledWith(12);
    expect(screen.getByRole('button', { name: 'Load report' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Export CSV' })).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Copy Reference: req-report-limit' }),
    ).toBeInTheDocument();
  });

  it('shows forbidden report errors with a copyable request reference', async () => {
    jest.mocked(reportsControllerListExecutiveSummaryV1).mockResolvedValue({
      status: 403,
      headers: new Headers(),
      data: {
        success: false,
        error: { statusCode: 403, code: 'FORBIDDEN', message: 'Forbidden' },
        meta: { requestId: 'req-forbidden' },
      },
    } as never);
    render(
      <ReportsWorkspace
        presentation="supervisor"
        hideScopeInputs
        canRefreshReports={false}
        canUseAuditReport={false}
        canUsePilotOperationsSummary={false}
      />,
    );

    expect(
      await screen.findByRole('heading', {
        name: "You don't have access to this report",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Copy Reference: req-forbidden' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Refresh materialization' }),
    ).not.toBeInTheDocument();
  });
});
