/**
 * `npm run test:api`: asks which languageCodes to run (shared by every spec that loops over
 * languages, see src/apps/onix-work/language/), then runs the live API suite
 * (`playwright test -c playwright.api.config.ts --grep-invert @capture`) with the answer in
 * ONIX_LANGUAGE_CODES. Extra arguments are passed on: `npm run test:api -- --grep @smoke`.
 *
 * No question is asked when ONIX_LANGUAGE_CODES is already set or CI is set. Press Enter for
 * all languages; when there is no keyboard (stdin closed), all languages run.
 *
 * `--subscription` (used by `npm run test:api:subscription`) sets JUDGE_BACKEND=claude-code: the
 * judge runs through Claude Code on the Pro/Max subscription instead of the API key (dev only).
 */
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { createInterface } from 'node:readline';
import { ONIX_LANGUAGES } from '@onix-work/language/language-code';
import { LANGUAGE_CODES_ENV, selectLanguages } from '@onix-work/language/language-selection';

const PLAYWRIGHT_CLI = resolve('node_modules/@playwright/test/cli.js');

async function askLanguageCodes(): Promise<string> {
  console.log('Which languageCode(s)? (every spec that loops over languages)');
  for (const language of ONIX_LANGUAGES) {
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
        selectLanguages(answer);
        return answer;
      } catch (error) {
        console.log((error as Error).message);
      }
    }
  } finally {
    reader.close();
  }
}

const SUBSCRIPTION_FLAG = '--subscription';

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const subscription = args.includes(SUBSCRIPTION_FLAG);
  const playwrightArgs = args.filter((arg) => arg !== SUBSCRIPTION_FLAG);
  const preset = process.env[LANGUAGE_CODES_ENV];
  const answer = preset ?? (process.env.CI ? '' : await askLanguageCodes());

  const selected = selectLanguages(answer);
  const all = selected.length === ONIX_LANGUAGES.length;
  if (subscription)
    console.log('Judge: Claude Code on the subscription (JUDGE_BACKEND=claude-code)');
  console.log(
    `Languages: ${
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
      ...playwrightArgs,
    ],
    {
      stdio: 'inherit',
      env: {
        ...process.env,
        [LANGUAGE_CODES_ENV]: all ? '' : selected.map((l) => l.languageCode).join(','),
        ...(subscription ? { JUDGE_BACKEND: 'claude-code' } : {}),
      },
    },
  );
  child.on('exit', (code, signal) => process.exit(code ?? (signal ? 1 : 0)));
}

main().catch((error: unknown) => {
  console.error((error as Error).message);
  process.exit(1);
});
