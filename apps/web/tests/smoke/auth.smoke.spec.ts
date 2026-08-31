import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import type { SmokeConfig } from './config';
import { loginRoleInUi, logoutRoleInUi } from './support/auth';

const config = {
  sessionBootstrapSecret: 'bootstrap-secret',
  cashier: {
    userId: 'cashier-user-id',
    username: 'smoke.cashier',
    password: 'password',
    deviceId: 'device-smoke',
    deviceAttestationSecret: 'attestation-secret',
  },
} as SmokeConfig;

test('Cashier UI authentication fills device-bound credentials and expects cashier route', async () => {
  const filled: Record<string, string> = {};
  const page = {
    goto: async () => undefined,
    getByLabel: (label: string) => ({
      fill: async (value: string) => {
        filled[label] = value;
      },
    }),
    getByRole: () => ({ click: async () => undefined }),
    waitForURL: async (predicate: (url: URL) => boolean) => {
      expect(predicate(new URL('https://shopcity.example/cashier'))).toBe(true);
    },
  } as unknown as Page;

  await loginRoleInUi(page, 'cashier', config);

  expect(filled).toMatchObject({
    'Tenant / email / username': 'smoke.cashier',
    Password: 'password',
    'Device ID': 'device-smoke',
    'Device attestation secret': 'attestation-secret',
  });
});

test('logout expects the login route', async () => {
  const page = {
    getByRole: () => ({ click: async () => undefined }),
    waitForURL: async (predicate: (url: URL) => boolean) => {
      expect(predicate(new URL('https://shopcity.example/login'))).toBe(true);
    },
  } as unknown as Page;

  await logoutRoleInUi(page);
});
