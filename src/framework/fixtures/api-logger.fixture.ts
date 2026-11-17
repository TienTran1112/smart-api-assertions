import { test as base } from '@playwright/test';
import { ApiLogger } from '../api/api-logger';

export interface ApiLoggerFixtures {
  apiLogger: ApiLogger;
}

/**
 * Auto fixture: one `ApiLogger` per test. When the test does not end as expected, the
 * redacted HTTP activity is attached to the report as `api-activity`.
 */
export const test = base.extend<ApiLoggerFixtures>({
  apiLogger: [
    async ({}, use, testInfo) => {
      const apiLogger = new ApiLogger();
      await use(apiLogger);
      if (testInfo.status !== testInfo.expectedStatus && apiLogger.getEntries().length > 0) {
        await testInfo.attach('api-activity', {
          body: apiLogger.toJson(),
          contentType: 'application/json',
        });
      }
    },
    { auto: true },
  ],
});

export { expect } from '@playwright/test';
