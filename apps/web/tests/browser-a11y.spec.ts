import { expect, test, type Page } from '@playwright/test';
import axe from 'axe-core';

const baseUrl = 'http://127.0.0.1:3100';

async function runAxe(page: Page) {
  await page.addScriptTag({ content: axe.source });
  return page.evaluate(async () => {
    const results = await (
      window as typeof window & { axe: typeof axe }
    ).axe.run(document, {
      rules: {
        'color-contrast': { enabled: true },
      },
    });
    return results.violations;
  });
}

test.describe('browser accessibility', () => {
  test('catches contrast and semantic issues on shared shell routes', async ({
    page,
  }) => {
    await page.goto(`${baseUrl}/login`);
    await expect(
      page.getByRole('heading', {
        name: /sign in to the shopcity retail operations shell/i,
      }),
    ).toBeVisible();

    let violations = await runAxe(page);
    expect(violations).toEqual([]);

    await page.goto(`${baseUrl}/testing/critical-flows`);
    await expect(page.getByTestId('flow-login-session')).toBeVisible();
    violations = await runAxe(page);
    expect(violations).toEqual([]);
  });
});
