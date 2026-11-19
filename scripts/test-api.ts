/**
 * `npm run test:api`: asks which document-types languageCodes to run, then runs the live API
 * suite (`playwright test -c playwright.api.config.ts --grep-invert @capture`) with the answer in
 * ONIX_LANGUAGE_CODES. Extra arguments are passed on: `npm run test:api -- --grep @smoke`.
 *
 * No question is asked when ONIX_LANGUAGE_CODES is already set or CI is set. Press Enter for
 * all languages; when there is no keyboard (stdin closed), all languages run.
 */
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { createInterface } from 'node:readline';
import {
  DOCUMENT_TYPE_LANGUAGE_CASES,
  LANGUAGE_CODES_ENV,
  selectLanguageCases,
} from '../tests/onix-work/api/common/document-type/document-type.test-data';

const PLAYWRIGHT_CLI = resolve('node_modules/@playwright/test/cli.js');

async function askLanguageCodes(): Promise<string> {
  console.log('GET /v1/company/document-types: which languageCode(s)?');
  for (const language of DOCUMENT_TYPE_LANGUAGE_CASES) {
    console.log(`  ${String(language.languageCode).padStart(2)}  ${language.languageName}`);
  }

  // The line iterator buffers lines, so answers typed (or piped) ahead are not lost.
  const reader = createInterface({ input: process.stdin, output: process.stdout });
  const lines = reader[Symbol.asyncIterator]();
  try {
    for (;;) {
      process.stdout.write('languageCode (e.g. 1,3 or 4-13; Enter = all): ');
      const { value: answer, done } = await lines.next();
      if (done) {
        console.log('\n(no input: running all languages)');
        return '';
      }
      try {
        selectLanguageCases(answer);
        return answer;
      } catch (error) {
        console.log((error as Error).message);
      }
    }
  } finally {
    reader.close();
  }
}

async function main(): Promise<void> {
  const preset = process.env[LANGUAGE_CODES_ENV];
  const answer = preset ?? (process.env.CI ? '' : await askLanguageCodes());

  const selected = selectLanguageCases(answer);
  const all = selected.length === DOCUMENT_TYPE_LANGUAGE_CASES.length;
  console.log(
    `Running document-types for ${
      all
        ? 'all languages'
        : selected.map((l) => `${l.languageName} (${l.languageCode})`).join(', ')
    }\n`,
  );

  const child = spawn(
    process.execPath,
    [
      PLAYWRIGHT_CLI,
      'test',
      '-c',
      'playwright.api.config.ts',
      '--grep-invert',
      '@capture',
      ...process.argv.slice(2),
    ],
    {
      stdio: 'inherit',
      env: {
        ...process.env,
        [LANGUAGE_CODES_ENV]: all ? '' : selected.map((l) => l.languageCode).join(','),
      },
    },
  );
  child.on('exit', (code, signal) => process.exit(code ?? (signal ? 1 : 0)));
}

main().catch((error: unknown) => {
  console.error((error as Error).message);
  process.exit(1);
});
