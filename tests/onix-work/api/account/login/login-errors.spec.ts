import type { ProblemDetailsResponse } from '@onix-work/api/public/models/errors/problem-details.response';
import type { ValidationProblemDetailsResponse } from '@onix-work/api/public/models/errors/validation-problem-details.response';
import { expect, test } from '@onix-work/fixtures/onix-work-api.fixture';
import { EMPTY_CREDENTIALS, PROBLEM_JSON, UNKNOWN_USER_CREDENTIALS } from './login.test-data';

/**
 * Real behavior (checked live 2026-11-10 and 2026-11-16):
 * - wrong password / unknown user → 400 problem+json, title "Bad Request", no message text
 * - empty fields → 400 problem+json, errors { Username, Password } with messages
 *
 * Deterministic checks only for now; the semantic check (LLM judge) is added last in W2.
 */
test.describe('POST /v1/Account/token', { tag: ['@p1', '@live', '@regression'] }, () => {
  test('should reject a wrong password without revealing the user', async ({ api }) => {
    const accountClient = api.anonymous().clients.account;

    const response =
      await accountClient.getTokenResponse<ProblemDetailsResponse>(UNKNOWN_USER_CREDENTIALS);

    expect(response.status).toBe(400);
    expect(response.headers['content-type']).toContain(PROBLEM_JSON);
    expect(response.body).toEqual({
      type: expect.any(String),
      title: expect.any(String),
      status: 400,
      traceId: expect.any(String),
    });
    expect(JSON.stringify(response.body)).not.toContain(UNKNOWN_USER_CREDENTIALS.username);

    // W2: await assertSemantic(response.body.title, { criteria: WRONG_PASSWORD_CRITERIA, ... })
  });

  test('should explain which fields are missing', async ({ api }) => {
    const accountClient = api.anonymous().clients.account;

    const response =
      await accountClient.getTokenResponse<ValidationProblemDetailsResponse>(EMPTY_CREDENTIALS);

    expect(response.status).toBe(400);
    expect(response.headers['content-type']).toContain(PROBLEM_JSON);
    expect(response.body).toEqual({
      type: expect.any(String),
      title: expect.any(String),
      status: 400,
      errors: expect.any(Object),
      traceId: expect.any(String),
    });
    expect(Object.keys(response.body.errors)).toEqual(
      expect.arrayContaining(['Username', 'Password']),
    );
    for (const messages of Object.values(response.body.errors)) {
      expect(messages).toEqual(expect.arrayContaining([expect.any(String)]));
    }

    // W2: const messages = Object.values(response.body.errors).flat().join('\n');
    //     await assertSemantic(messages, { criteria: EMPTY_FIELDS_CRITERIA, ... })
  });
});
