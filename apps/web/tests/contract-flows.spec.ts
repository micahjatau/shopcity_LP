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

  test('uses a virtual authenticator and waits for assertion completion before session issuance', async ({
    page,
  }) => {
    let authenticated = false;
    let sessionIssued = false;
    let credentialId = '';
    let releaseCompletion!: () => void;
    let signalCompletionRequest!: () => void;
    const completionGate = new Promise<void>((resolve) => {
      releaseCompletion = resolve;
    });
    const completionRequested = new Promise<void>((resolve) => {
      signalCompletionRequest = resolve;
    });

    await page.route('**/api/v1/auth/me', async (route) => {
      await route.fulfill(
        authenticated
          ? {
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify(
                sessionPayload('CASHIER', 'virtual-pos-device'),
              ),
            }
          : {
              status: 401,
              contentType: 'application/json',
              body: JSON.stringify({
                success: false,
                error: { statusCode: 401, code: 'UNAUTHORIZED' },
                meta: {},
              }),
            },
      );
    });
    await page.route('**/api/v1/auth/login', async (route) => {
      const body = route.request().postDataJSON() as { username: string };
      const headers = route.request().headers();
      expect(body.username).toBe('cashier@shopcity.local');
      expect(headers['x-device-id']).toBe('virtual-pos-device');
      expect(headers['x-device-attestation']).toBeUndefined();
      await route.fulfill({
        status: 202,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            code: 'DEVICE_ASSERTION_REQUIRED',
            attemptToken: 'virtual-attempt-token',
            options: {
              challenge: 'AQIDBA',
              rpId: 'localhost',
              allowCredentials: [
                {
                  type: 'public-key',
                  id: credentialId,
                  transports: ['internal'],
                },
              ],
              userVerification: 'required',
            },
          },
          meta: {},
        }),
      });
    });
    await page.route('**/api/v1/auth/cashier-login/complete', async (route) => {
      const body = route.request().postDataJSON() as {
        attemptToken: string;
        assertion: { id: string; response: { signature: string } };
      };
      expect(body.attemptToken).toBe('virtual-attempt-token');
      expect(body.assertion.id).toBe(credentialId);
      expect(body.assertion.response.signature).not.toBe('');
      signalCompletionRequest();
      await completionGate;
      authenticated = true;
      sessionIssued = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(sessionPayload('CASHIER', 'virtual-pos-device')),
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
          meta: {},
        }),
      });
    });

    const cdp = await page.context().newCDPSession(page);
    await cdp.send('WebAuthn.enable');
    const { authenticatorId } = await cdp.send(
      'WebAuthn.addVirtualAuthenticator',
      {
        options: {
          protocol: 'ctap2',
          transport: 'internal',
          hasResidentKey: false,
          hasUserVerification: true,
          isUserVerified: true,
          automaticPresenceSimulation: true,
        },
      },
    );

    try {
      await page.goto('http://localhost:3100/login');
      credentialId = await page.evaluate(async () => {
        const credential = await navigator.credentials.create({
          publicKey: {
            challenge: new Uint8Array([1, 2, 3, 4]),
            rp: { id: 'localhost', name: 'ShopCity POS' },
            user: {
              id: new Uint8Array([5, 6, 7, 8]),
              name: 'cashier@shopcity.local',
              displayName: 'ShopCity Cashier',
            },
            pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
            authenticatorSelection: {
              authenticatorAttachment: 'platform',
              residentKey: 'discouraged',
              userVerification: 'required',
            },
          },
        });
        if (!(credential instanceof PublicKeyCredential)) {
          throw new Error('Virtual authenticator did not create a credential');
        }
        return credential.id;
      });
      await page.evaluate(() =>
        window.localStorage.setItem(
          'shopcity:paired-device-id',
          'virtual-pos-device',
        ),
      );
      await page.getByLabel('Email Address').fill('cashier@shopcity.local');
      await page.getByRole('textbox', { name: /^Password$/i }).fill('secret');
      await page.getByRole('button', { name: /sign in/i }).click();
      await completionRequested;

      expect(sessionIssued).toBe(false);
      await expect(page).toHaveURL(/\/login$/);
      expect(await page.context().cookies()).toEqual([]);

      releaseCompletion();
      await expect(page).toHaveURL(/\/cashier$/);
      await expect(
        page.getByRole('heading', { name: /hi, cashier/i }),
      ).toBeVisible();
      expect(sessionIssued).toBe(true);
    } finally {
      releaseCompletion();
      await cdp.send('WebAuthn.removeVirtualAuthenticator', {
        authenticatorId,
      });
      await cdp.send('WebAuthn.disable');
      await cdp.detach();
    }
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
    await earn.getByLabel(/Receipt number/).fill('RCPT-123');
    await earn.getByLabel(/Receipt amount/).fill('1,234.50');
    await earn.getByLabel(/Receipt date & time/).fill('2030-01-01T12:00');
    await earn.getByRole('button', { name: 'Proceed to review' }).click();
    await earn.getByRole('button', { name: 'Confirm & add credit' }).click();
    await expect(
      earn.getByRole('region', { name: 'ShopCity Credit earned' }),
    ).toBeVisible();
    await expect(earn).toContainText('StatusConfirmed');

    await page.goto('/cashier/redeem');
    await expect(
      page.getByRole('heading', { name: /redeem credit/i }),
    ).toBeVisible();

    await page.getByRole('textbox', { name: 'Lookup' }).fill('CARD-123');
    await page.getByRole('button', { name: 'Search customer' }).click();
    await expect(
      page.getByText('Ada Shopper', { exact: true }).first(),
    ).toBeVisible();
    const redeem = page.locator('[data-od-id="redeem-form"]');
    await redeem.getByLabel('POS receipt number').fill('RCPT-124');
    await redeem.getByLabel('Basket subtotal (₦)').fill('1,000.00');
    await redeem.getByLabel('Basket subtotal (₦)').blur();
    await redeem.getByRole('button', { name: 'Proceed', exact: true }).click();
    await redeem.getByLabel('Redemption amount (₦)').fill('50.00');
    await redeem.getByLabel('Redemption amount (₦)').blur();
    await redeem.getByRole('button', { name: 'Proceed', exact: true }).click();
    await redeem.getByText('Transaction time').click();
    await redeem.getByLabel('Occurred at').fill('2030-01-01T12:00');
    await redeem.getByRole('button', { name: 'Confirm redemption' }).click();
    await expect(
      redeem.getByRole('region', { name: 'Redemption pending approval' }),
    ).toBeVisible();
    await expect(redeem).toContainText('no completed debit is claimed');
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
                category: 'HIGH_VALUE_TRANSACTION',
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
            categoryCounts: {
              HIGH_VALUE_TRANSACTION: 1,
              LATE_RECEIPT_CLAIM: 0,
            },
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
            scope: 'BRANCH',
            scopeKey: 'branch-1',
            branchId: 'branch-1',
            items: [
              {
                id: 'fraud-1',
                ruleCode: 'FR-HV-001',
                status: 'OPEN',
                severity: 'HIGH',
                branchId: 'branch-1',
                branchName: 'Wuse',
                customerName: 'Amina Bello',
                cashierName: 'jane.a',
                receiptNumber: 'POS-1042',
                amountKobo: 125000,
                evidence: {
                  purchaseAmountKobo: '125000',
                  thresholdKobo: 100000,
                  occurredAt: '2026-10-13T10:00:00.000Z',
                },
              },
            ],
            summary: {
              needReviewCount: 1,
              highPriorityCount: 1,
              underReviewCount: 0,
            },
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
      page.getByRole('heading', { name: 'Approval Centre' }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Recent customers' }),
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Decision' })).toBeVisible();
    await expect(
      page.getByRole('tab', {
        name: 'High-value transaction, 1 matching request',
      }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: /Amina Bello/ }),
    ).toBeVisible();
    await page.getByRole('button', { name: /Amina Bello/ }).click();
    await expect(
      page.locator('.approval-queue__decision-content'),
    ).toBeVisible();
    const approvalTable = page.getByRole('table', {
      name: 'High-value transaction approvals',
    });
    await expect(
      approvalTable.getByRole('columnheader', { name: 'Name' }),
    ).toBeVisible();
    await expect(
      approvalTable.getByRole('columnheader', { name: 'Amount' }),
    ).toBeVisible();

    for (const width of [1280, 1440, 1920, 768, 375]) {
      await page.setViewportSize({ width, height: 1100 });
      const geometry = await page.evaluate(() => {
        const cards = Array.from(
          document.querySelectorAll<HTMLElement>(
            '.approval-queue__results, .approval-queue__decision',
          ),
        ).map((element) => element.getBoundingClientRect());
        const approvalTable = document.querySelector<HTMLElement>(
          '.approval-queue__recent-table',
        );
        const rowsContainer = document.querySelector<HTMLElement>(
          '.approval-queue__rows',
        );
        const tableRect = approvalTable?.getBoundingClientRect();
        const containerRect = rowsContainer?.getBoundingClientRect();
        const headerCells = Array.from(
          approvalTable?.querySelectorAll<HTMLElement>('thead th') ?? [],
        );
        const valueCellStyle = approvalTable?.querySelector<HTMLElement>(
          'tbody tr:last-child td:last-child',
        );
        return {
          documentWidth: document.documentElement.scrollWidth,
          viewportWidth: window.innerWidth,
          table: {
            left: tableRect?.left ?? 0,
            width: tableRect?.width ?? 0,
            containerLeft: containerRect?.left ?? 0,
            containerWidth: containerRect?.width ?? 0,
            right: tableRect?.right ?? 0,
            nameRight: headerCells[0]?.getBoundingClientRect().right ?? 0,
            nameWidth: headerCells[0]?.getBoundingClientRect().width ?? 0,
            valueLeft: headerCells[1]?.getBoundingClientRect().left ?? 0,
            valueWidth: headerCells[1]?.getBoundingClientRect().width ?? 0,
            valueRight: headerCells[1]?.getBoundingClientRect().right ?? 0,
            dividerWidth: valueCellStyle
              ? window.getComputedStyle(valueCellStyle).borderLeftWidth
              : 'missing',
          },
          first: {
            left: cards[0]?.left,
            right: cards[0]?.right,
            top: cards[0]?.top,
            bottom: cards[0]?.bottom,
          },
          second: {
            left: cards[1]?.left,
            right: cards[1]?.right,
            top: cards[1]?.top,
            bottom: cards[1]?.bottom,
          },
        };
      });
      expect(geometry.documentWidth).toBeLessThanOrEqual(
        geometry.viewportWidth,
      );
      expect(geometry.table.width).toBeGreaterThanOrEqual(
        geometry.table.containerWidth - 1,
      );
      expect(geometry.table.width).toBeLessThanOrEqual(
        geometry.table.containerWidth + 1,
      );
      expect(
        Math.abs(geometry.table.left - geometry.table.containerLeft),
      ).toBeLessThanOrEqual(1);
      expect(geometry.table.nameWidth).toBeGreaterThan(
        geometry.table.valueWidth,
      );
      expect(geometry.table.nameRight).toBeLessThanOrEqual(
        geometry.table.valueLeft + 1,
      );
      expect(geometry.table.valueRight).toBeLessThanOrEqual(
        geometry.table.right + 1,
      );
      expect(geometry.table.dividerWidth).toBe('0px');
      if (width <= 768) {
        expect(geometry.second.top).toBeGreaterThanOrEqual(
          geometry.first.bottom,
        );
      } else {
        expect(geometry.second.left).toBeGreaterThan(geometry.first.left);
        expect(geometry.first.right).toBeLessThanOrEqual(
          geometry.second.left + 1,
        );
      }
    }

    await page.goto('/supervisor/fraud');
    await expect(
      page.getByRole('heading', { name: 'Flagged activity', level: 1 }),
    ).toBeVisible();
    await expect(
      page.getByRole('region', { name: /flagged activity workspace/i }),
    ).toContainText(/1 shown/i);
    await expect(
      page
        .getByRole('region', { name: /flagged activity results/i })
        .getByRole('table'),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Branch: All branches' }),
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
    expect(fraudHeaderTypography.textAlign).toBe('left');
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
    expect(fraudCellTypography.textAlign).toBe('left');
    await page.setViewportSize({ width: 1440, height: 900 });
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
      expect(new Set(filterTops).size).toBe(width > 860 ? 1 : 2);
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
            refreshFollowsFilters: refreshBounds.top >= filtersBounds.bottom,
          };
        });
      if (width > 860) {
        expect(controlRow.bottomDifference).toBeLessThanOrEqual(1);
        expect(controlRow.refreshIsRightOfFilters).toBe(true);
      } else {
        expect(controlRow.refreshFollowsFilters).toBe(true);
      }
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(width);
      for (const filter of [
        { trigger: 'Category: All activity', listbox: 'Category' },
        { trigger: 'Review status: All statuses', listbox: 'Review status' },
        { trigger: 'Priority: All priorities', listbox: 'Priority' },
        { trigger: 'Branch: All branches', listbox: 'Branch' },
      ]) {
        await page.getByRole('button', { name: filter.trigger }).click();
        const menu = page.getByRole('listbox', { name: filter.listbox });
        const menuBounds = await menu.evaluate((element) => {
          const bounds = element.getBoundingClientRect();
          const style = window.getComputedStyle(element);
          return {
            left: bounds.left,
            right: bounds.right,
            borderRadius: style.borderRadius,
            backgroundColor: style.backgroundColor,
          };
        });
        expect(menuBounds.left).toBeGreaterThanOrEqual(0);
        expect(menuBounds.right).toBeLessThanOrEqual(width);
        expect(menuBounds.borderRadius).toBe('12px');
        expect(menuBounds.backgroundColor).toBe('rgb(255, 255, 255)');
        await page.keyboard.press('Escape');
      }
    }
    await page.setViewportSize({ width: 1280, height: 720 });
    await page
      .getByRole('button', {
        name: /Review case: Purchase above the review threshold for Customer Amina Bello/i,
      })
      .click();
    const fraudDialog = page.getByRole('dialog', {
      name: 'Review flagged activity',
    });
    await expect(fraudDialog).toBeVisible();
    await fraudDialog
      .getByLabel('Decision reason')
      .fill('supervisor shell review');
    await fraudDialog.getByRole('button', { name: 'Record decision' }).click();

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
            summary: {
              needReviewCount: 0,
              highPriorityCount: 0,
              underReviewCount: 0,
            },
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
    await expect(
      page.getByText('No requests in this category on the loaded page.'),
    ).toBeVisible();
    approvalsFailure = true;
    await page
      .getByRole('region', { name: 'Approval requests' })
      .getByRole('button', { name: 'Refresh' })
      .click();
    await expect(
      page.getByText(/approvals unavailable \(503\)/i),
    ).toBeVisible();

    await page.goto('/supervisor/fraud');
    await expect(
      page.getByText(/No flagged activity is available/i),
    ).toBeVisible();
    await page.goto('/supervisor/reports');
    const reportingError = page
      .getByRole('region', { name: 'Operational reports' })
      .getByRole('alert')
      .first();
    await expect(reportingError).toContainText(
      'The report could not be loaded. Try again.',
    );
    await expect(
      reportingError.getByRole('button', { name: 'Try again' }),
    ).toBeVisible();

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
    await expect(page.getByLabel('Fraud branch filter')).toBeVisible();
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
