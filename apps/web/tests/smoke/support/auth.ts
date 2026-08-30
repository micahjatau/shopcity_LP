import type { Page } from '@playwright/test';
import type { SmokeConfig } from '../config';
import type { SmokeRole } from './api-client';

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

export async function logoutRoleInUi(page: Page): Promise<void> {
  await page.getByRole('button', { name: /sign out/i }).click();
  await page.waitForURL((url) => url.pathname === '/login');
}
