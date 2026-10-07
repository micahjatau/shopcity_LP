import {
  expect,
  test,
  type APIRequestContext,
  type Page,
} from '@playwright/test';
import {
  canonicalCashierContractSelectors,
  canonicalCashierLookupControl,
  type ComputedStyleSnapshot,
} from './fixtures/design-system-conformance';
import {
  cashierConformanceRoutes,
  conformanceViewports,
  publicConformanceRoutes,
  shellConformanceRoutes,
} from './fixtures/route-conformance-matrix';
import { shellNavigationByRole } from '../components/shell-navigation';

const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3100';

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
  test('shows full-width card search and a verified assignment eligibility dialog', async ({
    page,
  }) => {
    await mockShell(page, 'SUPERVISOR');
    let createCardRequests = 0;
    page.on('request', (request) => {
      if (
        request.method() === 'POST' &&
        new URL(request.url()).pathname === '/api/v1/cards'
      ) {
        createCardRequests += 1;
      }
    });
    await page.route('**/api/v1/customers**', async (route) => {
      const { pathname } = new URL(route.request().url());
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
                },
              ],
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
              activeCardStatus: 'BLOCKED',
            },
            meta: meta(pathname),
          }),
        );
      }
      return route.fallback();
    });

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${baseUrl}/supervisor/cards?tab=assign`);
    const searchInput = page.getByLabel('Name, phone number, or customer ID');
    await searchInput.fill('Ada');
    const searchPanel = page.locator('.sc-assignment-search');
    const panelWidth = await searchPanel.evaluate(
      (panel) => panel.getBoundingClientRect().width,
    );
    const searchWidth = await searchInput.evaluate(
      (input) => input.getBoundingClientRect().width,
    );
    expect(searchWidth).toBeGreaterThan(panelWidth - 64);
    await page.getByRole('button', { name: 'Search customers' }).click();

    const result = page.getByRole('button', { name: /Ada Shopper/ });
    await expect(result).toBeVisible();
    const resultWidth = await result.evaluate(
      (row) => row.getBoundingClientRect().width,
    );
    expect(resultWidth).toBeGreaterThan(panelWidth - 64);
    await result.click();
    await expect(page).toHaveURL(
      /\/supervisor\/cards\?tab=assign&id=customer-1/,
    );
    const dialog = page.getByRole('dialog', {
      name: 'Assignment eligibility',
    });
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByRole('heading', { name: 'Ada Shopper' }),
    ).toBeVisible();
    await expect(dialog.getByText('Customer status')).toBeVisible();
    await expect(dialog.getByText('Current card status')).toBeVisible();
    await expect(dialog.getByLabel('New card serial')).toHaveValue('');

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(dialog).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(390);
    const statusColumns = await dialog
      .locator('.sc-assignment-dialog__fields')
      .evaluate(
        (fields) =>
          getComputedStyle(fields).gridTemplateColumns.trim().split(/\s+/)
            .length,
      );
    expect(statusColumns).toBe(1);

    await dialog.getByLabel('New card serial').fill('TEST-CARD-UI-001');
    await dialog.getByRole('button', { name: 'Review assignment' }).click();
    await expect(
      dialog.getByRole('heading', { name: 'Review card assignment' }),
    ).toBeVisible();
    await expect(dialog.getByText('TEST-CARD-UI-001')).toBeVisible();
    expect(createCardRequests).toBe(0);

    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(searchInput).toHaveValue('Ada');
    const returnedResult = page.getByRole('button', { name: /Ada Shopper/ });
    await expect(returnedResult).toBeVisible();
    await expect(returnedResult).toBeFocused();
    await expect(page).toHaveURL(/\/supervisor\/cards\?tab=assign$/);
    expect(createCardRequests).toBe(0);
  });

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
    const menuButton = page.getByRole('button', { name: 'Menu' });
    await expect(menuButton).toBeFocused();
    expect(
      await menuButton.evaluate((element) => {
        const style = getComputedStyle(element);
        return {
          outlineWidth: style.outlineWidth,
          outlineOffset: style.outlineOffset,
        };
      }),
    ).toEqual({ outlineWidth: '2px', outlineOffset: '2px' });

    await page.setViewportSize({ width: 375, height: 812 });
    await page.reload();
    expect(
      await page.locator('body').evaluate((body) => body.scrollWidth),
    ).toBeLessThanOrEqual(375);
  });

  test('fills Cashier and Admin sidebar artwork to the rail edge', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    for (const { role, route } of [
      { role: 'CASHIER', route: '/cashier' },
      { role: 'ADMIN', route: '/admin/customers' },
    ] as const) {
      await mockShell(page, role);
      await page.goto(`${baseUrl}${route}`);

      const sidebar = page.locator('.shell-sidebar');
      await expect(page.locator('.shell-loading-screen')).toBeHidden();
      await expect(sidebar).toBeVisible();
      const backgroundCoverage = await sidebar.evaluate((element) => {
        const style = getComputedStyle(element);
        const railWidth = element.getBoundingClientRect().width;
        const imageWidth = style.backgroundSize.split(' ')[0];
        return {
          positionX: Number.parseFloat(style.backgroundPositionX),
          imageWidth: imageWidth.endsWith('%')
            ? (railWidth * Number.parseFloat(imageWidth)) / 100
            : Number.parseFloat(imageWidth),
          railWidth,
        };
      });
      expect(backgroundCoverage.positionX).toBe(0);
      expect(backgroundCoverage.imageWidth).toBeGreaterThan(
        backgroundCoverage.railWidth,
      );
      await expect(sidebar).toHaveScreenshot(
        `sidebar-${role.toLowerCase()}-artwork-edge.png`,
        { maxDiffPixelRatio: 0.02 },
      );
    }
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
      const lookupResponse = page.waitForResponse(
        '**/api/v1/cards/lookup/CARD-PAIR',
      );
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
      await lookupResponse;

      mode = 'error';
      await page.reload();
      await page.getByRole('textbox', { name: 'Lookup' }).fill('CARD-PAIR');
      await page.getByRole('button', { name: 'Search customer' }).click();
      await expect(
        page.getByText(/Card verification unavailable \(503\)/),
      ).toBeVisible();
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
    await expect(page.locator('.transaction-detail-modal')).toHaveCSS(
      'width',
      '600px',
    );
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

  test('covers public login across the required viewport matrix', async ({
    page,
  }) => {
    for (const route of publicConformanceRoutes) {
      for (const viewport of conformanceViewports) {
        await page.setViewportSize({
          width: viewport.width,
          height: viewport.height,
        });
        await page.goto(`${baseUrl}${route.path}`);
        await expect(page.locator('[data-od-id="login-page"]')).toBeVisible();
        await expect(
          page.locator('[data-od-id="role-selector"] input'),
        ).toHaveCount(3);
        expect(
          await page.locator('body').evaluate((body) => body.scrollWidth),
          `${route.path} ${viewport.name}`,
        ).toBeLessThanOrEqual(viewport.width);
      }
    }
  });

  test('executes the route and viewport conformance matrix', async ({
    page,
  }) => {
    for (const [role, routes] of [
      ['CASHIER', cashierConformanceRoutes],
      [
        'SUPERVISOR',
        shellConformanceRoutes.filter(
          ({ role: routeRole }) => routeRole === 'SUPERVISOR',
        ),
      ],
      [
        'ADMIN',
        shellConformanceRoutes.filter(
          ({ role: routeRole }) => routeRole === 'ADMIN',
        ),
      ],
    ] as const) {
      await page.unroute('**/api/v1/**');
      await mockShell(page, role);
      for (const route of routes) {
        await page.setViewportSize({
          width: conformanceViewports[0].width,
          height: conformanceViewports[0].height,
        });
        await page.goto(`${baseUrl}${route.path}`);
        await expect(page.locator('.shell-loading-screen')).toBeHidden();
        for (const viewport of conformanceViewports) {
          await page.setViewportSize({
            width: viewport.width,
            height: viewport.height,
          });
          await page.emulateMedia({ reducedMotion: 'reduce' });
          await expect(page.locator('.shell-loading-screen')).toBeHidden();
          await expect(page.locator('main')).toBeVisible();
          await page.getByRole('combobox', { name: 'Search ShopCity' }).focus();
          await expect(page.locator('.shell-main')).toHaveCSS(
            'max-width',
            'none',
          );
          const categoryBox = await page
            .locator('.global-shell-search__categories')
            .boundingBox();
          expect(categoryBox?.width ?? 0).toBeGreaterThan(0);
          const searchRowWidth = await page
            .locator('.global-shell-search__row')
            .evaluate((element) => ({
              scrollWidth: element.scrollWidth,
              clientWidth: element.clientWidth,
            }));
          expect(
            searchRowWidth.scrollWidth,
            `${role} ${route.path} ${viewport.name} search row overflow: ${JSON.stringify(searchRowWidth)}`,
          ).toBeLessThanOrEqual(searchRowWidth.clientWidth);

          for (const contract of canonicalCashierContractSelectors) {
            const subjects = page.locator(contract.selector);
            const subjectCount = await subjects.count();
            // Some canonical owners are legitimately absent on routes whose
            // state does not render that component. Every matching instance is
            // checked when the documented scope is present.
            for (let index = 0; index < subjectCount; index += 1) {
              const expectedValue =
                contract.selector === '.shell-topbar' && viewport.width <= 620
                  ? '56px'
                  : route.path.endsWith('/customers/new') &&
                      contract.selector ===
                        '.sc-control:not(.sc-textarea):not(.sc-input--compact)' &&
                      contract.property === 'min-height'
                    ? '42px'
                    : contract.expected;
              await expect(subjects.nth(index)).toHaveCSS(
                contract.property,
                expectedValue,
              );
            }
          }

          expect(
            await page.locator('body').evaluate((body) => body.scrollWidth),
            `${role} ${route.path} ${viewport.name}`,
          ).toBeLessThanOrEqual(viewport.width);
          expect(
            await page
              .locator('.shell-body')
              .evaluate(
                (element) => getComputedStyle(element).transitionDuration,
              ),
            `${role} ${route.path} ${viewport.name} reduced motion`,
          ).toBe('0s');
          const invalidTargets = await page
            .locator(
              'button:visible, input:visible, select:visible, textarea:visible',
            )
            .evaluateAll(
              (elements) =>
                elements.filter((element) => {
                  const rect = element.getBoundingClientRect();
                  return rect.width <= 0 || rect.height <= 0;
                }).length,
            );
          expect(
            invalidTargets,
            `${role} ${route.path} ${viewport.name} targets`,
          ).toBe(0);
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

  test('verifies copy hierarchy, Cashier header typography, and responsive width across all Supervisor routes', async ({
    page,
  }) => {
    const routes = [
      ['/supervisor', 'Hi, Supervisor!', 'Welcome back to your dashboard'],
      [
        '/supervisor/approvals',
        'Approvals',
        'Review pending transactions and recent decisions.',
      ],
      [
        '/supervisor/cards',
        'Manage cards',
        'Find a customer to assign, replace, or update card status.',
      ],
      [
        '/supervisor/customers',
        'Manage customers',
        'Register customers or find and manage customer accounts.',
      ],
      [
        '/supervisor/fraud',
        'Fraud',
        'Review flagged activity and record an acknowledgment or resolution.',
      ],
      [
        '/supervisor/reports',
        'Operational reports',
        'Review branch performance over time, investigate patterns, and generate detailed reports.',
      ],
      [
        '/supervisor/transactions',
        'Transactions',
        'Search by receipt number to review transaction details.',
      ],
    ] as const;
    const headerTypography = async (title: string, description: string) => {
      const titleElement = page.getByRole('heading', { level: 1, name: title });
      const descriptionElement = page.getByText(description, { exact: true });
      const readTypography = (element: Element) => {
        const style = getComputedStyle(element);
        return [
          style.fontFamily,
          style.fontSize,
          style.fontWeight,
          style.lineHeight,
          style.color,
        ];
      };
      const [titleStyle, descriptionStyle] = await Promise.all([
        titleElement.evaluate(readTypography),
        descriptionElement.evaluate(readTypography),
      ]);
      return { title: titleStyle, description: descriptionStyle };
    };

    await mockShell(page, 'CASHIER');
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${baseUrl}/cashier/lookup`);
    const cashierTypography = await headerTypography(
      'Find customer',
      'Search by phone number, card serial or name to continue a loyalty transaction.',
    );

    await mockShell(page, 'SUPERVISOR');
    for (const [path, title, description] of routes) {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(`${baseUrl}${path}`);
      const root = page.locator('main');
      await expect(root.getByRole('heading', { level: 1 })).toHaveCount(1);
      await expect(
        root.getByRole('heading', { level: 1, name: title }),
      ).toBeVisible();
      await expect(root.getByText(description, { exact: true })).toBeVisible();
      expect(
        await headerTypography(title, description),
        `${path} header typography`,
      ).toEqual(cashierTypography);

      if (path === '/supervisor') {
        await expect(root.locator('h2, article, a')).toHaveCount(0);
      } else if (path === '/supervisor/transactions') {
        await expect(
          root.getByRole('textbox', { name: 'Receipt number' }),
        ).toBeVisible();
        await expect(
          root.getByRole('button', { name: 'Search' }),
        ).toBeVisible();
        await expect(root.getByRole('table')).toBeVisible();
        await expect(
          root.getByRole('columnheader', { name: 'Receipt no.' }),
        ).toBeVisible();
        await expect(root.getByText('Search for a receipt')).toBeVisible();
        await expect(
          root.locator('.supervisor-transaction-reversal'),
        ).toHaveCount(0);
      } else {
        const sectionHeading = root.getByRole('heading', { level: 2 }).first();
        const bodyCopy = root.getByText(description, { exact: true });
        await expect(sectionHeading).toBeVisible();
        await expect(bodyCopy).toBeVisible();
        const hierarchy = await Promise.all([
          root
            .getByRole('heading', { level: 1 })
            .evaluate((node) =>
              Number.parseFloat(getComputedStyle(node).fontSize),
            ),
          sectionHeading.evaluate((node) =>
            Number.parseFloat(getComputedStyle(node).fontSize),
          ),
          bodyCopy.evaluate((node) =>
            Number.parseFloat(getComputedStyle(node).fontSize),
          ),
        ]);
        expect(hierarchy, `${path} title/section/body scale`).toHaveLength(3);
        expect(hierarchy[0], `${path} title scale`).toBeGreaterThan(
          hierarchy[1],
        );
        expect(hierarchy[1], `${path} section scale`).toBeGreaterThanOrEqual(
          hierarchy[2],
        );
      }

      for (const width of [1440, 768, 375]) {
        await page.setViewportSize({ width, height: 900 });
        const documentWidth = await page.evaluate(() =>
          Math.max(
            document.body.scrollWidth,
            document.documentElement.scrollWidth,
          ),
        );
        expect(
          documentWidth,
          `${path} document width at ${width}px`,
        ).toBeLessThanOrEqual(width);
      }
    }

    await mockShell(page, 'ADMIN');
    await page.goto(`${baseUrl}/admin/customers`);
    const adminCustomerWorkspace = page.locator(
      '[aria-label="Customer workspace"]',
    );
    await expect(
      adminCustomerWorkspace.getByRole('heading', {
        level: 1,
        name: 'Customers',
      }),
    ).toBeVisible();
    await expect(
      adminCustomerWorkspace.getByText(
        'Use the shell navigation for cashier, sync, and supervisor routes.',
      ),
    ).toBeVisible();

    await page.goto(`${baseUrl}/admin/transactions`);
    await expect(
      page.getByRole('heading', { level: 1, name: 'Transaction review' }),
    ).toBeVisible();
    await expect(
      page.getByRole('alert').filter({
        hasText:
          'Use this route for search, detail inspection, and compensating reversals.',
      }),
    ).toBeVisible();

    await mockShell(page, 'CASHIER');
    await page.goto(`${baseUrl}/cashier/customers`);
    await expect(
      page.getByRole('heading', { level: 1, name: 'Hi, Cashier!' }),
    ).toBeVisible();
  });

  test('searches a receipt and confirms a Supervisor reversal in the transaction dialog', async ({
    page,
  }) => {
    await mockShell(page, 'SUPERVISOR');
    await page.context().addCookies([
      {
        name: 'shopcity_csrf',
        value: 'csrf-browser-token',
        url: baseUrl,
      },
    ]);

    await page.route('**/api/v1/transactions?*', async (route) => {
      const url = new URL(route.request().url());
      expect(url.searchParams.get('receiptNumber')).toBe('r-001');
      return route.fulfill(
        json({
          success: true,
          data: {
            items: [
              {
                transactionId: 'ledger-1',
                receiptNumber: 'R-001',
                operation: 'EARN',
                amountKobo: 500,
                status: 'CONFIRMED',
                occurredAt: '2030-01-01T10:00:00.000Z',
              },
            ],
            nextCursor: null,
            hasMore: false,
          },
          meta: meta('/api/v1/transactions'),
        }),
      );
    });
    await page.route('**/api/v1/transactions/ledger-1', async (route) =>
      route.fulfill(
        json({
          success: true,
          data: {
            transactionId: 'ledger-1',
            posReceiptNumber: 'R-001',
            type: 'EARN',
            state: 'CONFIRMED',
            creditKobo: 500,
            redeemedAmountKobo: null,
            purchaseAmountKobo: 10_000,
            availableBalanceKobo: 2_500,
            occurredAt: '2030-01-01T10:00:00.000Z',
          },
          meta: meta('/api/v1/transactions/ledger-1'),
        }),
      ),
    );

    let reversalRequest: {
      body: unknown;
      csrfToken: string | undefined;
      idempotencyKey: string | undefined;
    } | null = null;
    await page.route(
      '**/api/v1/transactions/ledger-1/reverse',
      async (route) => {
        const request = route.request();
        const headers = request.headers();
        reversalRequest = {
          body: request.postDataJSON(),
          csrfToken: headers['x-csrf-token'],
          idempotencyKey: headers['idempotency-key'],
        };
        return route.fulfill({
          ...json({
            success: true,
            data: { transactionId: 'ledger-reversal-1' },
            meta: meta('/api/v1/transactions/ledger-1/reverse'),
          }),
          status: 201,
        });
      },
    );

    await page.goto(`${baseUrl}/supervisor/transactions`);
    await page.getByRole('textbox', { name: 'Receipt number' }).fill('r-001');
    await page
      .locator('.supervisor-transaction-search')
      .getByRole('button', { name: 'Search' })
      .click();
    const resultRow = page.locator('tbody tr').filter({ hasText: 'R-001' });
    await expect(resultRow).toBeVisible();
    await resultRow.click();

    const dialog = page.getByRole('dialog', { name: 'R-001' });
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByRole('heading', { name: 'Request reversal' }),
    ).toBeVisible();
    await dialog
      .getByRole('textbox', { name: 'Reversal reason' })
      .fill('Duplicate receipt entry');
    await dialog
      .getByRole('textbox', { name: 'Type REVERSE to confirm' })
      .fill('REVERSE');
    await dialog.getByRole('button', { name: 'Confirm reversal' }).click();
    await expect(dialog.getByRole('alert')).toContainText('Reversal confirmed');
    await expect
      .poll(() => reversalRequest)
      .toEqual({
        body: { reason: 'Duplicate receipt entry' },
        csrfToken: 'csrf-browser-token',
        idempotencyKey: expect.any(String),
      });
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
    await expect(
      page.getByText('No transactions recorded today.'),
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

  test('aligns overview composition across prototype viewports', async ({
    page,
  }) => {
    await mockShell(page, 'CASHIER');
    await page.goto(`${baseUrl}/cashier`);

    for (const viewport of [
      { width: 1440, height: 900 },
      { width: 1024, height: 900 },
      { width: 390, height: 844 },
    ]) {
      await page.setViewportSize(viewport);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.reload();

      const overview = page.locator('.cashier-overview');
      await expect(overview).toBeVisible();
      await expect(
        page.getByRole('heading', { name: 'Hi, Cashier!' }),
      ).toBeVisible();
      await expect(
        page.getByRole('link', { name: 'View today’s transactions →' }),
      ).toBeVisible();

      const transactionSearch = page.getByRole('searchbox', {
        name: 'Search recent transactions',
      });
      await transactionSearch.focus();
      await expect(transactionSearch).toBeFocused();
      await expect
        .poll(() =>
          transactionSearch.evaluate((element) => {
            const style = getComputedStyle(element);
            return `${style.outlineStyle} ${style.outlineWidth}`;
          }),
        )
        .toBe('solid 2px');

      const overviewWidth = await overview.evaluate((element) =>
        Math.round(element.getBoundingClientRect().width),
      );
      expect(overviewWidth).toBeGreaterThan(0);
      expect(overviewWidth).toBeLessThanOrEqual(1120);
      expect(
        await page.locator('body').evaluate((body) => body.scrollWidth),
      ).toBeLessThanOrEqual(viewport.width);

      const metricBoxes = await page
        .locator('[data-od-id^="metric-"]')
        .evaluateAll((elements) =>
          elements.map((element) => {
            const box = element.getBoundingClientRect();
            return {
              width: Math.round(box.width),
              height: Math.round(box.height),
            };
          }),
        );
      expect(metricBoxes).toHaveLength(4);
      expect(
        metricBoxes.every(({ width, height }) => width > 0 && height > 0),
      ).toBe(true);
      expect(Math.max(...metricBoxes.map(({ height }) => height))).toBe(
        Math.min(...metricBoxes.map(({ height }) => height)),
      );
    }
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
    await expect(
      page.locator('.cashier-overview-notice[role="status"]'),
    ).toHaveText('Today’s activity is temporarily unavailable.');
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
    await expect(
      page.locator('.cashier-overview-notice[role="status"]'),
    ).toHaveText('Loading today’s activity…');
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

  test('aligns Find Customer geometry and keyboard focus across viewports', async ({
    page,
  }) => {
    await mockShell(page, 'CASHIER');
    await page.goto(`${baseUrl}/cashier/lookup`);

    const searchPanel = page.locator('.find-customer-search');
    const recentPanel = page.locator('.find-customer-recent');
    const searchRow = page.locator('.find-customer-search-row');
    const lookup = page.getByRole('searchbox', { name: 'Customer search' });

    for (const viewport of [
      { width: 1440, height: 900 },
      { width: 1024, height: 900 },
      { width: 390, height: 844 },
    ]) {
      await page.setViewportSize(viewport);
      await page.reload();
      await expect(searchPanel).toBeVisible();
      await expect(recentPanel).toBeVisible();

      const panelWidths = await searchPanel.evaluate((element) => ({
        search: Math.round(element.getBoundingClientRect().width),
        recent: Math.round(
          element.parentElement
            ?.querySelector('.find-customer-recent')
            ?.getBoundingClientRect().width ?? 0,
        ),
      }));
      expect(panelWidths.search).toBeLessThanOrEqual(712);
      expect(panelWidths.recent).toBeLessThanOrEqual(712);
      expect(
        await page.locator('body').evaluate((body) => body.scrollWidth),
      ).toBeLessThanOrEqual(viewport.width);

      await lookup.focus();
      await expect(lookup).toBeFocused();
      await expect
        .poll(() =>
          lookup.evaluate((element) => {
            const style = getComputedStyle(element);
            return `${style.outlineStyle} ${style.outlineWidth}`;
          }),
        )
        .toBe('solid 2px');

      const columns = await searchRow.evaluate(
        (element) => getComputedStyle(element).gridTemplateColumns,
      );
      if (viewport.width <= 620) {
        expect(columns.trim().split(/\s+/)).toHaveLength(1);
      } else if (viewport.width <= 920) {
        expect(columns).toContain('140px 140px');
      } else {
        expect(columns).toContain('160px 160px');
      }
    }
  });

  test('discovers customers by name without unlocking financial workflows', async ({
    page,
  }) => {
    await mockShell(page, 'CASHIER');
    await page.goto(`${baseUrl}/cashier/lookup`);

    const lookup = page.getByRole('searchbox', { name: 'Customer search' });
    await lookup.fill('Ada Shopper');
    await page
      .locator('#customer-search-form')
      .getByRole('button', { name: 'Search' })
      .click();
    await expect(page.getByText('Ada Shopper')).toBeVisible();
    await expect(
      page.getByText('Scan an active card to continue'),
    ).toBeVisible();
    await expect(
      page.locator('main').getByRole('link', { name: 'Capture Purchase' }),
    ).toHaveCount(0);
  });

  test('shows an authoritative lookup error state', async ({ page }) => {
    await mockShell(page, 'CASHIER');
    await page.route('**/api/v1/customers*', async (route) =>
      route.fulfill({ status: 404, body: '{}' }),
    );
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${baseUrl}/cashier/lookup`);

    const lookup = page.getByRole('searchbox', { name: 'Customer search' });
    await lookup.fill('UNKNOWN-CARD');
    await page
      .locator('#customer-search-form')
      .getByRole('button', { name: 'Search' })
      .click();
    await expect(
      page.getByText(
        'Customer search is unavailable on this deployment. Check the API route.',
      ),
    ).toBeVisible();
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
    await page
      .locator('#customer-search-form')
      .getByRole('button', { name: 'Search' })
      .click();
    await expect(
      page.getByText(
        'Customer lookup requires a connection. Reconnect to try again.',
      ),
    ).toBeVisible();
  });

  test('covers authoritative Earn and Redeem outcomes', async ({ page }) => {
    await mockShell(page, 'CASHIER');
    await page.goto(`${baseUrl}/cashier/earn?card=CARD-001`);
    await expect(page.locator('.shell-loading-screen')).toBeHidden({
      timeout: 30000,
    });
    await expect(
      page
        .getByLabel('Lookup and status')
        .getByText('Ada Shopper', { exact: true }),
    ).toBeVisible({ timeout: 30000 });
    const captureFlow = page.locator('[data-od-id="capture-flow"]');
    await expect(captureFlow).toBeVisible({ timeout: 30000 });
    const capturePanelWidth = await captureFlow.evaluate((element) =>
      Math.round(element.getBoundingClientRect().width),
    );
    expect(capturePanelWidth).toBeLessThanOrEqual(860);
    expect(
      await page.locator('body').evaluate((body) => body.scrollWidth),
    ).toBeLessThanOrEqual(1440);
    await page.getByRole('button', { name: 'Proceed' }).click();
    await page.getByLabel('POS receipt number').fill('WORKFLOW-EARN-001');
    const purchase = page.getByLabel('Purchase amount');
    await purchase.fill('10');
    await purchase.blur();
    await page.getByRole('button', { name: 'Proceed to review' }).click();
    await expect(captureFlow).toBeVisible();
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
    await expect(page.locator('.shell-loading-screen')).toBeHidden({
      timeout: 30000,
    });
    await expect(
      page
        .getByLabel('Lookup and status')
        .getByText('Ada Shopper', { exact: true }),
    ).toBeVisible({ timeout: 30000 });
    const redeemFlow = page.locator('[data-od-id="redeem-flow"]');
    await expect(redeemFlow).toBeVisible({ timeout: 30000 });
    expect(
      await redeemFlow.evaluate((element) =>
        Math.round(element.getBoundingClientRect().width),
      ),
    ).toBeLessThanOrEqual(720);
    expect(
      await page.locator('body').evaluate((body) => body.scrollWidth),
    ).toBeLessThanOrEqual(1440);
    await page.getByRole('button', { name: 'Continue to redemption' }).click();
    await expect(redeemFlow).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(redeemFlow).toBeVisible();
    expect(
      await page.locator('body').evaluate((body) => body.scrollWidth),
    ).toBeLessThanOrEqual(390);
    await page.setViewportSize({ width: 1440, height: 900 });
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

  test('applies the prototype Capture and Redeem 700px breakpoint', async ({
    page,
  }) => {
    await mockShell(page, 'CASHIER');

    for (const route of [
      { path: '/cashier/earn?card=CARD-001', landmark: 'capture-flow' },
      { path: '/cashier/redeem?card=CARD-001', landmark: 'redeem-flow' },
    ] as const) {
      const stepsId =
        route.landmark === 'capture-flow' ? 'capture-stages' : 'redeem-stages';
      for (const [width, expectedColumns] of [
        [701, 4],
        [700, 1],
      ] as const) {
        await page.setViewportSize({ width, height: 844 });
        await page.goto(`${baseUrl}${route.path}`);
        await expect(page.locator('.shell-loading-screen')).toBeHidden({
          timeout: 30000,
        });
        await expect(
          page.getByLabel('Lookup and status').getByText('Ada Shopper', {
            exact: true,
          }),
        ).toBeVisible({ timeout: 30000 });
        const flow = page.locator(`[data-od-id="${route.landmark}"]`);
        const steps = page.locator(`[data-od-id="${stepsId}"]`);
        await expect(flow).toBeVisible({ timeout: 30000 });
        await expect(steps).toBeVisible({ timeout: 30000 });
        const columns = await steps.evaluate(
          (element) => getComputedStyle(element).gridTemplateColumns,
        );
        expect(
          columns.trim().split(/\s+/),
          `${route.path} at ${width}px`,
        ).toHaveLength(expectedColumns);
        expect(
          await page.locator('body').evaluate((body) => body.scrollWidth),
          `${route.path} at ${width}px overflow`,
        ).toBeLessThanOrEqual(width);
      }
    }
  });

  test('covers focused registration routes and landmarks', async ({ page }) => {
    for (const route of [
      { path: '/supervisor/customers/new', role: 'SUPERVISOR' as const },
      { path: '/admin/customers/new', role: 'ADMIN' as const },
    ]) {
      await mockShell(page, route.role);
      await page.setViewportSize({ width: 700, height: 844 });
      await page.goto(`${baseUrl}${route.path}`);
      await expect(page.locator('[data-od-id="register-flow"]')).toBeVisible();
      await expect(
        page.locator('[data-od-id="register-information"]'),
      ).toBeVisible();
      expect(
        await page.locator('body').evaluate((body) => body.scrollWidth),
        `${route.path} overflow`,
      ).toBeLessThanOrEqual(700);
    }
  });

  test('covers approval-pending and insufficient-balance transaction outcomes', async ({
    page,
  }) => {
    await mockShell(page, 'CASHIER');
    await page.route('**/api/v1/transactions/earn', async (route) =>
      route.fulfill({
        ...json({
          success: true,
          data: {
            transactionId: 'transaction-earn-pending',
            status: 'PENDING',
          },
          meta: meta('/api/v1/transactions/earn'),
        }),
        status: 202,
      }),
    );
    await page.route('**/api/v1/transactions/redeem', async (route) =>
      route.fulfill({
        ...json({
          success: false,
          error: { code: 'INSUFFICIENT_BALANCE' },
        }),
        status: 409,
      }),
    );

    await page.goto(`${baseUrl}/cashier/earn?card=CARD-001`);
    await page.getByRole('button', { name: 'Proceed' }).click();
    await page.getByLabel('POS receipt number').fill('WORKFLOW-APPROVAL-001');
    await page.getByLabel('Purchase amount').fill('10');
    await page.getByLabel('Purchase amount').blur();
    await page.getByRole('button', { name: 'Proceed to review' }).click();
    await page.getByRole('button', { name: 'Confirm & add credit' }).click();
    await expect(
      page.getByText('Purchase captured and waiting for approval.'),
    ).toBeVisible();

    await page.goto(`${baseUrl}/cashier/redeem?card=CARD-001`);
    await page.getByRole('button', { name: 'Continue to redemption' }).click();
    await page
      .getByLabel('POS receipt number')
      .fill('WORKFLOW-INSUFFICIENT-001');
    await page.getByLabel('Basket amount').fill('100');
    await page.getByLabel('Basket amount').blur();
    await page.getByLabel('Requested redemption').fill('10');
    await page.getByLabel('Requested redemption').blur();
    await page.getByRole('button', { name: 'Proceed to confirmation' }).click();
    await page.getByRole('button', { name: 'Confirm redemption' }).click();
    await expect(
      page.getByText('Available credit is lower than this redemption.'),
    ).toBeVisible();
  });

  test('covers shell search results, keyboard selection, escape, and errors', async ({
    page,
  }) => {
    await mockShell(page, 'CASHIER');
    await page.goto(`${baseUrl}/cashier`);

    const search = page.getByRole('combobox', { name: 'Search ShopCity' });
    await expect(page.locator('.shell-loading-screen')).toBeHidden();
    await expect(search).toBeVisible();
    await expect(search).toBeEditable();
    await search.fill('Ada');
    await expect(
      page.getByRole('option', { name: /Ada Shopper/ }),
    ).toBeVisible();
    await search.press('ArrowDown');
    await search.press('Enter');
    await expect(page).toHaveURL(/\/cashier\/customers\?id=customer-1/);

    await page.goto(`${baseUrl}/cashier`);
    await page.route('**/api/v1/customers*', async (route) =>
      route.fulfill({
        ...json({ success: false, error: { statusCode: 503 } }),
        status: 503,
      }),
    );
    await search.fill('Unavailable');
    await expect(page.getByText('Search unavailable (503).')).toBeVisible();
    await search.press('Escape');
    await expect(search).toBeFocused();

    await page.unroute('**/api/v1/customers*');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${baseUrl}/cashier`);
    await expect(page.locator('.shell-loading-screen')).toBeHidden();
    const mobileSearch = page.getByRole('combobox', {
      name: 'Search ShopCity',
    });
    await expect(mobileSearch).toBeVisible();
    await expect(mobileSearch).toBeEditable();
    await mobileSearch.focus();
    const mobileCategoryBox = await page
      .locator('.global-shell-search__categories')
      .boundingBox();
    expect(mobileCategoryBox?.width ?? 0).toBeGreaterThan(0);
    expect(
      await page
        .locator('.global-shell-search__row')
        .evaluate((element) => element.scrollWidth <= element.clientWidth),
    ).toBe(true);
    await mobileSearch.fill('Ada');
    await expect(
      page.getByRole('option', { name: /Ada Shopper/ }),
    ).toBeVisible();
    await mobileSearch.press('Escape');
    await expect(mobileSearch).toBeFocused();
  });

  test('captures same-state Transactions prototype and React screens for review', async ({
    page,
  }, testInfo) => {
    await mockShell(page, 'CASHIER');
    await page.setViewportSize({ width: 1440, height: 923 });
    const searchWidthPairs: Array<{
      viewport: number;
      referenceInputWidth: number;
      reactInputWidth: number;
      referencePageWidth: number;
      reactPageWidth: number;
    }> = [];

    await page.goto(`${baseUrl}/prototype/transactions-dashboard.html`);
    await expect(
      page.getByRole('heading', { name: 'Transactions', exact: true }),
    ).toBeVisible();
    await expect(page.getByText(/0 live receipts/)).toBeVisible();
    const referenceInputWidth =
      (await page.locator('#globalSearch').boundingBox())?.width ?? 0;
    const referencePageWidth = await page
      .locator('body')
      .evaluate((body) => body.scrollWidth);
    expect(referencePageWidth).toBeLessThanOrEqual(1440);
    await page.screenshot({
      path: testInfo.outputPath('transactions-html-empty-1440x923.png'),
      fullPage: true,
    });

    await page.goto(`${baseUrl}/cashier/transactions`);
    await expect(
      page.getByRole('heading', { name: 'Transactions', exact: true }),
    ).toBeVisible();
    await expect(page.getByText(/0 loaded transactions/)).toBeVisible({
      timeout: 10000,
    });
    const reactInputWidth =
      (
        await page
          .getByRole('combobox', { name: 'Search ShopCity' })
          .boundingBox()
      )?.width ?? 0;
    const reactPageWidth = await page
      .locator('body')
      .evaluate((body) => body.scrollWidth);
    expect(reactInputWidth).toBeGreaterThanOrEqual(180);
    expect(reactPageWidth).toBeLessThanOrEqual(1440);
    searchWidthPairs.push({
      viewport: 1440,
      referenceInputWidth,
      reactInputWidth,
      referencePageWidth,
      reactPageWidth,
    });
    await page.screenshot({
      path: testInfo.outputPath('transactions-react-empty-1440x923.png'),
      fullPage: true,
    });

    for (const width of [920, 390, 375]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`${baseUrl}/prototype/transactions-dashboard.html`);
      await expect(page.getByText(/0 live receipts/)).toBeVisible();
      const referenceWidth =
        (await page.locator('#globalSearch').boundingBox())?.width ?? 0;
      const referenceScrollWidth = await page
        .locator('body')
        .evaluate((body) => body.scrollWidth);
      expect(referenceScrollWidth).toBeLessThanOrEqual(width);
      await page.screenshot({
        path: testInfo.outputPath(`transactions-html-empty-${width}px.png`),
      });

      await page.goto(`${baseUrl}/cashier/transactions`);
      await expect(page.getByText(/0 loaded transactions/)).toBeVisible({
        timeout: 10000,
      });
      const reactWidth =
        (
          await page
            .getByRole('combobox', { name: 'Search ShopCity' })
            .boundingBox()
        )?.width ?? 0;
      const reactScrollWidth = await page
        .locator('body')
        .evaluate((body) => body.scrollWidth);
      expect(reactWidth).toBeGreaterThanOrEqual(width >= 920 ? 180 : 120);
      expect(reactScrollWidth).toBeLessThanOrEqual(width);
      searchWidthPairs.push({
        viewport: width,
        referenceInputWidth: referenceWidth,
        reactInputWidth: reactWidth,
        referencePageWidth: referenceScrollWidth,
        reactPageWidth: reactScrollWidth,
      });
      await page.screenshot({
        path: testInfo.outputPath(`transactions-react-empty-${width}px.png`),
      });
    }
    console.log(
      'transaction-search-width-parity',
      JSON.stringify(searchWidthPairs),
    );
    await testInfo.attach('transaction-search-width-parity.json', {
      body: JSON.stringify(searchWidthPairs, null, 2),
      contentType: 'application/json',
    });
  });

  test('keeps role search categories authorized and card deep links explicit', async ({
    page,
  }) => {
    for (const [role, route] of [
      ['CASHIER', '/cashier'],
      ['SUPERVISOR', '/supervisor'],
      ['ADMIN', '/admin'],
    ] as const) {
      await mockShell(page, role);
      await page.goto(`${baseUrl}${route}`);
      await page.getByRole('combobox', { name: 'Search ShopCity' }).focus();
      await expect(
        page.getByRole('button', { name: 'Customers' }),
      ).toBeVisible();
      await expect(page.getByRole('button', { name: 'Cards' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Cashiers' })).toHaveCount(
        role === 'CASHIER' ? 0 : 1,
      );
      await expect(
        page.getByRole('button', { name: 'Notifications' }),
      ).toBeDisabled();
      if (role === 'ADMIN') {
        await expect(
          page
            .locator('.shell-main-column a[href="/admin/operations"]')
            .first(),
        ).toHaveCSS('grid-column-start', 'span 2');
        await expect(
          page
            .locator('.shell-main-column a[href="/admin/transactions"]')
            .first(),
        ).toHaveCSS('grid-column-start', 'auto');
      }
    }

    await mockShell(page, 'CASHIER');
    await page.goto(`${baseUrl}/cashier`);
    const search = page.getByRole('combobox', { name: 'Search ShopCity' });
    await search.focus();
    await page.getByRole('button', { name: 'Cards' }).click();
    await search.fill('CARD-001');
    await search.press('Enter');
    const cardResult = page.getByRole('option', { name: /Ada Shopper/ });
    await expect(cardResult).toBeVisible();
    await expect(cardResult).toHaveAttribute(
      'href',
      '/cashier/lookup?card=CARD-001',
    );
  });

  test('keeps global search input usable and stable across viewports and categories', async ({
    page,
  }, testInfo) => {
    await mockShell(page, 'ADMIN');
    await page.goto(`${baseUrl}/admin`);
    const search = page.getByRole('combobox', { name: 'Search ShopCity' });
    const renderedGeometry: Array<{
      viewport: number;
      inputWidth: number;
      categoryWidth: number;
      groupWidth: number;
      pageScrollWidth: number;
    }> = [];

    await search.click();
    for (const { width } of conformanceViewports) {
      await page.setViewportSize({ width, height: 900 });
      await page.waitForTimeout(50);
      const minimumWidth =
        width >= 920 ? 180 : [390, 375].includes(width) ? 120 : 0;
      const initialWidth = (await search.boundingBox())?.width ?? 0;
      expect(initialWidth).toBeGreaterThanOrEqual(minimumWidth);
      const button = page.getByRole('button', { name: 'Search' });
      await expect(button).toBeVisible();
      for (const category of ['Cards', 'Cashiers', 'Customers']) {
        await page.getByRole('button', { name: category, exact: true }).click();
        await expect(button).toBeVisible();
        expect((await search.boundingBox())?.width ?? 0).toBeGreaterThanOrEqual(
          minimumWidth,
        );
        await expect(page.getByRole('listbox')).toHaveCount(0);
      }
      const inputWidth = (await search.boundingBox())?.width ?? 0;
      const categoryWidth =
        (await page.locator('.global-shell-search__categories').boundingBox())
          ?.width ?? 0;
      const groupWidth =
        (await page.locator('.global-shell-search').boundingBox())?.width ?? 0;
      const pageScrollWidth = await page
        .locator('body')
        .evaluate((body) => body.scrollWidth);
      expect(pageScrollWidth).toBeLessThanOrEqual(width);
      renderedGeometry.push({
        viewport: width,
        inputWidth,
        categoryWidth,
        groupWidth,
        pageScrollWidth,
      });
      if (width === 1440 || width === 920 || width === 390 || width === 375) {
        await page.screenshot({
          path: testInfo.outputPath(`global-search-${width}px.png`),
        });
      }
    }
    console.log(
      'global-search-rendered-geometry',
      JSON.stringify(renderedGeometry),
    );
    await testInfo.attach('global-search-rendered-geometry.json', {
      body: JSON.stringify(renderedGeometry, null, 2),
      contentType: 'application/json',
    });
  });

  test('ignores stale shell search responses', async ({ page }) => {
    await mockShell(page, 'CASHIER');
    await page.route('**/api/v1/customers*', async (route) => {
      const query = new URL(route.request().url()).searchParams.get('q');
      if (query === 'old')
        await new Promise((resolve) => setTimeout(resolve, 700));
      await route.fulfill(
        json({
          success: true,
          data: {
            items: [
              {
                id: `customer-${query}`,
                fullName: query === 'old' ? 'Old Result' : 'New Result',
                phoneE164: '+2348000000002',
                status: 'ACTIVE',
              },
            ],
          },
          meta: meta('/api/v1/customers'),
        }),
      );
    });
    await page.goto(`${baseUrl}/cashier`);
    const search = page.getByRole('combobox', { name: 'Search ShopCity' });
    await search.fill('old');
    await page.waitForTimeout(320);
    await search.fill('new');
    await expect(
      page.getByRole('option', { name: /New Result/ }),
    ).toBeVisible();
    await page.waitForTimeout(500);
    await expect(page.getByRole('option', { name: /Old Result/ })).toHaveCount(
      0,
    );
  });

  test('uses the shared Cashier header and a clear text hierarchy', async ({
    page,
  }) => {
    await mockShell(page, 'CASHIER', 'device-1');
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${baseUrl}/cashier/lookup`);

    const lookupTypography = await page
      .locator('[data-od-id="find-customer-heading"]')
      .evaluate((header) => {
        const title = header.querySelector('h1');
        const description = header.querySelector('.sc-page-head__copy > p');
        if (!title || !description) return null;
        const style = (element: Element) => {
          const computed = getComputedStyle(element);
          return {
            fontFamily: computed.fontFamily,
            fontSize: computed.fontSize,
            fontWeight: computed.fontWeight,
            lineHeight: computed.lineHeight,
            color: computed.color,
            letterSpacing: computed.letterSpacing,
          };
        };
        return { title: style(title), description: style(description) };
      });
    expect(lookupTypography).not.toBeNull();

    await page.goto(`${baseUrl}/cashier/sync`);
    const syncTypography = await page
      .locator('[data-od-id="sync-queue-heading"]')
      .evaluate((header) => {
        const title = header.querySelector('h1');
        const description = header.querySelector('.sc-page-head__copy > p');
        if (!title || !description) return null;
        const style = (element: Element) => {
          const computed = getComputedStyle(element);
          return {
            fontFamily: computed.fontFamily,
            fontSize: computed.fontSize,
            fontWeight: computed.fontWeight,
            lineHeight: computed.lineHeight,
            color: computed.color,
            letterSpacing: computed.letterSpacing,
          };
        };
        return { title: style(title), description: style(description) };
      });
    expect(syncTypography).toEqual(lookupTypography);

    const hierarchy = await page.evaluate(() => {
      const pageTitle = document.querySelector('.cashier-sync-header h1');
      const statusTitle = document.querySelector(
        '.cashier-sync-device-status h2',
      );
      const cardTitle = document.querySelector('.cashier-sync-queue-title h2');
      const body = document.querySelector(
        '.cashier-sync-header .sc-page-head__copy > p',
      );
      if (!pageTitle || !statusTitle || !cardTitle || !body) return null;
      const fontSize = (element: Element) =>
        Number.parseFloat(getComputedStyle(element).fontSize);
      return {
        pageTitle: fontSize(pageTitle),
        statusTitle: fontSize(statusTitle),
        cardTitle: fontSize(cardTitle),
        body: fontSize(body),
      };
    });
    expect(hierarchy).not.toBeNull();
    expect(hierarchy!.pageTitle).toBeGreaterThan(hierarchy!.statusTitle);
    expect(hierarchy!.statusTitle).toBe(hierarchy!.cardTitle);
    expect(hierarchy!.cardTitle).toBeGreaterThan(hierarchy!.body);
  });

  test('keeps Sync Queue controls usable on a narrow viewport', async ({
    page,
  }, testInfo) => {
    await mockShell(page, 'CASHIER');
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${baseUrl}/cashier/sync`);

    await expect(
      page.getByRole('heading', { name: 'Sync Queue' }),
    ).toBeVisible();
    const heading = page.locator('[data-od-id="sync-queue-heading"]');
    await expect(heading).toContainText(
      'Review purchases saved on this device, sync eligible records, and check each result.',
    );
    await expect(
      heading.locator('[data-od-id="sync-queue-toolbar"]'),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Refresh' })).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Sync eligible records' }),
    ).toBeDisabled();
    await expect(
      page.getByRole('heading', { name: 'Session needs device access' }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Retry access' }),
    ).toHaveCount(0);
    await expect(
      page.getByText(/Sign in again to restore device access/),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Sign in again' }),
    ).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Device ID' })).toHaveCount(
      0,
    );
    await expect(
      page.getByText(/Queue summary above stays aligned/),
    ).toHaveCount(0);
    await expect(page.getByText('0 records', { exact: true })).toBeVisible();
    await expect(
      page.getByText(/Showing \d+ of \d+ local records/),
    ).toHaveCount(0);
    await expect(
      page.getByRole('textbox', { name: 'Search sync queue' }),
    ).toHaveCount(0);
    await expect(
      page.getByRole('combobox', { name: 'Filter sync queue by status' }),
    ).toHaveCount(0);
    await expect(
      page.getByRole('heading', { name: 'No saved purchases on this device' }),
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Capture Purchase' }),
    ).toBeVisible();
    await expect(page.getByText('0 waiting · 0 need attention')).toBeVisible();
    await expect(page.locator('.shell-sidebar')).toBeHidden();
    await expect(page.getByRole('button', { name: 'Menu' })).toBeVisible();
    expect(
      await page.locator('[data-od-id="sync-queue-toolbar"]').count(),
    ).toBe(1);
    await expect(
      page.locator('[data-od-id="sync-queue-view"]'),
    ).not.toContainText('—');
    const landmarkOrder = await page
      .locator('[data-od-id="sync-queue-view"]')
      .evaluate((root) =>
        [
          root.querySelector('[data-od-id="sync-queue-heading"]'),
          root.querySelector('[data-od-id="sync-queue-metrics"]'),
          root.querySelector('[data-od-id="sync-queue-table"]'),
        ].map((element) => {
          if (!element) return -1;
          return Array.from(root.querySelectorAll('*')).indexOf(element);
        }),
      );
    expect(landmarkOrder).toEqual([...landmarkOrder].sort((a, b) => a - b));
    const queueTop = await page
      .locator('.cashier-sync-queue')
      .evaluate((element) => element.getBoundingClientRect().top);
    expect(queueTop).toBeGreaterThan(0);
    await expect(page.locator('.cashier-sync-results')).toHaveCount(0);
    await page.screenshot({
      path: testInfo.outputPath('sync-queue-mobile-full-current.png'),
    });
    await page.locator('main').screenshot({
      path: testInfo.outputPath('sync-queue-mobile-empty-current.png'),
    });
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

  test('keeps the empty queue full width across workspace sizes', async ({
    page,
  }) => {
    await mockShell(page, 'CASHIER', 'device-1');

    for (const width of [375, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`${baseUrl}/cashier/sync`);
      await expect(
        page.getByRole('heading', { name: 'Device access ready' }),
      ).toBeVisible();
      await expect(
        page.getByRole('heading', {
          name: 'No saved purchases on this device',
        }),
      ).toBeVisible();
      await expect(page.getByText('0 records', { exact: true })).toBeVisible();
      await expect(page.getByText(/Showing 0 of 0 local records/)).toHaveCount(
        0,
      );

      const geometry = await page.evaluate(() => {
        const page = document.querySelector('.cashier-sync-page');
        const queue = document.querySelector('.cashier-sync-queue');
        const priority = document.querySelector('.cashier-sync-priority');
        if (!page || !queue || !priority) return null;
        return {
          pageWidth: page.getBoundingClientRect().width,
          queueWidth: queue.getBoundingClientRect().width,
          columns: getComputedStyle(priority)
            .gridTemplateColumns.trim()
            .split(/\s+/).length,
          bodyWidth: document.body.scrollWidth,
        };
      });
      expect(geometry).not.toBeNull();
      expect(geometry!.queueWidth).toBeCloseTo(geometry!.pageWidth, 0);
      expect(geometry!.columns).toBe(1);
      expect(geometry!.bodyWidth).toBeLessThanOrEqual(width);
    }
  });

  test('does not report zero while the local queue is loading', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, 'indexedDB', {
        configurable: true,
        value: { open: () => ({}) },
      });
    });
    await mockShell(page, 'CASHIER', 'device-1');
    await page.setViewportSize({ width: 768, height: 900 });
    await page.goto(`${baseUrl}/cashier/sync`);

    await expect(
      page.getByRole('heading', { name: 'Checking saved purchases…' }),
    ).toBeVisible();
    await expect(
      page.getByText('Loading saved purchases', { exact: true }),
    ).toBeVisible();
    await expect(page.getByText('Loading…', { exact: true })).toBeVisible();
    await expect(page.getByText('0 records', { exact: true })).toHaveCount(0);
    await expect(page.getByText(/0 waiting/)).toHaveCount(0);
    await expect(
      page.getByRole('heading', { name: 'No saved purchases on this device' }),
    ).toHaveCount(0);
  });

  test('shows unknown queue counts and retry when the local read fails', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, 'indexedDB', {
        configurable: true,
        value: undefined,
      });
    });
    await mockShell(page, 'CASHIER', 'device-1');
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${baseUrl}/cashier/sync`);

    await expect(
      page.getByRole('heading', { name: 'Local queue unavailable' }),
    ).toBeVisible();
    await expect(page.getByText('Count unavailable')).toBeVisible();
    await expect(
      page.getByText('Unable to load saved purchases', { exact: true }),
    ).toBeVisible();
    await expect(page.getByText(/0 waiting/)).toHaveCount(0);
    await expect(
      page.getByRole('heading', { name: 'No saved purchases on this device' }),
    ).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: 'Sync eligible records' }),
    ).toBeDisabled();
    await expect(
      page.getByRole('button', { name: 'Retry access' }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Retry access' }).click();
    await expect(
      page.getByText('Unable to load saved purchases', { exact: true }),
    ).toBeVisible();
  });

  test('stacks the Sync Queue header when shell width is constrained', async ({
    page,
  }, testInfo) => {
    await mockShell(page, 'CASHIER');
    await page.setViewportSize({ width: 1080, height: 900 });
    await page.goto(`${baseUrl}/cashier/sync`);

    const header = page.locator('[data-od-id="sync-queue-heading"]');
    const trackCount = () =>
      header.evaluate(
        (element) =>
          getComputedStyle(element).gridTemplateColumns.trim().split(/\s+/)
            .length,
      );
    await expect(header.locator('.sc-page-head__copy > p')).toBeVisible();
    expect(await trackCount()).toBe(1);
    await expect(page.getByRole('button', { name: 'Refresh' })).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Sync eligible records' }),
    ).toBeVisible();

    const headingCopyWidth = await header
      .locator('.sc-page-head__copy > p')
      .evaluate((element) => element.getBoundingClientRect().width);
    expect(headingCopyWidth).toBeGreaterThan(400);

    const mainOverflow = await page
      .locator('main')
      .evaluate((element) => element.scrollWidth - element.clientWidth);
    expect(mainOverflow).toBeLessThanOrEqual(0);
    await page.screenshot({
      path: testInfo.outputPath('sync-queue-constrained-header.png'),
    });

    await page.setViewportSize({ width: 1440, height: 900 });
    expect(await trackCount()).toBe(2);
  });

  test('offers supported session reconnection when the backend has no device association', async ({
    page,
  }) => {
    await mockShell(page, 'CASHIER');
    await page.goto(`${baseUrl}/cashier/sync`);
    await expect(
      page.getByRole('button', { name: 'Sync eligible records' }),
    ).toBeDisabled();
    await expect(
      page.getByRole('heading', { name: 'Session needs device access' }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Sign in again' }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Sign in again' }).click();
    await expect(page).toHaveURL(/\/login$/);
    await expect(
      page.getByRole('heading', { name: 'Staff sign in' }),
    ).toBeVisible();
    await expect(
      page.getByText(/Cashiers sign in with a paired POS security key/),
    ).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Device ID' })).toHaveCount(
      0,
    );
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
    await expect(
      page
        .getByRole('table', { name: 'Offline sync queue records' })
        .getByText('Waiting to sync', { exact: true }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Sync eligible records' }).click();
    await expect(
      page.getByText('Batch submitted. Review per-record results below.'),
    ).toBeVisible();
    await page.getByText('Per-record results (1)').click();
    await expect(
      page.getByRole('cell', { name: 'Confirmed', exact: true }).first(),
    ).toBeVisible();
    const activityGrid = page.locator('.cashier-sync-priority');
    await expect(page.locator('.cashier-sync-results')).toBeVisible();
    expect(
      await activityGrid.evaluate(
        (element) =>
          getComputedStyle(element).gridTemplateColumns.trim().split(/\s+/)
            .length,
      ),
    ).toBe(2);
    await page.setViewportSize({ width: 768, height: 900 });
    expect(
      await activityGrid.evaluate(
        (element) =>
          getComputedStyle(element).gridTemplateColumns.trim().split(/\s+/)
            .length,
      ),
    ).toBe(1);
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
      const element =
        routeName === 'register-customer'
          ? page.getByRole('tabpanel', { name: 'Register customer' })
          : page.locator(`[data-od-id="${landmark}"]`);
      await expect(page.locator('.shell-loading-screen')).toBeHidden();
      await expect(element).toBeVisible();
      if (landmark === 'recent-transactions') {
        await expect(
          page.getByText('No transactions recorded today.'),
        ).toBeVisible();
      }
      const box = await element.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(1440);
      expect(box!.width).toBeGreaterThan(0);
      expect(box!.height).toBeGreaterThan(0);
      // The Supervisor customer tab replaces the former prototype workspace;
      // keep its geometry covered without comparing it to the obsolete snapshot.
      if (
        routeName !== 'transaction-workspace' &&
        routeName !== 'register-customer'
      ) {
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
      // The current sidebar uses the full ShopCity wordmark, not the compact mark.
      expect(
        await page.locator('.shell-sidebar-brand img').evaluate((node) => {
          const box = node.getBoundingClientRect();
          return {
            width: Math.round(box.width),
            height: Math.round(box.height),
          };
        }),
      ).toEqual({ width: 124, height: 32 });

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

  test('keeps Supervisor Help & Training visually contained and accessible at tablet width', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 768, height: 900 });
    await mockShell(page, 'SUPERVISOR');
    await page.goto(`${baseUrl}/supervisor/customers?tab=register`);
    await expect(page.locator('.shell-loading-screen')).toBeHidden();
    await expect(page.locator('.sc-page')).toBeVisible();

    const helpLink = page.getByRole('link', { name: 'Help & Training' });
    await expect(helpLink).toBeVisible();
    const supervisorTreatment = await helpLink.evaluate((link) => {
      const label = link.querySelector('span');
      const sidebar = link.closest('.shell-sidebar');
      if (!label || !sidebar) return null;
      const labelStyle = getComputedStyle(label);
      const linkRect = link.getBoundingClientRect();
      const sidebarRect = sidebar.getBoundingClientRect();
      return {
        text: label.textContent?.trim(),
        position: labelStyle.position,
        width: labelStyle.width,
        clip: labelStyle.clip,
        linkContained:
          linkRect.left >= sidebarRect.left &&
          linkRect.right <= sidebarRect.right,
      };
    });
    expect(supervisorTreatment).toEqual({
      text: 'Help & Training',
      position: 'absolute',
      width: '1px',
      clip: 'rect(0px, 0px, 0px, 0px)',
      linkContained: true,
    });
    await expect(helpLink).toHaveAccessibleName('Help & Training');
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(768);

    for (const route of [
      { path: '/admin/customers', role: 'ADMIN' as const },
      { path: '/cashier', role: 'CASHIER' as const },
    ]) {
      await mockShell(page, route.role);
      await page.goto(`${baseUrl}${route.path}`);
      const helpLink = page.getByRole('link', { name: 'Help & Training' });
      await expect(helpLink).toBeVisible();
      await expect(
        helpLink.locator('span').evaluate((label) => {
          const style = getComputedStyle(label);
          return style.position === 'absolute' && style.clip !== 'auto';
        }),
      ).resolves.toBe(false);
      await expect(helpLink).toHaveAccessibleName('Help & Training');
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(768);
    }
  });

  test('confirms Supervisor registration and edits a selected customer in a dialog', async ({
    page,
  }) => {
    await mockShell(page, 'SUPERVISOR');
    const createPayloads: unknown[] = [];
    const profileUpdatePayloads: unknown[] = [];
    let customerName = 'Ada Shopper';
    await page.route('**/api/v1/customers**', async (route) => {
      const request = route.request();
      const pathname = new URL(request.url()).pathname;
      if (
        pathname === '/api/v1/customers/customer-1' &&
        request.method() === 'GET'
      ) {
        return route.fulfill(
          json({
            success: true,
            data: {
              id: 'customer-1',
              fullName: customerName,
              phoneE164: '+2348000000001',
              email: 'ada@example.com',
              status: 'ACTIVE',
              activeCardStatus: 'ACTIVE',
            },
            meta: meta(pathname),
          }),
        );
      }
      if (
        pathname === '/api/v1/customers/customer-1' &&
        request.method() === 'PATCH'
      ) {
        const payload = request.postDataJSON() as { fullName: string };
        profileUpdatePayloads.push(payload);
        customerName = payload.fullName;
        return route.fulfill(
          json({
            success: true,
            data: { id: 'customer-1' },
            meta: meta(pathname),
          }),
        );
      }
      if (request.method() !== 'POST') return route.fallback();
      createPayloads.push(request.postDataJSON());
      return route.fulfill({
        ...json({
          success: true,
          data: { id: 'registered-customer-1' },
          meta: meta('/api/v1/customers'),
        }),
        status: 201,
      });
    });

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${baseUrl}/supervisor/customers?tab=register`);
    await expect(page.locator('.shell-loading-screen')).toBeHidden();
    await page.getByLabel('Full name').fill('Test Customer');
    await page.getByLabel('Phone number').fill('0000000000');
    await page.getByLabel('First card serial').fill('TEST-SERIAL-001');
    await page.getByLabel('Loyalty service consent (required)').check();
    await page.getByRole('button', { name: 'Review details' }).click();

    const dialog = page.getByRole('dialog', {
      name: 'Review customer details',
    });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('Test Customer');
    await expect(dialog).toContainText('0000000000');
    await expect(dialog).toContainText('Not provided');
    await expect(dialog).toContainText('TEST-SERIAL-001');
    await expect(dialog).not.toContainText(
      /customer status|card status|linked card|card tasks|active/i,
    );
    await expect(
      dialog.getByRole('button', { name: 'Edit details' }),
    ).toBeVisible();
    await expect(
      dialog.getByRole('button', { name: 'Register customer' }),
    ).toBeVisible();
    expect(createPayloads).toHaveLength(0);

    const desktopMetrics = await page
      .locator('.sc-dialog__panel')
      .evaluate((panel) => {
        const style = getComputedStyle(panel);
        return {
          width: panel.getBoundingClientRect().width,
          padding: style.paddingTop,
          radius: style.borderRadius,
        };
      });
    expect(desktopMetrics.width).toBeGreaterThanOrEqual(540);
    expect(desktopMetrics.width).toBeLessThanOrEqual(600);
    expect(desktopMetrics.padding).toBe('32px');
    expect(desktopMetrics.radius).toBe('16px');

    await page.setViewportSize({ width: 390, height: 844 });
    const customerFields = dialog
      .locator('.sc-registration-review__fields')
      .first();
    const mobileColumns = await customerFields.evaluate(
      (fields) =>
        getComputedStyle(fields).gridTemplateColumns.trim().split(/\s+/).length,
    );
    expect(mobileColumns).toBe(1);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(390);

    await dialog.getByRole('button', { name: 'Register customer' }).click();
    await expect(
      page.getByRole('heading', { name: 'Customer registered' }),
    ).toBeVisible();
    await expect(dialog).not.toBeVisible();
    await expect(
      page.getByRole('link', { name: 'View customer' }),
    ).toHaveAttribute(
      'href',
      '/supervisor/customers?tab=manage&id=registered-customer-1',
    );
    expect(createPayloads).toEqual([
      {
        fullName: 'Test Customer',
        phone: '0000000000',
        cardSerialNumber: 'TEST-SERIAL-001',
        loyaltyConsent: true,
        marketingOptIn: false,
      },
    ]);

    await page.goto(`${baseUrl}/supervisor/customers?tab=manage`);
    await page.getByLabel('Name, phone number, or customer ID').fill('Ada');
    await page.getByRole('button', { name: 'Search customers' }).click();
    const customerRow = page.getByRole('button', { name: /Ada Shopper/ });
    const resultsPanel = page.getByRole('region', { name: 'Find a customer' });
    const rowWidth = await customerRow.evaluate(
      (row) => row.getBoundingClientRect().width,
    );
    const panelWidth = await resultsPanel.evaluate(
      (panel) => panel.getBoundingClientRect().width,
    );
    expect(rowWidth).toBeGreaterThan(panelWidth - 50);
    await customerRow.click();
    await expect(page).toHaveURL(
      /\/supervisor\/customers\?tab=manage&id=customer-1/,
    );
    const customerDialog = page.getByRole('dialog', {
      name: 'Customer details',
    });
    await expect(customerDialog.getByLabel('Full name')).toHaveValue(
      'Ada Shopper',
    );
    await expect(customerDialog.getByLabel('Phone number')).toHaveValue(
      '+2348000000001',
    );
    await expect(customerDialog.getByText('Active card')).toBeVisible();
    await expect(
      customerDialog.getByText('Card serial not included in customer details.'),
    ).toBeVisible();
    await expect(
      customerDialog.getByRole('link', { name: 'Manage linked card →' }),
    ).toHaveAttribute('href', '/supervisor/cards?tab=assign&id=customer-1');

    await customerDialog.getByRole('button', { name: 'Change status' }).click();
    const accountStatusEditor = customerDialog.locator(
      '.sc-customer-details__status-editor',
    );
    await expect(accountStatusEditor).toBeVisible();
    const accountEditorStyles = await accountStatusEditor.evaluate((editor) => {
      const style = getComputedStyle(editor);
      return {
        background: style.backgroundColor,
        borderColor: style.borderTopColor,
        borderStyle: style.borderTopStyle,
        borderWidth: style.borderTopWidth,
        fields: Array.from(editor.querySelectorAll('.sc-control')).map(
          (field) => {
            const fieldStyle = getComputedStyle(field);
            return {
              background: fieldStyle.backgroundColor,
              borderColor: fieldStyle.borderTopColor,
              borderStyle: fieldStyle.borderTopStyle,
              borderWidth: fieldStyle.borderTopWidth,
            };
          },
        ),
      };
    });
    expect(accountEditorStyles).toEqual({
      background: 'rgb(255, 255, 255)',
      borderColor: 'rgb(205, 210, 216)',
      borderStyle: 'solid',
      borderWidth: '1px',
      fields: [
        {
          background: 'rgb(255, 255, 255)',
          borderColor: 'rgb(205, 210, 216)',
          borderStyle: 'solid',
          borderWidth: '1px',
        },
        {
          background: 'rgb(255, 255, 255)',
          borderColor: 'rgb(205, 210, 216)',
          borderStyle: 'solid',
          borderWidth: '1px',
        },
      ],
    });
    await accountStatusEditor.getByRole('button', { name: 'Cancel' }).click();

    await page.setViewportSize({ width: 390, height: 844 });
    const customerMobileColumns = await customerDialog
      .locator('.sc-customer-details__fields')
      .evaluate(
        (fields) =>
          getComputedStyle(fields).gridTemplateColumns.trim().split(/\s+/)
            .length,
      );
    expect(customerMobileColumns).toBe(1);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(390);

    await customerDialog.getByLabel('Full name').fill('Ada Shopper Updated');
    await customerDialog.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByText('Customer changes saved')).toBeVisible();
    await expect(
      page.getByRole('button', { name: /Ada Shopper Updated/ }),
    ).toBeVisible();
    expect(profileUpdatePayloads).toEqual([
      {
        fullName: 'Ada Shopper Updated',
        phone: '+2348000000001',
        email: 'ada@example.com',
      },
    ]);
  });

  test('reviews responsive Supervisor customer and card task workspaces', async ({
    page,
  }, testInfo) => {
    const workspaces = [
      {
        route: '/supervisor/customers?tab=register',
        role: 'SUPERVISOR' as const,
        task: 'register-customer',
        heading: 'Register a new customer',
        activeTab: 'Register customer',
        inactiveTab: 'Manage customers',
      },
      {
        route: '/supervisor/customers?tab=manage',
        role: 'SUPERVISOR' as const,
        task: 'manage-customers',
        heading: 'Find a customer',
        activeTab: 'Manage customers',
        inactiveTab: 'Register customer',
      },
      {
        route: '/supervisor/cards?tab=assign',
        role: 'SUPERVISOR' as const,
        task: 'assign-card',
        heading: 'Find an existing customer',
        activeTab: 'Assign card',
        inactiveTab: 'Manage cards',
      },
      {
        route: '/supervisor/cards?tab=manage',
        role: 'SUPERVISOR' as const,
        task: 'manage-cards',
        heading: 'Manage cards',
        activeTab: 'Manage cards',
        inactiveTab: 'Assign card',
      },
    ];
    const widths = [1440, 1024, 768, 390, 375];

    for (const workspace of workspaces) {
      await mockShell(page, workspace.role);
      await page.setViewportSize({ width: widths[0], height: 900 });
      await page.goto(`${baseUrl}${workspace.route}`);
      await expect(page.locator('.shell-loading-screen')).toBeHidden();
      for (const width of widths) {
        await page.setViewportSize({ width, height: 900 });
        const tablist = page.getByRole('tablist');
        const activeTab = tablist.getByRole('tab', {
          name: workspace.activeTab,
        });
        const inactiveTab = tablist.getByRole('tab', {
          name: workspace.inactiveTab,
        });
        await expect(activeTab).toHaveAttribute('aria-selected', 'true');
        await expect(inactiveTab).toHaveAttribute('aria-selected', 'false');
        const panels = page.getByRole('tabpanel');
        await expect(panels).toHaveCount(1);
        const panel = panels.first();
        await expect(panel).toBeVisible();
        await expect(
          panel.getByRole('heading', { name: workspace.heading }),
        ).toBeVisible();

        const measurements = await page.evaluate(() => ({
          documentWidth: document.documentElement.scrollWidth,
          bodyWidth: document.body.scrollWidth,
          viewportWidth: window.innerWidth,
        }));
        expect(
          measurements.documentWidth,
          `${workspace.task} at ${width}px`,
        ).toBeLessThanOrEqual(width);
        expect(
          measurements.bodyWidth,
          `${workspace.task} at ${width}px`,
        ).toBeLessThanOrEqual(width);
        expect(measurements.viewportWidth).toBe(width);

        const controls = panel.locator('input, button, textarea, select, a');
        const visibleControlRects = await controls.evaluateAll((elements) =>
          elements
            .filter((element) => {
              const style = getComputedStyle(element);
              return style.display !== 'none' && style.visibility !== 'hidden';
            })
            .map((element) => {
              const rect = element.getBoundingClientRect();
              return {
                tag: element.tagName,
                x: rect.x,
                right: rect.right,
                width: rect.width,
                height: rect.height,
                disabled: (element as HTMLButtonElement).disabled,
              };
            }),
        );
        expect(visibleControlRects.length, workspace.task).toBeGreaterThan(0);
        if (workspace.task === 'register-customer') {
          const registrationButton = panel.getByRole('button', {
            name: 'Review details',
          });
          const buttonBox = await registrationButton.boundingBox();
          const cardBox = await registrationButton
            .locator('xpath=ancestor::div[contains(@class, "sc-card")][1]')
            .boundingBox();
          expect(buttonBox).not.toBeNull();
          expect(cardBox).not.toBeNull();
          expect(buttonBox!.x).toBeGreaterThanOrEqual(cardBox!.x + 16);
          expect(buttonBox!.x + buttonBox!.width).toBeLessThanOrEqual(
            cardBox!.x + cardBox!.width - 16,
          );
        }
        for (const rect of visibleControlRects) {
          expect(
            rect.x,
            `${workspace.task} control left edge at ${width}px`,
          ).toBeGreaterThanOrEqual(0);
          expect(
            rect.right,
            `${workspace.task} control right edge at ${width}px`,
          ).toBeLessThanOrEqual(width);
          expect(rect.width).toBeGreaterThan(0);
          if (rect.tag === 'BUTTON')
            expect(rect.height).toBeGreaterThanOrEqual(40);
        }
        const tabRects = await tablist.getByRole('tab').evaluateAll((tabs) =>
          tabs.map((tab) => {
            const rect = tab.getBoundingClientRect();
            return { x: rect.x, right: rect.right, width: rect.width };
          }),
        );
        for (const rect of tabRects) {
          expect(
            rect.x,
            `${workspace.task} tab at ${width}px`,
          ).toBeGreaterThanOrEqual(0);
          expect(
            rect.right,
            `${workspace.task} tab at ${width}px`,
          ).toBeLessThanOrEqual(width);
          expect(rect.width).toBeGreaterThan(0);
        }
        const statusRects = await panel
          .getByRole('status')
          .evaluateAll((statuses) =>
            statuses.map((status) => {
              const rect = status.getBoundingClientRect();
              return { x: rect.x, right: rect.right, width: rect.width };
            }),
          );
        for (const rect of statusRects) {
          expect(
            rect.x,
            `${workspace.task} status at ${width}px`,
          ).toBeGreaterThanOrEqual(0);
          expect(
            rect.right,
            `${workspace.task} status at ${width}px`,
          ).toBeLessThanOrEqual(width);
          expect(rect.width).toBeGreaterThan(0);
        }
        const firstInput = panel.locator('input:visible').first();
        if (await firstInput.count()) {
          await firstInput.focus();
          await expect(firstInput).toBeFocused();
        }

        if (width === widths[0]) {
          await activeTab.focus();
          await expect(activeTab).toBeFocused();
          await page.keyboard.press('ArrowRight');
          await expect(inactiveTab).toHaveAttribute('aria-selected', 'true');
          await expect(inactiveTab).toBeFocused();
          await page.keyboard.press('ArrowLeft');
          await expect(activeTab).toHaveAttribute('aria-selected', 'true');
          await expect(activeTab).toBeFocused();
        }

        const screenshotPath = testInfo.outputPath(
          `supervisor-${workspace.task}-${width}px.png`,
        );
        await page.screenshot({ path: screenshotPath, fullPage: true });
        testInfo.attach(`${workspace.task}-${width}px`, {
          path: screenshotPath,
          contentType: 'image/png',
        });
      }
    }
  });

  test('restores Supervisor customer tabs after direct load, reload, back, and forward', async ({
    page,
  }) => {
    await mockShell(page, 'SUPERVISOR');
    await page.goto(`${baseUrl}/supervisor/customers?tab=register`);
    await expect(page.locator('.shell-loading-screen')).toBeHidden();
    await expect(
      page.getByRole('tab', { name: 'Register customer' }),
    ).toHaveAttribute('aria-selected', 'true');

    await page.getByRole('tab', { name: 'Manage customers' }).click();
    await expect(page).toHaveURL(`${baseUrl}/supervisor/customers?tab=manage`);
    await expect(
      page.getByRole('tab', { name: 'Manage customers' }),
    ).toHaveAttribute('aria-selected', 'true');
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 15_000 });
    await expect(
      page.getByRole('tab', { name: 'Manage customers' }),
    ).toHaveAttribute('aria-selected', 'true');
    await page.goBack({ waitUntil: 'commit', timeout: 15_000 });
    await expect(
      page.getByRole('tab', { name: 'Register customer' }),
    ).toHaveAttribute('aria-selected', 'true');
    await page.goForward({ waitUntil: 'commit', timeout: 15_000 });
    await expect(
      page.getByRole('tab', { name: 'Manage customers' }),
    ).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('tabpanel')).toHaveCount(1);
  });

  test('restores Supervisor card tabs after direct load and reload, defaulting invalid tabs', async ({
    page,
  }) => {
    await mockShell(page, 'SUPERVISOR');
    await page.goto(`${baseUrl}/supervisor/cards?tab=assign`);
    await expect(page.locator('.shell-loading-screen')).toBeHidden();
    await expect(
      page.getByRole('tab', { name: 'Assign card' }),
    ).toHaveAttribute('aria-selected', 'true');
    await page.goto(`${baseUrl}/supervisor/cards?tab=manage`);
    await expect(
      page.getByRole('tab', { name: 'Manage cards' }),
    ).toHaveAttribute('aria-selected', 'true');
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 15_000 });
    await expect(
      page.getByRole('tab', { name: 'Manage cards' }),
    ).toHaveAttribute('aria-selected', 'true');
    await page.goto(`${baseUrl}/supervisor/cards?tab=invalid`);
    await expect(
      page.getByRole('tab', { name: 'Assign card' }),
    ).toHaveAttribute('aria-selected', 'true');
  });

  test('restores Supervisor card task tabs with browser back and forward', async ({
    page,
  }) => {
    await mockShell(page, 'SUPERVISOR');
    await page.goto(`${baseUrl}/supervisor/cards?tab=assign`);
    await expect(page.locator('.shell-loading-screen')).toBeHidden();
    await expect(
      page.getByRole('tab', { name: 'Assign card' }),
    ).toHaveAttribute('aria-selected', 'true');

    await page.getByRole('tab', { name: 'Manage cards' }).click();
    await expect(page).toHaveURL(`${baseUrl}/supervisor/cards?tab=manage`);
    await expect(
      page.getByRole('tab', { name: 'Manage cards' }),
    ).toHaveAttribute('aria-selected', 'true');
    await page.goBack({ waitUntil: 'commit', timeout: 15_000 });
    await expect(
      page.getByRole('tab', { name: 'Assign card' }),
    ).toHaveAttribute('aria-selected', 'true');
    await page.goForward({ waitUntil: 'commit', timeout: 15_000 });
    await expect(
      page.getByRole('tab', { name: 'Manage cards' }),
    ).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('tabpanel')).toHaveCount(1);
  });

  test('denies Cashier and Admin direct navigation to Supervisor customer and card workflows', async ({
    page,
  }) => {
    const supervisorRoutes = [
      '/supervisor/customers?tab=manage',
      '/supervisor/cards?tab=assign',
    ];
    for (const role of ['CASHIER', 'ADMIN'] as const) {
      const permittedRoute = role === 'CASHIER' ? '/cashier' : '/admin';
      for (const path of supervisorRoutes) {
        await mockShell(page, role);
        await page.goto(`${baseUrl}${path}`, { waitUntil: 'domcontentloaded' });
        await expect(page.locator('.shell-loading-screen')).toBeHidden();
        await expect(page).toHaveURL(`${baseUrl}${permittedRoute}`);
        await expect(
          page.getByRole('heading', { name: 'Hi, Supervisor!' }),
        ).toHaveCount(0);
        await expect(
          page.getByRole('heading', { name: 'Find a customer' }),
        ).toHaveCount(0);
        await expect(
          page.getByRole('heading', { name: 'Find an existing customer' }),
        ).toHaveCount(0);
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
