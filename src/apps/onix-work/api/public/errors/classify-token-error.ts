import type { ApiResult } from '@framework/api/api-result';

/**
 * Why `POST /v1/Account/token` did not return a token, as far as the response can tell.
 *
 * Every 400 from this endpoint has the same `title` ("Bad Request"), so the reason is read from
 * the `errors` keys and messages instead. Observed live on 2026-11-22 (test host):
 *
 * | Request                                   | 400 body                                              | Kind                   |
 * |-------------------------------------------|-------------------------------------------------------|------------------------|
 * | wrong password / unknown user / extra prop | `{type,title,status,traceId}`, no `errors`            | `credentials-rejected` |
 * | empty or missing field                    | `errors.Username: ["The Username field is required."]` | `field-required`       |
 * | username over 100 characters              | `errors.Username: ["… maximum length of 100."]`        | `field-too-long`       |
 * | empty body                                | `errors[""]` + `errors.data`                          | `body-missing`         |
 * | malformed JSON                            | `errors["$…"]` (parser message) + `errors.data`       | `malformed-json`       |
 * | `{"username": 123}`                       | `errors["$.username"]: ["… could not be converted …"]` | `wrong-field-type`     |
 * | `[]` (body of the wrong type)             | `errors["$"]: ["… could not be converted …"]`         | `wrong-field-type`     |
 *
 * Other statuses: 415 and 405 have an empty body, 5xx is a server fault, and a network failure
 * throws before there is any status (pass the thrown error in).
 *
 * Limits:
 * - The server answers a wrong password, an unknown username and an extra JSON property the same
 *   way, on purpose (no user enumeration), so `credentials-rejected` cannot say which.
 * - Messages are matched on the server's English ASP.NET default texts; a message that matches
 *   nothing known is reported as `field-invalid` with the server's own text.
 */
export type TokenErrorKind =
  | 'ok'
  | 'unreachable'
  | 'server-error'
  | 'unauthorized'
  | 'method-not-allowed'
  | 'unsupported-media-type'
  | 'body-missing'
  | 'malformed-json'
  | 'wrong-field-type'
  | 'field-required'
  | 'field-too-long'
  | 'field-invalid'
  | 'credentials-rejected'
  | 'unexpected';

/** Why the server could not be reached (only for `unreachable`). */
export type UnreachableCause = 'dns' | 'refused' | 'timeout' | 'tls' | 'reset' | 'other';

export interface TokenProblem {
  kind: TokenErrorKind;
  /** Lower-case field name (`username`, `password`) when the problem is about one field. */
  field?: string;
  /** The server's message, or the network error message. */
  message: string;
}

export interface TokenErrorClassification {
  /** Missing when the request never got a response. */
  status?: number;
  /** The main reason: the first of `problems` by `KIND_PRIORITY`. */
  kind: TokenErrorKind;
  /** Every reason found, e.g. both `username` and `password` required. */
  problems: TokenProblem[];
  /** One readable sentence for logs and error messages. */
  description: string;
  cause?: UnreachableCause;
  /** The server's `traceId`, to quote in a defect report. */
  traceId?: string;
}

/** When a body has several problems, the one that stops the request earliest wins. */
const KIND_PRIORITY: TokenErrorKind[] = [
  'body-missing',
  'malformed-json',
  'wrong-field-type',
  'field-required',
  'field-too-long',
  'field-invalid',
];

const UNREACHABLE_PATTERNS: [UnreachableCause, RegExp][] = [
  ['dns', /ENOTFOUND|EAI_AGAIN|getaddrinfo/i],
  ['refused', /ECONNREFUSED/i],
  ['timeout', /ETIMEDOUT|timed? ?out|Timeout \d+ms exceeded/i],
  ['tls', /certificate|CERT_|SSL|TLS|self[- ]signed/i],
  ['reset', /ECONNRESET|socket hang up/i],
];

const UNREACHABLE_TEXT: Record<UnreachableCause, string> = {
  dns: 'the host name could not be resolved (DNS)',
  refused: 'the connection was refused (nothing listening on that host/port)',
  timeout: 'the request timed out',
  tls: 'the TLS/certificate check failed',
  reset: 'the connection was closed by the server or a proxy',
  other: 'the request failed before any response',
};

/** Classifies a token response, or the error thrown when there was no response. */
export function classifyTokenError(
  resultOrError: ApiResult<unknown> | Error,
): TokenErrorClassification {
  if (resultOrError instanceof Error) {
    return classifyNetworkError(resultOrError);
  }

  const { status, body } = resultOrError;
  const traceId = readTraceId(body);
  const only = (kind: TokenErrorKind, description: string): TokenErrorClassification => ({
    status,
    kind,
    problems: [{ kind, message: description }],
    description,
    ...(traceId ? { traceId } : {}),
  });

  if (status === 200) return { status, kind: 'ok', problems: [], description: 'Token issued.' };
  if (status >= 500) {
    return only('server-error', `Server error (HTTP ${status}); not caused by the request.`);
  }
  if (status === 401) {
    return only('unauthorized', 'HTTP 401: the endpoint asked for authentication.');
  }
  if (status === 405) {
    return only('method-not-allowed', 'HTTP 405: the token endpoint only accepts POST.');
  }
  if (status === 415) {
    return only(
      'unsupported-media-type',
      'HTTP 415: the body must be sent as Content-Type application/json.',
    );
  }
  if (status !== 400 || !isObject(body)) {
    return only('unexpected', `Unexpected response: HTTP ${status}.`);
  }

  const errors = body.errors;
  if (errors === undefined || (isObject(errors) && Object.keys(errors).length === 0)) {
    return only(
      'credentials-rejected',
      'Login rejected: wrong password, unknown username or an extra JSON property. ' +
        'The server does not say which.',
    );
  }
  if (!isObject(errors)) {
    return only('unexpected', 'HTTP 400 with an `errors` value that is not an object.');
  }

  const problems = readValidationProblems(errors);
  const kind = KIND_PRIORITY.find((k) => problems.some((p) => p.kind === k)) ?? 'unexpected';
  return {
    status,
    kind,
    problems,
    description: `Request rejected: ${problems.map(describeProblem).join('; ')}.`,
    ...(traceId ? { traceId } : {}),
  };
}

function classifyNetworkError(error: Error): TokenErrorClassification {
  const cause = UNREACHABLE_PATTERNS.find(([, pattern]) => pattern.test(error.message))?.[0];
  const reason = cause ?? 'other';
  return {
    kind: 'unreachable',
    cause: reason,
    problems: [{ kind: 'unreachable', message: error.message }],
    description: `Server not reached: ${UNREACHABLE_TEXT[reason]}.`,
  };
}

/**
 * Reads `errors` (key → messages). `data` is the action's parameter name: the server adds
 * "The data field is required." whenever the body could not be read at all, so it is only a
 * problem of its own when nothing else is reported.
 */
function readValidationProblems(errors: Record<string, unknown>): TokenProblem[] {
  const keys = Object.keys(errors);
  const relevant = keys.length > 1 ? keys.filter((key) => key !== 'data') : keys;
  return relevant.flatMap((key) =>
    toMessages(errors[key]).map((message) => classifyMessage(key, message)),
  );
}

function classifyMessage(key: string, message: string): TokenProblem {
  if (key === '' || key === 'data') return { kind: 'body-missing', message };

  // A JSON path: "$" is the whole body, "$.username" a property. A parser error is reported at
  // the path where parsing stopped, so truncated JSON can show up under "$.username" too.
  if (key.startsWith('$')) {
    const field = key.replace(/^\$\.?/, '').toLowerCase();
    const kind = /could not be converted/i.test(message) ? 'wrong-field-type' : 'malformed-json';
    return field ? { kind, field, message } : { kind, message };
  }

  const field = key.toLowerCase();
  if (/\bis required\b/i.test(message)) return { kind: 'field-required', field, message };
  if (/maximum length/i.test(message)) return { kind: 'field-too-long', field, message };
  return { kind: 'field-invalid', field, message };
}

function describeProblem(problem: TokenProblem): string {
  const field = problem.field ?? 'body';
  switch (problem.kind) {
    case 'body-missing':
      return 'request body is empty or missing';
    case 'malformed-json':
      return `body is not valid JSON${problem.field ? ` (breaks at ${problem.field})` : ''}: ${firstSentence(problem.message)}`;
    case 'wrong-field-type':
      return `${field} has the wrong JSON type (${firstSentence(problem.message)})`;
    case 'field-required':
      return `${field} is required`;
    case 'field-too-long':
      return `${field} is too long (${problem.message})`;
    default:
      return `${field}: ${problem.message}`;
  }
}

/** Server messages end with " Path: $ | LineNumber: …"; that tail is noise in a summary. */
function firstSentence(message: string): string {
  return message.split(/\s+Path:/)[0].trim();
}

function toMessages(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  return value === undefined || value === null ? [] : [String(value)];
}

function readTraceId(body: unknown): string | undefined {
  return isObject(body) && typeof body.traceId === 'string' ? body.traceId : undefined;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
