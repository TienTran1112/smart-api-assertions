import { expect, test } from '@playwright/test';
import { ApiLogger, REDACTED, REDACTED_JWT, redactSecrets } from '@framework/api/api-logger';

const FAKE_JWT =
  'eyJhbGciOiJIUzI1NiJ9.eyJ1c2VybmFtZSI6InFhQGV4YW1wbGUuY29tIiwiZXhwIjo0MTAyNDQ0ODAwfQ.c2lnbmF0dXJl';

test.describe('redactSecrets', () => {
  test('should hide auth headers and password fields', () => {
    const redacted = redactSecrets({
      headers: { Authorization: `Bearer ${FAKE_JWT}`, accept: 'application/json' },
      body: { username: 'qa.user@example.com', password: 'secret-1' },
    });

    expect(redacted).toEqual({
      headers: { Authorization: REDACTED, accept: 'application/json' },
      body: { username: 'qa.user@example.com', password: REDACTED },
    });
  });

  test('should hide a bare JWT string with no key (the login response body)', () => {
    expect(redactSecrets(FAKE_JWT)).toBe(REDACTED_JWT);
    expect(redactSecrets({ responseBody: FAKE_JWT })).toEqual({ responseBody: REDACTED_JWT });
  });

  test('should keep validation messages under a "Password" key readable', () => {
    const errors = { Password: ['The Password field is required.'] };

    expect(redactSecrets(errors)).toEqual(errors);
  });

  test('should hide a password inside a raw (malformed) JSON string', () => {
    const raw = '{"username": "qa", "password": "p\\"w"';

    expect(redactSecrets(raw)).toBe(`{"username": "qa", "password": "${REDACTED}"`);
  });

  test('should not touch ordinary text that has dots', () => {
    const text = 'See https://openapi-test.onixwork.com/v1.0/x.y for details.';

    expect(redactSecrets(text)).toBe(text);
  });
});

test.describe('ApiLogger', () => {
  test('should store redacted entries', () => {
    const logger = new ApiLogger();

    logger.log({
      method: 'POST',
      url: 'https://example.test/v1/Account/token',
      requestHeaders: { Authorization: 'Key abc' },
      requestBody: { username: 'qa', password: 'pw' },
      status: 200,
      responseHeaders: {},
      responseBody: FAKE_JWT,
      durationMs: 5,
    });

    const [entry] = logger.getEntries();
    expect(entry?.requestHeaders).toEqual({ Authorization: REDACTED });
    expect(entry?.requestBody).toEqual({ username: 'qa', password: REDACTED });
    expect(entry?.responseBody).toBe(REDACTED_JWT);
    expect(logger.toJson()).not.toContain('eyJ');
  });
});
