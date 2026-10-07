import { expect, test } from '@playwright/test';

function sessionPayload(
  role: 'CASHIER' | 'SUPERVISOR' | 'ADMIN' = 'CASHIER',
  deviceId: string | null = null,
) {
  return {
    success: true,
    data: {
      user: {
        id: 'user-1',
        username: 'cashier',
        role,
        branchId: 'branch-1',
      },
      session: {
        expiresAt: '2030-01-01T00:00:00.000Z',
        deviceId,
      },
    },
    meta: {
      timestamp: '2026-08-14T00:00:00.000Z',
      path: '/api/v1/auth/me',
      requestId: 'req-1',
    },
  };
}

test.describe('contract-faithful frontend flows', () => {
  test('explains and blocks device creation with a historical invalid branch UUID', async ({
    page,
  }) => {
    let createRequests = 0;
    await page.route('**/api/v1/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            user: {
              id: 'supervisor-1',
              username: 'supervisor',
              role: 'SUPERVISOR',
              branchId: '00000000-0000-0000-0000-000000000002',
            },
            session: { expiresAt: '2030-01-01T00:00:00.000Z', deviceId: null },
          },
          meta: {},
        }),
      });
    });
    await page.route('**/api/v1/devices', async (route) => {
      if (route.request().method() === 'POST') {
        createRequests += 1;
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: {}, meta: {} }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [], meta: {} }),
      });
    });

    await page.goto('/supervisor/devices');
    await page.getByLabel('Device name').fill('Preview register');
    await page.getByRole('button', { name: 'Create device' }).click();

    await expect(
      page.getByText(
        'Device creation could not be completed: the assigned branch identifier is invalid.',
      ),
    ).toBeVisible();
    expect(createRequests).toBe(0);
  });

  test('completes a paired-device WebAuthn login and reaches the cashier shell', async ({
    page,
  }) => {
    let authenticated = false;
    await page.addInitScript(() => {
      const bytes = (value: number) => new Uint8Array([value]).buffer;
      Object.defineProperty(navigator, 'credentials', {
        configurable: true,
        value: {
          get: async () => ({
            id: 'test-credential',
            rawId: bytes(1),
            type: 'public-key',
            authenticatorAttachment: 'platform',
            response: {
              clientDataJSON: bytes(1),
              authenticatorData: bytes(2),
              signature: bytes(3),
              userHandle: null,
            },
            getClientExtensionResults: () => ({}),
          }),
        },
      });
    });

    await page.route('**/api/v1/auth/me', async (route) => {
      await route.fulfill(
        authenticated
          ? {
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify(
                sessionPayload('CASHIER', 'cashier-device-1'),
              ),
            }
          : {
              status: 401,
              contentType: 'application/json',
              body: JSON.stringify({
                success: false,
                error: {
                  statusCode: 401,
                  code: 'UNAUTHORIZED',
                  message: 'Unauthorized',
                },
                meta: {
                  timestamp: '2026-08-14T00:00:00.000Z',
                  path: '/api/v1/auth/me',
                  requestId: 'req-unauthenticated',
                },
              }),
            },
      );
    });

    await page.route('**/api/v1/auth/login', async (route) => {
      const body = route.request().postDataJSON() as { username: string };
      const headers = route.request().headers();
      expect(body.username).toBe('cashier@shopcity.local');
      expect(headers['x-device-id']).toBe('cashier-device-1');
      expect(headers['x-device-attestation']).toBeUndefined();
      await route.fulfill({
        status: 202,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            code: 'DEVICE_ASSERTION_REQUIRED',
            attemptToken: 'attempt-token',
            options: {
              challenge: 'AQ',
              rpId: 'localhost',
              allowCredentials: [],
              userVerification: 'required',
            },
          },
          meta: {
            timestamp: '2026-08-14T00:00:00.000Z',
            path: '/api/v1/auth/login',
            requestId: 'req-login',
          },
        }),
      });
    });

    await page.route('**/api/v1/auth/cashier-login/complete', async (route) => {
      const body = route.request().postDataJSON() as {
        attemptToken: string;
        assertion: { id: string; response: { signature: string } };
      };
      expect(body.attemptToken).toBe('attempt-token');
      expect(body.assertion.id).toBe('test-credential');
      expect(body.assertion.response.signature).toBe('Aw');
      authenticated = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(sessionPayload('CASHIER', 'cashier-device-1')),
      });
    });

    await page.route('**/api/v1/config/operational', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
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
          meta: {
            timestamp: '2026-08-14T00:00:00.000Z',
            path: '/api/v1/config/operational',
            requestId: 'req-config',
          },
        }),
      });
    });

    await page.goto('/login');
    await page.evaluate(() =>
      window.localStorage.setItem(
        'shopcity:paired-device-id',
        'cashier-device-1',
      ),
    );
    await page.getByLabel('Email Address').fill('cashier@shopcity.local');
    await page.getByRole('textbox', { name: /^Password$/i }).fill('secret');
    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(page).toHaveURL(/\/cashier$/);
    await expect(
      page.getByRole('heading', { name: /hi, cashier/i }),
    ).toBeVisible();
    await expect(page.getByText(/device cashier-device-1/i)).toHaveCount(0);
  });

  test('submits earn and redeem through generated client contracts', async ({
    page,
  }) => {
    await page.route('**/api/v1/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(sessionPayload('CASHIER', 'cashier-device-1')),
      });
    });

    await page.route('**/api/v1/cards/lookup/CARD-123', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            customer: {
              id: 'customer-123',
              fullName: 'Ada Shopper',
              maskedPhone: '0803 *** 4412',
              isStaff: false,
              earningEligible: true,
              eligibilityReason: null,
            },
            customerId: 'customer-123',
            customerName: 'Ada Shopper',
            serialNumber: 'CARD-123',
            status: 'ACTIVE',
            availableBalanceKobo: 100000,
            branchId: 'branch-1',
          },
          meta: {},
        }),
      });
    });

    await page.route('**/api/v1/transactions/earn', async (route) => {
      const body = route.request().postDataJSON() as {
        cardSerialNumber: string;
        purchaseAmountKobo: number;
      };
      expect(body.cardSerialNumber).toBeTruthy();
      expect(body.purchaseAmountKobo).toBeGreaterThan(0);
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: {}, meta: {} }),
      });
    });

    await page.route('**/api/v1/transactions/redeem', async (route) => {
      const body = route.request().postDataJSON() as {
        cardSerialNumber: string;
        requestedRedemptionKobo: number;
      };
      expect(body.cardSerialNumber).toBeTruthy();
      expect(body.requestedRedemptionKobo).toBeGreaterThan(0);
      await route.fulfill({
        status: 202,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: {}, meta: {} }),
      });
    });

    await page.goto('/cashier/earn');
    await expect(
      page.getByRole('heading', { name: /capture purchase/i }),
    ).toBeVisible();

    await page.getByRole('textbox', { name: 'Lookup' }).fill('CARD-123');
    await page.getByRole('button', { name: 'Search customer' }).click();
    await expect(page.getByText('Ada Shopper', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Proceed' }).click();
    const earn = page.getByRole('article', { name: /earn transaction/i });
    await earn.getByLabel('POS receipt number').fill('RCPT-123');
    await earn.getByLabel('Purchase amount').fill('1,234.50');
    await earn.getByLabel('Occurred at').fill('2030-01-01T12:00');
    await earn.getByRole('button', { name: 'Proceed to review' }).click();
    await earn.getByRole('button', { name: 'Confirm & add credit' }).click();
    await expect(earn).toContainText(/purchase captured and credit added/i);

    await page.goto('/cashier/redeem');
    await expect(
      page.getByRole('heading', { name: /redeem credit/i }),
    ).toBeVisible();

    await page.getByRole('textbox', { name: 'Lookup' }).fill('CARD-123');
    await page.getByRole('button', { name: 'Search customer' }).click();
    await expect(page.getByText('Ada Shopper', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Continue to redemption' }).click();
    const redeem = page.getByRole('article', { name: /redeem transaction/i });
    await redeem.getByLabel('POS receipt number').fill('RCPT-124');
    await redeem.getByLabel('Basket amount').fill('1,000.00');
    await redeem.getByLabel('Basket amount').blur();
    await redeem.getByLabel('Requested redemption').fill('50.00');
    await redeem.getByLabel('Requested redemption').blur();
    await redeem.getByLabel('Occurred at').fill('2030-01-01T12:00');
    await redeem
      .getByRole('button', { name: 'Proceed to confirmation' })
      .click();
    await redeem.getByRole('button', { name: 'Confirm redemption' }).click();
    await expect(redeem).toContainText(
      /redemption submitted and waiting for approval/i,
    );
  });

  test('loads supervisor approvals and admin reports from contract-shaped responses', async ({
    page,
  }) => {
    await page.route('**/api/v1/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(sessionPayload('SUPERVISOR')),
      });
    });

    await page.route('**/api/v1/approvals**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            items: [
              {
                id: 'approval-1',
                receiptId: 'receipt-1',
                redemptionId: null,
                targetType: 'EARN',
                status: 'PENDING',
                reasonCode: 'HIGH_VALUE',
                requestedAmountKobo: 125000,
                requestedAt: '2030-01-01T12:00:00.000Z',
                expiresAt: '2030-01-01T14:00:00.000Z',
                decidedAt: null,
                executedAt: null,
                customer: { fullName: 'Amina Bello' },
                receipt: null,
              },
            ],
            nextCursor: null,
            hasMore: false,
          },
          meta: {},
        }),
      });
    });

    await page.route('**/api/v1/fraud-flags**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            scope: 'TENANT',
            scopeKey: 'tenant-1',
            branchId: null,
            items: [
              {
                id: 'fraud-1',
                ruleCode: 'HIGH_VALUE',
                status: 'OPEN',
                severity: 'HIGH',
                branchId: 'branch-1',
                customer: { fullName: 'Amina Bello' },
              },
            ],
            nextCursor: null,
            hasMore: false,
          },
          meta: {},
        }),
      });
    });

    await page.route('**/api/v1/fraud-flags/*/decision', async (route) => {
      const body = route.request().postDataJSON() as {
        decision: string;
        reason: string;
      };
      expect(body.decision).toMatch(/ACKNOWLEDGED|RESOLVED/);
      expect(body.reason).toContain('supervisor shell');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: {}, meta: {} }),
      });
    });

    await page.route('**/api/v1/reports/executive-summary', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            scope: 'TENANT',
            scopeKey: 'tenant-1',
            branchId: null,
            timezone: 'Africa/Lagos',
            items: [{ label: 'freshness', value: 'fresh' }],
          },
          meta: {},
        }),
      });
    });

    await page.goto('/supervisor');
    await expect(
      page.getByRole('heading', { name: 'Hi, Supervisor!' }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Transactions awaiting approval' }),
    ).toHaveCount(0);

    await page.goto('/supervisor/approvals');
    await expect(
      page.getByRole('heading', { name: 'Transactions awaiting approval' }),
    ).toBeVisible();
    await expect(page.getByText('1 result')).toBeVisible();
    const approvalHeaderTypography = await page
      .locator('.approval-queue__table thead th')
      .first()
      .evaluate((element) => {
        const style = window.getComputedStyle(element);
        return {
          fontFamily: style.fontFamily,
          fontSize: style.fontSize,
          fontWeight: style.fontWeight,
          color: style.color,
          textAlign: style.textAlign,
          padding: style.padding,
        };
      });
    const approvalCellTypography = await page
      .locator('.approval-queue__table tbody td')
      .first()
      .evaluate((element) => {
        const style = window.getComputedStyle(element);
        return {
          fontFamily: style.fontFamily,
          fontSize: style.fontSize,
          fontWeight: style.fontWeight,
          color: style.color,
          textAlign: style.textAlign,
          padding: style.padding,
        };
      });

    await page.goto('/supervisor/fraud');
    await expect(
      page.getByRole('region', { name: /fraud workspace/i }),
    ).toContainText(/1 result/i);
    await expect(
      page.getByRole('region', { name: /fraud flag list/i }).getByRole('table'),
    ).toBeVisible();
    const fraudHeaderTypography = await page
      .locator('.fraud-flags__table thead th')
      .first()
      .evaluate((element) => {
        const style = window.getComputedStyle(element);
        return {
          fontFamily: style.fontFamily,
          fontSize: style.fontSize,
          fontWeight: style.fontWeight,
          color: style.color,
          textAlign: style.textAlign,
          padding: style.padding,
        };
      });
    expect(fraudHeaderTypography).toEqual(approvalHeaderTypography);
    const fraudCellTypography = await page
      .locator('.fraud-flags__table tbody td')
      .first()
      .evaluate((element) => {
        const style = window.getComputedStyle(element);
        return {
          fontFamily: style.fontFamily,
          fontSize: style.fontSize,
          fontWeight: style.fontWeight,
          color: style.color,
          textAlign: style.textAlign,
          padding: style.padding,
        };
      });
    expect(fraudCellTypography).toEqual(approvalCellTypography);
    expect(
      await page
        .locator('.fraud-flags__table tbody tr:last-child > *')
        .first()
        .evaluate(
          (element) => window.getComputedStyle(element).borderBottomWidth,
        ),
    ).toBe('0px');
    for (const width of [1440, 768, 375]) {
      await page.setViewportSize({ width, height: 900 });
      const filterTops = await page
        .locator('.fraud-flags__filter')
        .evaluateAll((filters) =>
          filters.map((filter) =>
            Math.round(filter.getBoundingClientRect().top),
          ),
        );
      expect(new Set(filterTops).size).toBe(1);
      const controlRow = await page
        .locator('.fraud-flags__control-row')
        .evaluate((row) => {
          const filters = row.querySelector('.fraud-flags__filters')!;
          const refresh = row.querySelector('.fraud-flags__refresh')!;
          const filtersBounds = filters.getBoundingClientRect();
          const refreshBounds = refresh.getBoundingClientRect();
          return {
            bottomDifference: Math.abs(
              filtersBounds.bottom - refreshBounds.bottom,
            ),
            refreshIsRightOfFilters: refreshBounds.left >= filtersBounds.right,
          };
        });
      expect(controlRow.bottomDifference).toBeLessThanOrEqual(1);
      expect(controlRow.refreshIsRightOfFilters).toBe(true);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(width);
    }
    await page.setViewportSize({ width: 1280, height: 720 });
    await page
      .getByRole('button', { name: /Review HIGH_VALUE for Amina Bello/i })
      .click();
    const fraudDialog = page.getByRole('dialog', {
      name: 'Review fraud case',
    });
    await expect(fraudDialog).toBeVisible();
    await fraudDialog
      .getByLabel('Fraud decision reason')
      .fill('supervisor shell review');
    await fraudDialog.getByRole('button', { name: 'Submit decision' }).click();

    await page.unroute('**/api/v1/auth/me');
    await page.route('**/api/v1/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(sessionPayload('ADMIN')),
      });
    });

    await page.route('**/api/v1/users', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            {
              id: 'user-1',
              username: 'admin',
              role: 'ADMIN',
              status: 'ACTIVE',
              branchId: 'branch-1',
            },
          ],
          meta: {},
        }),
      });
    });

    await page.route('**/api/v1/users/user-1/role', async (route) => {
      const body = route.request().postDataJSON() as { role: string };
      expect(body.role).toBeTruthy();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: {}, meta: {} }),
      });
    });

    await page.route('**/api/v1/users/user-1/status', async (route) => {
      const body = route.request().postDataJSON() as { status: string };
      expect(body.status).toBeTruthy();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: {}, meta: {} }),
      });
    });

    await page.route('**/api/v1/devices', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            {
              id: 'device-1',
              name: 'Front counter',
              status: 'ACTIVE',
              branchId: 'branch-1',
              fingerprintHash: 'hash-1',
            },
          ],
          meta: {},
        }),
      });
    });

    await page.route('**/api/v1/devices/device-1', async (route) => {
      const body = route.request().postDataJSON() as { status?: string };
      expect(body.status).toBeTruthy();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: {}, meta: {} }),
      });
    });

    await page.route('**/api/v1/audit*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            {
              id: 'audit-1',
              action: 'USER_ROLE_UPDATED',
              subjectType: 'USER',
              subjectId: 'user-1',
              actorId: 'admin',
              createdAt: '2030-01-01T12:00:00.000Z',
            },
          ],
          meta: {},
        }),
      });
    });

    await Promise.all([
      page.waitForURL(/\/admin(?:\/.*)?$/),
      page.goto('/admin').catch(() => undefined),
    ]);
    await expect(
      page.getByRole('heading', { name: /admin shell/i }),
    ).toBeVisible();
    await expect(page.getByText(/users: 1/i)).toBeVisible();
    await expect(page.getByText(/devices: 1/i)).toBeVisible();
    await expect(page.getByText(/audit rows: 1/i)).toBeVisible();
    await page.getByRole('button', { name: /update role/i }).click();
    await page.getByRole('button', { name: /update device status/i }).click();
  });

  test('shows empty states and retry messaging on supervisor and admin shells', async ({
    page,
  }) => {
    let approvalsFailure = false;
    let userFailure = false;

    await page.route('**/api/v1/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(sessionPayload('SUPERVISOR')),
      });
    });

    await page.route('**/api/v1/approvals**', async (route) => {
      if (approvalsFailure) {
        await route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: {
              statusCode: 503,
              code: 'UNAVAILABLE',
              message: 'Approvals unavailable',
            },
            meta: {},
          }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { items: [], nextCursor: null, hasMore: false },
          meta: {},
        }),
      });
    });

    await page.route('**/api/v1/fraud-flags**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            scope: 'TENANT',
            scopeKey: 'tenant-1',
            branchId: null,
            items: [],
            nextCursor: null,
            hasMore: false,
          },
          meta: {},
        }),
      });
    });

    await page.route('**/api/v1/reports/executive-summary', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            scope: 'TENANT',
            scopeKey: 'tenant-1',
            branchId: null,
            timezone: 'Africa/Lagos',
            items: [],
          },
          meta: {},
        }),
      });
    });

    await page.goto('/supervisor/approvals');
    await expect(page.getByText(/No approvals/i)).toBeVisible();
    approvalsFailure = true;
    await page.getByRole('button', { name: /refresh approvals/i }).click();
    await expect(
      page.getByText(/approvals unavailable \(503\)/i),
    ).toBeVisible();

    await page.goto('/supervisor/fraud');
    await expect(page.getByText(/No fraud flags/i)).toBeVisible();
    await page.goto('/supervisor/reports');
    await expect(page.getByText(/No report rows/i)).toBeVisible();

    await page.unroute('**/api/v1/auth/me');
    await page.route('**/api/v1/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(sessionPayload('ADMIN')),
      });
    });

    await page.route('**/api/v1/users', async (route) => {
      if (userFailure) {
        await route.fulfill({
          status: 403,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: {
              statusCode: 403,
              code: 'FORBIDDEN',
              message: 'Users unavailable',
            },
            meta: {},
          }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [], meta: {} }),
      });
    });

    await page.route('**/api/v1/devices', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [], meta: {} }),
      });
    });

    await page.route('**/api/v1/audit*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [], meta: {} }),
      });
    });

    await page.goto('/admin');
    await expect(page.getByText(/No users/i)).toBeVisible();
    await expect(page.getByText(/No devices/i)).toBeVisible();
    await expect(page.getByText(/No audit rows/i)).toBeVisible();

    userFailure = true;
    await page.getByRole('button', { name: /refresh users/i }).click();
    await expect(page.getByText(/users unavailable \(403\)/i)).toBeVisible();

    await page.goto('/admin/fraud');
    await expect(
      page.getByRole('heading', { name: 'Fraud', exact: true }),
    ).toBeVisible();
    const adminFraudResults = page.getByRole('region', {
      name: /fraud flag list/i,
    });
    await expect(adminFraudResults.getByRole('table')).toBeVisible();
    await expect(
      adminFraudResults.getByRole('columnheader', { name: 'Severity' }),
    ).toBeVisible();
    await expect(
      adminFraudResults.getByText(/No fraud flags match/i),
    ).toBeVisible();
  });
});
