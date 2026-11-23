import { expect, test } from '@onix-work/fixtures/onix-work-api.fixture';
import { UNSUPPORTED_LANGUAGE_CODE } from '@onix-work/language/language-code';
import { selectedLanguages } from '@onix-work/language/language-selection';

/** The languages `npm run test:api` asked for (all when the variable is unset or empty). */
const LANGUAGES = selectedLanguages();

/**
 * Live. GET rule (plan section 3.1): no expected result, so only status and content type are
 * checked and the body is never compared. The returned data is stored by
 * `npm run save:responses` (save-document-types.spec.ts); this spec never writes it.
 * `npm run test:api` asks which languageCodes to run (`@onix-work/language/language-selection`).
 */
test.describe('GET /v1/company/document-types', { tag: ['@p1', '@live', '@regression'] }, () => {
  for (const language of LANGUAGES) {
    test(`should return JSON in ${language.languageName} (languageCode=${language.languageCode})`, async ({
      api,
    }) => {
      const client = api.withAccount().clients.documentType;

      const response = await client.getDocumentTypesResponse(language.languageCode);

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('application/json');
    });
  }

  test('should return JSON when languageCode is omitted', { tag: '@smoke' }, async ({ api }) => {
    const client = api.withAccount().clients.documentType;

    const response = await client.getDocumentTypesResponse();

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('application/json');
  });

  test('should reject unsupported languageCode', async ({ api }) => {
    const client = api.withAccount().clients.documentType;

    const response = await client.getDocumentTypesResponse(UNSUPPORTED_LANGUAGE_CODE);

    expect(response.status).toBe(400);
    expect(response.headers['content-type']).toContain('application/json');
  });
});
