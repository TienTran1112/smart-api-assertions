/** Body of `POST /v1/Account/token` (Swagger `AccountItemDto`: username ≤ 100, password ≤ 500). */
export interface TokenRequest {
  username: string;
  password: string;
}
