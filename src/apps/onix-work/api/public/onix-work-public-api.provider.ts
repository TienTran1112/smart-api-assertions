import type { APIRequestContext } from '@playwright/test';
import type { ApiLogger } from '@framework/api/api-logger';
import type { ApiAuthentication } from '@framework/api/auth/api-authentication';
import { ApiKeyAuthentication } from '@framework/api/auth/api-key-authentication';
import { BearerTokenAuthentication } from '@framework/api/auth/bearer-token-authentication';
import { RequestHandlerFactory } from '@framework/api/request-handler.factory';
import { requireEnvironmentVariable } from '@framework/config/environment-variable';
import { runtimeConfig } from '@framework/config/runtime.config';
import { getOnixWorkCredentials } from '../auth/onix-work-credentials';
import { OnixWorkTokenProvider } from '../auth/onix-work-token.provider';
import { AccountPublicApiClient } from './clients/account/account-public-api.client';
import { DocumentTypePublicApiClient } from './clients/common/document-type-public-api.client';
import { JobTypePublicApiClient } from './clients/common/job-type-public-api.client';
import { PropertyPublicApiClient } from './clients/common/property-public-api.client';
import { ProbePublicApiClient } from './clients/probe/probe-public-api.client';
import type { TokenRequest } from './models/account/token.request';

export interface OnixWorkPublicApiClients {
  account: AccountPublicApiClient;
  documentType: DocumentTypePublicApiClient;
  jobType: JobTypePublicApiClient;
  property: PropertyPublicApiClient;
  /** Generic request client for the capture spec only. */
  probe: ProbePublicApiClient;
}

export interface OnixWorkPublicApi {
  clients: OnixWorkPublicApiClients;
}

/**
 * Entry point for tests (fixture `api`). Pick an auth identity, then a client:
 * `api.anonymous().clients.account.getTokenResponse(...)`.
 * Clients are cached per identity for the lifetime of one test.
 */
export class OnixWorkPublicApiProvider {
  private readonly cache = new Map<string, OnixWorkPublicApi>();

  constructor(
    private readonly request: APIRequestContext,
    private readonly logger: ApiLogger,
    private readonly baseUrl: string = runtimeConfig.onixWorkApiBaseUrl,
  ) {}

  /** No `Authorization` header (login, auth-error tests). */
  anonymous(): OnixWorkPublicApi {
    return this.getOrCreate('anonymous', () => undefined);
  }

  /** `Authorization: Bearer <short-lived token>`, logging in with the `.env` account by default. */
  withAccount(credentials: TokenRequest = getOnixWorkCredentials()): OnixWorkPublicApi {
    return this.getOrCreate(`account:${credentials.username}`, () => {
      const tokenProvider = new OnixWorkTokenProvider(
        this.anonymous().clients.account,
        credentials,
      );
      return new BearerTokenAuthentication(() => tokenProvider.getToken());
    });
  }

  /**
   * `Authorization: Key <apiKey>`. Needs the long-lived key from Onix Work settings
   * (`ONIX_WORK_API_KEY`); the short-lived login token returns 401 with `Key`.
   */
  withApiKey(apiKey: string = requireEnvironmentVariable('ONIX_WORK_API_KEY')): OnixWorkPublicApi {
    return this.getOrCreate(`api-key:${apiKey}`, () => new ApiKeyAuthentication(apiKey));
  }

  private getOrCreate(
    identity: string,
    createAuthentication: () => ApiAuthentication | undefined,
  ): OnixWorkPublicApi {
    let api = this.cache.get(identity);
    if (!api) {
      const factory = new RequestHandlerFactory(
        this.request,
        this.baseUrl,
        this.logger,
        createAuthentication(),
      );
      api = {
        clients: {
          account: new AccountPublicApiClient(factory),
          documentType: new DocumentTypePublicApiClient(factory),
          jobType: new JobTypePublicApiClient(factory),
          property: new PropertyPublicApiClient(factory),
          probe: new ProbePublicApiClient(factory),
        },
      };
      this.cache.set(identity, api);
    }
    return api;
  }
}
