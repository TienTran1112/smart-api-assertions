import { test as apiLoggerTest } from '@framework/fixtures/api-logger.fixture';
import { OnixWorkPublicApiProvider } from '../api/public/onix-work-public-api.provider';

export interface OnixWorkApiFixtures {
  api: OnixWorkPublicApiProvider;
}

/** `test` with the `api` fixture: a fresh provider per test, sharing the test's logger. */
export const test = apiLoggerTest.extend<OnixWorkApiFixtures>({
  api: async ({ request, apiLogger }, use) => {
    await use(new OnixWorkPublicApiProvider(request, apiLogger));
  },
});

// W8: switch to `export { expect } from '@smart-assert/playwright/matchers'` (adds toMeetCriteria).
export { expect } from '@playwright/test';
