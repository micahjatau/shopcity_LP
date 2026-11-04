import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { ReportsWorkspace } from '../components/workflows/reports-workspace';
import {
  formatReportBusinessDate,
  formatSupervisorReportFieldLabel,
} from '../components/workflows/report-ui';
import {
  branchesControllerListBranchesV1,
  reportsControllerGetPilotOperationsSummaryV1,
  reportsControllerListExecutiveSummaryV1,
  reportsControllerRefreshReportV1,
} from '../lib/api/generated-client';

jest.mock('../lib/api/generated-client', () => ({
  branchesControllerListBranchesV1: jest.fn(),
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
  it('uses the shared plain-language label dictionary for report fields', () => {
    expect(formatSupervisorReportFieldLabel('reportDate')).toBe('Report date');
    expect(formatSupervisorReportFieldLabel('duplicateAttempts')).toBe(
      'Duplicate receipt attempts',
    );
    expect(formatSupervisorReportFieldLabel('sentCount')).toBe(
      'Submitted to provider',
    );
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(branchesControllerListBranchesV1).mockResolvedValue({
      status: 200,
      data: { data: [] },
    } as never);
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
    expect(screen.getByLabelText('Timezone filter')).toBeInTheDocument();
    expect(screen.getByLabelText('From date')).toBeInTheDocument();
    expect(screen.getByLabelText('To date')).toBeInTheDocument();
    expect(
      screen.getByRole('region', { name: 'Report status' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('region', { name: 'Selected report item' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('table', { name: 'Summary items' }),
    ).not.toBeInTheDocument();
    expect(branchesControllerListBranchesV1).not.toHaveBeenCalled();
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

  it('keeps report status badges by default for shared callers', async () => {
    const { container } = render(<ReportsWorkspace />);

    await screen.findByText('No report rows');

    expect(container.querySelectorAll('.sc-badge').length).toBeGreaterThan(0);
  });

  it('omits status badges when requested while retaining selected-item semantics', async () => {
    jest.mocked(reportsControllerListExecutiveSummaryV1).mockResolvedValueOnce({
      status: 200,
      data: {
        data: {
          scope: 'TENANT',
          scopeKey: 'tenant-1',
          branchId: null,
          timezone: 'Africa/Lagos',
          items: [{ reportDate: '2026-09-01', transactionCount: 2 }],
        },
      },
    } as never);
    const { container } = render(<ReportsWorkspace showStatusBadges={false} />);

    const selectedItem = await screen.findByRole('button', {
      name: /Report date/i,
    });

    expect(selectedItem).toHaveAttribute('aria-pressed', 'true');
    expect(container.querySelectorAll('.sc-badge')).toHaveLength(0);
  });

  it('combines report context with summary rows and opens selected details in a closable dialog', async () => {
    jest.mocked(reportsControllerListExecutiveSummaryV1).mockResolvedValueOnce({
      status: 200,
      data: {
        data: {
          scope: 'TENANT',
          scopeKey: 'tenant-1',
          branchId: null,
          timezone: 'Africa/Lagos',
          items: [
            {
              reportDate: '2026-09-01T00:00:00.000Z',
              transactionCount: 3,
              salesValueKobo: 123456,
            },
          ],
        },
      },
    } as never);
    render(
      <ReportsWorkspace
        showStatusBadges={false}
        summaryItemsPresentation="table-dialog"
      />,
    );

    const summaryTable = await screen.findByRole('table', {
      name: 'Summary items',
    });
    const resultSurface = screen.getByRole('region', {
      name: 'Report results',
    });
    expect(
      within(resultSurface).getByRole('heading', { name: 'Summary items' }),
    ).toBeInTheDocument();
    expect(
      within(resultSurface).queryByRole('heading', { name: 'Current report' }),
    ).not.toBeInTheDocument();
    expect(
      within(resultSurface).getByText(
        'Selected filters: All branches · Time zone: Africa/Lagos · Date range: Default report window',
      ),
    ).toHaveClass('reports-workspace__summary-subtext');
    expect(
      within(resultSurface).getByText('Executive summary loaded.'),
    ).toHaveClass('reports-workspace__summary-status');
    expect(
      within(resultSurface).queryByText('Current filters'),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('region', { name: 'Report status' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('region', { name: 'Selected report item' }),
    ).not.toBeInTheDocument();

    expect(within(summaryTable).getAllByRole('row')).toHaveLength(2);
    expect(
      within(summaryTable).getByRole('columnheader', { name: 'Report date' }),
    ).toBeInTheDocument();
    expect(
      within(summaryTable).getByRole('columnheader', { name: 'Transactions' }),
    ).toHaveAttribute('data-numeric', 'true');
    expect(
      within(summaryTable).getByRole('columnheader', { name: 'Sales value' }),
    ).toHaveAttribute('data-numeric', 'true');
    expect(within(summaryTable).getByText('₦1,234.56')).toBeInTheDocument();
    const itemTrigger = within(summaryTable).getByRole('button', {
      name: /^View details for Report date:/i,
    });
    fireEvent.click(itemTrigger);

    const dialog = screen.getByRole('dialog', { name: 'Selected item' });
    expect(
      within(dialog).getByRole('table', { name: 'Selected item details' }),
    ).toBeInTheDocument();
    expect(within(dialog).getByText('Transactions')).toBeInTheDocument();
    fireEvent.click(
      within(dialog).getByRole('button', {
        name: 'Close selected item details',
      }),
    );
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
  });

  it('renders report-specific table columns and paginates summary rows', async () => {
    jest.mocked(reportsControllerListExecutiveSummaryV1).mockResolvedValueOnce({
      status: 200,
      data: {
        data: {
          scope: 'TENANT',
          timezone: 'Africa/Lagos',
          items: Array.from({ length: 12 }, (_, index) => ({
            reportDate: `2026-09-${String(index + 1).padStart(2, '0')}`,
            transactionCount: index + 1,
            salesValueKobo: (index + 1) * 100,
          })),
        },
      },
    } as never);
    render(
      <ReportsWorkspace
        showStatusBadges={false}
        summaryItemsPresentation="table-dialog"
      />,
    );

    const summaryTable = await screen.findByRole('table', {
      name: 'Summary items',
    });
    expect(
      within(summaryTable).getByRole('columnheader', { name: 'Report date' }),
    ).toBeInTheDocument();
    expect(
      within(summaryTable).getByRole('columnheader', { name: 'Transactions' }),
    ).toHaveAttribute('data-numeric', 'true');
    expect(within(summaryTable).getAllByRole('row')).toHaveLength(11);
    expect(
      screen.getByText('Showing 1–10 of 12 loaded rows'),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Next report page' }));
    expect(within(summaryTable).getAllByRole('row')).toHaveLength(3);
    expect(
      screen.getByText('Showing 11–12 of 12 loaded rows'),
    ).toBeInTheDocument();
  });

  it('does not present tenant-wide summary controls as effective filters', async () => {
    jest
      .mocked(reportsControllerGetPilotOperationsSummaryV1)
      .mockResolvedValueOnce({
        status: 200,
        data: {
          data: {
            release: { version: 'local', sha: 'abc1234' },
            generatedAt: '2026-09-01T10:00:00.000Z',
            outbox: { backlogCount: 0, staleCount: 0 },
          },
        },
      } as never);
    render(
      <ReportsWorkspace
        loadTenantBranchOptions
        showStatusBadges={false}
        summaryItemsPresentation="table-dialog"
      />,
    );

    fireEvent.change(screen.getByLabelText('Report'), {
      target: { value: 'pilot-operations-summary' },
    });

    const filterContext = await screen.findByText(
      'Tenant-wide summary · Branch and date filters do not apply.',
    );
    expect(filterContext).toHaveClass('reports-workspace__summary-subtext');
    expect(
      await screen.findByText('Pilot operations summary loaded.'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Current filters')).not.toBeInTheDocument();
  });

  it('uses tenant branch options and Supervisor-style date presets with branch timezone', async () => {
    jest.mocked(branchesControllerListBranchesV1).mockResolvedValueOnce({
      status: 200,
      data: {
        data: [
          {
            id: 'branch-123',
            name: 'Lagos branch',
            timezone: 'Africa/Lagos',
          },
          {
            id: 'branch-456',
            name: 'London branch',
            timezone: 'Europe/London',
          },
        ],
      },
    } as never);
    render(
      <ReportsWorkspace
        loadTenantBranchOptions
        showStatusBadges={false}
        summaryItemsPresentation="table-dialog"
      />,
    );

    const branchFilter = await screen.findByRole('combobox', {
      name: 'Branch filter',
    });
    await screen.findByText('No report rows');
    await waitFor(() => expect(branchFilter).toBeEnabled());

    expect(branchFilter).toHaveValue('');
    expect(
      screen.getByRole('option', { name: 'All branches' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('option', { name: 'London branch' }),
    ).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Branch ID')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Timezone filter')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('From date')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('To date')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'All dates' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(branchesControllerListBranchesV1).toHaveBeenCalledTimes(1);
    expect(reportsControllerListExecutiveSummaryV1).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ branchId: undefined, timezone: undefined }),
      expect.any(Object),
    );

    fireEvent.change(branchFilter, { target: { value: 'branch-456' } });
    await waitFor(() =>
      expect(
        screen.getByText(
          'Selected filters: London branch · Time zone: Europe/London · Date range: Default report window',
        ),
      ).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Last 7 days' }));
    expect(screen.getByRole('button', { name: 'Last 7 days' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.queryByLabelText('From date')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Load report' }));

    await waitFor(() =>
      expect(reportsControllerListExecutiveSummaryV1).toHaveBeenLastCalledWith(
        expect.objectContaining({
          branchId: 'branch-456',
          timezone: 'Europe/London',
          from: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
          to: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        }),
        expect.any(Object),
      ),
    );
    const weekParams = jest
      .mocked(reportsControllerListExecutiveSummaryV1)
      .mock.calls.at(-1)?.[0];
    expect(weekParams?.from).toBeDefined();
    expect(weekParams?.to).toBeDefined();
    const weekEnd = new Date(`${weekParams?.to}T12:00:00.000Z`);
    weekEnd.setUTCDate(weekEnd.getUTCDate() - 6);
    expect(weekParams?.from).toBe(weekEnd.toISOString().slice(0, 10));

    fireEvent.click(screen.getByRole('button', { name: 'Custom dates' }));
    const fromDate = await screen.findByLabelText('From date');
    const toDate = screen.getByLabelText('To date');
    fireEvent.change(fromDate, { target: { value: '2026-11-03' } });
    fireEvent.change(toDate, { target: { value: '2026-11-02' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply dates' }));
    expect(
      await screen.findByText(
        'Choose a valid start date on or before the end date.',
      ),
    ).toBeInTheDocument();

    fireEvent.change(fromDate, { target: { value: '2026-10-25' } });
    fireEvent.change(toDate, { target: { value: '2026-11-02' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply dates' }));
    expect(
      screen.getByText(
        'Selected filters: London branch · Time zone: Europe/London · Date range: 2026-10-25 to 2026-11-02',
      ),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Load report' }));
    await waitFor(() =>
      expect(reportsControllerListExecutiveSummaryV1).toHaveBeenLastCalledWith(
        expect.objectContaining({
          branchId: 'branch-456',
          timezone: 'Europe/London',
          from: '2026-10-25',
          to: '2026-11-02',
        }),
        expect.any(Object),
      ),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Last 30 days' }));
    fireEvent.click(screen.getByRole('button', { name: 'Load report' }));
    await waitFor(() =>
      expect(reportsControllerListExecutiveSummaryV1).toHaveBeenLastCalledWith(
        expect.objectContaining({
          branchId: 'branch-456',
          timezone: 'Europe/London',
          from: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
          to: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        }),
        expect.any(Object),
      ),
    );
    const monthParams = jest
      .mocked(reportsControllerListExecutiveSummaryV1)
      .mock.calls.at(-1)?.[0];
    const monthEnd = new Date(`${monthParams?.to}T12:00:00.000Z`);
    monthEnd.setUTCDate(monthEnd.getUTCDate() - 29);
    expect(monthParams?.from).toBe(monthEnd.toISOString().slice(0, 10));

    fireEvent.click(screen.getByRole('button', { name: 'All dates' }));
    fireEvent.click(screen.getByRole('button', { name: 'Load report' }));
    await waitFor(() =>
      expect(reportsControllerListExecutiveSummaryV1).toHaveBeenLastCalledWith(
        expect.objectContaining({
          branchId: 'branch-456',
          timezone: 'Europe/London',
        }),
        expect.any(Object),
      ),
    );
    const allDatesParams = jest
      .mocked(reportsControllerListExecutiveSummaryV1)
      .mock.calls.at(-1)?.[0];
    expect(allDatesParams?.from).toBeUndefined();
    expect(allDatesParams?.to).toBeUndefined();
  });

  it('reports unavailable tenant branch options without enabling a guessed filter', async () => {
    jest.mocked(branchesControllerListBranchesV1).mockResolvedValueOnce({
      status: 503,
      data: {},
    } as never);
    render(<ReportsWorkspace loadTenantBranchOptions />);

    const branchFilter = await screen.findByRole('combobox', {
      name: 'Branch filter',
    });
    expect(
      await screen.findByText(
        'Branch options are unavailable. The report scope remains all branches.',
      ),
    ).toBeInTheDocument();
    expect(branchFilter).toBeDisabled();
    expect(branchFilter).toHaveValue('');
    expect(screen.queryByPlaceholderText('Branch ID')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Timezone filter')).not.toBeInTheDocument();
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
