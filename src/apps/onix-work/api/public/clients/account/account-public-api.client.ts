import { BaseApiClient } from '@framework/api/base-api.client';
import type { ApiResult } from '@framework/api/api-result';
import { isJwt } from '@framework/api/auth/jwt';
import { classifyTokenError } from '../../errors/classify-token-error';
import type { TokenRequest } from '../../models/account/token.request';

const TOKEN_PATH = 'v1/Account/token';
const LOGIN = 'Login (POST /v1/Account/token)';

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
   *
   * A failure names the reason (`classifyTokenError`), e.g. `credentials-rejected` or
   * `unreachable (tls)`, so a broken setup step says what to fix. Never includes the password.
   */
  async getToken(credentials: TokenRequest): Promise<string> {
    let result: ApiResult<unknown>;
    try {
      result = await this.getTokenResponse<unknown>(credentials, { Accept: 'application/json' });
    } catch (error) {
      throw new Error(loginFailure(classifyTokenError(error as Error)), { cause: error });
    }
    if (result.status !== 200) {
      throw new Error(loginFailure(classifyTokenError(result)));
    }
    if (!isJwt(result.body)) {
      throw new Error(`${LOGIN}: 200 body is not a JWT string.`);
    }
    return result.body;
  }
}

/** e.g. "Login (POST /v1/Account/token) failed [HTTP 400, credentials-rejected]: … traceId: 00-…" */
function loginFailure(classification: ReturnType<typeof classifyTokenError>): string {
  const where = classification.status
    ? `HTTP ${classification.status}`
    : `no response, ${classification.cause}`;
  const trace = classification.traceId ? ` traceId: ${classification.traceId}` : '';
  return `${LOGIN} failed [${where}, ${classification.kind}]: ${classification.description}${trace}`;
}
