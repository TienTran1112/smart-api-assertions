import { requireEnvironmentVariable } from '@framework/config/environment-variable';
import type { TokenRequest } from '../public/models/account/token.request';

/** The Onix Work test account from `.env` (never from code). */
export function getOnixWorkCredentials(): TokenRequest {
  return {
    username: requireEnvironmentVariable('ONIX_WORK_USERNAME'),
    password: requireEnvironmentVariable('ONIX_WORK_PASSWORD'),
  };
}
