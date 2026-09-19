import { expect, test } from '@playwright/test';

test.describe.configure({ timeout: 120000 });
test.use({ viewport: { width: 1440, height: 923 } });

test.describe('visual regression gallery', () => {
  test('captures prototype login surface', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 923 });
    await page.goto('/login', { waitUntil: 'networkidle' });
    await page.locator('[data-od-id="login-page"]').waitFor();
    // The group name stays accessible without occupying visual layout space.
    await expect(
      page.getByRole('group', { name: 'Choose a staff account' }),
    ).toBeVisible();
    await expect(page.locator('.login-role-list > legend')).toHaveCSS(
      'position',
      'absolute',
    );
    await expect(page.locator('.login-role-list > legend')).toHaveCSS(
      'height',
      '1px',
    );
    await expect(page.locator('[data-od-id="login-heading"]')).toHaveText(
      'Staff sign in',
    );
    await expect(page.locator('[data-od-id="brand-link"]')).toBeVisible();
    await expect(
      page.locator('[data-od-id="role-selector"] input'),
    ).toHaveCount(4);
    expect(page.viewportSize()).toEqual({ width: 1440, height: 923 });
    const loginGeometry = await page
      .locator('[data-od-id="login-page"]')
      .boundingBox();
    expect(loginGeometry?.width).toBe(1440);
    expect(loginGeometry?.height).toBeGreaterThanOrEqual(923);
    const buttonRhythm = await page
      .locator('button:visible')
      .evaluateAll((buttons) =>
        buttons.map((button) => {
          const style = getComputedStyle(button);
          return { display: style.display, whiteSpace: style.whiteSpace };
        }),
      );
    for (const button of buttonRhythm) {
      expect(['flex', 'inline-flex', 'grid']).toContain(button.display);
      expect(button.whiteSpace).toBe('nowrap');
    }
    await expect(page).toHaveScreenshot('visual-login-page.png');
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('/visual-regression');
  });

  test('captures primitives', async ({ page }) => {
    await expect(page.getByTestId('visual-primitives')).toHaveScreenshot(
      'visual-primitives.png',
    );
  });

  test('captures status badges', async ({ page }) => {
    await expect(page.getByTestId('visual-status-badges')).toHaveScreenshot(
      'visual-status-badges.png',
    );
  });

  test('captures transaction and approval surfaces', async ({ page }) => {
    await expect(
      page.getByTestId('visual-transaction-confirmation'),
    ).toHaveScreenshot('visual-transaction-confirmation.png');
    await expect(page.getByTestId('visual-approval-decision')).toHaveScreenshot(
      'visual-approval-decision.png',
    );
  });

  test('captures offline, dialog, table and report workspace surfaces', async ({
    page,
  }) => {
    await expect(page.getByTestId('visual-offline-queue')).toHaveScreenshot(
      'visual-offline-queue.png',
    );
    await expect(page.getByTestId('visual-dialogs')).toHaveScreenshot(
      'visual-dialogs.png',
    );
    await expect(page.getByTestId('visual-table')).toHaveScreenshot(
      'visual-table.png',
    );
    await expect(page.getByTestId('visual-report-workspace')).toHaveScreenshot(
      'visual-report-workspace.png',
    );
  });

  test('captures shell states and role shells', async ({ page }) => {
    await expect(page.getByTestId('visual-shell-states')).toHaveScreenshot(
      'visual-shell-states.png',
    );
    await expect(page.getByTestId('visual-role-shells')).toHaveScreenshot(
      'visual-role-shells.png',
    );
  });
});
