import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { redactSecrets } from '@framework/api/api-logger';
import { test } from '@onix-work/fixtures/onix-work-api.fixture';
import { CAPTURE_PROBES } from './capture-probes';

/**
 * Sends every probe in `capture-probes.ts` and saves the raw responses to
 * `data/raw/onix-capture-<date>.jsonl` (one line per probe). Not part of `test:api`;
 * run it on purpose with `npm run capture`.
 *
 * A 2xx body is not stored: the probes aim at errors, and a success body may hold company data.
 */
const OUTPUT_FILE = resolve(
  'data/raw',
  `onix-capture-${new Date().toISOString().slice(0, 10)}.jsonl`,
);

test.describe('Capture Onix error responses', { tag: '@capture' }, () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(() => {
    mkdirSync(dirname(OUTPUT_FILE), { recursive: true });
    writeFileSync(OUTPUT_FILE, '');
  });

  for (const probe of CAPTURE_PROBES) {
    test(`${probe.id}: ${probe.endpoint} (${probe.trigger})`, async ({ api }) => {
      const identity = probe.auth === 'anonymous' ? api.anonymous() : api.withAccount();

      const response = await identity.clients.probe.sendResponse(probe.request);

      const isSuccess = response.status >= 200 && response.status < 300;
      const record = {
        id: probe.id,
        endpoint: probe.endpoint,
        trigger: probe.trigger,
        auth: probe.auth,
        method: probe.request.method,
        path: probe.request.path,
        params: probe.request.params ?? null,
        status: response.status,
        contentType: response.headers['content-type'] ?? null,
        body: isSuccess ? '[2xx body not stored]' : (redactSecrets(response.body) ?? null),
        capturedAt: new Date().toISOString(),
      };
      appendFileSync(OUTPUT_FILE, `${JSON.stringify(record)}\n`);
    });
  }
});
