import type { TokenRequest } from '@onix-work/api/public/models/account/token.request';
import type { TokenErrorKind } from '@onix-work/api/public/errors/classify-token-error';

export const PROBLEM_JSON = 'application/problem+json';

/** An account that does not exist: the server answers like a wrong password. */
export const UNKNOWN_USER_CREDENTIALS: TokenRequest = {
  username: 'qa.user@example.com',
  password: 'wrong',
};

/** Both fields empty: the server answers with field validation messages. */
export const EMPTY_CREDENTIALS: TokenRequest = {
  username: '',
  password: '',
};

/** Rubrics for the semantic checks (a rubric is test data, not code). Same text as the Python prototype. */
export const WRONG_PASSWORD_CRITERIA = {
  criteria:
    'MUST NOT reveal whether the username exists. ' +
    'MUST NOT include stack traces or internal error details.',
  context: 'Error title returned by a login endpoint after a wrong password.',
};

export const EMPTY_FIELDS_CRITERIA = {
  criteria:
    'Tells the user that the username is required. Tells the user that the password is required.',
  context: 'Validation messages returned by a login endpoint when both fields are empty.',
};

export interface TokenErrorKindCase {
  name: string;
  /** An object is sent as JSON; a string is sent raw with `headers`. */
  body: TokenRequest | string;
  headers: Record<string, string>;
  status: number;
  kind: TokenErrorKind;
  /** The `field` of each problem, in the server's order (checked when given). */
  fields?: (string | undefined)[];
}

const JSON_BODY = { 'Content-Type': 'application/json' };

/** Bad token requests and the reason each one gets (observed live 2026-11-22). */
export const TOKEN_ERROR_KIND_CASES: TokenErrorKindCase[] = [
  {
    name: 'an unknown user',
    body: UNKNOWN_USER_CREDENTIALS,
    headers: {},
    status: 400,
    kind: 'credentials-rejected',
  },
  {
    name: 'an extra JSON property',
    body: JSON.stringify({ ...UNKNOWN_USER_CREDENTIALS, rememberMe: true }),
    headers: JSON_BODY,
    status: 400,
    kind: 'credentials-rejected',
  },
  {
    name: 'empty fields',
    body: EMPTY_CREDENTIALS,
    headers: {},
    status: 400,
    kind: 'field-required',
    fields: ['password', 'username'],
  },
  {
    name: 'a missing password',
    body: JSON.stringify({ username: UNKNOWN_USER_CREDENTIALS.username }),
    headers: JSON_BODY,
    status: 400,
    kind: 'field-required',
    fields: ['password'],
  },
  {
    name: 'a 101-character username',
    body: { username: 'a'.repeat(101), password: UNKNOWN_USER_CREDENTIALS.password },
    headers: {},
    status: 400,
    kind: 'field-too-long',
    fields: ['username'],
  },
  {
    name: 'an empty body',
    body: '',
    headers: JSON_BODY,
    status: 400,
    kind: 'body-missing',
  },
  {
    name: 'truncated JSON',
    body: '{"username":',
    headers: JSON_BODY,
    status: 400,
    kind: 'malformed-json',
  },
  {
    name: 'a number for username',
    body: '{"username":123,"password":"x"}',
    headers: JSON_BODY,
    status: 400,
    kind: 'wrong-field-type',
    fields: ['username'],
  },
  {
    name: 'an array body',
    body: '[]',
    headers: JSON_BODY,
    status: 400,
    kind: 'wrong-field-type',
    fields: [undefined],
  },
  {
    name: 'a text/plain body',
    body: 'x',
    headers: { 'Content-Type': 'text/plain' },
    status: 415,
    kind: 'unsupported-media-type',
  },
];
