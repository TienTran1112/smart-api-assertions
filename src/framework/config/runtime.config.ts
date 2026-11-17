import { optionalEnvironmentVariable } from './environment-variable';

/**
 * Settings that come from the environment. Getters read `process.env` on each access,
 * after `.env` has been loaded.
 */
export const runtimeConfig = {
  get onixWorkApiBaseUrl(): string {
    return optionalEnvironmentVariable(
      'ONIX_WORK_API_BASE_URL',
      'https://openapi-test.onixwork.com',
    );
  },

  /** `false` only when ONIX_VERIFY_TLS is exactly "false" (case-insensitive). */
  get verifyTls(): boolean {
    return optionalEnvironmentVariable('ONIX_VERIFY_TLS', 'true').toLowerCase() !== 'false';
  },

  get judgeModel(): string {
    return optionalEnvironmentVariable('JUDGE_MODEL', 'claude-opus-5-5');
  },
};
