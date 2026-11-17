import type { ApiAuthentication } from './api-authentication';

/** `Authorization: Key <apiKey>` (a long-lived key issued per company). */
export class ApiKeyAuthentication implements ApiAuthentication {
  constructor(private readonly apiKey: string) {}

  async getHeaders(): Promise<Record<string, string>> {
    return { Authorization: `Key ${this.apiKey}` };
  }
}
