import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { Cookie, Page } from '@playwright/test';
import type { SmokeConfig } from '../config';
import type { SmokeRole } from './api-client';
import { loadSmokeRun } from './smoke-run';

const roleRoutes: Record<SmokeRole, string> = {
  cashier: '/cashier',
  supervisor: '/supervisor',
  admin: '/admin',
};

export async function loginRoleInUi(
  page: Page,
  role: SmokeRole,
  config: SmokeConfig,
): Promise<void> {
  if (await restoreRoleSession(page, role, config)) {
    await page.goto(roleRoutes[role]);
    return;
  }

  await page.goto('/login');
  await page
    .getByLabel('Tenant / email / username')
    .fill(config[role].username);
  await page.getByLabel('Password').fill(config[role].password);

  if (role === 'cashier') {
    await page.getByLabel('Device ID').fill(config.cashier.deviceId);
    await page
      .getByLabel('Device attestation secret')
      .fill(config.cashier.deviceAttestationSecret);
  }

  await page.getByRole('button', { name: /^sign in$/i }).click();
  await page.waitForURL((url) => url.pathname === roleRoutes[role]);
}

async function restoreRoleSession(
  page: Page,
  role: SmokeRole,
  config: SmokeConfig,
): Promise<boolean> {
  if (
    typeof page.context !== 'function' ||
    typeof config.tenantId !== 'string'
  ) {
    return false;
  }

  try {
    const run = loadSmokeRun();
    const state = JSON.parse(
      await readFile(resolve(run.outputDir, 'auth', `${role}.json`), 'utf8'),
    ) as { cookies?: Cookie[] };
    if (!state.cookies?.length) return false;
    await page.context().addCookies(state.cookies);
    return true;
  } catch {
    return false;
  }
}

export async function logoutRoleInUi(page: Page): Promise<void> {
  await page.getByRole('button', { name: /sign out/i }).click();
  await page.waitForURL((url) => url.pathname === '/login');
}
