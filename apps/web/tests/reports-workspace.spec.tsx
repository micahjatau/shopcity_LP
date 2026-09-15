import { render, screen, waitFor } from '@testing-library/react';
import { ReportsWorkspace } from '../components/workflows/reports-workspace';
import { reportsControllerListExecutiveSummaryV1 } from '../lib/api/generated-client';

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
  });
});
