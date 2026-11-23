import { BaseApiClient } from '@framework/api/base-api.client';
import type { ApiResult } from '@framework/api/api-result';

const DOCUMENT_TYPES_PATH = 'v1/company/document-types';

/** `GET /v1/company/document-types`: the document type lookup list in one language. */
export class DocumentTypePublicApiClient extends BaseApiClient {
  /**
   * For tests: returns the full response and never throws on a status.
   * Leave `languageCode` out to get the server default (English).
   */
  async getDocumentTypesResponse<T = unknown>(languageCode?: number): Promise<ApiResult<T>> {
    return this.request()
      .path(DOCUMENT_TYPES_PATH)
      .params(languageCode === undefined ? {} : { languageCode })
      .get<T>();
  }
}
