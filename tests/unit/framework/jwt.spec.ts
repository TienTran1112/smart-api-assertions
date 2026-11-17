import { expect, test } from '@playwright/test';
import { decodeJwtPayload, getJwtExpiryMs, isJwt } from '@framework/api/auth/jwt';

function makeJwt(payload: object): string {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'HS256' })}.${encode(payload)}.signature`;
}

test.describe('jwt', () => {
  test('should recognise a JWT and reject other strings', () => {
    expect(isJwt(makeJwt({ exp: 1 }))).toBe(true);
    expect(isJwt('not a token')).toBe(false);
    expect(isJwt('a.b')).toBe(false);
    expect(isJwt(42)).toBe(false);
  });

  test('should decode the payload claims', () => {
    const token = makeJwt({ username: 'qa', companyId: 7, exp: 4102444800 });

    expect(decodeJwtPayload(token)).toEqual({ username: 'qa', companyId: 7, exp: 4102444800 });
  });

  test('should return the expiry in milliseconds', () => {
    expect(getJwtExpiryMs(makeJwt({ exp: 4102444800 }))).toBe(4102444800 * 1000);
  });

  test('should throw when exp is missing', () => {
    expect(() => getJwtExpiryMs(makeJwt({ username: 'qa' }))).toThrow(/exp/);
  });
});
