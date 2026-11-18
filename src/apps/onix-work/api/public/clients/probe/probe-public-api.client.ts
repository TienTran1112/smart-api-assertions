import { BaseApiClient } from '@framework/api/base-api.client';
import type { ApiResult } from '@framework/api/api-result';

/** One deliberately bad request, described as data (see `capture-probes.ts`). */
export interface ProbeRequest {
  method: 'GET' | 'POST' | 'PATCH';
  /** Relative to the base URL, e.g. `v1/company/products/abc`. */
  path: string;
  params?: Record<string, string | number | boolean>;
  /** An object is sent as JSON; a string is sent as-is (malformed JSON). */
  body?: unknown;
  headers?: Record<string, string>;
}

/**
 * Sends any request described by a `ProbeRequest`. Only for the capture spec and the feasibility
 * gate, where the request list is data. Regular tests use one client per endpoint group (W9).
 */
export class ProbePublicApiClient extends BaseApiClient {
  async sendResponse<T = unknown>(probe: ProbeRequest): Promise<ApiResult<T>> {
    const handler = this.request()
      .path(probe.path)
      .params(probe.params ?? {})
      .headers(probe.headers ?? {});
    if (probe.body !== undefined) {
      handler.body(probe.body);
    }
    switch (probe.method) {
      case 'GET':
        return handler.get<T>();
      case 'POST':
        return handler.post<T>();
      case 'PATCH':
        return handler.patch<T>();
    }
  }
}
