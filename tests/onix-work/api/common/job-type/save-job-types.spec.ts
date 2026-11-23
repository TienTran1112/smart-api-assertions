import { resolve } from 'node:path';
import { test } from '@onix-work/fixtures/onix-work-api.fixture';
import { MAX_STORED_ITEMS, saveLookupResponses } from '../saved-lookup-response';

/** Relative to the repo root, where every npm script runs. */
const SAVED_JOB_TYPES_FILE = resolve(
  'tests/onix-work/api/common/job-type/responses/job-types.response.json',
);

/**
 * Saves the actual `GET /v1/company/job-types` bodies (job types) to
 * `responses/job-types.response.json`, one case per languageCode (default, 0, 1..15).
 * A list longer than MAX_STORED_ITEMS is cut to that many, sorted by `key` descending.
 * Run on purpose with `npm run save:responses`; `npm run test:api` skips it (`@capture`).
 * Stored GET data is not an expected result; review the change with `git diff` before committing.
 */
test.describe('Save job-types responses', { tag: ['@capture', '@save-response'] }, () => {
  test(`GET /v1/company/job-types: save every language case (max ${MAX_STORED_ITEMS} items)`, async ({
    api,
  }) => {
    const client = api.withAccount().clients.jobType;

    await saveLookupResponses({
      endpoint: 'GET /v1/company/job-types',
      file: SAVED_JOB_TYPES_FILE,
      sortBy: 'key',
      get: (languageCode) => client.getJobTypesResponse(languageCode),
    });
  });
});
