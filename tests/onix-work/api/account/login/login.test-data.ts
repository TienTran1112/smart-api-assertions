import type { TokenRequest } from '@onix-work/api/public/models/account/token.request';

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

// W2: add the criteria for the semantic checks here (a rubric is test data, not code), e.g.
// WRONG_PASSWORD_CRITERIA: must not reveal whether the username exists; no internal details.
// EMPTY_FIELDS_CRITERIA: says the username is required; says the password is required.
