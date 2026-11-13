import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AdminOperationsTabs } from '../components/workflows/admin-operations-tabs';

jest.mock('../components/workflows/pilot-health-panel', () => ({
  PilotHealthPanel: ({
    compact,
    cardStyleVariant,
  }: {
    compact: boolean;
    cardStyleVariant: string;
  }) => (
    <div data-compact={compact} data-card-style-variant={cardStyleVariant}>
      Pilot health panel
    </div>
  ),
}));

jest.mock('../components/workflows/reports-workspace', () => ({
  ReportsWorkspace: ({
    loadTenantBranchOptions,
    presentation = 'default',
    showStatusBadges,
    summaryItemsPresentation,
  }: {
    loadTenantBranchOptions?: boolean;
    presentation?: string;
    showStatusBadges?: boolean;
    summaryItemsPresentation?: string;
  }) => (
    <div
      data-load-tenant-branch-options={loadTenantBranchOptions}
      data-presentation={presentation}
      data-show-status-badges={showStatusBadges}
      data-summary-items-presentation={summaryItemsPresentation}
    >
      Reports workspace
    </div>
  ),
}));

describe('Admin Operations tabs', () => {
  it('opens Overview first and removes the retired badges, link, and alert copy', () => {
    render(<AdminOperationsTabs />);

    expect(
      screen.getByRole('tab', { name: 'Overview', selected: true }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Operations', level: 1 }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Check system health, view reports, and manage key settings.',
      ),
    ).toBeInTheDocument();
    const pilotHealthCard = within(
      screen.getByRole('tabpanel', { name: 'Overview' }),
    ).getByText('Pilot health panel');
    expect(pilotHealthCard).toHaveAttribute('data-compact', 'true');
    expect(pilotHealthCard).toHaveAttribute(
      'data-card-style-variant',
      'adminOverview',
    );
    expect(screen.queryByText('7 routes')).not.toBeInTheDocument();
    expect(screen.queryByText('Health + reports')).not.toBeInTheDocument();
    expect(screen.queryByText('Route-backed')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Back to admin' })).toBeNull();
    expect(
      screen.queryByText('Admin operations at a glance'),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(
        'Keep review, reporting, and control actions on separate route-backed surfaces.',
      ),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('Reports workspace')).not.toBeInTheDocument();
  });

  it('loads the existing Reports workspace in its page style scope only after Reports is selected', async () => {
    const user = userEvent.setup();
    render(<AdminOperationsTabs />);

    expect(screen.queryByText('Reports workspace')).not.toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: 'Reports' }));

    expect(
      screen.getByRole('tab', { name: 'Reports', selected: true }),
    ).toBeInTheDocument();
    const reportsPanel = screen.getByRole('tabpanel', { name: 'Reports' });
    const reportsWorkspace =
      within(reportsPanel).getByText('Reports workspace');
    expect(reportsWorkspace).toHaveAttribute(
      'data-load-tenant-branch-options',
      'true',
    );
    expect(reportsWorkspace).toHaveAttribute('data-presentation', 'default');
    expect(reportsWorkspace).toHaveAttribute(
      'data-show-status-badges',
      'false',
    );
    expect(reportsWorkspace).toHaveAttribute(
      'data-summary-items-presentation',
      'table-dialog',
    );
    expect(
      reportsPanel.querySelector('.admin-operations-reports'),
    ).toBeTruthy();
    expect(reportsWorkspace.closest('.supervisor-reports-page')).toBeTruthy();
    expect(screen.queryByText('Pilot health panel')).not.toBeInTheDocument();
  });

  it('links Controls to the existing user, device, branch, audit, and adjustment pages', async () => {
    const user = userEvent.setup();
    render(<AdminOperationsTabs />);
    await user.click(screen.getByRole('tab', { name: 'Controls' }));

    const controlsPanel = screen.getByRole('tabpanel', { name: 'Controls' });
    expect(
      within(controlsPanel).getByRole('heading', { name: 'Manage settings' }),
    ).toBeInTheDocument();
    expect(
      within(controlsPanel).getByText(
        'Choose a page to manage staff, devices, branches, audit history, or wallet adjustments.',
      ),
    ).toBeInTheDocument();
    const routes = [
      ['/admin/users', 'Users'],
      ['/admin/devices', 'Devices'],
      ['/admin/branches', 'Branches'],
      ['/admin/audit', 'Audit'],
      ['/admin/adjustments', 'Adjustments'],
    ];

    for (const [href, label] of routes) {
      const link = within(controlsPanel).getByRole('link', {
        name: new RegExp(`${label}`),
      });
      expect(link).toHaveAttribute('href', href);
      expect(link.querySelector('svg')).toBeInTheDocument();
    }
  });

  it('supports arrow, Home, End, and wraparound keyboard tab navigation', async () => {
    const user = userEvent.setup();
    render(<AdminOperationsTabs />);

    const overviewTab = screen.getByRole('tab', { name: 'Overview' });
    overviewTab.focus();
    await user.keyboard('{ArrowRight}');
    expect(
      screen.getByRole('tab', { name: 'Reports', selected: true }),
    ).toHaveFocus();

    await user.keyboard('{End}');
    expect(
      screen.getByRole('tab', { name: 'Controls', selected: true }),
    ).toHaveFocus();

    await user.keyboard('{ArrowRight}');
    expect(
      screen.getByRole('tab', { name: 'Overview', selected: true }),
    ).toHaveFocus();

    await user.keyboard('{Home}');
    expect(
      screen.getByRole('tab', { name: 'Overview', selected: true }),
    ).toHaveFocus();
  });
});
