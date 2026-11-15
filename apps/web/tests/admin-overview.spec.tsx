import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import * as axe from 'axe-core';
import { AdminOverview } from '../components/workflows/admin-overview';
import {
  approvalsControllerListApprovalsV1,
  auditControllerListV1,
  reportsControllerGetAdminOverviewMetricsV1,
  reportsControllerListExecutiveSummaryV1,
  reportsControllerListMaterializationStateV1,
} from '../lib/api/generated-client';
import { recentReportPeriod } from '../lib/reports/supervisor-report-metrics';

jest.mock('../lib/api/generated-client', () => ({
  approvalsControllerListApprovalsV1: jest.fn(),
  auditControllerListV1: jest.fn(),
  reportsControllerGetAdminOverviewMetricsV1: jest.fn(),
  reportsControllerListExecutiveSummaryV1: jest.fn(),
  reportsControllerListMaterializationStateV1: jest.fn(),
}));

const meta = {
  timestamp: '2026-10-27T12:00:00.000Z',
  path: '/api/v1/reports/executive-summary',
  requestId: 'request-overview-test',
};

function reportResponse(items: unknown[]) {
  return {
    status: 200,
    headers: new Headers(),
    data: {
      success: true,
      data: {
        scope: 'TENANT',
        scopeKey: 'tenant-1',
        branchId: null,
        timezone: 'Africa/Lagos',
        items,
      },
      meta,
    },
  } as never;
}

function activeCardResponse(activeVirtualCardCount = 36) {
  return {
    status: 200,
    headers: new Headers(),
    data: {
      success: true,
      data: { activeVirtualCardCount },
      meta,
    },
  } as never;
}

function materializationResponse(status = 'COMPLETED') {
  return {
    status: 200,
    headers: new Headers(),
    data: {
      success: true,
      data: {
        scope: 'TENANT',
        scopeKey: 'tenant-1',
        branchId: null,
        timezone: 'Africa/Lagos',
        items: [
          {
            status,
            materializedAt: '2026-10-27T11:00:00.000Z',
            updatedAt: '2026-10-27T11:00:00.000Z',
          },
        ],
      },
      meta,
    },
  } as never;
}

function approvalResponse(totalCount?: number) {
  return {
    status: 200,
    headers: new Headers(),
    data: {
      success: true,
      data: { items: [], totalCount },
      meta,
    },
  } as never;
}

function activityResponse(items: unknown[]) {
  return {
    status: 200,
    headers: new Headers(),
    data: { success: true, data: items, meta },
  } as never;
}

function reportRows() {
  const period = recentReportPeriod(7);
  return [
    {
      reportDate: `${period.from}T00:00:00.000Z`,
      activeCustomers: 25,
      registeredCustomers: 80,
      creditIssuedKobo: 120_000,
      creditRedeemedKobo: 45_000,
      outstandingLiabilityKobo: 900_000,
    },
    {
      reportDate: `${period.to}T00:00:00.000Z`,
      activeCustomers: 27,
      registeredCustomers: 83,
      creditIssuedKobo: 70_000,
      creditRedeemedKobo: 30_000,
      outstandingLiabilityKobo: 940_000,
    },
  ];
}

function setupResponses() {
  const rows = reportRows();
  jest
    .mocked(reportsControllerListExecutiveSummaryV1)
    .mockResolvedValue(reportResponse(rows));
  jest
    .mocked(reportsControllerGetAdminOverviewMetricsV1)
    .mockResolvedValue(activeCardResponse());
  jest
    .mocked(reportsControllerListMaterializationStateV1)
    .mockResolvedValue(materializationResponse());
  jest
    .mocked(approvalsControllerListApprovalsV1)
    .mockResolvedValue(approvalResponse(4));
  jest.mocked(auditControllerListV1).mockResolvedValue(
    activityResponse([
      {
        id: 'event-1',
        action: 'card.status',
        entityType: 'card',
        entityId: 'card-1',
        actorId: 'staff-id',
        createdAt: new Date(Date.now() - 60_000).toISOString(),
      },
      {
        id: 'event-2',
        action: 'custom.action_code',
        entityType: 'unknown_type',
        createdAt: new Date(Date.now() - 120_000).toISOString(),
      },
    ]),
  );
}

describe('Admin Overview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupResponses();
  });

  it('loads four existing tenant data sources once and maps supported live values', async () => {
    render(<AdminOverview />);

    expect(await screen.findByText('27')).toBeInTheDocument();
    expect(screen.getByText('36')).toBeInTheDocument();
    expect(screen.getByText('₦1.9K')).toBeInTheDocument();
    expect(screen.getByText('₦750.00')).toBeInTheDocument();
    expect(screen.getByText('₦9.4K')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText(/cumulative snapshots/)).toBeInTheDocument();
    expect(screen.getByText('Report materialized')).toBeInTheDocument();

    const period = recentReportPeriod(7);
    expect(reportsControllerGetAdminOverviewMetricsV1).toHaveBeenCalledTimes(1);
    expect(reportsControllerGetAdminOverviewMetricsV1).toHaveBeenCalledWith(
      expect.objectContaining({ credentials: 'include' }),
    );
    expect(reportsControllerListExecutiveSummaryV1).toHaveBeenCalledTimes(1);
    expect(reportsControllerListExecutiveSummaryV1).toHaveBeenCalledWith(
      { from: period.from, to: period.to, timezone: 'Africa/Lagos' },
      expect.objectContaining({ credentials: 'include' }),
    );
    expect(reportsControllerListMaterializationStateV1).toHaveBeenCalledTimes(
      1,
    );
    expect(reportsControllerListMaterializationStateV1).toHaveBeenCalledWith(
      { timezone: 'Africa/Lagos' },
      expect.objectContaining({ credentials: 'include' }),
    );
    expect(approvalsControllerListApprovalsV1).toHaveBeenCalledWith(
      { limit: '1', cursor: '', status: 'PENDING', includeTotalCount: true },
      expect.objectContaining({ credentials: 'include' }),
    );
    expect(auditControllerListV1).toHaveBeenCalledWith(
      { actorId: '' },
      expect.objectContaining({ credentials: 'include' }),
    );
  });

  it('shows the authoritative active-card count without exposing actor/entity IDs as names', async () => {
    render(<AdminOverview />);

    expect(
      await screen.findByRole('heading', {
        name: 'Virtual card status changed',
      }),
    ).toBeInTheDocument();
    const cardsMetric = screen.getByRole('heading', {
      name: 'Active virtual cards',
    }).parentElement;
    expect(cardsMetric).toHaveTextContent('36');
    expect(cardsMetric).toHaveTextContent('Current tenant total');
    expect(screen.getByText('Virtual card')).toBeVisible();
    expect(screen.getByText('Staff member')).toBeInTheDocument();
    expect(screen.queryByText('staff-id')).not.toBeInTheDocument();
    const entityReference = screen.getByText('Virtual card reference: card-1');
    expect(entityReference).not.toBeVisible();
    fireEvent.click(screen.getByText('Record details'));
    expect(entityReference).toBeVisible();
    expect(
      screen.getByRole('heading', { name: 'Custom Action Code' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Unknown Type')).toBeInTheDocument();
    expect(screen.getByText('Actor unavailable')).toBeInTheDocument();
  });

  it('preserves missing chart dates as gaps rather than rendering them as zero', async () => {
    render(<AdminOverview />);

    const table = await screen.findByRole('table', {
      name: 'Daily credit issued and redeemed, integer kobo',
    });
    expect(table.querySelectorAll('tbody tr')).toHaveLength(7);
    expect(
      within(table).getAllByText('No report value').length,
    ).toBeGreaterThan(0);
  });

  it('lets keyboard users inspect chart points and move across dates', async () => {
    render(<AdminOverview />);

    await screen.findByRole('table', {
      name: 'Daily credit issued and redeemed, integer kobo',
    });
    const points = screen
      .getAllByRole('button')
      .filter(
        (button) =>
          button.getAttribute('aria-label')?.includes('issued') &&
          button.getAttribute('aria-label')?.includes('redeemed'),
      );
    expect(points).toHaveLength(7);
    act(() => points[0].focus());
    fireEvent.keyDown(points[0], { key: 'ArrowRight' });
    expect(points[1]).toHaveFocus();
    expect(points[1]).toHaveAccessibleDescription(/Issued/);
  });

  it('shows an explicit error and retry when a report request fails', async () => {
    jest
      .mocked(reportsControllerListExecutiveSummaryV1)
      .mockRejectedValueOnce(new Error('offline'));
    render(<AdminOverview />);

    expect(
      (
        await screen.findAllByText(
          'This section could not be reached. Check your connection.',
        )
      ).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByRole('button', { name: 'Try again' }).length,
    ).toBeGreaterThan(0);
  });

  it('shows an unavailable active-card value and retries its own metric request', async () => {
    jest
      .mocked(reportsControllerGetAdminOverviewMetricsV1)
      .mockRejectedValueOnce(new Error('offline'));
    render(<AdminOverview />);

    const metric = screen.getByRole('heading', {
      name: 'Active virtual cards',
    }).parentElement;
    expect(
      await within(metric!).findByText('Active-card count could not be loaded'),
    ).toBeInTheDocument();
    expect(within(metric!).getByText('—')).toBeInTheDocument();
    fireEvent.click(within(metric!).getByRole('button', { name: 'Try again' }));

    await waitFor(() =>
      expect(reportsControllerGetAdminOverviewMetricsV1).toHaveBeenCalledTimes(
        2,
      ),
    );
    expect(await within(metric!).findByText('36')).toBeInTheDocument();
  });

  it('shows a per-section Retry-After countdown and disables global refresh', async () => {
    jest.mocked(reportsControllerListExecutiveSummaryV1).mockResolvedValueOnce({
      status: 429,
      headers: new Headers({ 'Retry-After': '20' }),
      data: {
        success: false,
        error: {
          statusCode: 429,
          code: 'RATE_LIMITED',
          message: 'Too many requests',
        },
        meta,
      },
    } as never);
    render(<AdminOverview />);

    expect(
      await screen.findAllByRole('button', { name: 'Retry in 20s' }),
    ).not.toHaveLength(0);
    expect(
      screen.getByRole('button', { name: 'Refresh overview' }),
    ).toBeDisabled();
  });

  it('has no structural axe violations in the loaded overview', async () => {
    const { container } = render(<AdminOverview />);
    await screen.findByRole('heading', { name: 'Virtual card status changed' });
    container.ownerDocument.documentElement.lang = 'en';
    container.ownerDocument.title = 'ShopCity';
    const { violations } = await axe.run(container.ownerDocument, {
      elementRef: container,
      rules: { 'color-contrast': { enabled: false } },
    });
    expect(violations).toHaveLength(0);
  });

  it('does not convert an absent approval total into zero', async () => {
    jest
      .mocked(approvalsControllerListApprovalsV1)
      .mockResolvedValueOnce(approvalResponse());
    render(<AdminOverview />);

    await waitFor(() =>
      expect(approvalsControllerListApprovalsV1).toHaveBeenCalled(),
    );
    const pendingMetric = screen.getByRole('heading', {
      name: 'Pending approvals',
    }).parentElement;
    await waitFor(() => expect(pendingMetric).toHaveTextContent('—'));
  });
});
