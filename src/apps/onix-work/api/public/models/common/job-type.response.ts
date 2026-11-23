/**
 * One item of `GET /v1/company/job-types`. Live (2026-11-23) it is `{ key, value }` with the id as
 * a string (`"1"`), not the `DocumentTypeInfoDto` the Swagger file names.
 */
export interface JobTypeResponse {
  key: string;
  value: string;
}
