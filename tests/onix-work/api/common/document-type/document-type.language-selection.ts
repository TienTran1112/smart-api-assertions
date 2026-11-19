import {
  DOCUMENT_TYPE_LANGUAGE_CASES,
  type DocumentTypeLanguageTestCase,
} from './document-type.test-data';

/**
 * Language selection for the live spec. `npm run test:api` (scripts/test-api.ts) asks for the
 * codes and passes them in LANGUAGE_CODES_ENV; unset or empty = every language.
 */

export const LANGUAGE_CODES_ENV = 'ONIX_LANGUAGE_CODES';

/**
 * Picks language cases from text like `1,3`, `1 3`, `4-13` or `all`. Empty or `all` gives every
 * case. Throws on anything that is not a known `languageCode`, listing the valid ones.
 */
export function selectLanguageCases(input: string | undefined): DocumentTypeLanguageTestCase[] {
  const text = (input ?? '').trim().toLowerCase();
  if (text === '' || text === 'all') {
    return DOCUMENT_TYPE_LANGUAGE_CASES;
  }

  const known = DOCUMENT_TYPE_LANGUAGE_CASES.map(
    (language) => `${language.languageCode} ${language.languageName}`,
  ).join(', ');
  const fail = (reason: string): never => {
    throw new Error(`${reason}. Choose from: ${known} (or press Enter for all)`);
  };

  const codes = new Set<number>();
  for (const part of text.split(/[\s,]+/)) {
    const range = /^(\d+)(?:-(\d+))?$/.exec(part);
    if (!range) {
      fail(`"${part}" is not a languageCode or a range like 4-13`);
    }
    const from = Number(range![1]);
    const to = range![2] === undefined ? from : Number(range![2]);
    if (to < from) {
      fail(`range "${part}" goes backwards`);
    }
    for (let code = from; code <= to; code++) {
      codes.add(code);
    }
  }

  const unknown = [...codes].filter(
    (code) => !DOCUMENT_TYPE_LANGUAGE_CASES.some((language) => language.languageCode === code),
  );
  if (unknown.length > 0) {
    fail(`No test data for languageCode ${unknown.join(', ')}`);
  }
  return DOCUMENT_TYPE_LANGUAGE_CASES.filter((language) => codes.has(language.languageCode));
}
