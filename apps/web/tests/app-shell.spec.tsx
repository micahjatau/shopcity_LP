import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { AppShell } from '../components/app-shell';
import { invalidatePublicConfigCache } from '../components/session-bootstrap';

const mockBootstrapSession = jest.fn();
const mockLogoutSession = jest.fn();
const mockGetPublicConfig = jest.fn();
const mockGetOfflineEarnRecordCount = jest.fn();
const mockSubscribeOfflineQueue = jest.fn();

jest.mock('../lib/api', () => ({
  bootstrapSession: (...args: unknown[]) => mockBootstrapSession(...args),
  logoutSession: (...args: unknown[]) => mockLogoutSession(...args),
  configurationControllerGetPublicConfigV1: (...args: unknown[]) =>
    mockGetPublicConfig(...args),
  configurationControllerGetOperationalConfigV1: (...args: unknown[]) =>
    mockGetPublicConfig(...args),
}));

jest.mock('../lib/browser/offline-earn-queue', () => ({
  getOfflineEarnRecordCount: (...args: unknown[]) =>
    mockGetOfflineEarnRecordCount(...args),
  subscribeOfflineQueue: (...args: unknown[]) =>
    mockSubscribeOfflineQueue(...args),
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
    mockGetOfflineEarnRecordCount.mockReset();
    mockSubscribeOfflineQueue.mockReset();
    sessionStorage.clear();
    invalidatePublicConfigCache();
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
    mockGetOfflineEarnRecordCount.mockResolvedValue(2);
    mockSubscribeOfflineQueue.mockImplementation(() => () => undefined);
  });

  it('renders protected content for authenticated sessions', async () => {
    mockBootstrapSession.mockResolvedValueOnce({
      user: {
        id: 'u1',
        username: 'cashier',
        role: 'CASHIER',
        branchId: 'b1',
      },
      session: {
        expiresAt: '2030-01-01T00:00:00.000Z',
        deviceId: 'device-1',
      },
    });

    const { container } = render(
      <AppShell>
        <p>Protected content</p>
      </AppShell>,
    );

    await waitFor(() => {
      expect(screen.getByText(/session ready/i)).toBeInTheDocument();
      expect(document.title).toMatch(/workspace · overview · shopcity/i);
    });
    expect(mockBootstrapSession).toHaveBeenCalledTimes(1);
    expect(mockGetPublicConfig).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Protected content')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /overview/i })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(container.querySelectorAll('.shell-nav-link-icon svg')).toHaveLength(
      6,
    );
    expect(
      container.querySelector('.shell-context-line--secondary'),
    ).toHaveTextContent('Workspace · Overview');
    expect(screen.getByText('Device device-1')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /skip to content/i }),
    ).toHaveAttribute('href', '#shell-main-content');
    expect(screen.getByRole('link', { name: /lookup/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /earn/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /redeem/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /sync queue/i })).toHaveAttribute(
      'title',
      '2 offline transactions waiting to sync',
    );
  });

  it('persists sidebar collapse state across reloads in the session', async () => {
    sessionStorage.setItem('shopcity:shell:sidebar-collapsed', 'true');
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
    expect(
      screen.getByRole('button', { name: /expand sidebar/i }),
    ).toBeInTheDocument();
    expect(document.querySelector('.shell-body')).toHaveClass(
      'shell-body--collapsed',
    );
    expect(screen.getByText('Branch and device')).not.toBeVisible();
  });

  it('persists sidebar collapse toggles to the session store', async () => {
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

    fireEvent.click(screen.getByRole('button', { name: /collapse sidebar/i }));
    expect(sessionStorage.getItem('shopcity:shell:sidebar-collapsed')).toBe(
      'true',
    );
    expect(
      screen.getByRole('button', { name: /expand sidebar/i }),
    ).toBeInTheDocument();
  });

  it('defaults tablets to the collapsed rail when no preference is stored', async () => {
    const originalMatchMedia = window.matchMedia;
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation((query: string) => ({
        matches: query.includes('768px') && query.includes('1199px'),
        media: query,
        onchange: null,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        addListener: jest.fn(),
        removeListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });

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
    expect(document.querySelector('.shell-body')).toHaveClass(
      'shell-body--collapsed',
    );

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: originalMatchMedia,
    });
  });

  it('keeps the drawer focus trapped and the shell inert while open', async () => {
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
    const drawer = screen.getByRole('dialog', { name: /primary navigation/i });
    expect((document.querySelector('.shell-frame') as HTMLElement).inert).toBe(
      true,
    );

    const navLinks = within(drawer).getAllByRole('link');
    const lastLink = navLinks[navLinks.length - 1];
    fireEvent.keyDown(window, { key: 'Tab', shiftKey: true });
    expect(lastLink).toHaveFocus();

    fireEvent.click(document.querySelector('.shell-mobile-overlay') as Element);
    await waitFor(() => {
      expect(
        screen.queryByRole('dialog', { name: /primary navigation/i }),
      ).not.toBeInTheDocument();
    });
    expect((document.querySelector('.shell-frame') as HTMLElement).inert).toBe(
      false,
    );
  });

  it('shows an unavailable sidebar badge when the offline queue cannot be read', async () => {
    mockBootstrapSession.mockResolvedValueOnce({
      user: {
        id: 'u1',
        username: 'cashier',
        role: 'CASHIER',
        branchId: 'b1',
      },
      session: { expiresAt: '2030-01-01T00:00:00.000Z' },
    });
    mockGetOfflineEarnRecordCount.mockRejectedValue(new Error('boom'));

    render(
      <AppShell>
        <p>Protected content</p>
      </AppShell>,
    );

    await waitFor(() => {
      expect(screen.getByText(/session ready/i)).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(
        screen.getByRole('link', { name: /sync queue/i }),
      ).toHaveTextContent(/unavailable/i);
    });
  });

  it('redirects system sessions to the login gate', async () => {
    mockBootstrapSession.mockResolvedValueOnce({
      user: {
        id: 'system-1',
        username: 'system',
        role: 'SYSTEM',
        branchId: null,
      },
      session: { expiresAt: '2030-01-01T00:00:00.000Z' },
    });

    render(
      <AppShell>
        <p>Protected content</p>
      </AppShell>,
    );

    await waitFor(() => {
      expect(
        screen.getAllByText(/you do not have access to this workspace/i),
      ).not.toHaveLength(0);
    });
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /go to my workspace/i }),
    ).toBeInTheDocument();
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
    expect(
      screen.getByRole('dialog', { name: /primary navigation/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /close/i })).toHaveFocus();

    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(
      screen.queryByRole('dialog', { name: /primary navigation/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByText('Menu', { selector: 'button' })).toHaveFocus();
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
    expect(
      screen.getByRole('dialog', { name: /primary navigation/i }),
    ).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(
      screen.queryByRole('dialog', { name: /primary navigation/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByText('Menu', { selector: 'button' })).toHaveFocus();
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
