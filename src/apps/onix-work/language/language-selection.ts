import { findLanguage, ONIX_LANGUAGES, type OnixLanguage } from './language-code';

/**
 * Which languages a live run covers, for every spec that loops over `languageCode`.
 * `npm run test:api` (scripts/test-api.ts) asks once and passes the answer in
 * LANGUAGE_CODES_ENV; unset or empty = every language. In a spec:
 *
 *   for (const language of selectedLanguages()) { test(`… ${language.languageName}`, …) }
 */
export const LANGUAGE_CODES_ENV = 'ONIX_LANGUAGE_CODES';

/**
 * Picks languages from text like `1,3`, `1 3`, `4-13` or `all`. Empty or `all` gives every
 * language. Throws on anything that is not a supported `languageCode`, listing the valid ones.
 */
export function selectLanguages(input: string | undefined): readonly OnixLanguage[] {
  const text = (input ?? '').trim().toLowerCase();
  if (text === '' || text === 'all') {
    return ONIX_LANGUAGES;
  }

  const known = ONIX_LANGUAGES.map(
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

  const unknown = [...codes].filter((code) => findLanguage(code) === undefined);
  if (unknown.length > 0) {
    fail(`No supported language for languageCode ${unknown.join(', ')}`);
  }
  return ONIX_LANGUAGES.filter((language) => codes.has(language.languageCode));
}

/** The languages chosen for this run (from LANGUAGE_CODES_ENV). */
export function selectedLanguages(): readonly OnixLanguage[] {
  return selectLanguages(process.env[LANGUAGE_CODES_ENV]);
}
