import fs from 'node:fs';
import path from 'node:path';
import {
  getShellNavigationSections,
  getActiveShellNavigationItem,
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

  it('uses the most specific canonical route for nested paths', () => {
    const sections = getShellNavigationSections('ADMIN', 'ready');
    expect(
      getActiveShellNavigationItem('/admin/customers/123', sections),
    ).toEqual(expect.objectContaining({ href: '/admin/customers' }));
  });
});
