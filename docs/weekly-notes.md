# Weekly notes

Twenty minutes every Friday: what I did, what I decided and why, problems. These notes become
the Method chapter.

## W1 (Phase 0: setup and feasibility)

### Done

- Node project: `package.json` with the npm scripts from plan 3.5, `tsconfig.json` (strict,
  ES2024, Bundler resolution, path aliases `@framework`, `@smart-assert`, `@onix-work`,
  `@baselines`, `@experiments`), `playwright.unit.config.ts`, `playwright.api.config.ts`,
  Prettier. Installed versions: `@playwright/test` 1.65.1, `typescript` 7.0.2, `tsx` 4.23.15,
  `@anthropic-ai/sdk` 1.9.0, `zod` 4.6.7, `ajv` 8.20.0, `dotenv` 18.0.10.
- Framework layer (`src/framework/`): request handler + factory, `BaseApiClient`, `ApiResult`,
  Bearer and API-key authentication, JWT helpers, `.env` loader, `runtimeConfig`, `ApiLogger`
  with secret redaction, auto fixture that attaches `api-activity` to failed tests.
- Onix layer (`src/apps/onix-work/`): `AccountPublicApiClient`, `OnixWorkTokenProvider`,
  `OnixWorkPublicApiProvider`, `onix-work-api.fixture.ts`, request/error models.
- Ported the login tests to `tests/onix-work/api/account/login/` (deterministic checks only).
- Unit tests for redaction and JWT reading (`tests/unit/framework/`).
- `.env`: added `ONIX_WORK_*` names next to the old `ONIX_*` names (Python still reads those).
- Results: `npm run typecheck` clean; `npm test` 10/10; `npm run test:api` 4/4 against Onix.

### Decisions

- Config files sit flat in `src/framework/config/` (the plan names both `config/` and
  `config/environment/`; I picked the shorter one).
- A string request body is sent as a `Buffer`. Playwright otherwise JSON-encodes a string that
  is not valid JSON when the content type is JSON, which would hide the malformed-JSON case.
- `RequestHandler` only wraps a call in `test.step` when it runs inside a test, so the same
  code can later be used from a plain script or a worker fixture.
- The token cache lives in module state (one cache per worker process), keyed by username. It
  refreshes when less than 5 minutes are left, read from the JWT `exp` claim.
- Log redaction hides a string or number under a secret key (`password`, `authorization`, …)
  but walks arrays and objects under such a key, so `errors.Password: ["…is required."]` stays
  readable in the report. Any `eyJ….….…` substring is redacted anywhere.
- Added one extra login test for `getToken()` (the setup helper), so the code path used by
  `withAccount()` is covered.

### Problems / open

- TypeScript 7 is the new native compiler; `baseUrl` is gone, so `paths` are relative to
  `tsconfig.json`. Playwright resolves them without problems.
- Still to do this week (not code): read Barr 2015 and Zheng 2023; import the Onix Swagger into
  Postman and start the text-field table; send the data-permission email
  (draft in `docs/drafts/data-permission-email.md`); ask a colleague to be second labeler; book
  the five supervisor checkpoints.
