import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { ApiResult } from '@framework/api/api-result';
import { redactSecrets } from '@framework/api/api-logger';
import { limitList } from '@framework/data/limit-list';
import { findLanguage, UNSUPPORTED_LANGUAGE_CODE } from '@onix-work/language/language-code';

/**
 * Stored GET data for `languageCode` lookup lists (`GET /v1/company/properties`,
 * `GET /v1/company/job-types`). Written only by `npm run save:responses`. It is the record of
 * what the API returned, not an expected result: nothing compares against it.
 *
 * A list body with more than `MAX_STORED_ITEMS` items is cut to `MAX_STORED_ITEMS`, sorted
 * descending by the endpoint's `sortBy` (see `limitList`); `totalCount`, `storedCount` and
 * `order` in each case say whether that happened.
 */
export const MAX_STORED_ITEMS = 20;

/** Highest `languageCode` saved; 0 and 1..this are all tried, whatever status they return. */
export const MAX_SAVED_LANGUAGE_CODE = 15;

export interface SavedLookupCase {
  name: string;
  /** `null` = `languageCode` left out (server default). */
  languageCode: number | null;
  status: number;
  contentType: string | null;
  totalCount: number | null;
  storedCount: number | null;
  order: string;
  body: unknown;
}

export interface SavedLookupFile {
  endpoint: string;
  auth: string;
  savedAt: string;
  maxStoredItems: number;
  /** The property a list longer than `maxStoredItems` is sorted by, descending. */
  sortBy: string;
  cases: SavedLookupCase[];
}

const caseName = (languageCode: number): string =>
  findLanguage(languageCode)?.languageName ??
  (languageCode === UNSUPPORTED_LANGUAGE_CODE ? 'unsupported' : `languageCode=${languageCode}`);

/** The requests that are saved, in file order: default, then 0 and 1..MAX_SAVED_LANGUAGE_CODE. */
export const SAVED_LOOKUP_REQUESTS: { name: string; languageCode: number | null }[] = [
  { name: 'default', languageCode: null },
  ...[0, ...Array.from({ length: MAX_SAVED_LANGUAGE_CODE }, (_, index) => index + 1)].map(
    (languageCode) => ({ name: caseName(languageCode), languageCode }),
  ),
];

export interface SaveLookupOptions {
  /** e.g. `GET /v1/company/job-types`. */
  endpoint: string;
  /** Absolute path of the `.response.json` file. */
  file: string;
  sortBy: string;
  get: (languageCode?: number) => Promise<ApiResult<unknown>>;
}

/** Calls the endpoint for every request in `SAVED_LOOKUP_REQUESTS` and writes the file. */
export async function saveLookupResponses(options: SaveLookupOptions): Promise<SavedLookupFile> {
  const cases: SavedLookupCase[] = [];
  for (const request of SAVED_LOOKUP_REQUESTS) {
    const response = await options.get(request.languageCode ?? undefined);
    const limited = limitList(redactSecrets(response.body) ?? null, {
      limit: MAX_STORED_ITEMS,
      sortBy: options.sortBy,
    });
    cases.push({
      name: request.name,
      languageCode: request.languageCode,
      status: response.status,
      contentType: response.headers['content-type'] ?? null,
      totalCount: limited.totalCount,
      storedCount: limited.storedCount,
      order: limited.order,
      body: limited.body,
    });
  }

  const file: SavedLookupFile = {
    endpoint: options.endpoint,
    auth: 'Bearer (.env account)',
    savedAt: new Date().toISOString(),
    maxStoredItems: MAX_STORED_ITEMS,
    sortBy: options.sortBy,
    cases,
  };
  mkdirSync(dirname(options.file), { recursive: true });
  writeFileSync(options.file, `${JSON.stringify(file, null, 2)}\n`, 'utf8');
  return file;
}
