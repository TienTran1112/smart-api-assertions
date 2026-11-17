import { defineConfig } from '@playwright/test';
import { runtimeConfig } from './src/framework/config/runtime.config';

/**
 * Live tests: real Onix Work test API (and, from W2, the real LLM judge).
 * API only: no browser is downloaded or launched.
 */
export default defineConfig({
  testDir: './tests',
  testMatch: '**/api/**/*.spec.ts',
  testIgnore: '**/unit/**',
  // One worker: one login per run, and no parallel calls that could hit rate limits.
  workers: 1,
  retries: 0,
  timeout: 60_000,
  forbidOnly: !!process.env.CI,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: runtimeConfig.onixWorkApiBaseUrl,
    ignoreHTTPSErrors: !runtimeConfig.verifyTls,
    extraHTTPHeaders: { Accept: 'application/json' },
  },
});
