import { BaseApiClient } from '@framework/api/base-api.client';
import type { ApiResult } from '@framework/api/api-result';

const PROPERTIES_PATH = 'v1/company/properties';

/** `GET /v1/company/properties`: the company's equipment property names in one language. */
export class PropertyPublicApiClient extends BaseApiClient {
  /**
   * For tests: returns the full response and never throws on a status.
   * Leave `languageCode` out to get the server default (English).
   */
  async getPropertiesResponse<T = unknown>(languageCode?: number): Promise<ApiResult<T>> {
    return this.request()
      .path(PROPERTIES_PATH)
      .params(languageCode === undefined ? {} : { languageCode })
      .get<T>();
  }
}
