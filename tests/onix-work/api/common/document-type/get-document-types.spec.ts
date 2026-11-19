import {
  compareLookupList,
  EMPTY_LOOKUP_LIST_DIFF,
} from '@framework/assertions/compare-lookup-list';
import type { DocumentTypeResponse } from '@onix-work/api/public/models/common/document-type.response';
import type { ApiValidationErrorResponse } from '@onix-work/api/public/models/errors/api-validation-error.response';
import { expect, test } from '@onix-work/fixtures/onix-work-api.fixture';
import { LANGUAGE_CODES_ENV, selectLanguageCases } from './document-type.language-selection';
import {
  DEFAULT_LANGUAGE_CODE,
  DOCUMENT_TYPE_KEYS,
  UNSUPPORTED_LANGUAGE_CODE,
  UNSUPPORTED_LANGUAGE_ERROR,
} from './document-type.test-data';

/** The languages `npm run test:api` asked for (all when the variable is unset or empty). */
const LANGUAGE_CASES = selectLanguageCases(process.env[LANGUAGE_CODES_ENV]);

/**
 * Live: compares the live response with the expected test data (FILE 1). Never writes the
 * saved response (FILE 2); that is `npm run save:responses`.
 * `npm run test:api` asks which languageCodes to run; see `selectLanguageCases`.
 */
test.describe('GET /v1/company/document-types', { tag: ['@p1', '@live', '@regression'] }, () => {
  const sortedIds = (body: DocumentTypeResponse[]) =>
    body.map((documentType) => documentType.documentTypeId).sort((a, b) => a - b);

  for (const language of LANGUAGE_CASES) {
    test(`should return expected descriptions in ${language.languageName} (languageCode=${language.languageCode})`, async ({
      api,
    }, testInfo) => {
      const client = api.withAccount().clients.documentType;

      const response = await client.getDocumentTypesResponse<DocumentTypeResponse[]>(
        language.languageCode,
      );

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('application/json');

      const diff = compareLookupList(
        language.expectedDescriptions,
        response.body,
        DOCUMENT_TYPE_KEYS,
      );
      await testInfo.attach('document-types-diff.json', {
        body: JSON.stringify(diff, null, 2),
        contentType: 'application/json',
      });
      expect(diff, `live ${language.languageName} body differs from the test data`).toEqual(
        EMPTY_LOOKUP_LIST_DIFF,
      );
    });
  }

  test(
    'should return English document types when languageCode is omitted',
    { tag: '@smoke' },
    async ({ api }) => {
      const client = api.withAccount().clients.documentType;

      const defaultResponse = await client.getDocumentTypesResponse<DocumentTypeResponse[]>();
      const englishResponse =
        await client.getDocumentTypesResponse<DocumentTypeResponse[]>(DEFAULT_LANGUAGE_CODE);

      expect(defaultResponse.status).toBe(200);
      expect(englishResponse.status).toBe(200);
      expect(defaultResponse.body).toEqual(englishResponse.body);
    },
  );

  test('should return the same document type ids in every selected language', async ({ api }) => {
    const client = api.withAccount().clients.documentType;

    const english =
      await client.getDocumentTypesResponse<DocumentTypeResponse[]>(DEFAULT_LANGUAGE_CODE);
    expect(english.status).toBe(200);
    const englishIds = sortedIds(english.body);

    for (const language of LANGUAGE_CASES) {
      if (language.languageCode === DEFAULT_LANGUAGE_CODE) {
        continue;
      }
      const response = await client.getDocumentTypesResponse<DocumentTypeResponse[]>(
        language.languageCode,
      );
      expect(response.status, language.languageName).toBe(200);
      expect(sortedIds(response.body), language.languageName).toEqual(englishIds);
    }
  });

  test('should reject unsupported languageCode', async ({ api }) => {
    const client = api.withAccount().clients.documentType;

    const response =
      await client.getDocumentTypesResponse<ApiValidationErrorResponse>(UNSUPPORTED_LANGUAGE_CODE);

    expect(response.status).toBe(400);
    expect(response.headers['content-type']).toContain('application/json');
    expect(response.body).toEqual(UNSUPPORTED_LANGUAGE_ERROR);
  });
});
