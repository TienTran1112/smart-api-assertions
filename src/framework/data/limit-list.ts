/**
 * Caps a stored list body: a list longer than `limit` is sorted descending by `sortBy` and only
 * the first `limit` items are kept. A list of `limit` items or fewer is kept as returned, in the
 * server's order. A body that is not an array (an error body) is kept unchanged.
 *
 * Sorting uses an English collator with `numeric: true`, so `"14"` sorts above `"2"` and words
 * sort alphabetically (case and accents are compared, so the order is stable). Items with the
 * same value keep the server's order; items without `sortBy` sort last.
 */
export interface LimitListOptions {
  limit: number;
  /** The item property to sort by, e.g. `key` or `description`. */
  sortBy: string;
}

export interface LimitedList {
  body: unknown;
  /** Items the server returned (`null` when the body is not a list). */
  totalCount: number | null;
  /** Items kept in `body` (`null` when the body is not a list). */
  storedCount: number | null;
  /** `"as returned"`, or e.g. `"key desc"` when the list was cut. */
  order: string;
}

const collator = new Intl.Collator('en', { numeric: true, sensitivity: 'variant' });

export function limitList(body: unknown, { limit, sortBy }: LimitListOptions): LimitedList {
  if (!Array.isArray(body)) {
    return { body, totalCount: null, storedCount: null, order: 'as returned' };
  }
  if (body.length <= limit) {
    return { body, totalCount: body.length, storedCount: body.length, order: 'as returned' };
  }

  const sorted = [...body].sort((a, b) => compareDescending(readSortValue(a, sortBy), readSortValue(b, sortBy)));
  const kept = sorted.slice(0, limit);
  return { body: kept, totalCount: body.length, storedCount: kept.length, order: `${sortBy} desc` };
}

function readSortValue(item: unknown, sortBy: string): string | undefined {
  if (typeof item !== 'object' || item === null) return undefined;
  const value = (item as Record<string, unknown>)[sortBy];
  return value === undefined || value === null ? undefined : String(value);
}

function compareDescending(a: string | undefined, b: string | undefined): number {
  if (a === undefined || b === undefined) {
    return a === b ? 0 : a === undefined ? 1 : -1;
  }
  return collator.compare(b, a);
}
