import { existsSync, readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import {
  compareLookupList,
  EMPTY_LOOKUP_LIST_DIFF,
} from '@framework/assertions/compare-lookup-list';
import {
  SAVED_RESPONSE_FILE,
  type SavedDocumentTypesFile,
  type SavedResponseCase,
} from '@tests/onix-work/api/common/document-type/document-type.saved-response';
import {
  DOCUMENT_TYPE_KEYS,
  DOCUMENT_TYPE_LANGUAGE_CASES,
  UNSUPPORTED_LANGUAGE_CODE,
  UNSUPPORTED_LANGUAGE_ERROR,
} from '@tests/onix-work/api/common/document-type/document-type.test-data';

/**
 * Offline: compares the saved response (FILE 2, `responses/document-types.response.json`) with
 * the expected test data (FILE 1, `document-type.test-data.ts`). No network.
 * Refresh FILE 2 with `npm run save:responses`.
 */
test.describe('GET /v1/company/document-types: saved response vs test data', () => {
  test.skip(!existsSync(SAVED_RESPONSE_FILE), 'No saved response yet: run npm run save:responses');

  const load = (): SavedDocumentTypesFile =>
    JSON.parse(readFileSync(SAVED_RESPONSE_FILE, 'utf8')) as SavedDocumentTypesFile;

  const findCase = (
    file: SavedDocumentTypesFile,
    languageCode: number | null,
  ): SavedResponseCase => {
    const found = file.cases.find((savedCase) => savedCase.languageCode === languageCode);
    expect(found, `saved file has no case for languageCode=${languageCode}`).toBeDefined();
    return found as SavedResponseCase;
  };

  const sortedIds = (body: unknown) =>
    (body as { documentTypeId: number }[]).map((item) => item.documentTypeId).sort((a, b) => a - b);

  for (const language of DOCUMENT_TYPE_LANGUAGE_CASES) {
    test(`${language.languageName} (languageCode=${language.languageCode}) matches the expected descriptions`, async ({}, testInfo) => {
      const saved = findCase(load(), language.languageCode);

      expect(saved.status).toBe(200);
      expect(saved.contentType).toContain('application/json');

      const diff = compareLookupList(language.expectedDescriptions, saved.body, DOCUMENT_TYPE_KEYS);
      await testInfo.attach('document-types-diff.json', {
        body: JSON.stringify(diff, null, 2),
        contentType: 'application/json',
      });
      expect(diff, `saved ${language.languageName} body differs from the test data`).toEqual(
        EMPTY_LOOKUP_LIST_DIFF,
      );
    });
  }

  test('languageCode left out returns the same body as English', () => {
    const file = load();

    expect(findCase(file, null).body).toEqual(findCase(file, 1).body);
  });

  test('every language has the same document type ids', () => {
    const file = load();
    const englishIds = sortedIds(findCase(file, 1).body);

    for (const language of DOCUMENT_TYPE_LANGUAGE_CASES) {
      expect(sortedIds(findCase(file, language.languageCode).body), language.languageName).toEqual(
        englishIds,
      );
    }
  });

  test(`unsupported languageCode=${UNSUPPORTED_LANGUAGE_CODE} is rejected`, () => {
    const saved = findCase(load(), UNSUPPORTED_LANGUAGE_CODE);

    expect(saved.status).toBe(400);
    expect(saved.contentType).toContain('application/json');
    expect(saved.body).toEqual(UNSUPPORTED_LANGUAGE_ERROR);
  });
});
