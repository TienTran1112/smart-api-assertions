import { defineConfig } from '@playwright/test';

/**
 * Offline unit tests: no Onix, no LLM, no API keys. This is the default (`npm test`).
 */
export default defineConfig({
  testDir: './tests/unit',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: [['list']],
});
