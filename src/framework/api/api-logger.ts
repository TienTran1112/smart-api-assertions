/**
 * Records every HTTP call of a test, with secrets redacted, so a failed test can show what was
 * sent and received. This hides secrets in HTTP logs only; hiding personal data in text sent to
 * the LLM is a separate step (`smart-assert/redact.ts`).
 */

export interface ApiLogEntry {
  method: string;
  url: string;
  requestHeaders: Record<string, string>;
  requestBody?: unknown;
  status?: number;
  responseHeaders?: Record<string, string>;
  responseBody?: unknown;
  durationMs: number;
  error?: string;
}

export const REDACTED = '[REDACTED]';
export const REDACTED_JWT = '[REDACTED_JWT]';

/** Keys whose scalar value is always a secret (headers and JSON properties). */
const SECRET_KEY_PATTERN =
  /^(authorization|proxy-authorization|cookie|set-cookie|password|passwd|pwd|secret|client_?secret|token|access_?token|refresh_?token|id_?token|api[-_]?key|x-api-key)$/i;

/**
 * Any JWT inside any string. A JWT header is base64url of `{"…`, so it always starts with `eyJ`.
 * Needed because the Onix login response is a bare JSON string with no key: key-based
 * redaction alone would leave the token (and its username / contactId / companyId claims) in
 * the report.
 */
const JWT_IN_TEXT_PATTERN = /eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*/g;

/** `"password": "…"` inside raw text, e.g. a deliberately malformed JSON request body. */
const SECRET_PROPERTY_IN_TEXT_PATTERN =
  /("(?:password|passwd|pwd|secret|token|access_?token|refresh_?token|api_?key)"\s*:\s*)"(?:[^"\\]|\\.)*"/gi;

/**
 * Returns a deep copy of `value` with secrets replaced.
 * - A string or number under a secret key (`password`, `authorization`, …) becomes `[REDACTED]`.
 *   Arrays and objects under such a key are walked instead, so validation messages such as
 *   `errors.Password: ["The Password field is required."]` stay readable.
 * - Any JWT found inside any string becomes `[REDACTED_JWT]`.
 */
export function redactSecrets(value: unknown, key?: string): unknown {
  if (typeof value === 'string') {
    if (key !== undefined && SECRET_KEY_PATTERN.test(key)) {
      return REDACTED;
    }
    return value
      .replace(JWT_IN_TEXT_PATTERN, REDACTED_JWT)
      .replace(SECRET_PROPERTY_IN_TEXT_PATTERN, `$1"${REDACTED}"`);
  }
  if (typeof value === 'number' && key !== undefined && SECRET_KEY_PATTERN.test(key)) {
    return REDACTED;
  }
  if (Array.isArray(value)) {
    return value.map((item) => redactSecrets(item));
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([childKey, childValue]) => [
        childKey,
        redactSecrets(childValue, childKey),
      ]),
    );
  }
  return value;
}

export class ApiLogger {
  private readonly entries: ApiLogEntry[] = [];

  log(entry: ApiLogEntry): void {
    this.entries.push(redactSecrets(entry) as ApiLogEntry);
  }

  getEntries(): readonly ApiLogEntry[] {
    return this.entries;
  }

  toJson(): string {
    return JSON.stringify(this.entries, null, 2);
  }
}
