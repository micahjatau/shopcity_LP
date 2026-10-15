import { expect, test } from '@playwright/test';

test.use({
  launchOptions: { args: ['--disable-gpu', '--disable-dev-shm-usage'] },
});

test('local test cashier session signs in without a paired device', async ({
  page,
}) => {
  test.skip(
    process.env.PLAYWRIGHT_USE_PRODUCTION_SERVER === 'true',
    'The local cashier test session is available only on the development server.',
  );

  let requestedUsername: string | undefined;

  await page.route('**/api/v1/auth/dev/cashier-test-session', async (route) => {
    requestedUsername = (route.request().postDataJSON() as { username: string })
      .username;
    await route.fulfill({
      status: 200,
      headers: {
        'content-type': 'application/json',
        'set-cookie':
          'shopcity_session=local-test-session; Path=/; HttpOnly; SameSite=Lax',
      },
      body: JSON.stringify({
        status: 'success',
        data: {
          user: {
            id: 'cashier-id',
            username: 'cashier@example.test',
            role: 'CASHIER',
            branchId: 'branch-id',
          },
          session: {
            expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
            deviceId: 'local-test-device-id',
          },
        },
      }),
    });
  });

  await page.route('**/api/v1/auth/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        data: {
          user: {
            id: 'cashier-id',
            username: 'cashier@example.test',
            role: 'CASHIER',
            branchId: 'branch-id',
          },
          session: {
            expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
            deviceId: 'local-test-device-id',
          },
        },
      }),
    });
  });

  await page.goto('/login');
  await page.getByLabel('Email Address').fill('cashier@example.test');
  await page
    .getByRole('button', { name: 'Start local cashier test session' })
    .click();

  await expect(page).toHaveURL(/\/cashier$/);
  expect(requestedUsername).toBe('cashier@example.test');
});
