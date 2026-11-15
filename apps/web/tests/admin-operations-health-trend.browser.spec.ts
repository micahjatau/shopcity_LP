import { expect, test, type Page, type Route } from '@playwright/test';

const adminSession = {
  user: {
    id: 'admin-health-trend-browser-test',
    username: 'admin@example.test',
    role: 'ADMIN',
    branchId: null,
  },
  session: { expiresAt: '2030-01-01T00:00:00.000Z', deviceId: null },
};

function envelope(path: string, data: unknown) {
  return {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      path,
      requestId: 'admin-health-trend-browser-test',
    },
  };
}

async function mockAdminApis(page: Page) {
  const requests = new Map<string, number>();
  await page.route('**/api/v1/**', async (route: Route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    requests.set(path, (requests.get(path) ?? 0) + 1);
    let data: unknown = {};

    if (path === '/api/v1/auth/me') {
      data = adminSession;
    } else if (path === '/api/v1/config/public') {
      data = {
        tenant: { id: 'tenant-browser-test', name: 'ShopCity' },
        branch: {
          id: 'branch-browser-test',
          name: 'Main branch',
          timezone: 'Africa/Lagos',
          receiptWeekStartDay: 1,
        },
        policies: {
          defaultEarnRateBps: 500,
          minRedemptionKobo: 1000,
          maxRedemptionBasketPercent: 50,
          purchaseFlagThresholdKobo: 100000,
          purchaseApprovalThresholdKobo: 200000,
          redemptionApprovalThresholdKobo: 100000,
          offlineRedemptionDisabled: false,
        },
      };
    } else if (path === '/api/v1/branches') {
      data = [
        {
          id: 'branch-browser-test',
          name: 'Main branch',
          status: 'ACTIVE',
        },
      ];
    } else if (path === '/api/v1/config/policies') {
      data = {
        branchId: 'branch-browser-test',
        branchName: 'Main branch',
        version: 3,
        defaultEarnRateBps: 500,
        minRedemptionKobo: 1000,
        maxRedemptionBasketPercent: 50,
        purchaseFlagThresholdKobo: 100000,
        purchaseApprovalThresholdKobo: 200000,
        purchaseAmountCeilingKobo: 500000,
        redemptionApprovalThresholdKobo: 100000,
        offlineRedemptionDisabled: false,
      };
    } else if (path === '/api/v1/reports/pilot-operations-summary') {
      data = {
        release: {
          version: 'test',
          sha: 'browser-test',
          sentryConfigured: false,
        },
        generatedAt: new Date().toISOString(),
        outbox: { backlogCount: 0, staleCount: 0 },
        sms: { failedCount: 0 },
        offlineSync: { failureCount: 0 },
        fraud: { openCount: 0 },
        reports: { staleCount: 0 },
        reconciliation: { healthy: true, mismatchCount: 0 },
      };
    } else if (path === '/api/v1/reports/pilot-operations-history') {
      const generatedAt = new Date();
      const bucketStart = new Date(
        Math.floor(generatedAt.getTime() / 3_600_000) * 3_600_000,
      );
      data = {
        window: url.searchParams.get('window') ?? '7d',
        generatedAt: generatedAt.toISOString(),
        items: [
          {
            bucketStart: bucketStart.toISOString(),
            capturedAt: generatedAt.toISOString(),
            outbox: { backlogCount: 1, staleCount: 0 },
            sms: { failedCount: 0 },
            offlineSync: { failureCount: 0 },
            fraud: { openCount: 0 },
            reports: { staleCount: 0 },
            reconciliation: { healthy: true, mismatchCount: 0 },
          },
        ],
      };
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(envelope(path, data)),
    });
  });
  return requests;
}

test('Admin Operations health trends work at desktop and 320px', async ({
  page,
}) => {
  const requests = await mockAdminApis(page);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/admin/operations');

  await expect(
    page.getByRole('heading', { name: 'Operations', level: 1 }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'System health trends' }),
  ).toBeVisible();
  await expect(
    page.getByRole('img', { name: 'System health trends' }),
  ).toBeVisible();
  await expect
    .poll(() => requests.get('/api/v1/reports/pilot-operations-history'))
    .toBe(1);

  await page.getByLabel('Health trend metric').selectOption('sms.failedCount');
  await expect(page.getByLabel('Health trend metric')).toHaveValue(
    'sms.failedCount',
  );
  await expect
    .poll(() => requests.get('/api/v1/reports/pilot-operations-history'))
    .toBe(1);

  await page.getByLabel('Health trend range').selectOption('24h');
  await expect
    .poll(() => requests.get('/api/v1/reports/pilot-operations-history'))
    .toBe(2);

  await page.setViewportSize({ width: 320, height: 860 });
  await expect(
    page.getByRole('heading', { name: 'System health trends' }),
  ).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
    .toBeLessThanOrEqual(320);
});

test('Admin Operations and Policies share a readable page frame', async ({
  page,
}) => {
  await mockAdminApis(page);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/admin/operations');

  const operationsFrame = page.getByTestId('admin-workspace-page');
  await expect(
    page.getByRole('heading', { name: 'Operations', level: 1 }),
  ).toBeVisible();
  await expect(
    page.getByText(
      'Check system health, view reports, and manage key settings.',
    ),
  ).toBeVisible();
  const operationsGeometry = await operationsFrame.evaluate((element) => {
    const title = element.querySelector('h1')!;
    const description = element.querySelector('p')!;
    return {
      width: element.getBoundingClientRect().width,
      titleSize: getComputedStyle(title).fontSize,
      bodySize: getComputedStyle(description).fontSize,
    };
  });
  expect(operationsGeometry.width).toBeLessThanOrEqual(1120);
  const tabList = page.getByRole('tablist', { name: 'Operations sections' });
  expect(
    await tabList.evaluate(
      (element) => getComputedStyle(element).scrollbarWidth,
    ),
  ).toBe('none');
  await tabList.evaluate((element) => {
    element.style.maxWidth = '120px';
  });
  expect(
    await tabList.evaluate(
      (element) => element.scrollWidth > element.clientWidth,
    ),
  ).toBe(true);
  await page.getByRole('tab', { name: 'Overview' }).focus();
  await page.keyboard.press('End');
  await expect(
    page.getByRole('tab', { name: 'Controls', selected: true }),
  ).toBeFocused();

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/admin/policies');
  const policiesFrame = page.getByTestId('admin-workspace-page');
  await expect(
    page.getByRole('heading', { name: 'Policies', level: 1 }),
  ).toBeVisible();
  await expect(
    page.getByText('Set purchase and redemption rules for each branch.'),
  ).toBeVisible();
  await expect(page.getByText('Policy loaded.')).toBeVisible();
  await expect(
    page.getByRole('textbox', { name: 'Earn rate (%)' }),
  ).toHaveValue('5.00');
  const policiesGeometry = await policiesFrame.evaluate((element) => {
    const title = element.querySelector('h1')!;
    const description = element.querySelector('header p')!;
    return {
      width: element.getBoundingClientRect().width,
      titleSize: getComputedStyle(title).fontSize,
      bodySize: getComputedStyle(description).fontSize,
    };
  });
  expect(policiesGeometry).toEqual(operationsGeometry);

  await page.setViewportSize({ width: 320, height: 860 });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(320);
  expect(
    await policiesFrame.evaluate(
      (element) => element.getBoundingClientRect().width,
    ),
  ).toBeLessThanOrEqual(320);
  expect(
    await page.getByTestId('policy-fields').evaluate((element) => {
      const columns = getComputedStyle(element).gridTemplateColumns;
      return columns.trim().split(/\s+/).length;
    }),
  ).toBe(1);
});
