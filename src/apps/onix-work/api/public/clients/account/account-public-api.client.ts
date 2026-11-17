import { BaseApiClient } from '@framework/api/base-api.client';
import type { ApiResult } from '@framework/api/api-result';
import { isJwt } from '@framework/api/auth/jwt';
import type { TokenRequest } from '../../models/account/token.request';

const TOKEN_PATH = 'v1/Account/token';

/** `POST /v1/Account/token`: exchange username + password for a short-lived JWT. */
export class AccountPublicApiClient extends BaseApiClient {
  /**
   * For tests: returns the full response and never throws on a status.
   * A `string` request is sent raw (e.g. malformed JSON); set its `Content-Type` via `headers`.
   */
  async getTokenResponse<T = unknown>(
    request: TokenRequest | string,
    headers: Record<string, string> = {},
  ): Promise<ApiResult<T>> {
    return this.request().path(TOKEN_PATH).headers(headers).body(request).post<T>();
  }

  /**
   * For setup: returns the token or throws.
   *
   * Sends `Accept: application/json` itself, so the 200 body is a JSON string `"eyJ…"` that the
   * request handler parses into a `string`. Without that header the server sends the token as
   * bare `text/plain` instead (checked 2026-11-17).
   */
  async getToken(credentials: TokenRequest): Promise<string> {
    const result = await this.getTokenResponse<unknown>(credentials, {
      Accept: 'application/json',
    });
    const token = this.expectStatus(result, 200, 'Login (POST /v1/Account/token)');
    if (!isJwt(token)) {
      throw new Error('Login (POST /v1/Account/token): 200 body is not a JWT string.');
    }
    return token;
  }
}
