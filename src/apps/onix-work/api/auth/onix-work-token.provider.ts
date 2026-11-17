import { getJwtExpiryMs } from '@framework/api/auth/jwt';
import type { AccountPublicApiClient } from '../public/clients/account/account-public-api.client';
import type { TokenRequest } from '../public/models/account/token.request';

/** Fetch a new token when less than this is left (Swagger says tokens live 60 minutes). */
const REFRESH_MARGIN_MS = 5 * 60 * 1000;

interface CachedToken {
  token: string;
  expiresAtMs: number;
}

/**
 * One cache per worker process (module state), keyed by username, so the whole run logs in
 * once per account instead of once per test.
 */
const tokenCache = new Map<string, CachedToken>();

/**
 * Logs in on first use and reuses the token until it is about to expire.
 * The expiry comes from the JWT's `exp` claim (the token has no `iat`, so no lifetime is assumed).
 */
export class OnixWorkTokenProvider {
  constructor(
    private readonly accountClient: AccountPublicApiClient,
    private readonly credentials: TokenRequest,
  ) {}

  async getToken(): Promise<string> {
    const cached = tokenCache.get(this.credentials.username);
    if (cached && cached.expiresAtMs - Date.now() > REFRESH_MARGIN_MS) {
      return cached.token;
    }

    const token = await this.accountClient.getToken(this.credentials);
    tokenCache.set(this.credentials.username, { token, expiresAtMs: getJwtExpiryMs(token) });
    return token;
  }
}
