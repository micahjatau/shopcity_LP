import { expect, test } from '@playwright/test';

const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3100';

test('Admin registers a staff member and manages the created profile', async ({
  page,
}) => {
  const staff = [
    {
      id: 'staff-existing',
      firstName: 'Ada',
      lastName: 'Lovelace',
      username: 'ada@example.test',
      phoneNumber: '+234 801 234 5678',
      role: 'CASHIER',
      status: 'ACTIVE',
      branchId: 'branch-1',
      createdAt: '2026-10-01T09:00:00.000Z',
      lastLoginAt: null,
    },
  ];
  const branch = { id: 'branch-1', name: 'Central Market', status: 'ACTIVE' };

  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const { pathname } = new URL(request.url());
    const method = request.method();
    const envelope = (data: unknown) => ({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data,
        meta: {
          timestamp: '2030-01-01T00:00:00.000Z',
          path: pathname,
          requestId: 'staff-browser-test',
        },
      }),
    });

    if (pathname === '/api/v1/auth/me') {
      return route.fulfill(
        envelope({
          user: {
            id: 'admin-1',
            username: 'admin@shopcity.local',
            role: 'ADMIN',
            branchId: 'branch-1',
          },
          session: { expiresAt: '2030-01-01T00:00:00.000Z', deviceId: null },
        }),
      );
    }
    if (
      pathname === '/api/v1/auth/refresh' ||
      pathname === '/api/v1/auth/logout'
    ) {
      return route.fulfill(envelope(null));
    }
    if (pathname === '/api/v1/config/public') {
      return route.fulfill(
        envelope({
          tenant: { id: 'tenant-1', name: 'ShopCity' },
          branch: {
            id: branch.id,
            name: branch.name,
            timezone: 'Africa/Lagos',
            receiptWeekStartDay: 1,
          },
          policies: {},
        }),
      );
    }
    if (pathname === '/api/v1/branches' && method === 'GET') {
      return route.fulfill(envelope([branch]));
    }
    if (pathname === '/api/v1/users' && method === 'GET') {
      return route.fulfill(envelope(staff));
    }
    if (pathname === '/api/v1/users' && method === 'POST') {
      const payload = request.postDataJSON() as {
        firstName: string;
        lastName: string;
        username: string;
        phoneNumber: string;
        role: string;
        branchId: string;
      };
      const created = {
        id: 'staff-created',
        ...payload,
        status: 'ACTIVE',
        createdAt: '2030-01-01T00:00:00.000Z',
        lastLoginAt: null,
      };
      staff.push(created);
      const result = envelope(created);
      return route.fulfill({ ...result, status: 201 });
    }
    if (pathname === '/api/v1/users/staff-created/role' && method === 'PATCH') {
      const payload = request.postDataJSON() as { role: string };
      staff[1]!.role = payload.role;
      return route.fulfill(envelope(staff[1]));
    }
    if (
      pathname === '/api/v1/users/staff-created/status' &&
      method === 'PATCH'
    ) {
      const payload = request.postDataJSON() as { status: string };
      staff[1]!.status = payload.status;
      return route.fulfill(envelope(staff[1]));
    }

    return route.fulfill({ status: 404, body: '{}' });
  });

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`${baseUrl}/admin/users`);
  await expect(
    page.getByRole('heading', { name: 'Staff', level: 1 }),
  ).toBeVisible();
  await expect(page.getByText('Ada Lovelace')).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Register staff' }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'View profile for Ada Lovelace' }),
  ).toHaveAttribute('href', '/admin/users/staff-existing');

  await page.getByRole('button', { name: 'Register staff' }).click();
  await expect(page).toHaveURL(/\/admin\/users\/new$/);
  await page.getByLabel('First name').fill('Katherine');
  await page.getByLabel('Last name').fill('Johnson');
  await page.getByLabel('Email').fill('katherine@example.test');
  await page.getByLabel('Phone number').fill('+234 803 765 4321');
  await page.getByLabel('Password').fill('browser-test-only-password');
  await page.getByLabel('Role').selectOption('SUPERVISOR');
  await page.getByLabel('Branch').selectOption('branch-1');
  await page.getByRole('button', { name: 'Register staff' }).click();

  await expect(page).toHaveURL(/\/admin\/users\/staff-created$/);
  const profile = page.getByRole('region', { name: 'Katherine Johnson' });
  await expect(
    page.getByRole('heading', { name: 'Katherine Johnson' }),
  ).toBeVisible();
  await expect(
    profile
      .getByRole('definition')
      .filter({ hasText: 'katherine@example.test' }),
  ).toBeVisible();
  await expect(
    profile.getByRole('definition').filter({ hasText: '+234 803 765 4321' }),
  ).toBeVisible();
  await expect(
    profile.getByRole('definition').filter({ hasText: 'Central Market' }),
  ).toBeVisible();

  await page.locator('#profile-role').selectOption('ADMIN');
  await page.locator('#staff-update-confirmation').fill('UPDATE');
  await page.getByRole('button', { name: 'Update role' }).click();
  await expect(
    page.getByText(
      'Role updated. Existing sessions may need to sign in again.',
    ),
  ).toBeVisible();

  await page.locator('#profile-status').selectOption('SUSPENDED');
  await page.locator('#staff-update-confirmation').fill('UPDATE');
  await page.getByRole('button', { name: 'Update status' }).click();
  await expect(page.getByText('Status updated.')).toBeVisible();
  await expect(page.getByText('SUSPENDED', { exact: true })).toBeVisible();

  await page.setViewportSize({ width: 375, height: 844 });
  await expect(
    page.getByRole('heading', { name: 'Katherine Johnson' }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(375);
});
