/**
 * The public API's second error format (`application/json`), e.g.
 * `GET v1/company/document-types?languageCode=2` →
 * `{ memberNames: ["languageCode"], errorMessage: "2 invalid language" }`.
 */
export interface ApiValidationErrorResponse {
  memberNames: string[];
  errorMessage: string;
}
