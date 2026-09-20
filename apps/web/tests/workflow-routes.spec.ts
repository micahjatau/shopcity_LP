import {
  expect,
  test,
  type APIRequestContext,
  type Page,
} from '@playwright/test';
import {
  canonicalCashierLookupControl,
  type ComputedStyleSnapshot,
} from './fixtures/design-system-conformance';
import {
  cashierConformanceRoutes,
  conformanceViewports,
  shellConformanceRoutes,
} from './fixtures/route-conformance-matrix';
import { shellNavigationByRole } from '../components/shell-navigation';

const baseUrl = 'http://127.0.0.1:3100';

const sessionByRole = {
  CASHIER: {
    user: {
      id: 'cashier-1',
      username: 'cashier@shopcity.local',
      role: 'CASHIER',
      branchId: 'branch-1',
    },
    session: { expiresAt: '2030-01-01T00:00:00.000Z', deviceId: null },
  },
  SUPERVISOR: {
    user: {
      id: 'supervisor-1',
      username: 'supervisor@shopcity.local',
      role: 'SUPERVISOR',
      branchId: 'branch-1',
    },
    session: { expiresAt: '2030-01-01T00:00:00.000Z', deviceId: null },
  },
  ADMIN: {
    user: {
      id: 'admin-1',
      username: 'admin@shopcity.local',
      role: 'ADMIN',
      branchId: 'branch-1',
    },
    session: { expiresAt: '2030-01-01T00:00:00.000Z', deviceId: null },
  },
} as const;

test.describe.configure({ timeout: 120000 });

test.describe('workflow route coverage', () => {
  test('repairs sidebar geometry, collapse state, and mobile drawer access', async ({
    page,
  }) => {
    await mockShell(page, 'CASHIER');
    await page.addInitScript(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${baseUrl}/cashier`);
    const sidebar = page.locator('.shell-sidebar');
    await expect(sidebar).toHaveAttribute('data-collapsed', 'false');
    await page.waitForTimeout(300);
    await page.mouse.move(600, 500);
    await expect(page).toHaveScreenshot('sidebar-expanded-desktop.png', {
      maxDiffPixelRatio: 0.08,
    });
    expect(Math.round((await sidebar.boundingBox())?.width ?? 0)).toBe(244);

    await page.getByRole('button', { name: 'Collapse sidebar' }).click();
    await expect(sidebar).toHaveAttribute('data-collapsed', 'true');
    await page.waitForTimeout(300);
    await page.mouse.move(600, 500);
    await expect(
      page.getByRole('button', { name: 'Expand sidebar' }),
    ).toHaveAttribute('aria-expanded', 'false');
    await expect(page).toHaveScreenshot('sidebar-collapsed-desktop.png', {
      maxDiffPixelRatio: 0.08,
    });
    expect(Math.round((await sidebar.boundingBox())?.width ?? 0)).toBe(76);
    await expect(page.getByRole('link', { name: 'Overview' })).toHaveAttribute(
      'title',
      'Overview',
    );
    await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible();

    await page.setViewportSize({ width: 1024, height: 900 });
    await expect(sidebar).toHaveAttribute('data-collapsed', 'true');
    await page.getByRole('button', { name: 'Expand sidebar' }).click();
    await expect(sidebar).toHaveAttribute('data-collapsed', 'false');
    await expect(
      page.getByRole('link', { name: 'Find Customer Lookup' }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Collapse sidebar' }).click();
    await page.waitForTimeout(300);
    await expect(page).toHaveScreenshot('sidebar-collapsed-tablet.png', {
      maxDiffPixelRatio: 0.08,
    });
    expect(
      await page.locator('body').evaluate((body) => body.scrollWidth),
    ).toBeLessThanOrEqual(1024);

    await page.setViewportSize({ width: 768, height: 900 });
    await page.getByRole('button', { name: 'Expand sidebar' }).click();
    await expect(sidebar).toHaveAttribute('data-collapsed', 'false');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    expect(
      await page
        .locator('.shell-body')
        .evaluate((element) => getComputedStyle(element).transitionDuration),
    ).toBe('0s');

    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    await expect(sidebar).toBeHidden();
    await page.getByRole('button', { name: 'Menu' }).click();
    const drawer = page.getByRole('dialog', { name: 'Primary navigation' });
    await expect(drawer).toBeVisible();
    await expect(
      drawer.getByRole('link', { name: /help & training/i }),
    ).toBeVisible();
    await expect(drawer.getByRole('button', { name: 'Logout' })).toBeVisible();
    await expect(page).toHaveScreenshot('sidebar-mobile-drawer.png', {
      maxDiffPixelRatio: 0.08,
    });
    await page.keyboard.press('Escape');
    await expect(drawer).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Menu' })).toBeFocused();

    await page.setViewportSize({ width: 375, height: 812 });
    await page.reload();
    expect(
      await page.locator('body').evaluate((body) => body.scrollWidth),
    ).toBeLessThanOrEqual(375);
  });

  test('keeps Capture Purchase and Redeem lookup states visually paired', async ({
    page,
  }) => {
    await mockShell(page, 'CASHIER');
    let mode: 'success' | 'loading' | 'error' = 'success';
    await page.route('**/api/v1/cards/lookup/CARD-PAIR', async (route) => {
      if (mode === 'loading')
        await new Promise((resolve) => setTimeout(resolve, 700));
      if (mode === 'error') {
        await route.fulfill({
          ...json({ success: false, error: { statusCode: 503 } }),
          status: 503,
        });
        return;
      }
      await route.fulfill(
        json({
          success: true,
          data: {
            customer: { id: 'customer-1', fullName: 'Ada Shopper' },
            serialNumber: 'CARD-PAIR',
            status: 'ACTIVE',
            availableBalanceKobo: 5500,
            branchId: 'branch-1',
          },
          meta: meta('/api/v1/cards/lookup/CARD-PAIR'),
        }),
      );
    });

    let canonicalLookupStyles: ComputedStyleSnapshot | null = null;
    let canonicalLookupButtonStyles: Record<string, string> | null = null;
    for (const kind of ['earn', 'redeem'] as const) {
      const route = kind === 'earn' ? '/cashier/earn' : '/cashier/redeem';
      await page.goto(`${baseUrl}${route}`);
      const lookup = page.locator('.cashier-verified-card-lookup');
      await expect(lookup).toBeVisible();
      const lookupStyles = await page
        .getByRole('textbox', { name: 'Lookup' })
        .evaluate((input): ComputedStyleSnapshot => {
          const style = getComputedStyle(input);
          return {
            fontFamily: style.fontFamily,
            fontSize: style.fontSize,
            lineHeight: style.lineHeight,
            minHeight: style.minHeight,
            borderRadius: style.borderRadius,
            borderWidth: style.borderWidth,
            borderStyle: style.borderStyle,
            borderColor: style.borderColor,
            backgroundColor: style.backgroundColor,
            color: style.color,
            paddingInline: `${style.paddingLeft}|${style.paddingRight}`,
            paddingBlock: `${style.paddingTop}|${style.paddingBottom}`,
          };
        });
      expect(lookupStyles).toMatchObject(canonicalCashierLookupControl);
      const lookupButtonStyles = await page
        .getByRole('button', { name: 'Search customer' })
        .evaluate((button) => {
          const style = getComputedStyle(button);
          return {
            fontFamily: style.fontFamily,
            fontSize: style.fontSize,
            minHeight: style.minHeight,
            borderRadius: style.borderRadius,
            borderWidth: style.borderWidth,
            borderStyle: style.borderStyle,
            borderColor: style.borderColor,
            backgroundColor: style.backgroundColor,
            color: style.color,
            paddingInline: `${style.paddingLeft}|${style.paddingRight}`,
          };
        });
      if (canonicalLookupButtonStyles) {
        expect(lookupButtonStyles).toEqual(canonicalLookupButtonStyles);
      } else {
        canonicalLookupButtonStyles = lookupButtonStyles;
      }
      if (canonicalLookupStyles) {
        expect(lookupStyles).toEqual(canonicalLookupStyles);
      } else {
        canonicalLookupStyles = lookupStyles;
      }
      await expect(page).toHaveScreenshot(`financial-lookup-${kind}-idle.png`, {
        maxDiffPixelRatio: 0.08,
      });

      mode = 'loading';
      await page.getByRole('textbox', { name: 'Lookup' }).fill('CARD-PAIR');
      await page.getByRole('button', { name: 'Search customer' }).click();
      await expect(
        page.getByRole('button', { name: 'Looking up…' }),
      ).toBeDisabled();
      await expect(page).toHaveScreenshot(
        `financial-lookup-${kind}-loading.png`,
        {
          maxDiffPixelRatio: 0.08,
        },
      );
      await page.waitForResponse('**/api/v1/cards/lookup/CARD-PAIR');

      mode = 'error';
      await page.reload();
      await page.getByRole('textbox', { name: 'Lookup' }).fill('CARD-PAIR');
      await page.getByRole('button', { name: 'Search customer' }).click();
      await expect(page.getByText(/Lookup unavailable \(503\)/)).toBeVisible();
      await expect(page).toHaveScreenshot(
        `financial-lookup-${kind}-error.png`,
        {
          maxDiffPixelRatio: 0.08,
        },
      );

      mode = 'success';
      await page.reload();
      await page.getByRole('textbox', { name: 'Lookup' }).fill('CARD-PAIR');
      await page.getByRole('button', { name: 'Search customer' }).click();
      await expect(
        page.getByRole('heading', { name: 'Confirm customer' }),
      ).toBeVisible();
      await expect(page).toHaveScreenshot(
        `financial-lookup-${kind}-verified.png`,
        {
          maxDiffPixelRatio: 0.08,
        },
      );
      await page
        .getByRole('button', {
          name: kind === 'earn' ? 'Proceed' : 'Continue to redemption',
        })
        .click();
      await expect(
        page.getByRole('article', { name: `${kind} transaction` }),
      ).toBeVisible();
      await expect(page.locator('.cashier-verified-card-lookup')).toHaveCount(
        0,
      );
      await expect(page).toHaveScreenshot(
        `financial-lookup-${kind}-confirmation.png`,
        {
          maxDiffPixelRatio: 0.08,
        },
      );
    }
  });

  test('opens and closes the cashier transaction detail modal without unsupported fields', async ({
    page,
  }) => {
    await mockShell(page, 'CASHIER');
    await page.route('**/api/v1/reports/cashier-today', (route) =>
      route.fulfill(
        json({
          success: true,
          data: {
            branchId: 'branch-1',
            timezone: 'Africa/Lagos',
            items: [
              {
                id: 'txn-1',
                occurredAt: '2030-01-01T10:00:00.000Z',
                operation: 'EARN',
                loyaltyAmountKobo: 500,
                receiptNumber: 'R-001',
                status: 'APPROVED',
              },
            ],
          },
          meta: meta('/api/v1/reports/cashier-today'),
        }),
      ),
    );
    let detailMode: 'success' | 'error' = 'success';
    await page.route('**/api/v1/transactions/txn-1', (route) => {
      if (detailMode === 'error') {
        return route.fulfill({
          ...json({ success: false, error: { statusCode: 503 } }),
          status: 503,
        });
      }
      return route.fulfill(
        json({
          success: true,
          data: {
            id: 'txn-1',
            transactionId: 'txn-1',
            type: 'EARN',
            direction: 'CREDIT',
            tenantId: 'tenant-1',
            branchId: 'branch-1',
            customerId: 'customer-1',
            deviceId: null,
            cardSerialNumber: null,
            posReceiptNumber: 'R-001',
            purchaseAmountKobo: null,
            occurredAt: '2030-01-01T10:00:00.000Z',
            capturedAt: '2030-01-01T10:01:00.000Z',
            state: 'POSTED',
            captureStatus: null,
            reviewStatus: null,
            approvalId: null,
            approvalStatus: null,
            ledgerEntryId: 'ledger-1',
            creditKobo: 500,
            redeemedAmountKobo: null,
            redemptionId: null,
            availableBalanceKobo: 0,
            expiresAt: null,
            smsStatus: null,
            ledger: {},
            reversal: null,
          },
          meta: meta('/api/v1/transactions/txn-1'),
        }),
      );
    });
    await page.goto(`${baseUrl}/cashier/transactions`);
    await expect(page.locator('main')).toHaveScreenshot(
      'cashier-transactions-list.png',
      { maxDiffPixelRatio: 0.08 },
    );

    const trigger = page.getByRole('row', { name: /open transaction R-001/i });
    await trigger.click();
    const dialog = page.getByRole('dialog', { name: 'R-001' });
    await expect(dialog).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Close transaction detail' }),
    ).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(
      page.getByRole('button', { name: 'Close transaction detail' }),
    ).toBeFocused();
    await expect(dialog).toContainText('txn-1');
    await expect(dialog).not.toContainText('customer-1');
    await expect(page).toHaveScreenshot('cashier-transactions-detail.png', {
      maxDiffPixelRatio: 0.08,
    });
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    await expect(trigger).toBeFocused();

    detailMode = 'error';
    await page.setViewportSize({ width: 375, height: 812 });
    await page.reload();
    const mobileTrigger = page.getByRole('row', {
      name: /open transaction R-001/i,
    });
    await mobileTrigger.click();
    await expect(page.getByRole('dialog', { name: 'R-001' })).toContainText(
      'Transaction detail unavailable',
    );
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'R-001' })).not.toBeVisible();
  });

  test('covers cashier earn, redeem, customers and sync routes', async ({
    request,
  }) => {
    await expectRoutesAvailable(request, [
      '/cashier/lookup?card=CARD-001',
      '/cashier/earn?card=CARD-001',
      '/cashier/customers',
      '/cashier/redeem?card=CARD-001',
      '/cashier/sync',
    ]);
  });

  test('executes the route and viewport conformance matrix', async ({
    page,
  }) => {
    for (const [role, routes] of [
      ['CASHIER', cashierConformanceRoutes],
      ['SUPERVISOR', shellConformanceRoutes.filter(({ role: routeRole }) => routeRole === 'SUPERVISOR')],
      ['ADMIN', shellConformanceRoutes.filter(({ role: routeRole }) => routeRole === 'ADMIN')],
    ] as const) {
      await page.unroute('**/api/v1/**');
      await mockShell(page, role);
      for (const route of routes) {
        for (const viewport of conformanceViewports) {
          await page.setViewportSize({
            width: viewport.width,
            height: viewport.height,
          });
          await page.emulateMedia({ reducedMotion: 'reduce' });
          await page.goto(`${baseUrl}${route.path}`);
          await expect(page.locator('.shell-loading-screen')).toBeHidden();
          await expect(page.locator('main')).toBeVisible();
          expect(
            await page.locator('body').evaluate((body) => body.scrollWidth),
            `${role} ${route.path} ${viewport.name}`,
          ).toBeLessThanOrEqual(viewport.width);
          expect(
            await page
              .locator('.shell-body')
              .evaluate((element) => getComputedStyle(element).transitionDuration),
            `${role} ${route.path} ${viewport.name} reduced motion`,
          ).toBe('0s');
          const invalidTargets = await page
            .locator('button:visible, input:visible, select:visible, textarea:visible')
            .evaluateAll((elements) =>
              elements.filter((element) => {
                const rect = element.getBoundingClientRect();
                return rect.width <= 0 || rect.height <= 0;
              }).length,
            );
          expect(invalidTargets, `${role} ${route.path} ${viewport.name} targets`).toBe(0);
        }
      }
    }
  });

  test('covers supervisor customer, card, and reports routes', async ({
    request,
  }) => {
    await expectRoutesAvailable(request, [
      '/supervisor/customers',
      '/supervisor/cards',
      '/supervisor/reports',
    ]);
  });

  test('keeps the cashier overview launcher and context compact', async ({
    page,
  }) => {
    await mockShell(page, 'CASHIER');
    await page.goto(`${baseUrl}/cashier`);

    await expect(
      page.getByRole('heading', { name: 'Hi, Cashier!' }),
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Find Customer' }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: "Today's Activity" }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Recent Transactions' }),
    ).toBeVisible();
    await page.locator('main').evaluate((main) => {
      main.style.height = '826px';
      main.style.overflow = 'hidden';
    });
    await expect(page.locator('main')).toHaveScreenshot(
      'cashier-overview-compact.png',
      { maxDiffPixelRatio: 0.08 },
    );
  });

  test('covers overview empty and authoritative error states', async ({
    page,
  }) => {
    await mockShell(page, 'CASHIER');
    await page.goto(`${baseUrl}/cashier`);
    await expect(
      page.getByText('No transactions recorded today.'),
    ).toBeVisible();

    await page.route('**/api/v1/reports/cashier-today', (route) =>
      route.fulfill({
        ...json({ success: false, error: { statusCode: 503 } }),
        status: 503,
      }),
    );
    await page.reload();
    await expect(page.getByRole('status')).toHaveText(
      'Today’s activity is temporarily unavailable.',
    );
    await expect(
      page.getByText('No transactions recorded today.'),
    ).not.toBeVisible();
  });

  test('covers overview loading and narrow layout', async ({ page }) => {
    await mockShell(page, 'CASHIER');
    let releaseRequest!: () => void;
    const requestPending = new Promise<void>((resolve) => {
      releaseRequest = resolve;
    });
    await page.route('**/api/v1/reports/cashier-today', async (route) => {
      await requestPending;
      await route.fulfill(
        json({
          success: true,
          data: { branchId: 'branch-1', timezone: 'Africa/Lagos', items: [] },
          meta: meta('/api/v1/reports/cashier-today'),
        }),
      );
    });

    await page.setViewportSize({ width: 375, height: 812 });
    const navigation = page.goto(`${baseUrl}/cashier`);
    await expect(page.getByRole('status')).toHaveText(
      'Loading today’s activity…',
    );
    releaseRequest();
    await navigation;
    await expect(
      page.getByText('No transactions recorded today.'),
    ).toBeVisible();
    expect(
      await page.locator('body').evaluate((body) => body.scrollWidth),
    ).toBeLessThanOrEqual(375);
  });

  test('keeps overview long values inside tablet geometry', async ({
    page,
  }) => {
    await mockShell(page, 'CASHIER');
    await page.route('**/api/v1/reports/cashier-today', (route) =>
      route.fulfill(
        json({
          success: true,
          data: {
            branchId: 'branch-1',
            timezone: 'Africa/Lagos',
            items: [
              {
                id: 'long-transaction',
                occurredAt: '2030-01-01T10:00:00.000Z',
                operation: 'EARN',
                loyaltyAmountKobo: 999999999,
                receiptNumber: 'R-' + '9'.repeat(80),
                status: 'APPROVED',
              },
            ],
          },
          meta: meta('/api/v1/reports/cashier-today'),
        }),
      ),
    );
    await page.setViewportSize({ width: 768, height: 900 });
    await page.goto(`${baseUrl}/cashier`);
    await expect(page.getByText(/R-999999/)).toBeVisible();
    expect(
      await page.locator('body').evaluate((body) => body.scrollWidth),
    ).toBeLessThanOrEqual(768);
  });

  test('covers lookup success, context handoff, keyboard, and narrow layout', async ({
    page,
  }) => {
    await mockShell(page, 'CASHIER');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${baseUrl}/cashier/lookup?card=CARD-001`);

    const lookup = page.getByRole('searchbox', { name: 'Customer search' });
    await expect(lookup).toHaveValue('CARD-001');
    await lookup.press('Enter');
    await expect(page.getByText('Ada Shopper')).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Capture Purchase' }),
    ).toHaveAttribute('href', '/cashier/earn?card=CARD-001');
    await expect(
      page.getByRole('link', { name: 'Redeem Credit' }),
    ).toHaveAttribute('href', '/cashier/redeem?card=CARD-001');
    await page.locator('main').evaluate((main) => {
      main.style.height = '836px';
      main.style.overflow = 'hidden';
    });
    await expect(page.locator('main')).toHaveScreenshot(
      'cashier-lookup-mobile.png',
      { maxDiffPixelRatio: 0.08 },
    );
  });

  test('shows an authoritative lookup error state', async ({ page }) => {
    await mockShell(page, 'CASHIER');
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${baseUrl}/cashier/lookup`);

    const lookup = page.getByRole('searchbox', { name: 'Customer search' });
    await lookup.fill('UNKNOWN-CARD');
    await page.getByRole('button', { name: 'Search' }).click();
    await expect(page.getByText('Lookup unavailable (404).')).toBeVisible();
  });

  test('shows an explicit offline lookup failure without claiming resolution', async ({
    page,
  }) => {
    await mockShell(page, 'CASHIER');
    await page.goto(`${baseUrl}/cashier/lookup`);
    await page.context().setOffline(true);

    await page
      .getByRole('searchbox', { name: 'Customer search' })
      .fill('CARD-001');
    await page.getByRole('button', { name: 'Search' }).click();
    await expect(
      page.getByText('Lookup unavailable offline. Reconnect to try again.'),
    ).toBeVisible();
  });

  test('covers authoritative Earn and Redeem outcomes', async ({ page }) => {
    await mockShell(page, 'CASHIER');
    await page.goto(`${baseUrl}/cashier/earn?card=CARD-001`);
    await expect(
      page
        .getByLabel('Lookup and status')
        .getByText('Ada Shopper', { exact: true }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Proceed' }).click();
    await page.getByLabel('POS receipt number').fill('WORKFLOW-EARN-001');
    const purchase = page.getByLabel('Purchase amount');
    await purchase.fill('10');
    await purchase.blur();
    await page.getByRole('button', { name: 'Proceed to review' }).click();
    await expect(page.locator('main')).toHaveScreenshot(
      'cashier-earn-review.png',
      { maxDiffPixelRatio: 0.08 },
    );
    await page.getByRole('button', { name: 'Confirm & add credit' }).click();
    await expect(
      page.getByText('Purchase captured and credit added.'),
    ).toBeVisible();
    await expect(page.locator('main')).toHaveScreenshot(
      'cashier-earn-outcome.png',
      { maxDiffPixelRatio: 0.08 },
    );

    await page.goto(`${baseUrl}/cashier/redeem?card=CARD-001`);
    await expect(
      page
        .getByLabel('Lookup and status')
        .getByText('Ada Shopper', { exact: true }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Continue to redemption' }).click();
    await page.getByLabel('POS receipt number').fill('WORKFLOW-REDEEM-001');
    const basket = page.getByLabel('Basket amount');
    const requested = page.getByLabel('Requested redemption');
    await basket.fill('100');
    await basket.blur();
    await requested.fill('10');
    await requested.blur();
    await page.getByRole('button', { name: 'Proceed to confirmation' }).click();
    await expect(page.locator('main')).toHaveScreenshot(
      'cashier-redeem-review.png',
      { maxDiffPixelRatio: 0.08 },
    );
    await page.getByRole('button', { name: 'Confirm redemption' }).click();
    await expect(page.getByText('Credit redeemed successfully.')).toBeVisible();
    await expect(page.locator('main')).toHaveScreenshot(
      'cashier-redeem-outcome.png',
      { maxDiffPixelRatio: 0.08 },
    );
  });

  test('keeps Sync Queue controls usable on a narrow viewport', async ({
    page,
  }) => {
    await mockShell(page, 'CASHIER');
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${baseUrl}/cashier/sync`);

    await expect(
      page.getByRole('heading', { name: 'Sync Queue' }),
    ).toBeVisible();
    await expect(
      page.getByRole('textbox', { name: 'Search sync queue' }),
    ).toBeVisible();
    await expect(
      page.getByRole('combobox', { name: 'Filter sync queue by status' }),
    ).toBeVisible();
    await expect(
      page.getByText(/There are no local offline earn records/),
    ).toBeVisible();
    await expect(page.locator('main')).toHaveScreenshot(
      'sync-queue-mobile-empty.png',
      { maxDiffPixelRatio: 0.08 },
    );
    const overflow = await page.locator('main').evaluate((main) => ({
      scrollWidth: main.scrollWidth,
      clientWidth: main.clientWidth,
      children: Array.from(main.querySelectorAll<HTMLElement>('*'))
        .filter((element) => element.scrollWidth > element.clientWidth + 1)
        .slice(0, 8)
        .map((element) => ({
          tag: element.tagName,
          className: element.className,
          scrollWidth: element.scrollWidth,
          clientWidth: element.clientWidth,
        })),
    }));
    expect(overflow.scrollWidth, JSON.stringify(overflow)).toBeLessThanOrEqual(
      overflow.clientWidth,
    );
  });

  test('gates sync when the session has no backend device association', async ({
    page,
  }) => {
    await mockShell(page, 'CASHIER');
    await page.goto(`${baseUrl}/cashier/sync`);
    await page.getByRole('button', { name: 'Submit batch' }).click();
    await expect(
      page.getByText(
        'Authenticated device ID is unavailable. Reconnect the session.',
      ),
    ).toBeVisible();
  });

  test('saves failed Earn locally and reconciles it through sync', async ({
    page,
  }) => {
    await mockShell(page, 'CASHIER', 'device-1');
    await page.route('**/api/v1/transactions/earn', (route) => route.abort());
    await page.goto(`${baseUrl}/cashier/earn?card=CARD-001`);

    await page.getByRole('button', { name: 'Proceed' }).click();
    await page.getByLabel('POS receipt number').fill('WORKFLOW-OFFLINE-001');
    const purchase = page.getByLabel('Purchase amount');
    await purchase.fill('10');
    await purchase.blur();
    await page.getByRole('button', { name: 'Proceed to review' }).click();
    await page.getByRole('button', { name: 'Confirm & add credit' }).click();
    await expect(
      page.getByText('Earn could not be submitted. Saved locally for sync.'),
    ).toBeVisible();

    await page.goto(`${baseUrl}/cashier/sync`);
    await expect(
      page.getByRole('cell', { name: 'CARD-001' }).first(),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Submit batch' }).click();
    await expect(
      page.getByText('Batch submitted. Review per-record results below.'),
    ).toBeVisible();
    await expect(
      page.getByRole('cell', { name: 'confirmed', exact: true }).first(),
    ).toBeVisible();
  });

  test('disables Earn submission while the authoritative request is pending', async ({
    page,
  }) => {
    await mockShell(page, 'CASHIER', 'device-1');
    await page.route('**/api/v1/transactions/earn', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await route.fulfill({
        ...json({
          success: true,
          data: {},
          meta: meta('/api/v1/transactions/earn'),
        }),
        status: 201,
      });
    });
    await page.goto(`${baseUrl}/cashier/earn?card=CARD-001`);

    await page.getByRole('button', { name: 'Proceed' }).click();
    await page.getByLabel('POS receipt number').fill('WORKFLOW-PENDING-001');
    const purchase = page.getByLabel('Purchase amount');
    await purchase.fill('10');
    await purchase.blur();
    const proceed = page.getByRole('button', { name: 'Proceed to review' });
    await proceed.click();
    const submit = page.getByRole('button', { name: 'Confirm & add credit' });
    await submit.click();
    await expect(submit).toBeDisabled();
  });

  test('resolves every shell navigation destination', async ({ request }) => {
    const hrefs = (
      Object.keys(shellNavigationByRole) as Array<keyof typeof sessionByRole>
    ).flatMap((role) =>
      shellNavigationByRole[role].flatMap((section) =>
        section.items.map((item) => item.href),
      ),
    );
    await expectRoutesAvailable(request, hrefs);
  });

  test('keeps prototype landmarks inside the 1440px route geometry', async ({
    page,
  }) => {
    const fixtures = [
      ['/cashier', 'recent-transactions', 'CASHIER', 'overview'],
      ['/cashier/lookup', 'customer-search', 'CASHIER', 'find-customer'],
      [
        '/cashier/earn?card=CARD-001',
        'capture-flow',
        'CASHIER',
        'capture-purchase',
      ],
      [
        '/cashier/redeem?card=CARD-001',
        'redeem-flow',
        'CASHIER',
        'redeem-credit',
      ],
      [
        '/supervisor/customers',
        'register-flow',
        'SUPERVISOR',
        'register-customer',
      ],
      [
        '/supervisor/transactions',
        'transactions-view',
        'SUPERVISOR',
        'transaction-workspace',
      ],
    ] as const;

    await page.setViewportSize({ width: 1440, height: 923 });
    for (const [route, landmark, role, routeName] of fixtures) {
      await mockShell(page, role);
      await page.goto(`${baseUrl}${route}`);
      if (landmark === 'capture-flow') {
        await page.getByRole('button', { name: 'Proceed' }).click();
      }
      if (landmark === 'redeem-flow') {
        await page
          .getByRole('button', { name: 'Continue to redemption' })
          .click();
      }
      const element = page.locator(`[data-od-id="${landmark}"]`);
      await expect(element).toBeVisible();
      const box = await element.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(1440);
      expect(box!.width).toBeGreaterThan(0);
      expect(box!.height).toBeGreaterThan(0);
      if (routeName !== 'transaction-workspace') {
        await expect(element).toHaveScreenshot(`prototype-${landmark}.png`, {
          maxDiffPixelRatio: 0.08,
        });
        await expect(page).toHaveScreenshot(
          `prototype-route-${routeName}.png`,
          {
            fullPage: true,
            maxDiffPixelRatio: 0.08,
            mask: [
              page.locator('.shell-session-label'),
              page.locator('.shell-online'),
            ],
          },
        );
      }

      const sidebar = await page.locator('.shell-sidebar').boundingBox();
      const topbar = await page.locator('.shell-topbar').boundingBox();
      expect(Math.round(sidebar?.width ?? 0)).toBe(244);
      expect(Math.round(topbar?.height ?? 0)).toBe(64);
      expect(
        await page.locator('.shell-sidebar-brand img').evaluate((node) => {
          const box = node.getBoundingClientRect();
          return {
            width: Math.round(box.width),
            height: Math.round(box.height),
          };
        }),
      ).toEqual({ width: 29, height: 29 });

      const buttonRhythm = await page
        .locator('button:visible')
        .evaluateAll((buttons) =>
          buttons.map((button) => {
            const style = getComputedStyle(button);
            return {
              display: style.display,
              whiteSpace: style.whiteSpace,
              className: button.className || button.outerHTML.slice(0, 120),
              hasIconAndLabel:
                Boolean(button.querySelector('svg')) &&
                Boolean(button.textContent?.trim()),
            };
          }),
        );
      for (const button of buttonRhythm) {
        expect(['flex', 'inline-flex', 'grid'], button.className).toContain(
          button.display,
        );
        expect(button.whiteSpace, button.className).toBe('nowrap');
      }
    }
  });
});

async function expectRoutesAvailable(
  request: APIRequestContext,
  hrefs: readonly string[],
) {
  const responses = await Promise.all(
    hrefs.map((href) => request.get(href, { timeout: 30000 })),
  );

  for (const [index, response] of responses.entries()) {
    expect(response.status(), hrefs[index]).toBe(200);
  }
}

async function mockShell(
  page: Page,
  role: 'CASHIER' | 'SUPERVISOR' | 'ADMIN',
  deviceId: string | null = null,
) {
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const { pathname } = url;

    if (pathname === '/api/v1/auth/me') {
      return route.fulfill(
        json({
          success: true,
          data: {
            ...sessionByRole[role],
            session: { ...sessionByRole[role].session, deviceId },
          },
          meta: meta(pathname),
        }),
      );
    }

    if (
      pathname === '/api/v1/auth/refresh' ||
      pathname === '/api/v1/auth/logout'
    ) {
      return route.fulfill(
        json({ success: true, data: null, meta: meta(pathname) }),
      );
    }

    if (pathname === '/api/v1/config/public') {
      return route.fulfill(
        json({
          success: true,
          data: {
            tenant: { id: 'tenant-1', name: 'ShopCity' },
            branch: {
              id: 'branch-1',
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
          },
          meta: meta(pathname),
        }),
      );
    }

    if (pathname === '/api/v1/customers') {
      return route.fulfill(
        json({
          success: true,
          data: {
            items: [
              {
                id: 'customer-1',
                fullName: 'Ada Shopper',
                phoneE164: '+2348000000001',
                status: 'ACTIVE',
                balanceKobo: 5500,
              },
            ],
          },
          meta: meta(pathname),
        }),
      );
    }

    if (pathname === '/api/v1/transactions/earn') {
      return route.fulfill({
        ...json({
          success: true,
          data: { transactionId: 'transaction-earn-1', status: 'CONFIRMED' },
          meta: meta(pathname),
        }),
        status: 201,
      });
    }

    if (pathname === '/api/v1/transactions/redeem') {
      return route.fulfill({
        ...json({
          success: true,
          data: { transactionId: 'transaction-redeem-1', status: 'CONFIRMED' },
          meta: meta(pathname),
        }),
        status: 201,
      });
    }

    if (pathname === '/api/v1/offline-sync/earn-batch') {
      const body = request.postDataJSON() as {
        records?: Array<{ localId: string }>;
      };
      return route.fulfill(
        json({
          success: true,
          data: {
            records: (body.records ?? []).map((record) => ({
              localId: record.localId,
              status: 'CONFIRMED',
              transactionId: `server-${record.localId}`,
            })),
          },
          meta: meta(pathname),
        }),
      );
    }

    if (pathname === '/api/v1/cards/lookup/CARD-001') {
      return route.fulfill(
        json({
          success: true,
          data: {
            customer: {
              id: 'customer-1',
              fullName: 'Ada Shopper',
            },
            customerId: 'customer-1',
            customerName: 'Ada Shopper',
            serialNumber: 'CARD-001',
            status: 'ACTIVE',
            availableBalanceKobo: 5500,
            expiringCreditKobo: 1000,
            branchId: 'branch-1',
          },
          meta: meta(pathname),
        }),
      );
    }

    if (pathname === '/api/v1/customers/customer-1') {
      return route.fulfill(
        json({
          success: true,
          data: {
            id: 'customer-1',
            fullName: 'Ada Shopper',
            phoneE164: '+2348000000001',
            status: 'ACTIVE',
            balanceKobo: 5500,
            linkedCards: [
              {
                id: 'card-1',
                serialNumber: 'CARD-001',
                status: 'ACTIVE',
                availableBalanceKobo: 5500,
              },
            ],
          },
          meta: meta(pathname),
        }),
      );
    }

    if (pathname === '/api/v1/customers/customer-1/ledger') {
      return route.fulfill(
        json({
          success: true,
          data: {
            items: [
              {
                id: 'ledger-1',
                type: 'EARN',
                amountKobo: 2500,
              },
            ],
          },
          meta: meta(pathname),
        }),
      );
    }

    if (pathname === '/api/v1/reports/cashier-today') {
      return route.fulfill(
        json({
          success: true,
          data: {
            branchId: 'branch-1',
            timezone: 'Africa/Lagos',
            items: [],
          },
          meta: meta(pathname),
        }),
      );
    }

    if (pathname === '/api/v1/reports/executive-summary') {
      return route.fulfill(
        json({
          success: true,
          data: {
            scope: 'TENANT',
            scopeKey: 'tenant-1',
            branchId: null,
            timezone: 'Africa/Lagos',
            items: [{ label: 'Revenue', value: 1000 }],
          },
          meta: meta(pathname),
        }),
      );
    }

    if (pathname === '/api/v1/reports/pilot-operations-summary') {
      return route.fulfill(
        json({
          success: true,
          data: {
            release: { version: '1.0.0', sha: 'abc123' },
            generatedAt: '2030-01-01T00:00:00.000Z',
            outbox: { backlogCount: 0, staleCount: 0 },
            sms: { failedCount: 0 },
            offlineSync: { failureCount: 0 },
            fraud: { openCount: 0 },
            reports: { staleCount: 0 },
            reconciliation: { healthy: true, mismatchCount: 0 },
          },
          meta: meta(pathname),
        }),
      );
    }

    if (
      pathname.startsWith('/api/v1/reports/') &&
      pathname.endsWith('/export')
    ) {
      return route.fulfill({
        status: 200,
        headers: { 'content-type': 'text/csv; charset=utf-8' },
        body: 'col1,col2\nvalue-1,value-2\n',
      });
    }

    if (pathname.startsWith('/api/v1/reports/')) {
      return route.fulfill(
        json({
          success: true,
          data: {
            scope: 'TENANT',
            scopeKey: 'tenant-1',
            branchId: null,
            timezone: 'Africa/Lagos',
            items: [{ label: 'Rows', value: 1 }],
          },
          meta: meta(pathname),
        }),
      );
    }

    if (pathname === '/api/v1/offline-sync/earn-batch') {
      return route.fulfill(
        json({
          success: true,
          data: { records: [] },
          meta: meta(pathname),
        }),
      );
    }

    return route.fulfill({ status: 404, body: '{}' });
  });
}

function json(body: unknown) {
  return {
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(body),
  };
}

function meta(path: string) {
  return {
    timestamp: '2030-01-01T00:00:00.000Z',
    path,
    requestId: 'test-request-id',
  };
}
