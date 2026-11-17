import type { APIRequestContext } from '@playwright/test';
import type { ApiLogger } from './api-logger';
import type { ApiAuthentication } from './auth/api-authentication';
import { RequestHandler } from './request-handler';

/** Holds what every request of one auth identity shares, and creates a fresh handler per call. */
export class RequestHandlerFactory {
  constructor(
    private readonly request: APIRequestContext,
    private readonly baseUrl: string,
    private readonly logger: ApiLogger,
    private readonly authentication?: ApiAuthentication,
  ) {}

  create(): RequestHandler {
    return new RequestHandler(this.request, this.baseUrl, this.logger, this.authentication);
  }
}
