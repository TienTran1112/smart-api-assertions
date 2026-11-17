import { redactSecrets } from './api-logger';
import type { ApiResult } from './api-result';
import type { RequestHandler } from './request-handler';
import type { RequestHandlerFactory } from './request-handler.factory';

/**
 * Base class for one client per endpoint group.
 * - `getXxxResponse<T>()` methods return the full `ApiResult` and never throw on a status.
 * - `getXxx<T>()` methods are for setup steps: they return the body or throw (`expectStatus`).
 */
export abstract class BaseApiClient {
  constructor(private readonly requestHandlerFactory: RequestHandlerFactory) {}

  /** A fresh request handler for one call. */
  protected request(): RequestHandler {
    return this.requestHandlerFactory.create();
  }

  /** Returns the body when the status is as expected; otherwise throws with a redacted body. */
  protected expectStatus<T>(result: ApiResult<T>, expectedStatus: number, action: string): T {
    if (result.status !== expectedStatus) {
      const body = JSON.stringify(redactSecrets(result.body)) ?? '(empty)';
      throw new Error(
        `${action}: expected HTTP ${expectedStatus} but got ${result.status}. Body: ${body}`,
      );
    }
    return result.body;
  }
}
