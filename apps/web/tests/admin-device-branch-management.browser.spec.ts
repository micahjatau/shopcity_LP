import { expect, test } from '@playwright/test';

const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3100';
const branch = {
  id: 'branch-1',
  name: 'Central Market',
  status: 'ACTIVE',
  timezone: 'Africa/Lagos',
  receiptWeekStartDay: 1,
  createdAt: '2026-10-01T09:00:00.000Z',
};

test('Admin registers a device, opens its tenant-scoped profile, and manages its name after a direct-route reload', async ({
  page,
}) => {
  const branches = [{ ...branch }];
  const devices: Record<string, unknown>[] = [];

  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const { pathname } = new URL(request.url());
    const method = request.method();
    const envelope = (data: unknown, status = 200) => ({
      status,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data,
        meta: {
          timestamp: '2030-01-01T00:00:00.000Z',
          path: pathname,
          requestId: 'admin-device-branch-browser-test',
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
    )
      return route.fulfill(envelope(null));
    if (pathname === '/api/v1/config/public') {
      return route.fulfill(
        envelope({
          tenant: { id: 'tenant-1', name: 'ShopCity' },
          branch,
          policies: {},
        }),
      );
    }
    if (pathname === '/api/v1/branches' && method === 'GET')
      return route.fulfill(envelope(branches));
    if (pathname === '/api/v1/branches' && method === 'POST') {
      const payload = request.postDataJSON() as {
        name: string;
        timezone: string;
        receiptWeekStartDay: number;
      };
      const created = {
        id: 'branch-created',
        status: 'ACTIVE',
        ...payload,
        createdAt: '2030-01-01T00:00:00.000Z',
      };
      branches.push(created);
      return route.fulfill(envelope(created, 201));
    }
    if (pathname === '/api/v1/branches/branch-created' && method === 'PATCH') {
      const updated = {
        ...branches.find((record) => record.id === 'branch-created')!,
        ...(request.postDataJSON() as object),
      };
      branches.splice(
        branches.findIndex((record) => record.id === 'branch-created'),
        1,
        updated,
      );
      return route.fulfill(envelope(updated));
    }
    if (pathname === '/api/v1/devices' && method === 'GET')
      return route.fulfill(envelope(devices));
    if (pathname === '/api/v1/devices' && method === 'POST') {
      const payload = request.postDataJSON() as {
        name: string;
        branchId: string;
      };
      const created = {
        id: 'device-created',
        status: 'ACTIVE',
        authBindingMode: 'UNPAIRED',
        pairedAt: null,
        branch: {
          name: branches.find((record) => record.id === payload.branchId)?.name,
        },
        createdAt: '2030-01-01T00:00:00.000Z',
        ...payload,
      };
      devices.push(created);
      return route.fulfill(envelope(created, 201));
    }
    if (pathname === '/api/v1/devices/device-created' && method === 'PATCH') {
      const updated = { ...devices[0], ...(request.postDataJSON() as object) };
      devices.splice(0, 1, updated);
      return route.fulfill(envelope(updated));
    }

    return route.fulfill({
      status: 404,
      contentType: 'application/json',
      body: JSON.stringify({ success: false, error: { code: 'NOT_FOUND' } }),
    });
  });

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`${baseUrl}/admin/devices`);
  await expect(
    page.getByRole('heading', { name: 'Devices', level: 1 }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Register device' }).click();
  await expect(page).toHaveURL(/\/admin\/devices\/new$/);
  await page.getByLabel('Device name').fill('Front POS');
  await page.getByRole('button', { name: 'Register device' }).click();
  await expect(page).toHaveURL(/\/admin\/devices\/device-created$/);
  await expect(
    page.getByRole('heading', { name: 'Device profile', level: 1 }),
  ).toBeVisible();
  await expect(
    page.getByRole('cell', { name: 'UNPAIRED', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('alert').filter({ hasText: 'Pairing required' }),
  ).toBeVisible();

  await page.reload();
  await expect(page.getByLabel('Device name')).toHaveValue('Front POS');
  await page.getByLabel('Device name').fill('Renamed POS');
  await page.getByRole('button', { name: 'Save device name' }).click();
  await expect(page.getByLabel('Device name')).toHaveValue('Renamed POS');
});

test('Admin creates a branch, opens and updates its profile, and reloads the nested profile route', async ({
  page,
}) => {
  const branches = [{ ...branch }];
  const devices: Record<string, unknown>[] = [];

  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const { pathname } = new URL(request.url());
    const method = request.method();
    const envelope = (data: unknown, status = 200) => ({
      status,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data,
        meta: {
          timestamp: '2030-01-01T00:00:00.000Z',
          path: pathname,
          requestId: 'admin-device-branch-browser-test',
        },
      }),
    });

    if (pathname === '/api/v1/auth/me')
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
    if (
      pathname === '/api/v1/auth/refresh' ||
      pathname === '/api/v1/auth/logout'
    )
      return route.fulfill(envelope(null));
    if (pathname === '/api/v1/config/public')
      return route.fulfill(
        envelope({
          tenant: { id: 'tenant-1', name: 'ShopCity' },
          branch,
          policies: {},
        }),
      );
    if (pathname === '/api/v1/branches' && method === 'GET')
      return route.fulfill(envelope(branches));
    if (pathname === '/api/v1/branches' && method === 'POST') {
      const created = {
        id: 'branch-created',
        status: 'ACTIVE',
        ...(request.postDataJSON() as object),
        createdAt: '2030-01-01T00:00:00.000Z',
      };
      branches.push(created);
      return route.fulfill(envelope(created, 201));
    }
    if (pathname === '/api/v1/branches/branch-created' && method === 'PATCH') {
      const updated = {
        ...branches.find((record) => record.id === 'branch-created')!,
        ...(request.postDataJSON() as object),
      };
      branches.splice(
        branches.findIndex((record) => record.id === 'branch-created'),
        1,
        updated,
      );
      return route.fulfill(envelope(updated));
    }
    if (pathname === '/api/v1/devices' && method === 'GET')
      return route.fulfill(envelope(devices));
    return route.fulfill({
      status: 404,
      contentType: 'application/json',
      body: JSON.stringify({ success: false, error: { code: 'NOT_FOUND' } }),
    });
  });

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`${baseUrl}/admin/branches`);
  await expect(
    page.getByRole('heading', { name: 'Branches', level: 1 }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Create branch' }).click();
  await expect(page).toHaveURL(/\/admin\/branches\/new$/);
  await page.getByLabel('Branch name').fill('West depot');
  await page.getByRole('button', { name: 'Create branch' }).click();
  await expect(page).toHaveURL(/\/admin\/branches\/branch-created$/);
  await expect(
    page.getByRole('heading', { name: 'West depot', level: 1 }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'West depot', level: 1 }),
  ).toBeVisible();
  await page.getByLabel('Branch name').fill('West depot updated');
  await page.getByLabel('Type UPDATE to confirm changes').fill('UPDATE');
  await page.getByRole('button', { name: 'Save branch settings' }).click();
  await expect(
    page.getByRole('heading', { name: 'West depot updated', level: 1 }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Back to branches' }),
  ).toHaveAttribute('href', '/admin/branches');

  await page.setViewportSize({ width: 375, height: 844 });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(375);
});
