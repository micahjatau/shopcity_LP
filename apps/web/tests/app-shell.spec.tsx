import { render, screen, waitFor } from '@testing-library/react';
import { AppShell } from '../components/app-shell';

const mockBootstrapSession = jest.fn();
const mockLogoutSession = jest.fn();

jest.mock('../lib/api', () => ({
  bootstrapSession: (...args: unknown[]) => mockBootstrapSession(...args),
  logoutSession: (...args: unknown[]) => mockLogoutSession(...args),
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
    });
    expect(screen.getByText('Protected content')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /cashier/i })).toBeInTheDocument();
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
    expect(screen.getByRole('link', { name: /go to sign in/i })).toBeInTheDocument();
  });
});
