/**
 * Onix `languageCode` values, shared by every endpoint that takes the parameter
 * (`GET /v1/company/document-types` today). Codes 0, 1 and 3–13 return 200; 2, 14 and 15
 * return 400 `{ memberNames: ["languageCode"], errorMessage: "<code> invalid language" }`.
 */
export interface OnixLanguage {
  languageCode: number;
  languageName: string;
}

/** English is the server default when `languageCode` is left out. */
export const DEFAULT_LANGUAGE_CODE = 1;

/** A code the API rejects with 400. */
export const UNSUPPORTED_LANGUAGE_CODE = 2;

/** Every supported language, English first (test and prompt order). */
export const ONIX_LANGUAGES: readonly OnixLanguage[] = [
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

/** The language for a code, or `undefined` when the code is not supported. */
export function findLanguage(languageCode: number): OnixLanguage | undefined {
  return ONIX_LANGUAGES.find((language) => language.languageCode === languageCode);
}
