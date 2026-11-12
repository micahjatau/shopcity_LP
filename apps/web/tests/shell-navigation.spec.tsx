import fs from 'node:fs';
import path from 'node:path';
import {
  getShellNavigationSections,
  getActiveShellNavigationItem,
  matchShellRoute,
  shellNavigationByRole,
} from '../components/shell-navigation';

describe('canonical shell navigation', () => {
  it('keeps Cashier navigation in the approved workflow order', () => {
    expect(
      shellNavigationByRole.CASHIER.flatMap((section) => section.items).map(
        (item) => [item.label, item.href],
      ),
    ).toEqual([
      ['Overview', '/cashier'],
      ['Find Customer', '/cashier/lookup'],
      ['Capture Purchase', '/cashier/earn'],
      ['Redeem Credit', '/cashier/redeem'],
      ['Transactions', '/cashier/transactions'],
      ['Sync Queue', '/cashier/sync'],
    ]);
  });

  it.each(['CASHIER', 'SUPERVISOR', 'ADMIN'] as const)(
    'resolves every %s navigation item to an app route',
    (role) => {
      const items = shellNavigationByRole[role].flatMap(
        (section) => section.items,
      );

      for (const item of items) {
        const routePath = path.join(
          process.cwd(),
          'app/(shell)',
          ...item.href.replace(/^\//, '').split('/'),
          'page.tsx',
        );
        expect(fs.existsSync(routePath)).toBe(true);
      }
    },
  );

  it('keeps customer deep-link routes available outside Cashier primary navigation', () => {
    expect(
      fs.existsSync(
        path.join(process.cwd(), 'app/(shell)/cashier/customers/page.tsx'),
      ),
    ).toBe(true);
  });

  it('authorizes the Cashier profile alias without adding a sidebar item', () => {
    const cashierItems = shellNavigationByRole.CASHIER.flatMap(
      (section) => section.items,
    );
    const lookupItem = cashierItems.find(
      (item) => item.id === 'cashier-lookup',
    );

    expect(cashierItems).toHaveLength(6);
    if (!lookupItem) throw new Error('Cashier lookup route is missing');
    expect(matchShellRoute('/cashier/customers', lookupItem)).toBe(true);
    expect(
      getActiveShellNavigationItem(
        '/cashier/customers',
        getShellNavigationSections('CASHIER', 'ready'),
      ),
    ).toEqual(expect.objectContaining({ id: 'cashier-lookup' }));
    expect(
      getActiveShellNavigationItem(
        '/cashier/customers',
        getShellNavigationSections('SUPERVISOR', 'ready'),
      ),
    ).toBeNull();
    expect(
      getActiveShellNavigationItem(
        '/cashier/customers',
        getShellNavigationSections('ADMIN', 'ready'),
      ),
    ).toBeNull();
  });

  it('keeps Admin Controls destinations under Operations instead of the sidebar', () => {
    const sections = getShellNavigationSections('ADMIN', 'ready');
    const items = sections.flatMap((section) => section.items);
    const controlRoutes = [
      '/admin/users',
      '/admin/devices',
      '/admin/branches',
      '/admin/audit',
      '/admin/adjustments',
    ];

    const operationsItem = items.find(
      (item) => item.href === '/admin/operations',
    );

    expect(operationsItem).toBeDefined();
    if (!operationsItem) throw new Error('Admin Operations route is missing');
    expect(operationsItem.routeAliases).toEqual(controlRoutes);

    for (const href of controlRoutes) {
      expect(items.some((item) => item.href === href)).toBe(false);
      expect(matchShellRoute(href, operationsItem)).toBe(true);
      expect(getActiveShellNavigationItem(href, sections)).toEqual(
        expect.objectContaining({ id: 'admin-operations-panel' }),
      );
      expect(
        getActiveShellNavigationItem(
          href,
          getShellNavigationSections('SUPERVISOR', 'ready'),
        ),
      ).toBeNull();
      expect(
        getActiveShellNavigationItem(
          href,
          getShellNavigationSections('CASHIER', 'ready'),
        ),
      ).toBeNull();
      expect(
        fs.existsSync(
          path.join(
            process.cwd(),
            'app/(shell)',
            ...href.slice(1).split('/'),
            'page.tsx',
          ),
        ),
      ).toBe(true);
    }
  });

  it('uses the most specific canonical route for nested paths', () => {
    const sections = getShellNavigationSections('ADMIN', 'ready');
    expect(
      getActiveShellNavigationItem('/admin/customers/123', sections),
    ).toEqual(expect.objectContaining({ href: '/admin/customers' }));
  });
});
