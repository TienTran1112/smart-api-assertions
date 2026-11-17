import type { ApiAuthentication } from './api-authentication';

/** `Authorization: Bearer <token>`. The token getter is called on every request (it may cache). */
export class BearerTokenAuthentication implements ApiAuthentication {
  constructor(private readonly getToken: () => Promise<string>) {}

  async getHeaders(): Promise<Record<string, string>> {
    return { Authorization: `Bearer ${await this.getToken()}` };
  }
}
