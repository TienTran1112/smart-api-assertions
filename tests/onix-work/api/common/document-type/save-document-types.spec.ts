import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { redactSecrets } from '@framework/api/api-logger';
import { test } from '@onix-work/fixtures/onix-work-api.fixture';
import {
  SAVED_CASE_REQUESTS,
  SAVED_RESPONSE_FILE,
  type SavedDocumentTypesFile,
  type SavedResponseCase,
} from './document-type.saved-response';

/**
 * Saves the actual `GET /v1/company/document-types` bodies to
 * `tests/onix-work/api/common/document-type/responses/document-types.response.json`.
 * GET rule (plan section 3.1): this stored data is not an expected result; nothing compares it.
 * Run on purpose with `npm run save:responses`; `npm run test:api` skips it (`@capture`).
 * Review the change with `git diff` before committing it.
 *
 * Unlike `../../capture/capture-responses.spec.ts`, this stores 2xx bodies: document types are a lookup list,
 * not company records. No username, token or header other than `content-type` is stored.
 */
test.describe('Save document-types responses', { tag: ['@capture', '@save-response'] }, () => {
  test('GET /v1/company/document-types: save every language case', async ({ api }) => {
    const client = api.withAccount().clients.documentType;
    const cases: SavedResponseCase[] = [];

    for (const request of SAVED_CASE_REQUESTS) {
      const response = await client.getDocumentTypesResponse(request.languageCode ?? undefined);
      cases.push({
        name: request.name,
        languageCode: request.languageCode,
        status: response.status,
        contentType: response.headers['content-type'] ?? null,
        body: redactSecrets(response.body) ?? null,
      });
    }

    const file: SavedDocumentTypesFile = {
      endpoint: 'GET /v1/company/document-types',
      auth: 'Bearer (.env account)',
      savedAt: new Date().toISOString(),
      cases,
    };

    mkdirSync(dirname(SAVED_RESPONSE_FILE), { recursive: true });
    writeFileSync(SAVED_RESPONSE_FILE, `${JSON.stringify(file, null, 2)}\n`, 'utf8');
  });
});
