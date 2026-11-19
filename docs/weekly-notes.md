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

## W2 (Phase 0: port and feasibility gate)

### Done

- Ported the judge to `src/smart-assert/`: `judge/judge-output.schema.ts` (Zod `VerdictSchema`),
  `judge/prompts/v1.ts` (same prompt text as Python, `PROMPT_VERSION = 'v1'`),
  `judge/judge.ts` (`Judge` interface), `judge/claude-judge.ts`, `assert-semantic.ts`,
  `index.ts`. Ported the 3 voting tests with a `FakeJudge` (`tests/unit/smart-assert/`).
- `login-errors.spec.ts` now ends with `assertSemantic(...)` (one vote); the criteria are test
  data in `login.test-data.ts`.
- Compared Python and TypeScript once on the same 3 inputs (wrong password, empty fields, and a
  made-up leaking message): same verdicts (PASS, PASS, FAIL, all "high").
- Deleted the Python prototype (`smart_assert/`, `tests/api/`, `tests/unit/test_voting.py`), the
  old `ONIX_*` variable names, and the empty `baselines/` and `dashboard/` folders.
  `pyproject.toml` now lists only the analysis dependencies.
- Feasibility gate: `ProbePublicApiClient` + `tests/onix-work/api/capture/capture-responses.spec.ts`
  (`npm run capture`) with 39 safe probes on 26 endpoints → `data/raw/onix-capture-2026-11-18.jsonl`.
  Result and text-field table in `docs/feasibility.md`. One-page proposal in `docs/proposal.md`.
- Results: `npm run typecheck` clean; `npm test` 13/13; `npm run test:api` 4/4 (with the judge).
- Added a dev-only judge backend, `ClaudeCodeJudge` (`judge/claude-code-judge.ts`), that runs
  Claude Code headless on the Pro/Max subscription instead of the API key. Picked with
  `JUDGE_BACKEND=claude-code` or `npm run test:api:subscription`. `npm test` 48/48;
  `npm run test:api:subscription` 20/20.

### Decisions

- No server-side fallback model in `ClaudeJudge` (plan 3.4: reproducibility). If the answer
  comes from a different model than requested, the verdict is `INCONCLUSIVE`.
- `ClaudeJudge` returns `INCONCLUSIVE` for refusal, `max_tokens`, an API error, or output that
  does not match the schema. Other errors (bugs) are thrown.
- `assertSemantic` takes the judge as a required option in W2; the login spec builds
  `new ClaudeJudge({ model: runtimeConfig.judgeModel })`. The matcher (W8) will hide this.
- The subscription judge is for development only, never for measured runs: Claude Code adds
  its own context (about 1.5K input tokens and a structured-output tool), `max_tokens` cannot
  be set, and rate limits differ. It keeps the same prompt, schema and `INCONCLUSIVE` rules,
  and drops `ANTHROPIC_API_KEY` from the child process (Claude Code would otherwise bill the key).
- The capture spec uses one generic `probe` client, because its request list is data. Regular
  tests still get one client per endpoint group (W9).
- Probe safety rule: GET with any bad input; POST only with bodies rejected before the action
  runs; PATCH only on an ID that does not exist. A 2xx body is not saved.
- Proposed track: **Mixed** (about 40–60 real-seeded families, the rest from a mock API).
  Reason: 30 distinct real messages, but only 15 templates, 10 of them framework defaults.

### Problems / open

- Found a real bug: `POST /v1/equipment/quantity-adjustment` with `{}` returns 500 with the
  .NET message "Object reference not set to an instance of an object." (and "wrong wrong").
  Worth reporting to the Onix team; it is also a good real FAIL case.
- The data-permission answer is still open; it can move the plan to Track B.
- Checkpoint 1: agree the question and the track with the supervisor.
