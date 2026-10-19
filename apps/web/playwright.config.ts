import { defineConfig } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3100';
const webServerCommand =
  process.env.PLAYWRIGHT_USE_PRODUCTION_SERVER === 'true'
    ? 'npm run start -- --port 3100'
    : 'npm run dev -- --port 3100';

export default defineConfig({
  testDir: './tests',
  testMatch: /.*\.spec\.ts$/,
  testIgnore: [
    /tests\/smoke\/(roles|scenarios|guardrails|offline)\//,
    /tests\/(api-proxy-device-cookie|api-proxy-security|customer-card-number|report-errors|supervisor-report-metrics|webauthn-json)\.spec\.ts$/,
  ],
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL,
    viewport: { width: 1440, height: 2200 },
    colorScheme: 'light',
    deviceScaleFactor: 1,
    locale: 'en-NG',
    timezoneId: 'Africa/Lagos',
    trace: 'on-first-retry',
  },
  expect: {
    toHaveScreenshot: {
      animations: 'disabled',
      caret: 'hide',
      scale: 'css',
    },
  },
  ...(process.env.PLAYWRIGHT_SKIP_WEBSERVER
    ? {}
    : {
        webServer: {
          command: webServerCommand,
          url: baseURL,
          reuseExistingServer: false,
          timeout: 120000,
          env: {
            SHOPCITY_WEB_DIST_DIR:
              process.env.PLAYWRIGHT_USE_PRODUCTION_SERVER === 'true'
                ? '.next-playwright-production'
                : '.next-playwright-dev',
            NEXT_PUBLIC_SHOPCITY_LEGACY_DEVICE_AUTH_ENABLED:
              process.env.PLAYWRIGHT_USE_PRODUCTION_SERVER === 'true'
                ? 'false'
                : 'true',
            NEXT_PUBLIC_DEV_CASHIER_TEST_SESSION_ENABLED:
              process.env.PLAYWRIGHT_USE_PRODUCTION_SERVER === 'true'
                ? 'false'
                : 'true',
          },
        },
      }),
});
