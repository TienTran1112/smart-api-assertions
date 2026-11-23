import { resolve } from 'node:path';
import { DOCUMENT_TYPE_LANGUAGE_CASES, UNSUPPORTED_LANGUAGE_CODE } from './document-type.test-data';

/**
 * Stored GET data. Written only by `npm run save:responses`
 * (tests/onix-work/api/common/document-type/save-document-types.spec.ts). It is the record of what
 * the API returned, not an expected result: nothing compares against it.
 */

/** Relative to the repo root, where every npm script runs. */
export const SAVED_RESPONSE_FILE = resolve(
  'tests/onix-work/api/common/document-type/responses/document-types.response.json',
);

export interface SavedResponseCase {
  name: string;
  /** `null` = `languageCode` left out (server default). */
  languageCode: number | null;
  status: number;
  contentType: string | null;
  body: unknown;
}

export interface SavedDocumentTypesFile {
  endpoint: string;
  auth: string;
  savedAt: string;
  cases: SavedResponseCase[];
}

/** Highest `languageCode` the save step tries. Codes 1..this are all saved, whatever status they return. */
export const MAX_SAVED_LANGUAGE_CODE = 15;

/** 0 (Norwegian) plus 1..MAX_SAVED_LANGUAGE_CODE. */
export const SAVED_LANGUAGE_CODES: number[] = [
  0,
  ...Array.from({ length: MAX_SAVED_LANGUAGE_CODE }, (_, index) => index + 1),
];

const savedCaseName = (languageCode: number): string =>
  DOCUMENT_TYPE_LANGUAGE_CASES.find((language) => language.languageCode === languageCode)
    ?.languageName ??
  (languageCode === UNSUPPORTED_LANGUAGE_CODE ? 'unsupported' : `languageCode=${languageCode}`);

/** The requests that are saved, in file order: default, then each code in SAVED_LANGUAGE_CODES. */
export const SAVED_CASE_REQUESTS: { name: string; languageCode: number | null }[] = [
  { name: 'default', languageCode: null },
  ...SAVED_LANGUAGE_CODES.map((languageCode) => ({
    name: savedCaseName(languageCode),
    languageCode,
  })),
];
