/**
 * RFC 7807 problem details (`application/problem+json`), e.g. a wrong password on login:
 * `{ type, title: "Bad Request", status: 400, traceId }`.
 */
export interface ProblemDetailsResponse {
  type: string;
  title: string;
  status: number;
  traceId: string;
}
