/** Adds auth headers to a request. Async, so a token can be fetched lazily on first use. */
export interface ApiAuthentication {
  getHeaders(): Promise<Record<string, string>>;
}
