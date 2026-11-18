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
