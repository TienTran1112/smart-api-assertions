/**
 * Compares a lookup-list response (`[{ <id>: 1, <text>: "Certificate" }, …]`) with the expected
 * `{ id: text }` table from a `*.test-data.ts` file, and returns every difference at once.
 *
 * - Items are matched by id, never by position: list order is not part of the contract.
 * - Texts must match exactly (no trim, no case folding), so a fixed typo or a re-worded label
 *   shows up in `changed`.
 * - Pure function: no Playwright, no I/O. Specs assert `expect(diff).toEqual(EMPTY_LOOKUP_LIST_DIFF)`
 *   so one failure prints the whole diff.
 */

export interface LookupListKeys {
  /** Property holding the integer id, e.g. `documentTypeId`. */
  idKey: string;
  /** Property holding the text, e.g. `description`. */
  textKey: string;
}

export interface ChangedText {
  id: number;
  expected: string;
  actual: string;
}

export interface LookupListDiff {
  /** Body is not an array, or an item is not exactly `{ <idKey>: integer, <textKey>: non-empty string }`. */
  shapeErrors: string[];
  /** Ids that appear more than once in the response. */
  duplicateIds: number[];
  /** In the expected table, not in the response. */
  missingIds: number[];
  /** In the response, not in the expected table. */
  extraIds: number[];
  /** Same id, different text. */
  changed: ChangedText[];
}

export const EMPTY_LOOKUP_LIST_DIFF: LookupListDiff = Object.freeze({
  shapeErrors: [],
  duplicateIds: [],
  missingIds: [],
  extraIds: [],
  changed: [],
}) as LookupListDiff;

const byNumber = (a: number, b: number) => a - b;

export function compareLookupList(
  expected: Record<number, string>,
  actual: unknown,
  keys: LookupListKeys,
): LookupListDiff {
  const { idKey, textKey } = keys;
  const expectedIds = Object.keys(expected).map(Number);
  const diff: LookupListDiff = {
    shapeErrors: [],
    duplicateIds: [],
    missingIds: [],
    extraIds: [],
    changed: [],
  };

  if (!Array.isArray(actual)) {
    diff.shapeErrors.push(`body is not an array (got ${describe(actual)})`);
    diff.missingIds = expectedIds.sort(byNumber);
    return diff;
  }

  // First occurrence of each valid id wins; later ones are reported as duplicates.
  const actualTexts = new Map<number, string>();
  const duplicates = new Set<number>();

  actual.forEach((item, index) => {
    if (item === null || typeof item !== 'object' || Array.isArray(item)) {
      diff.shapeErrors.push(`[${index}] is not an object (got ${describe(item)})`);
      return;
    }
    const record = item as Record<string, unknown>;
    const otherKeys = Object.keys(record).filter((key) => key !== idKey && key !== textKey);
    if (otherKeys.length > 0) {
      diff.shapeErrors.push(`[${index}] has unexpected properties: ${otherKeys.join(', ')}`);
    }

    const id = record[idKey];
    const text = record[textKey];
    if (!Number.isInteger(id)) {
      diff.shapeErrors.push(`[${index}].${idKey} is not an integer (got ${describe(id)})`);
      return;
    }
    if (typeof text !== 'string') {
      diff.shapeErrors.push(`[${index}].${textKey} is not a string (got ${describe(text)})`);
      return;
    }
    if (text.trim() === '') {
      diff.shapeErrors.push(`[${index}].${textKey} is empty`);
    }

    const numericId = id as number;
    if (actualTexts.has(numericId)) {
      duplicates.add(numericId);
      return;
    }
    actualTexts.set(numericId, text);
  });

  diff.duplicateIds = [...duplicates].sort(byNumber);
  diff.missingIds = expectedIds.filter((id) => !actualTexts.has(id)).sort(byNumber);
  diff.extraIds = [...actualTexts.keys()].filter((id) => !(id in expected)).sort(byNumber);
  diff.changed = expectedIds
    .filter((id) => actualTexts.has(id) && actualTexts.get(id) !== expected[id])
    .sort(byNumber)
    .map((id) => ({ id, expected: expected[id], actual: actualTexts.get(id) as string }));

  return diff;
}

function describe(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value === 'string' ? JSON.stringify(value) : typeof value;
}
