import { decodeJwtPayload } from '@framework/api/auth/jwt';
import { getOnixWorkCredentials } from '@onix-work/api/auth/onix-work-credentials';
import { expect, test } from '@onix-work/fixtures/onix-work-api.fixture';

test.describe('POST /v1/Account/token', { tag: ['@p1', '@live', '@smoke'] }, () => {
  test('should return a JWT for a valid account', async ({ api }) => {
    const accountClient = api.anonymous().clients.account;

    const response = await accountClient.getTokenResponse<string>(getOnixWorkCredentials());

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('application/json');
    expect(typeof response.body).toBe('string');
    expect(response.body.split('.')).toHaveLength(3);

    const claims = decodeJwtPayload(response.body);
    expect(claims).toEqual(
      expect.objectContaining({
        username: expect.any(String),
        contactId: expect.anything(),
        companyId: expect.anything(),
        exp: expect.any(Number),
        iss: expect.any(String),
        aud: expect.anything(),
      }),
    );
    expect((claims.exp as number) * 1000).toBeGreaterThan(Date.now());
  });

  test('getToken() should return a JWT for setup steps', async ({ api }) => {
    const accountClient = api.anonymous().clients.account;

    const token = await accountClient.getToken(getOnixWorkCredentials());

    expect(token.split('.')).toHaveLength(3);
  });
});
