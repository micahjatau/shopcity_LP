import { expect, test } from '@playwright/test';

test.describe.configure({ timeout: 120000 });

test.describe('visual regression gallery', () => {
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
