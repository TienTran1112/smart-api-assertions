import type { ProbeRequest } from '@onix-work/api/public/clients/probe/probe-public-api.client';

/**
 * Deliberately bad requests for the feasibility gate (plan section 2) and the dataset seed.
 *
 * Safety rule: no probe may change data on the test server.
 * - GET: any bad input.
 * - POST: only bodies the framework rejects before the action runs (malformed JSON, wrong JSON
 *   type, missing required field, wrong content type), or a POST under an ID that does not exist.
 * - PATCH: only on an ID that does not exist (`MISSING_ID`), so even a valid body cannot update.
 */
export interface CaptureProbe {
  id: string;
  /** Endpoint template as in Swagger, e.g. `GET /v1/company/products/{productId}`. */
  endpoint: string;
  trigger: string;
  auth: 'anonymous' | 'account';
  request: ProbeRequest;
}

const MISSING_ID = 2147483647;
const TOO_LONG_51 = 'x'.repeat(51);
const TOO_LONG_251 = 'x'.repeat(251);
const JSON_HEADERS = { 'Content-Type': 'application/json' };

const DOCUMENT_TYPES = 'GET /v1/company/document-types';
const PRODUCTS = 'GET /v1/company/products';
const QUANTITY = 'POST /v1/equipment/quantity-adjustment';

export const CAPTURE_PROBES: CaptureProbe[] = [
  // Authentication
  {
    id: 'auth-none',
    endpoint: DOCUMENT_TYPES,
    trigger: 'no token',
    auth: 'anonymous',
    request: { method: 'GET', path: 'v1/company/document-types' },
  },
  {
    id: 'auth-bad-bearer',
    endpoint: DOCUMENT_TYPES,
    trigger: 'invalid Bearer token',
    auth: 'anonymous',
    request: {
      method: 'GET',
      path: 'v1/company/document-types',
      headers: { Authorization: 'Bearer not-a-token' },
    },
  },
  {
    id: 'auth-bad-key',
    endpoint: DOCUMENT_TYPES,
    trigger: 'invalid Key',
    auth: 'anonymous',
    request: {
      method: 'GET',
      path: 'v1/company/document-types',
      headers: { Authorization: 'Key not-a-key' },
    },
  },

  // Lookup lists with a language code
  {
    id: 'doctypes-lang-2',
    endpoint: DOCUMENT_TYPES,
    trigger: 'unsupported languageCode=2',
    auth: 'account',
    request: { method: 'GET', path: 'v1/company/document-types', params: { languageCode: 2 } },
  },
  {
    id: 'properties-lang-999',
    endpoint: 'GET /v1/company/properties',
    trigger: 'unknown languageCode=999',
    auth: 'account',
    request: { method: 'GET', path: 'v1/company/properties', params: { languageCode: 999 } },
  },
  {
    id: 'control-categories-lang-999',
    endpoint: 'GET /v1/company/control-categories',
    trigger: 'unknown languageCode=999',
    auth: 'account',
    request: {
      method: 'GET',
      path: 'v1/company/control-categories',
      params: { languageCode: 999 },
    },
  },
  {
    id: 'order-statuses-lang-999',
    endpoint: 'GET /v1/company/order-statuses',
    trigger: 'unknown languageCode=999',
    auth: 'account',
    request: { method: 'GET', path: 'v1/company/order-statuses', params: { languageCode: 999 } },
  },
  {
    id: 'forms-lang-999',
    endpoint: 'GET /v1/company/forms',
    trigger: 'unknown languageCode=999',
    auth: 'account',
    request: { method: 'GET', path: 'v1/company/forms', params: { languageCode: 999 } },
  },
  {
    id: 'job-types-lang-999',
    endpoint: 'GET /v1/company/job-types',
    trigger: 'unknown languageCode=999',
    auth: 'account',
    request: { method: 'GET', path: 'v1/company/job-types', params: { languageCode: 999 } },
  },

  // Products
  {
    id: 'products-bad-date',
    endpoint: PRODUCTS,
    trigger: 'ChangedFromUtcDatetime not a date',
    auth: 'account',
    request: {
      method: 'GET',
      path: 'v1/company/products',
      params: { ChangedFromUtcDatetime: 'not-a-date' },
    },
  },
  {
    id: 'products-quantity-abc',
    endpoint: PRODUCTS,
    trigger: 'QuantityUsage not a number',
    auth: 'account',
    request: { method: 'GET', path: 'v1/company/products', params: { QuantityUsage: 'abc' } },
  },
  {
    id: 'products-lang-999',
    endpoint: PRODUCTS,
    trigger: 'unknown LanguageCode=999',
    auth: 'account',
    request: {
      method: 'GET',
      path: 'v1/company/products',
      params: { LanguageCode: 999, ProductNo: 'does-not-exist' },
    },
  },
  {
    id: 'product-id-abc',
    endpoint: 'GET /v1/company/products/{productId}',
    trigger: 'productId not a number',
    auth: 'account',
    request: { method: 'GET', path: 'v1/company/products/abc' },
  },
  {
    id: 'product-missing',
    endpoint: 'GET /v1/company/products/{productId}',
    trigger: 'productId does not exist',
    auth: 'account',
    request: { method: 'GET', path: `v1/company/products/${MISSING_ID}` },
  },
  {
    id: 'product-rules-missing',
    endpoint: 'GET /v1/company/products/{productId}/rules',
    trigger: 'productId does not exist',
    auth: 'account',
    request: { method: 'GET', path: `v1/company/products/${MISSING_ID}/rules` },
  },
  {
    id: 'product-patch-missing',
    endpoint: 'PATCH /v1/company/products/{productId}',
    trigger: 'productId does not exist',
    auth: 'account',
    request: {
      method: 'PATCH',
      path: `v1/company/products/${MISSING_ID}`,
      body: { description: 'probe' },
    },
  },

  // Company, locations, areas
  {
    id: 'company-id-abc',
    endpoint: 'GET /v1/company/{companyId}',
    trigger: 'companyId not a number',
    auth: 'account',
    request: { method: 'GET', path: 'v1/company/abc' },
  },
  {
    id: 'company-missing',
    endpoint: 'GET /v1/company/{companyId}',
    trigger: 'companyId does not exist',
    auth: 'account',
    request: { method: 'GET', path: `v1/company/${MISSING_ID}` },
  },
  {
    id: 'company-other',
    endpoint: 'GET /v1/company/{companyId}',
    trigger: 'another company (id 1): no permission?',
    auth: 'account',
    request: { method: 'GET', path: 'v1/company/1' },
  },
  {
    id: 'location-missing',
    endpoint: 'GET /v1/company/locations/{locationId}',
    trigger: 'locationId does not exist',
    auth: 'account',
    request: { method: 'GET', path: `v1/company/locations/${MISSING_ID}` },
  },
  {
    id: 'location-patch-too-long',
    endpoint: 'PATCH /v1/company/locations/{locationId}',
    trigger: 'importId longer than 50, id does not exist',
    auth: 'account',
    request: {
      method: 'PATCH',
      path: `v1/company/locations/${MISSING_ID}`,
      body: { importId: TOO_LONG_51, email: 'not-an-email' },
    },
  },
  {
    id: 'location-post-wrong-type',
    endpoint: 'POST /v1/company/locations',
    trigger: 'locationId is a string',
    auth: 'account',
    request: { method: 'POST', path: 'v1/company/locations', body: { locationId: 'abc' } },
  },
  {
    id: 'area-missing',
    endpoint: 'GET /v1/company/areas/{areaId}',
    trigger: 'areaId does not exist',
    auth: 'account',
    request: { method: 'GET', path: `v1/company/areas/${MISSING_ID}` },
  },
  {
    id: 'express-location-missing',
    endpoint: 'GET /v1/locations',
    trigger: 'locationExternalId does not exist',
    auth: 'account',
    request: {
      method: 'GET',
      path: 'v1/locations',
      params: { locationExternalId: 'does-not-exist' },
    },
  },

  // Equipment
  {
    id: 'equipment-missing',
    endpoint: 'GET /v1/equipment/{equipmentId}',
    trigger: 'equipmentId does not exist',
    auth: 'account',
    request: { method: 'GET', path: `v1/equipment/${MISSING_ID}` },
  },
  {
    id: 'equipment-id-abc',
    endpoint: 'GET /v1/equipment/{equipmentId}',
    trigger: 'equipmentId not a number',
    auth: 'account',
    request: { method: 'GET', path: 'v1/equipment/abc' },
  },
  {
    id: 'equipment-filter-abc',
    endpoint: 'GET /v1/equipment',
    trigger: 'CompanyId not a number',
    auth: 'account',
    request: { method: 'GET', path: 'v1/equipment', params: { CompanyId: 'abc' } },
  },
  {
    id: 'equipment-properties-missing',
    endpoint: 'GET /v1/equipment/{equipmentId}/properties',
    trigger: 'equipmentId does not exist, languageCode=999',
    auth: 'account',
    request: {
      method: 'GET',
      path: `v1/equipment/${MISSING_ID}/properties`,
      params: { languageCode: 999 },
    },
  },
  {
    id: 'equipment-patch-too-long',
    endpoint: 'PATCH /v1/equipment/{equipmentId}',
    trigger: 'serialNumber longer than 50, id does not exist',
    auth: 'account',
    request: {
      method: 'PATCH',
      path: `v1/equipment/${MISSING_ID}`,
      body: { serialNumber: TOO_LONG_51 },
    },
  },
  {
    id: 'equipment-post-text-plain',
    endpoint: 'POST /v1/equipment',
    trigger: 'Content-Type text/plain',
    auth: 'account',
    request: {
      method: 'POST',
      path: 'v1/equipment',
      body: 'probe',
      headers: { 'Content-Type': 'text/plain' },
    },
  },
  {
    id: 'issue-missing-equipment',
    endpoint: 'POST /v1/equipment/{equipmentId}/issues',
    trigger: 'description longer than 250, equipment does not exist',
    auth: 'account',
    request: {
      method: 'POST',
      path: `v1/equipment/${MISSING_ID}/issues`,
      body: { description: TOO_LONG_251 },
    },
  },
  {
    id: 'quantity-empty',
    endpoint: QUANTITY,
    trigger: 'required fields missing',
    auth: 'account',
    request: { method: 'POST', path: 'v1/equipment/quantity-adjustment', body: {} },
  },
  {
    id: 'quantity-wrong-type',
    endpoint: QUANTITY,
    trigger: 'productId is a string',
    auth: 'account',
    request: {
      method: 'POST',
      path: 'v1/equipment/quantity-adjustment',
      body: { productId: 'abc', locationId: 1, quantity: 1 },
    },
  },

  // Orders and jobs
  {
    id: 'orders-malformed-json',
    endpoint: 'POST /v1/orders',
    trigger: 'malformed JSON',
    auth: 'account',
    request: { method: 'POST', path: 'v1/orders', body: '{"orderId": ', headers: JSON_HEADERS },
  },
  {
    id: 'orders-wrong-type',
    endpoint: 'POST /v1/orders',
    trigger: 'orderId is a string',
    auth: 'account',
    request: { method: 'POST', path: 'v1/orders', body: { orderId: 'abc' } },
  },
  {
    id: 'jobs-wrong-type',
    endpoint: 'POST /v1/jobs',
    trigger: 'companyId is a string',
    auth: 'account',
    request: { method: 'POST', path: 'v1/jobs', body: { companyId: 'abc' } },
  },
  {
    id: 'job-documents-missing',
    endpoint: 'POST /v1/jobs/{jobId}/documents',
    trigger: 'empty body, job does not exist',
    auth: 'account',
    request: { method: 'POST', path: `v1/jobs/${MISSING_ID}/documents`, body: {} },
  },
];
