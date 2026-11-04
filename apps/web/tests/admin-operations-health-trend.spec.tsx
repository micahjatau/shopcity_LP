import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { AdminOperationsHealthTrend } from '../components/workflows/admin-operations-health-trend';
import { reportsControllerGetPilotOperationsHistoryV1 } from '../lib/api/generated-client';

type HistoryWindow = '24h' | '7d' | '30d';

jest.mock('../lib/api/generated-client', () => ({
  reportsControllerGetPilotOperationsHistoryV1: jest.fn(),
}));

jest.mock('../lib/api/request', () => ({
  createApiRequest: jest.fn(() => ({})),
}));

function historyResponse(window: HistoryWindow, items = historyItems()) {
  return {
    status: 200,
    data: {
      data: {
        window,
        generatedAt: '2026-11-01T12:34:56.000Z',
        items,
      },
    },
  } as never;
}

function historyItems() {
  const base = {
    capturedAt: '2026-11-01T10:04:00.000Z',
    outbox: { backlogCount: 4, staleCount: 1 },
    sms: { failedCount: 2 },
    offlineSync: { failureCount: 3 },
    fraud: { openCount: 1 },
    reports: { staleCount: 2 },
    reconciliation: { healthy: false, mismatchCount: 5 },
  };

  return [
    {
      ...base,
      bucketStart: '2026-11-01T10:00:00.000Z',
    },
    {
      ...base,
      capturedAt: '2026-11-01T12:02:00.000Z',
      bucketStart: '2026-11-01T12:00:00.000Z',
      outbox: { backlogCount: 7, staleCount: 2 },
    },
  ];
}

describe('AdminOperationsHealthTrend', () => {
  beforeEach(() => {
    jest.mocked(reportsControllerGetPilotOperationsHistoryV1).mockClear();
    jest
      .mocked(reportsControllerGetPilotOperationsHistoryV1)
      .mockImplementation(async (params) =>
        historyResponse((params?.window ?? '7d') as HistoryWindow),
      );
  });

  it('shows a loading state while the history request is pending', async () => {
    let resolveRequest: ((value: never) => void) | undefined;
    const pending = new Promise<never>((resolve) => {
      resolveRequest = resolve;
    });
    jest
      .mocked(reportsControllerGetPilotOperationsHistoryV1)
      .mockReturnValueOnce(pending);

    render(<AdminOperationsHealthTrend />);

    expect(screen.getByRole('status')).toHaveTextContent(
      'Loading 7d operational history…',
    );
    await act(async () => {
      resolveRequest?.(historyResponse('7d') as never);
    });
    expect(await screen.findByText('2 observed samples')).toBeInTheDocument();
  });

  it('shows observed metric values and leaves gaps between missing hours', async () => {
    const { container } = render(<AdminOperationsHealthTrend />);

    expect(await screen.findByText('2 observed samples')).toBeInTheDocument();
    expect(reportsControllerGetPilotOperationsHistoryV1).toHaveBeenCalledWith(
      { window: '7d' },
      {},
    );

    const chart = screen.getByRole('img', {
      name: 'Operational health trends',
    });
    const path = chart.querySelector('path')?.getAttribute('d') ?? '';
    expect(path.match(/M/g)).toHaveLength(2);
    expect(path).not.toMatch(/L/);
    expect(chart).toHaveAttribute(
      'aria-describedby',
      expect.stringContaining('pilot-operations-history-description'),
    );

    fireEvent.click(screen.getByText('View observed values'));
    const rows = container.querySelectorAll('tbody tr');
    expect(rows).toHaveLength(24 * 7);
    expect(rows[rows.length - 2]).toHaveTextContent('No sample');

    fireEvent.change(screen.getByLabelText('Health trend metric'), {
      target: { value: 'sms.failedCount' },
    });
    expect(screen.getAllByText('Failed SMS messages')).toHaveLength(2);
    expect(reportsControllerGetPilotOperationsHistoryV1).toHaveBeenCalledTimes(
      1,
    );
  });

  it('requests a newly selected history range', async () => {
    render(<AdminOperationsHealthTrend />);
    await screen.findByText('2 observed samples');

    fireEvent.change(screen.getByLabelText('Health trend range'), {
      target: { value: '24h' },
    });

    await waitFor(() => {
      expect(reportsControllerGetPilotOperationsHistoryV1).toHaveBeenCalledWith(
        { window: '24h' },
        {},
      );
    });
    expect(await screen.findByText('2 observed samples')).toBeInTheDocument();
  });

  it('shows an explicit collecting state when history is empty', async () => {
    jest
      .mocked(reportsControllerGetPilotOperationsHistoryV1)
      .mockResolvedValue(historyResponse('7d', []) as never);

    render(<AdminOperationsHealthTrend />);

    expect(
      await screen.findByText(/Collection starts with the first worker sample/),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('img', { name: 'Operational health trends' }),
    ).not.toBeInTheDocument();
  });

  it('offers retry when the history endpoint is unavailable', async () => {
    jest
      .mocked(reportsControllerGetPilotOperationsHistoryV1)
      .mockResolvedValue({ status: 503, data: {} } as never);

    render(<AdminOperationsHealthTrend />);

    expect(
      await screen.findByText('Operational history unavailable (503).'),
    ).toBeInTheDocument();
    const callsBeforeRetry = jest.mocked(
      reportsControllerGetPilotOperationsHistoryV1,
    ).mock.calls.length;
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

    await waitFor(() => {
      expect(
        reportsControllerGetPilotOperationsHistoryV1,
      ).toHaveBeenCalledTimes(callsBeforeRetry + 1);
    });
  });
});
