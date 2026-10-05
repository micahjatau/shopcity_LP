import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SupervisorOperationalReports } from '../components/workflows/supervisor-operational-reports';
import {
  reportsControllerListCashierActivityV1,
  reportsControllerListExecutiveSummaryV1,
  reportsControllerListRedemptionSummaryV1,
  reportsControllerListSmsOperationsV1,
} from '../lib/api/generated-client';
import { recentReportPeriod } from '../lib/reports/supervisor-report-metrics';

jest.mock('../lib/api/generated-client', () => ({
  reportsControllerListCashierActivityV1: jest.fn(),
  reportsControllerListExecutiveSummaryV1: jest.fn(),
  reportsControllerListRedemptionSummaryV1: jest.fn(),
  reportsControllerListSmsOperationsV1: jest.fn(),
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
      expect(screen.getByText(/7,000\.00/)).toBeInTheDocument(),
    );
    expect(screen.getByText(/140\.00/)).toBeInTheDocument();
    expect(screen.getByText(/60\.00/)).toBeInTheDocument();
    expect(screen.getByText(/2,300\.00/)).toBeInTheDocument();
    const period = recentReportPeriod(7);
    expect(reportsControllerListExecutiveSummaryV1).toHaveBeenCalledWith(
      { from: period.from, to: period.to },
      expect.any(Object),
    );
    expect(screen.getByTestId('report-builder')).toHaveTextContent(period.from);
    expect(screen.getByTestId('report-builder')).toHaveTextContent(
      'branch-scoped',
    );
  });

  it('applies custom dates to every category and the report builder', async () => {
    render(<SupervisorOperationalReports />);
    fireEvent.change(screen.getByLabelText('Reporting period'), {
      target: { value: 'custom' },
    });
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
    expect(screen.getByTestId('report-builder')).toHaveTextContent(
      '2026-08-01 — 2026-08-31',
    );
    fireEvent.change(screen.getByLabelText('Summary category'), {
      target: { value: 'cashiers' },
    });
    expect(screen.getByText('Duplicate attempts')).toBeInTheDocument();
    expect(screen.getByText('Fraud flags')).toBeInTheDocument();
  });

  it('rejects an inverted date range without triggering new report requests', async () => {
    render(<SupervisorOperationalReports />);
    await screen.findByText(/7,000\.00/);
    fireEvent.change(screen.getByLabelText('Reporting period'), {
      target: { value: 'custom' },
    });
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
    await waitFor(() =>
      expect(
        screen.getByText(/financial could not be loaded/),
      ).toBeInTheDocument(),
    );
    expect(
      screen.getByText('No materialized daily financial rows for this period.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('This report category is unavailable. Try Refresh.'),
    ).toBeInTheDocument();
  });
});
