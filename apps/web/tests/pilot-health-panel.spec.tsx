import { render, screen } from '@testing-library/react';
import { PilotHealthPanel } from '../components/workflows/pilot-health-panel';
import { reportsControllerGetPilotOperationsSummaryV1 } from '../lib/api/generated-client';

jest.mock('../lib/api/generated-client', () => ({
  reportsControllerGetPilotOperationsSummaryV1: jest.fn(),
}));

jest.mock('../components/workflows/admin-operations-health-trend', () => ({
  AdminOperationsHealthTrend: () => (
    <div data-testid="operations-health-trend" />
  ),
}));

jest.mock('../lib/api/request', () => ({
  createApiRequest: jest.fn(() => ({})),
}));

const healthySummary = {
  generatedAt: '2026-11-01T09:00:00.000Z',
  release: {
    version: '1.2.3',
    sha: 'abcdef1234567890',
    sentryConfigured: true,
  },
  outbox: { backlogCount: 0, staleCount: 0 },
  sms: { failedCount: 0 },
  offlineSync: { failureCount: 0 },
  fraud: { openCount: 0 },
  reports: { staleCount: 0 },
  reconciliation: { healthy: true, mismatchCount: 0 },
};

describe('PilotHealthPanel card surfaces and status pills', () => {
  beforeEach(() => {
    jest
      .mocked(reportsControllerGetPilotOperationsSummaryV1)
      .mockResolvedValue({
        status: 200,
        data: { data: healthySummary },
      } as never);
  });

  it('matches the main Admin Overview panel and metric card surfaces when opted in', async () => {
    const { container } = render(
      <PilotHealthPanel compact cardStyleVariant="adminOverview" />,
    );

    const lastChecked = await screen.findByText(/Last checked:/);
    expect(lastChecked.querySelector('time')).toHaveAttribute(
      'dateTime',
      healthySummary.generatedAt,
    );
    expect(lastChecked).toHaveStyle({
      color: '#676767',
      fontSize: '12px',
      fontWeight: '400',
      lineHeight: '1.45',
    });
    expect(screen.getByText('No active issues.')).toBeInTheDocument();
    expect(screen.getByLabelText('Deployment configuration')).toHaveTextContent(
      'Version 1.2.3 · Build abcdef1 · Error monitoring on',
    );
    expect(screen.queryByText('Live')).not.toBeInTheDocument();
    expect(screen.queryByText('Reconciled')).not.toBeInTheDocument();
    expect(screen.queryByText('Healthy')).not.toBeInTheDocument();
    expect(screen.getByText('No events waiting')).toHaveStyle({
      color: '#676767',
      fontSize: '12px',
      fontWeight: '400',
      lineHeight: '1.45',
    });
    expect(reportsControllerGetPilotOperationsSummaryV1).toHaveBeenCalledTimes(
      1,
    );

    const panel = container.querySelector('section');
    const metric = screen.getByText('Pending events').closest('article');

    expect(panel).toHaveStyle({
      border: '1px solid #e4e4e4',
      borderRadius: '16px',
      padding: '16px 20px',
      background: '#fff',
      boxShadow: 'none',
    });
    expect(metric).toHaveStyle({
      border: '1px solid #e4e4e4',
      borderRadius: '16px',
      padding: '14px 16px',
      background: '#fff',
      minHeight: '121px',
    });
  });

  it('summarizes active signals without treating missing counts as zero', async () => {
    jest
      .mocked(reportsControllerGetPilotOperationsSummaryV1)
      .mockResolvedValueOnce({
        status: 200,
        data: {
          data: {
            ...healthySummary,
            outbox: { backlogCount: 2, staleCount: 1 },
            sms: { failedCount: 3 },
          },
        },
      } as never);

    render(<PilotHealthPanel compact cardStyleVariant="adminOverview" />);

    expect(await screen.findByText('Needs attention')).toBeInTheDocument();
    expect(screen.getByText('2 system events are waiting')).toBeInTheDocument();
    expect(screen.getByText('1 system event is overdue')).toBeInTheDocument();
    expect(screen.getByText('3 SMS messages failed')).toBeInTheDocument();
  });

  it('keeps unknown signal counts unavailable instead of reporting no alerts', async () => {
    const { sms: _sms, ...summaryWithoutSms } = healthySummary;
    jest
      .mocked(reportsControllerGetPilotOperationsSummaryV1)
      .mockResolvedValueOnce({
        status: 200,
        data: { data: summaryWithoutSms },
      } as never);

    render(<PilotHealthPanel compact cardStyleVariant="adminOverview" />);

    expect(
      await screen.findByText("Couldn't check: SMS delivery."),
    ).toBeInTheDocument();
    expect(screen.queryByText('No active issues.')).not.toBeInTheDocument();
  });

  it('keeps the existing default card surface and status pills without the variant', async () => {
    const { container } = render(<PilotHealthPanel />);
    const panel = container.querySelector('section');

    expect(panel?.style.borderRadius).toBe('var(--sc-radius-xl)');
    expect(panel?.style.boxShadow).toBe('var(--sc-shadow-level1)');
    await screen.findByText('Live');
    expect(screen.getByText('Reconciled')).toBeInTheDocument();
    expect(screen.getAllByText('Healthy')).toHaveLength(6);
    expect(
      screen.queryByLabelText('Operational attention'),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText('Deployment configuration'),
    ).not.toBeInTheDocument();
  });
});
