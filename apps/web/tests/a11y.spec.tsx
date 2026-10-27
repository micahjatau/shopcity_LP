import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as axe from 'axe-core';
import HomePage from '../app/page';
import LoginPage from '../app/(auth)/login/page';
import CashierPage from '../app/(shell)/cashier/page';
import SupervisorPage from '../app/(shell)/supervisor/page';
import AdminPage from '../app/(shell)/admin/page';
import AdminPoliciesPage from '../app/(shell)/admin/policies/page';
import { MoneyInput } from '../components/shopcity';
import { Button, Input } from '../components/ui';
import {
  approvalsControllerListApprovalsV1,
  auditControllerListV1,
  branchesControllerListBranchesV1,
  branchesControllerListDevicesV1,
  configurationControllerGetPolicyConfigurationV1,
  configurationControllerUpdatePolicyConfigurationV1,
  reportsControllerGetExecutiveSnapshotV1,
  reportsControllerListCashierTodayV1,
  usersControllerListUsersV1,
} from '../lib/api/generated-client';
import { businessDateInTimezone } from '../lib/reports/supervisor-overview-data';

jest.mock('../lib/api/generated-client', () => ({
  ...jest.requireActual('../lib/api/generated-client'),
  approvalsControllerListApprovalsV1: jest.fn(),
  branchesControllerListBranchesV1: jest.fn(),
  configurationControllerGetPolicyConfigurationV1: jest.fn(),
  configurationControllerUpdatePolicyConfigurationV1: jest.fn(),
  auditControllerListV1: jest.fn(),
  branchesControllerListDevicesV1: jest.fn(),
  reportsControllerGetExecutiveSnapshotV1: jest.fn(),
  reportsControllerListCashierTodayV1: jest.fn(),
  usersControllerListUsersV1: jest.fn(),
}));

function mockSupervisorOverviewData() {
  const reportDate = businessDateInTimezone('Africa/Lagos')!;
  jest.mocked(reportsControllerGetExecutiveSnapshotV1).mockResolvedValue({
    status: 200,
    data: {
      data: {
        scope: 'BRANCH',
        scopeKey: 'branch-1',
        branchId: 'branch-1',
        timezone: 'Africa/Lagos',
        items: [
          {
            reportDate: `${reportDate}T00:00:00.000Z`,
            materializedAt: new Date().toISOString(),
            transactionCount: 89,
            creditIssuedKobo: 59_445_200,
            creditRedeemedKobo: 0,
          },
        ],
      },
    },
  } as never);
  jest.mocked(reportsControllerListCashierTodayV1).mockResolvedValue({
    status: 200,
    data: {
      data: { branchId: 'branch-1', timezone: 'Africa/Lagos', items: [] },
    },
  } as never);
  jest.mocked(usersControllerListUsersV1).mockResolvedValue({
    status: 200,
    data: { data: [] },
  } as never);
  jest.mocked(branchesControllerListDevicesV1).mockResolvedValue({
    status: 200,
    data: { data: [] },
  } as never);
  jest.mocked(auditControllerListV1).mockResolvedValue({
    status: 200,
    data: { data: [] },
  } as never);
  jest.mocked(approvalsControllerListApprovalsV1).mockResolvedValue({
    status: 200,
    data: {
      data: {
        items: Array.from({ length: 5 }, (_, index) => ({
          id: `approval-${index + 1}`,
          status: 'PENDING',
          targetType: 'EARN',
          requestedAmountKobo: 5_000 + index * 100,
          requestedAt: new Date().toISOString(),
          reasonCode: 'PURCHASE_ABOVE_APPROVAL_THRESHOLD',
          customer: {
            id: `customer-${index + 1}`,
            fullName: `Customer ${index + 1}`,
          },
          requester: { username: `cashier-${index + 1}`, role: 'CASHIER' },
          receipt: { posReceiptNumber: `POS-${index + 1}` },
        })),
        totalCount: 80,
        scopeTotalCount: 80,
        nextCursor: 'a11y-next',
        hasMore: true,
      },
    },
  } as never);
}

async function runAxe(container: HTMLElement) {
  const { documentElement } = container.ownerDocument;
  documentElement.lang = 'en';
  container.ownerDocument.title = 'ShopCity';

  const { violations } = await axe.run(container.ownerDocument, {
    elementRef: container,
    rules: {
      'color-contrast': { enabled: false },
    },
  });
  return violations;
}

describe('frontend accessibility gates', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSupervisorOverviewData();
  });

  it('keeps shared controls accessible', async () => {
    const { container } = render(
      <main>
        <Button>Primary action</Button>
        <Input aria-label="Lookup" placeholder="Search" />
        <MoneyInput label="Amount" hint="Enter naira only" />
      </main>,
    );

    expect(await runAxe(container)).toHaveLength(0);
  });

  it('labels each policy editor field visibly and programmatically', async () => {
    jest.mocked(branchesControllerListBranchesV1).mockResolvedValue({
      status: 200,
      data: { data: [{ id: 'branch-1', name: 'Main', status: 'ACTIVE' }] },
    } as never);
    jest
      .mocked(configurationControllerGetPolicyConfigurationV1)
      .mockResolvedValue({
        status: 200,
        data: {
          data: {
            branchId: 'branch-1',
            branchName: 'Main',
            version: 3,
            defaultEarnRateBps: 200,
            minRedemptionKobo: 1000,
            maxRedemptionBasketPercent: 25,
            purchaseFlagThresholdKobo: 50000,
            purchaseApprovalThresholdKobo: 100000,
            purchaseAmountCeilingKobo: 500000,
            redemptionApprovalThresholdKobo: 200000,
            offlineRedemptionDisabled: false,
          },
        },
      } as never);

    const { container } = render(<AdminPoliciesPage />);
    await waitFor(() => {
      expect(container.querySelectorAll('input[id^="policy-"]').length).toBe(7);
    });

    for (const input of Array.from(
      container.querySelectorAll<HTMLInputElement>('input[id^="policy-"]'),
    )) {
      const label = container.querySelector(`label[for="${input.id}"]`);
      expect(label).toBeVisible();
      expect(label).toHaveTextContent(/\S/);
      expect(input.labels).toContain(label);
    }
  });

  it('renders the Supervisor overview as accessible cards and a live approvals table', async () => {
    const { container } = render(
      <main>
        <SupervisorPage />
        <AdminPage />
      </main>,
    );
    const supervisorOverview = container.querySelector('.supervisor-page');
    expect(
      await screen.findByRole('row', { name: /Customer 1/ }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole('heading', { name: 'Hi, Supervisor!', level: 1 }),
    ).toBeInTheDocument();
    expect(
      supervisorOverview?.querySelectorAll('[data-metric-card]'),
    ).toHaveLength(4);
    expect(supervisorOverview?.querySelectorAll('img')).toHaveLength(0);
    expect(
      screen.getByRole('link', { name: /open approvals/i }),
    ).toHaveAttribute('href', '/supervisor/approvals');
    expect(
      screen.getByRole('heading', { name: "Today's Activity", level: 2 }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', {
        name: 'Approvals requiring attention',
        level: 2,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Daily report materialized/)).toBeInTheDocument();
    expect(
      screen.getByRole('searchbox', {
        name: 'Search all open approvals',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Previous approvals page' }),
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Next approvals page' }),
    ).toBeEnabled();
    const supervisorTable = supervisorOverview?.querySelector('table');
    expect(supervisorTable).toBeInTheDocument();
    expect(supervisorTable?.querySelectorAll('tbody tr')).toHaveLength(5);
    expect(supervisorTable?.querySelectorAll('thead th')).toHaveLength(4);
    expect(supervisorTable?.textContent).toContain('Customer 1');
    expect(container.querySelector('a[href="/admin/operations"]')).toHaveStyle({
      gridColumn: 'span 2',
    });
    expect(
      container.querySelector('a[href="/admin/transactions"]'),
    ).not.toHaveStyle({ gridColumn: 'span 2' });
  });

  it('discloses that Supervisor search covers all authorized open approvals', async () => {
    render(<SupervisorPage />);
    await screen.findByRole('row', { name: /Customer 1/ });

    expect(
      screen.getByRole('searchbox', { name: 'Search all open approvals' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Search covers all authorized open approvals/),
    ).toBeInTheDocument();
  });

  it('keeps the login route accessible and keyboard navigable', async () => {
    const user = userEvent.setup();
    render(
      <div>
        <LoginPage />
      </div>,
    );

    expect(
      screen.getByRole('heading', { name: /staff sign in/i }),
    ).toBeInTheDocument();
    expect(await runAxe(document.body)).toHaveLength(0);

    await user.tab();
    expect(
      screen.getByRole('link', { name: /shopcity supermarket home/i }),
    ).toHaveFocus();
    await user.tab();
    expect(screen.getByLabelText(/email address/i)).toHaveFocus();
    await user.tab();
    expect(screen.getByLabelText(/^Password$/i)).toHaveFocus();
    await user.tab();
    expect(
      screen.getByRole('button', { name: /show password/i }),
    ).toHaveFocus();
    await user.tab();
    expect(
      screen.getByRole('button', { name: /forgot password/i }),
    ).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: /sign in/i })).toHaveFocus();
    expect(screen.queryByLabelText(/device id/i)).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText(/device attestation secret/i),
    ).not.toBeInTheDocument();
  });

  it('renders the public homepage and keeps operational shells accessible', async () => {
    const { unmount } = render(<HomePage />);

    expect(
      screen.getByRole('heading', {
        name: /shop your favourites\. get rewarded for coming back\./i,
        level: 1,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('img', {
        name: 'Example ShopCity virtual rewards card',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByAltText('ShopCity Supermarket logo'),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/No\. 35, Yakubu Gowon Way/)).toHaveLength(1);
    expect(screen.getByText(/All rights reserved/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /sign in/i })).toBeInTheDocument();
    expect(await runAxe(document.body)).toHaveLength(0);
    unmount();

    render(
      <main>
        <CashierPage />
        <SupervisorPage />
        <AdminPage />
      </main>,
    );

    expect(
      screen.getByRole('heading', { name: 'Hi, Supervisor!', level: 1 }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /admin shell/i, level: 1 }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('row', { name: /Customer 1/ }),
    ).toBeInTheDocument();
    expect(
      await screen.findByText(/Daily report materialized/),
    ).toBeInTheDocument();
    expect(await runAxe(document.body)).toHaveLength(0);
  }, 30000);
});
