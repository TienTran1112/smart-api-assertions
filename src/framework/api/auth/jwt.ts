/**
 * Minimal JWT reading (no signature check: we only need the claims of a token we were given).
 */

const JWT_PATTERN = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*$/;

export function isJwt(value: unknown): value is string {
  return typeof value === 'string' && JWT_PATTERN.test(value);
}

/** Decodes the payload (middle part) of a JWT. Throws if the value is not a JWT. */
export function decodeJwtPayload(token: string): Record<string, unknown> {
  if (!isJwt(token)) {
    throw new Error('Value is not a JWT (expected three base64url parts separated by dots).');
  }
  const payload = token.split('.')[1] as string;
  const decoded: unknown = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  if (typeof decoded !== 'object' || decoded === null || Array.isArray(decoded)) {
    throw new Error('JWT payload is not a JSON object.');
  }
  return decoded as Record<string, unknown>;
}

/** Expiry time of a JWT in epoch milliseconds, from its `exp` claim (seconds). */
export function getJwtExpiryMs(token: string): number {
  const { exp } = decodeJwtPayload(token);
  if (typeof exp !== 'number') {
    throw new Error('JWT has no numeric `exp` claim.');
  }
  return exp * 1000;
}
