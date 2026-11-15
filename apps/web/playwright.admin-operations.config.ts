import { defineConfig } from '@playwright/test';
import baseConfig from './playwright.config';

export default defineConfig({
  ...baseConfig,
  testMatch: /admin-operations-health-trend\.browser\.spec\.ts$/,
  use: {
    ...baseConfig.use,
    launchOptions: {
      executablePath: process.env.CHROME_BIN ?? '/usr/bin/google-chrome',
      args: ['--no-sandbox'],
    },
  },
});
