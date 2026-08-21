import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AppShell } from '../components/app-shell';

const mockBootstrapSession = jest.fn();
const mockLogoutSession = jest.fn();
const mockGetPublicConfig = jest.fn();

jest.mock('../lib/api', () => ({
  bootstrapSession: (...args: unknown[]) => mockBootstrapSession(...args),
  logoutSession: (...args: unknown[]) => mockLogoutSession(...args),
  configurationControllerGetPublicConfigV1: (...args: unknown[]) =>
    mockGetPublicConfig(...args),
}));

jest.mock('../lib/browser/offline-earn-queue', () => ({
  getOfflineEarnRecordCount: jest.fn().mockResolvedValue(0),
  subscribeOfflineQueue: jest.fn(() => () => undefined),
}));

jest.mock('next/navigation', () => ({
  usePathname: () => '/cashier',
  useRouter: () => ({
    replace: jest.fn(),
    refresh: jest.fn(),
  }),
}));

describe('AppShell', () => {
  beforeEach(() => {
    mockBootstrapSession.mockReset();
    mockLogoutSession.mockReset();
    mockGetPublicConfig.mockReset();
    mockGetPublicConfig.mockResolvedValue({
      status: 200,
      data: {
        data: {
          tenant: { id: 'tenant-1', name: 'ShopCity Demo' },
          branch: {
            id: 'branch-1',
            name: 'Lekki Flagship',
            timezone: 'Africa/Lagos',
            receiptWeekStartDay: 1,
          },
          policies: {
            defaultEarnRateBps: 500,
            minRedemptionKobo: 1000,
            offlineRedemptionDisabled: false,
          },
        },
      },
    });
  });

  it('renders protected content for authenticated sessions', async () => {
    mockBootstrapSession.mockResolvedValueOnce({
      user: {
        id: 'u1',
        username: 'cashier',
        role: 'CASHIER',
        branchId: 'b1',
      },
      session: { expiresAt: '2030-01-01T00:00:00.000Z' },
    });

    render(
      <AppShell>
        <p>Protected content</p>
      </AppShell>,
    );

    await waitFor(() => {
      expect(screen.getByText(/session ready/i)).toBeInTheDocument();
      expect(document.title).toMatch(/workspace · overview · shopcity/i);
    });
    expect(screen.getByText('Protected content')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /overview/i })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByText('Workspace · Overview')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /earn/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /redeem/i })).toBeInTheDocument();
  });

  it('closes the mobile drawer from the explicit close action', async () => {
    mockBootstrapSession.mockResolvedValueOnce({
      user: {
        id: 'u1',
        username: 'cashier',
        role: 'CASHIER',
        branchId: 'b1',
      },
      session: { expiresAt: '2030-01-01T00:00:00.000Z' },
    });

    render(
      <AppShell>
        <p>Protected content</p>
      </AppShell>,
    );

    await waitFor(() => {
      expect(screen.getByText(/session ready/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Menu', { selector: 'button' }));
    expect(screen.getByRole('dialog', { name: /primary navigation/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /close/i })).toHaveFocus();

    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(screen.queryByRole('dialog', { name: /primary navigation/i })).not.toBeInTheDocument();
  });

  it('closes the mobile drawer with Escape', async () => {
    mockBootstrapSession.mockResolvedValueOnce({
      user: {
        id: 'u1',
        username: 'cashier',
        role: 'CASHIER',
        branchId: 'b1',
      },
      session: { expiresAt: '2030-01-01T00:00:00.000Z' },
    });

    render(
      <AppShell>
        <p>Protected content</p>
      </AppShell>,
    );

    await waitFor(() => {
      expect(screen.getByText(/session ready/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Menu', { selector: 'button' }));
    expect(screen.getByRole('dialog', { name: /primary navigation/i })).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: /primary navigation/i })).not.toBeInTheDocument();
  });

  it('shows the protected shell gate when unauthenticated', async () => {
    mockBootstrapSession.mockResolvedValueOnce(null);

    render(
      <AppShell>
        <p>Protected content</p>
      </AppShell>,
    );

    await waitFor(() => {
      expect(screen.getByText(/sign in required/i)).toBeInTheDocument();
    });
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /go to sign in/i }),
    ).toBeInTheDocument();
  });
});
