/**
 * One item of `GET /v1/company/properties`: an equipment property name in the requested language.
 * Live (2026-11-23): `{ languageCode, description, value }`, `value` is `null` in the list.
 */
export interface PropertyResponse {
  languageCode: number | null;
  description: string;
  value: string | null;
}
