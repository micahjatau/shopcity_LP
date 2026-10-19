import { defineConfig } from '@playwright/test';
import baseConfig from './playwright.config';

const inheritedIgnores = Array.isArray(baseConfig.testIgnore)
  ? baseConfig.testIgnore
  : baseConfig.testIgnore
    ? [baseConfig.testIgnore]
    : [];

export default defineConfig({
  ...baseConfig,
  testIgnore: [...inheritedIgnores, /tests\/visual-regression\.spec\.ts$/],
});
