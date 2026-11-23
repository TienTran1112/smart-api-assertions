/**
 * Language cases for `GET /v1/company/document-types`.
 *
 * GET rule (plan section 3.1): no expected result. The live spec checks status and content type
 * only; `npm run save:responses` stores the returned bodies in `responses/`. This file only names
 * the languages to call.
 */
export interface DocumentTypeLanguageTestCase {
  languageCode: number;
  languageName: string;
}

export const DEFAULT_LANGUAGE_CODE = 1;
export const UNSUPPORTED_LANGUAGE_CODE = 2;

export const DOCUMENT_TYPE_LANGUAGE_CASES: DocumentTypeLanguageTestCase[] = [
  { languageCode: 1, languageName: 'English' },
  { languageCode: 0, languageName: 'Norwegian' },
  { languageCode: 3, languageName: 'Swedish' },
  { languageCode: 4, languageName: 'Danish' },
  { languageCode: 5, languageName: 'Dutch' },
  { languageCode: 6, languageName: 'German' },
  { languageCode: 7, languageName: 'Spanish' },
  { languageCode: 8, languageName: 'Finnish' },
  { languageCode: 9, languageName: 'Portuguese' },
  { languageCode: 10, languageName: 'Estonian' },
  { languageCode: 11, languageName: 'Latvian' },
  { languageCode: 12, languageName: 'Lithuanian' },
  { languageCode: 13, languageName: 'Polish' },
];
