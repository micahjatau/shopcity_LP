import { defineConfig } from '@playwright/test';

const baseURL = process.env.SMOKE_FRONTEND_URL;

export default defineConfig({
  testDir: './tests/smoke',
  testMatch: /.*\.smoke\.spec\.ts$/,
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  outputDir: 'test-results/smoke/test-artifacts',
  globalSetup: './tests/smoke/global-setup.ts',
  globalTeardown: './tests/smoke/global-teardown.ts',
  reporter: [
    ['list'],
    ['junit', { outputFile: 'test-results/smoke/junit.xml' }],
    ['html', { outputFolder: 'test-results/smoke/html', open: 'never' }],
  ],
  use: {
    baseURL,
    locale: 'en-NG',
    timezoneId: 'Africa/Lagos',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
});
