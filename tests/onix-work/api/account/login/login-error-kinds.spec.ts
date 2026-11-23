import { classifyTokenError } from '@onix-work/api/public/errors/classify-token-error';
import { expect, test } from '@onix-work/fixtures/onix-work-api.fixture';
import { TOKEN_ERROR_KIND_CASES } from './login.test-data';

/**
 * Live: each bad token request gets the reason `classifyTokenError` expects. If the server
 * changes an error shape, the failing case shows which rule in the classifier to update.
 * Only made-up usernames are sent, so no real account collects failed logins.
 */
test.describe(
  'POST /v1/Account/token error kinds',
  { tag: ['@p2', '@live', '@regression'] },
  () => {
    for (const testCase of TOKEN_ERROR_KIND_CASES) {
      test(`should classify ${testCase.name} as ${testCase.kind}`, async ({ api }, testInfo) => {
        const accountClient = api.anonymous().clients.account;

        const response = await accountClient.getTokenResponse(testCase.body, testCase.headers);
        const classification = classifyTokenError(response);

        await testInfo.attach('classification.json', {
          body: JSON.stringify(classification, null, 2),
          contentType: 'application/json',
        });
        expect(response.status).toBe(testCase.status);
        expect(classification.kind, classification.description).toBe(testCase.kind);
        if (testCase.fields) {
          expect(classification.problems.map((problem) => problem.field)).toEqual(testCase.fields);
        }
      });
    }
  },
);
