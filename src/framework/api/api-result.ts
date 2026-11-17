/**
 * What every `getXxxResponse<T>()` returns. Never thrown on a bad status: the test decides.
 *
 * `body` is the parsed JSON when the response is JSON (a JSON string such as the login token
 * becomes a `string`), the raw text otherwise, and `undefined` when the body is empty
 * (401, 405, 415 on Onix).
 */
export interface ApiResult<T = unknown> {
  status: number;
  /** Response headers with lower-case names, e.g. `headers['content-type']`. */
  headers: Record<string, string>;
  body: T;
}
