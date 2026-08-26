import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import {
  invalidatePublicConfigCache,
  SessionBootstrapProvider,
  useSessionBootstrapState,
} from '../components/session-bootstrap';

const mockBootstrapSession = jest.fn();
const mockGetPublicConfig = jest.fn();

jest.mock('../lib/api', () => ({
  bootstrapSession: (...args: unknown[]) => mockBootstrapSession(...args),
  configurationControllerGetPublicConfigV1: (...args: unknown[]) =>
    mockGetPublicConfig(...args),
  configurationControllerGetOperationalConfigV1: (...args: unknown[]) =>
    mockGetPublicConfig(...args),
}));

function Probe() {
  const { status, publicConfig, configStatus, reset } =
    useSessionBootstrapState();
  return (
    <>
      <output data-testid="session-status">{status}</output>
      <output data-testid="config-status">{configStatus}</output>
      <output data-testid="tenant">{publicConfig?.tenant.name ?? ''}</output>
      <button type="button" onClick={reset}>
        Reset
      </button>
    </>
  );
}

describe('SessionBootstrapProvider', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  beforeEach(() => {
    invalidatePublicConfigCache();
    mockBootstrapSession.mockReset();
    mockGetPublicConfig.mockReset();
    mockBootstrapSession.mockResolvedValue({
      user: {
        id: 'provider-user',
        username: 'cashier',
        role: 'CASHIER',
        branchId: 'branch-1',
      },
      session: { expiresAt: '2030-01-01T00:00:00.000Z', deviceId: 'device-1' },
    });
    mockGetPublicConfig.mockResolvedValue({
      status: 200,
      data: {
        data: {
          tenant: { id: 'tenant-1', name: 'Demo' },
          branch: { id: 'branch-1' },
          policies: {},
        },
      },
    });
  });

  it('loads session and public context once for all shell consumers', async () => {
    render(
      <SessionBootstrapProvider>
        <Probe />
      </SessionBootstrapProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('session-status')).toHaveTextContent('ready');
      expect(screen.getByTestId('tenant')).toHaveTextContent('Demo');
    });
    expect(mockBootstrapSession).toHaveBeenCalledTimes(1);
    expect(mockGetPublicConfig).toHaveBeenCalledTimes(1);
  });

  it('exposes unavailable policy state when public config fails', async () => {
    mockGetPublicConfig.mockRejectedValueOnce(new Error('config unavailable'));

    render(
      <SessionBootstrapProvider>
        <Probe />
      </SessionBootstrapProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('session-status')).toHaveTextContent('ready');
      expect(screen.getByTestId('config-status')).toHaveTextContent(
        'unavailable',
      );
    });
  });

  it('serves stale context while revalidation is pending', async () => {
    const first = render(
      <SessionBootstrapProvider>
        <Probe />
      </SessionBootstrapProvider>,
    );
    await waitFor(() =>
      expect(screen.getByTestId('tenant')).toHaveTextContent('Demo'),
    );
    first.unmount();

    const now = Date.now();
    jest.spyOn(Date, 'now').mockReturnValue(now + 5 * 60 * 1000 + 1);
    mockGetPublicConfig.mockImplementationOnce(
      () => new Promise(() => undefined),
    );
    render(
      <SessionBootstrapProvider>
        <Probe />
      </SessionBootstrapProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('config-status')).toHaveTextContent('stale');
    });
    jest.restoreAllMocks();
  });

  it('isolates config cache entries and supports scoped invalidation', async () => {
    const first = render(
      <SessionBootstrapProvider>
        <Probe />
      </SessionBootstrapProvider>,
    );
    await waitFor(() =>
      expect(screen.getByTestId('tenant')).toHaveTextContent('Demo'),
    );
    first.unmount();

    mockBootstrapSession.mockResolvedValueOnce({
      user: {
        id: 'different-user',
        username: 'other-cashier',
        role: 'CASHIER',
        branchId: 'branch-1',
      },
      session: { expiresAt: '2030-01-01T00:00:00.000Z', deviceId: 'device-2' },
    });
    mockGetPublicConfig.mockResolvedValueOnce({
      status: 200,
      data: {
        data: {
          tenant: { id: 'tenant-2', name: 'Other Tenant' },
          branch: { id: 'branch-1' },
          policies: {},
        },
      },
    });
    const second = render(
      <SessionBootstrapProvider>
        <Probe />
      </SessionBootstrapProvider>,
    );
    await waitFor(() =>
      expect(screen.getByTestId('tenant')).toHaveTextContent('Other Tenant'),
    );
    expect(mockGetPublicConfig).toHaveBeenCalledTimes(2);
    second.unmount();

    invalidatePublicConfigCache({
      userId: 'different-user',
      branchId: 'branch-1',
    });
    mockBootstrapSession.mockResolvedValueOnce({
      user: {
        id: 'different-user',
        username: 'other-cashier',
        role: 'CASHIER',
        branchId: 'branch-1',
      },
      session: { expiresAt: '2030-01-01T00:00:00.000Z', deviceId: 'device-2' },
    });
    mockGetPublicConfig.mockResolvedValueOnce({
      status: 200,
      data: {
        data: {
          tenant: { id: 'tenant-2', name: 'Other Tenant Refreshed' },
          branch: { id: 'branch-1' },
          policies: {},
        },
      },
    });
    render(
      <SessionBootstrapProvider>
        <Probe />
      </SessionBootstrapProvider>,
    );
    await waitFor(() =>
      expect(screen.getByTestId('tenant')).toHaveTextContent(
        'Other Tenant Refreshed',
      ),
    );
    expect(mockGetPublicConfig).toHaveBeenCalledTimes(3);
  });

  it('resets shared state on logout', async () => {
    render(
      <SessionBootstrapProvider>
        <Probe />
      </SessionBootstrapProvider>,
    );
    await waitFor(() =>
      expect(screen.getByTestId('session-status')).toHaveTextContent('ready'),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
    await waitFor(() => {
      expect(screen.getByTestId('session-status')).toHaveTextContent('loading');
    });
  });

  it('returns to sign-in state when session revalidation is rejected', async () => {
    jest.useFakeTimers();
    const fetchMock = jest.fn().mockResolvedValue({ status: 401 } as Response);
    Object.defineProperty(global, 'fetch', {
      configurable: true,
      value: fetchMock,
      writable: true,
    });

    try {
      render(
        <SessionBootstrapProvider>
          <Probe />
        </SessionBootstrapProvider>,
      );
      await waitFor(() =>
        expect(screen.getByTestId('session-status')).toHaveTextContent('ready'),
      );

      await act(async () => {
        jest.advanceTimersByTime(60 * 1000);
        await Promise.resolve();
      });

      expect(screen.getByTestId('session-status')).toHaveTextContent(
        'unauthenticated',
      );
    } finally {
      delete (global as { fetch?: unknown }).fetch;
      jest.useRealTimers();
    }
  });
});
