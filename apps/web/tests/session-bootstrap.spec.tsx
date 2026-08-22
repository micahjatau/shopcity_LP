import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import {
  SessionBootstrapProvider,
  useSessionBootstrapState,
} from '../components/session-bootstrap';

const mockBootstrapSession = jest.fn();
const mockGetPublicConfig = jest.fn();

jest.mock('../lib/api', () => ({
  bootstrapSession: (...args: unknown[]) => mockBootstrapSession(...args),
  configurationControllerGetPublicConfigV1: (...args: unknown[]) =>
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
  beforeEach(() => {
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
});
