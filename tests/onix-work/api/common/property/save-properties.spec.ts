import { resolve } from 'node:path';
import { test } from '@onix-work/fixtures/onix-work-api.fixture';
import { MAX_STORED_ITEMS, saveLookupResponses } from '../saved-lookup-response';

/** Relative to the repo root, where every npm script runs. */
const SAVED_PROPERTIES_FILE = resolve(
  'tests/onix-work/api/common/property/responses/properties.response.json',
);

/**
 * Saves the actual `GET /v1/company/properties` bodies (equipment property names) to
 * `responses/properties.response.json`, one case per languageCode (default, 0, 1..15).
 * A list longer than MAX_STORED_ITEMS is cut to that many, sorted by `description` descending.
 * Run on purpose with `npm run save:responses`; `npm run test:api` skips it (`@capture`).
 * Stored GET data is not an expected result; review the change with `git diff` before committing.
 */
test.describe('Save properties responses', { tag: ['@capture', '@save-response'] }, () => {
  test(`GET /v1/company/properties: save every language case (max ${MAX_STORED_ITEMS} items)`, async ({
    api,
  }) => {
    const client = api.withAccount().clients.property;

    await saveLookupResponses({
      endpoint: 'GET /v1/company/properties',
      file: SAVED_PROPERTIES_FILE,
      sortBy: 'description',
      get: (languageCode) => client.getPropertiesResponse(languageCode),
    });
  });
});
