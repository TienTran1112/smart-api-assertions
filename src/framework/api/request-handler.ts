import { test, type APIRequestContext, type APIResponse } from '@playwright/test';
import type { ApiLogger } from './api-logger';
import type { ApiResult } from './api-result';
import type { ApiAuthentication } from './auth/api-authentication';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
type QueryParams = Record<string, string | number | boolean>;

/**
 * Builds and sends one HTTP request. Create a new handler per request (the factory does this),
 * so no state leaks from one call to the next.
 *
 * - Never throws on an HTTP status (`failOnStatusCode: false`); the caller checks `status`.
 * - Each request runs inside a `test.step` when called from a test, so it shows in the report.
 * - Every call is written to the `ApiLogger`, with secrets redacted.
 */
export class RequestHandler {
  private requestPath = '';
  private queryParams: QueryParams = {};
  private requestHeaders: Record<string, string> = {};
  private requestBody: unknown = undefined;
  private hasBody = false;

  constructor(
    private readonly request: APIRequestContext,
    private readonly baseUrl: string,
    private readonly logger: ApiLogger,
    private readonly authentication?: ApiAuthentication,
  ) {}

  /** Path relative to the base URL, e.g. `v1/Account/token`. */
  path(path: string): this {
    this.requestPath = path;
    return this;
  }

  params(params: QueryParams): this {
    this.queryParams = { ...this.queryParams, ...params };
    return this;
  }

  /** Extra headers. They override the auth headers and the config's `extraHTTPHeaders`. */
  headers(headers: Record<string, string>): this {
    this.requestHeaders = { ...this.requestHeaders, ...headers };
    return this;
  }

  /**
   * Request body.
   * - An object, array, number, boolean or `null` is sent as JSON (`Content-Type: application/json`).
   * - A `string` is sent exactly as-is, with the `Content-Type` set via `headers()`. Use this
   *   for malformed JSON or an empty body in negative tests.
   */
  body(body: unknown): this {
    this.requestBody = body;
    this.hasBody = true;
    return this;
  }

  get<T = unknown>(): Promise<ApiResult<T>> {
    return this.send<T>('GET');
  }

  post<T = unknown>(): Promise<ApiResult<T>> {
    return this.send<T>('POST');
  }

  put<T = unknown>(): Promise<ApiResult<T>> {
    return this.send<T>('PUT');
  }

  patch<T = unknown>(): Promise<ApiResult<T>> {
    return this.send<T>('PATCH');
  }

  delete<T = unknown>(): Promise<ApiResult<T>> {
    return this.send<T>('DELETE');
  }

  private async send<T>(method: HttpMethod): Promise<ApiResult<T>> {
    const stepTitle = `${method} ${this.requestPath}`;
    return isInsideTest()
      ? test.step(stepTitle, () => this.execute<T>(method), { box: true })
      : this.execute<T>(method);
  }

  private async execute<T>(method: HttpMethod): Promise<ApiResult<T>> {
    const url = joinUrl(this.baseUrl, this.requestPath);
    const authHeaders = this.authentication ? await this.authentication.getHeaders() : {};
    const headers = { ...authHeaders, ...this.requestHeaders };
    const startedAt = Date.now();

    let response: APIResponse;
    try {
      response = await this.request.fetch(url, {
        method,
        params: this.queryParams,
        headers,
        // A string is sent as a Buffer: Playwright would otherwise JSON-encode a string that is
        // not valid JSON when the content type is JSON, which hides the malformed-JSON case.
        data: !this.hasBody
          ? undefined
          : typeof this.requestBody === 'string'
            ? Buffer.from(this.requestBody, 'utf8')
            : this.requestBody,
        failOnStatusCode: false,
      });
    } catch (error) {
      this.logger.log({
        method,
        url,
        requestHeaders: headers,
        requestBody: this.requestBody,
        durationMs: Date.now() - startedAt,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }

    const result: ApiResult<T> = {
      status: response.status(),
      headers: response.headers(),
      body: parseBody(await response.text()) as T,
    };

    this.logger.log({
      method,
      url,
      requestHeaders: headers,
      requestBody: this.requestBody,
      status: result.status,
      responseHeaders: result.headers,
      responseBody: result.body,
      durationMs: Date.now() - startedAt,
    });

    return result;
  }
}

/** JSON when it parses, otherwise the raw text; `undefined` for an empty body. */
function parseBody(text: string): unknown {
  if (text === '') {
    return undefined;
  }
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function joinUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
}

/** `test.step` throws outside a running test (e.g. in a worker fixture or a plain script). */
function isInsideTest(): boolean {
  try {
    test.info();
    return true;
  } catch {
    return false;
  }
}
