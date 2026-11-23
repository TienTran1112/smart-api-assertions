import { BaseApiClient } from '@framework/api/base-api.client';
import type { ApiResult } from '@framework/api/api-result';

const JOB_TYPES_PATH = 'v1/company/job-types';

/** `GET /v1/company/job-types`: the job type lookup list in one language. */
export class JobTypePublicApiClient extends BaseApiClient {
  /**
   * For tests: returns the full response and never throws on a status.
   * Leave `languageCode` out to get the server default (English).
   */
  async getJobTypesResponse<T = unknown>(languageCode?: number): Promise<ApiResult<T>> {
    return this.request()
      .path(JOB_TYPES_PATH)
      .params(languageCode === undefined ? {} : { languageCode })
      .get<T>();
  }
}
