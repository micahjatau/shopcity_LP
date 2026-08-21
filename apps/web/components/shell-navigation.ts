import type { SessionBootstrapStatus, SessionRole } from './session-bootstrap';

export type HumanRole = Exclude<SessionRole, 'SYSTEM'>;

export type ShellNavigationItem = {
  id: string;
  label: string;
  href: string;
  exact?: boolean;
};

export type ShellNavigationSection = {
  id: string;
  label: string;
  items: ShellNavigationItem[];
};

export const shellNavigationByRole: Record<HumanRole, ShellNavigationSection[]> = {
  CASHIER: [
    {
      id: 'cashier-workspace',
      label: 'Workspace',
      items: [
        { id: 'cashier-overview', label: 'Overview', href: '/cashier', exact: true },
        { id: 'cashier-lookup', label: 'Lookup', href: '/cashier/lookup' },
        { id: 'cashier-earn', label: 'Earn', href: '/cashier/earn' },
        { id: 'cashier-redeem', label: 'Redeem', href: '/cashier/redeem' },
        { id: 'cashier-customers', label: 'Customers', href: '/cashier/customers' },
        { id: 'cashier-sync', label: 'Sync queue', href: '/cashier/sync' },
      ],
    },
  ],
  SUPERVISOR: [
    {
      id: 'supervisor-workspace',
      label: 'Workspace',
      items: [{ id: 'supervisor-overview', label: 'Overview', href: '/supervisor', exact: true }],
    },
    {
      id: 'supervisor-operations',
      label: 'Operations',
      items: [
        { id: 'supervisor-transactions', label: 'Transactions', href: '/supervisor/transactions' },
        { id: 'supervisor-customers', label: 'Customers', href: '/supervisor/customers' },
        { id: 'supervisor-cards', label: 'Cards', href: '/supervisor/cards' },
        { id: 'supervisor-approvals', label: 'Approvals', href: '/supervisor/approvals' },
        { id: 'supervisor-fraud', label: 'Fraud', href: '/supervisor/fraud' },
        { id: 'supervisor-reports', label: 'Reports', href: '/supervisor/reports' },
      ],
    },
  ],
  ADMIN: [
    {
      id: 'admin-workspace',
      label: 'Workspace',
      items: [{ id: 'admin-overview', label: 'Overview', href: '/admin', exact: true }],
    },
    {
      id: 'admin-operations',
      label: 'Operations',
      items: [
        { id: 'admin-operations-panel', label: 'Operations', href: '/admin/operations' },
        { id: 'admin-transactions', label: 'Transactions', href: '/admin/transactions' },
        { id: 'admin-approvals', label: 'Approvals', href: '/admin/approvals' },
        { id: 'admin-fraud', label: 'Fraud', href: '/admin/fraud' },
      ],
    },
    {
      id: 'admin-loyalty',
      label: 'Loyalty',
      items: [
        { id: 'admin-customers', label: 'Customers', href: '/admin/customers' },
        { id: 'admin-cards', label: 'Cards', href: '/admin/cards' },
        { id: 'admin-adjustments', label: 'Adjustments', href: '/admin/adjustments' },
      ],
    },
    {
      id: 'admin-insights',
      label: 'Insights',
      items: [
        { id: 'admin-reports', label: 'Reports', href: '/admin/reports' },
        { id: 'admin-audit', label: 'Audit', href: '/admin/audit' },
      ],
    },
    {
      id: 'admin-access',
      label: 'Access & configuration',
      items: [
        { id: 'admin-users', label: 'Users', href: '/admin/users' },
        { id: 'admin-devices', label: 'Devices', href: '/admin/devices' },
        { id: 'admin-branches', label: 'Branches', href: '/admin/branches' },
      ],
    },
  ],
};

export function getShellNavigationSections(
  role: SessionRole | null,
  status: SessionBootstrapStatus,
) {
  if (status !== 'ready' || !role || role === 'SYSTEM') {
    return [] as ShellNavigationSection[];
  }

  return shellNavigationByRole[role];
}

export function getShellPrimaryRoute(
  role: SessionRole | null,
  status: SessionBootstrapStatus,
) {
  const sections = getShellNavigationSections(role, status);
  return sections[0]?.items[0]?.href ?? '/login';
}

export function matchShellRoute(
  pathname: string | null,
  item: ShellNavigationItem,
) {
  if (!pathname) {
    return false;
  }

  if (item.exact) {
    return pathname === item.href;
  }

  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function getActiveShellNavigationItem(
  pathname: string | null,
  sections: ShellNavigationSection[],
) {
  const allItems = sections.flatMap((section) => section.items);
  return allItems
    .filter((item) => matchShellRoute(pathname, item))
    .sort((left, right) => right.href.length - left.href.length)[0] ?? null;
}

export function getActiveShellNavigationSection(
  pathname: string | null,
  sections: ShellNavigationSection[],
) {
  const activeItem = getActiveShellNavigationItem(pathname, sections);
  if (!activeItem) {
    return null;
  }

  return (
    sections.find((section) =>
      section.items.some((item) => item.id === activeItem.id),
    ) ?? null
  );
}

export function getShellNavigationTrail(
  pathname: string | null,
  sections: ShellNavigationSection[],
) {
  const section = getActiveShellNavigationSection(pathname, sections);
  const item = getActiveShellNavigationItem(pathname, sections);

  return {
    section,
    item,
    labels: [section?.label, item?.label].filter(Boolean) as string[],
  };
}

export function getShellWorkspaceLabel(role: SessionRole | null, status: SessionBootstrapStatus) {
  if (status !== 'ready') {
    return 'Protected shell';
  }

  switch (role) {
    case 'ADMIN':
      return 'Admin workspace';
    case 'SUPERVISOR':
      return 'Supervisor workspace';
    case 'CASHIER':
      return 'Cashier workspace';
    case 'SYSTEM':
      return 'Operational session';
    default:
      return 'Operational workspace';
  }
}
