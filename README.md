# smart-assert

LLM-as-a-judge semantic assertions for API testing — a Master's capstone project.

Classic API assertions (exact match, keywords, regex) break whenever a server rewords a message,
even if the meaning is unchanged. `smart-assert` adds one more check on top of the usual
deterministic ones: an LLM judge (Claude) decides whether a server-written text — an error or
validation message, a status explanation — **means** what the tester expects, and quotes the
evidence it used.

The research question is whether such a hybrid check accepts meaning-preserving rewording while
still catching semantic defects (information leaks, wrong meaning, internal details). The full
16-week plan is in [docs/capstone-plan.md](docs/capstone-plan.md).

> **Status:** Phase 0 done (weeks 1–2). Everything runs in **TypeScript + Playwright Test**;
> the Python prototype has been ported and deleted. Python is now used only for analysis
> (`pyproject.toml`). The feasibility gate result is in [docs/feasibility.md](docs/feasibility.md)
> and the one-page proposal in [docs/proposal.md](docs/proposal.md).

## Setup and commands

Requires Node 24. No browser is installed or used (API tests only).

```bash
npm install
```

Copy [`.env.example`](.env.example) to `.env` and fill it in:

| Variable | Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | Key for the judge (live tests only) |
| `JUDGE_MODEL` | `claude-opus-5-5` (default), `claude-sonnet-5-5` or `claude-haiku-5-5` |
| `JUDGE_BACKEND` | `api` (default, API key) or `claude-code` (dev only: Claude Code on your Pro/Max subscription) |
| `ONIX_WORK_API_BASE_URL` | Onix Work test API, default `https://openapi-test.onixwork.com` |
| `ONIX_WORK_USERNAME`, `ONIX_WORK_PASSWORD` | Test account used to get a short-lived token |
| `ONIX_WORK_API_KEY` | Optional long-lived key, sent as `Authorization: Key <apiKey>` |
| `ONIX_VERIFY_TLS` | `true` by default. The test server's certificate is currently expired, so live tests need `false` |

Never commit `.env`. Values in `.env` also fill variables that exist but are **empty** in the
Windows environment (e.g. a blank `ANTHROPIC_API_KEY` in user settings); non-empty OS values win.

| Command | What it runs |
|---|---|
| `npm test` | Offline unit tests (`tests/unit/`), no keys needed |
| `npm run test:api` | Live tests against the Onix Work test API with the real judge (needs VPN and an API key; costs money), one worker |
| `npm run test:api:subscription` | Same as `test:api`, but the judge runs through Claude Code on your Pro/Max subscription instead of the API key (needs Claude Code installed and signed in). Dev only; don't use it for measured runs |
| `npm run test:api:smoke` | Only tests tagged `@smoke` |
| `npm run capture` | Sends the bad-request probes in `tests/onix-work/api/capture/capture-probes.ts` and saves the responses to `data/raw/` (tag `@capture`, not part of `test:api`) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run report` | Opens the HTML report of the last API run |

Every endpoint is tested through layers; a spec never builds a URL or calls `fetch`:

```
spec (tests/…/*.spec.ts)            what to check; data from *.test-data.ts next to it
  │  uses fixture `api`
  ▼
fixture (onix-work-api.fixture.ts)  creates the provider per test; exports `test` and `expect`
  ▼
provider (onix-work-public-api.provider.ts)
  │  api.anonymous() / api.withAccount() / api.withApiKey()  → { clients }
  ▼
client (one class per endpoint group, extends BaseApiClient)
  │  getXxxResponse<T>() → { status, headers, body }  (never throws on status)
  │  getXxx<T>()         → body, throws if status ≠ expected (for setup steps)
  ▼
request handler (src/framework)     auth headers, JSON or raw body, test.step, redacted ApiLogger
```

When a live test fails, the report has an `api-activity` attachment with every request and
response of that test; passwords, auth headers and anything that looks like a JWT are redacted.

## How it works

```ts
expect(response.status).toBe(400); // classic checks first
expect(response.headers['content-type']).toContain('application/problem+json');

await assertSemantic(response.body.title, {
  // semantic check last
  criteria:
    'MUST NOT reveal whether the username exists. ' +
    'MUST NOT include stack traces or internal error details.',
  context: 'Error title returned by a login endpoint after a wrong password.',
  judge: createJudge({ backend: runtimeConfig.judgeBackend, model: runtimeConfig.judgeModel }),
});
```

- [`src/smart-assert/judge/claude-judge.ts`](src/smart-assert/judge/claude-judge.ts): one
  structured-output call to Claude per verdict (`PASS` / `FAIL` / `INCONCLUSIVE`, confidence,
  reason, exact quote as evidence). The response under test is wrapped in
  `<response_under_test>` and treated as data, never as instructions. Effort is always sent;
  no sampling parameters, no tools, no fallback model. A refusal, an API error, a cut-off
  output or an answer from another model becomes `INCONCLUSIVE`. The prompt lives in
  `judge/prompts/v2.ts` (one file per version; `v1.ts` is kept for old results). Add a new
  file and bump `PROMPT_VERSION` whenever the text changes.
- [`src/smart-assert/judge/claude-code-judge.ts`](src/smart-assert/judge/claude-code-judge.ts):
  the same prompt and schema, but run through Claude Code headless (`claude --print
  --json-schema`) without `ANTHROPIC_API_KEY`, so calls count against the Pro/Max subscription.
  Tools, MCP servers and settings are turned off. Dev only: Claude Code adds about 1.5K input
  tokens of its own, `max_tokens` cannot be set, and subscription rate limits apply.
  `createJudge({ backend })` picks one of the two judges.
- [`src/smart-assert/assert-semantic.ts`](src/smart-assert/assert-semantic.ts):
  `assertSemantic(actual, { criteria, judge, votes })` calls the judge `votes` times and needs a
  **strict majority of `PASS`**; `INCONCLUSIVE` counts against passing. On failure it throws a
  `SemanticAssertionError` with the reason and the quoted evidence, which fails the test.
- The core (`src/smart-assert/` outside `playwright/`) imports only `@anthropic-ai/sdk`,
  `zod` and Node built-ins, so it can be used without the test runner. Unit tests use a `FakeJudge`.

Deterministic checks always run first, so a broken response never costs an LLM call.

## Layout

| Path | Purpose |
|---|---|
| `src/framework/` | Generic API test layer: request handler, clients, auth, config, logger |
| `src/apps/onix-work/` | Onix Work clients, models, auth, fixture |
| `src/smart-assert/` | The library: judge, prompt versions, `assertSemantic` |
| `tests/unit/` | Offline unit tests (judge mocked), mirroring `src/` and the app folders |
| `tests/onix-work/api/` | Live tests against Onix Work, one folder per endpoint area (spec, `*.test-data.ts`, saved responses); `capture/` holds the dataset `@capture` spec |
| `data/raw/` | Captured Onix responses (`onix-capture-<date>.jsonl`) |
| `data/labeled/` | Labeled dataset (from W3) |
| `experiments/configs/` | One config per experiment arm (from W7); `experiments/results/` is git-ignored |
| `notebooks/` | Analysis notebook (W12) |
| `docs/` | Plan, feasibility gate, proposal, weekly notes; `proposal/` holds the `.docx` proposal documents, `drafts/` unsent drafts |

## Notes on the API under test

Server-written text is what this project targets; stored user text is better checked with exact
match. Known behavior of `POST /v1/Account/token` (details and more cases in section 2 of the plan):

- Valid login → `200`, body is a JSON string holding a JWT (valid about 60 minutes), used as
  `Authorization: Bearer <token>`.
- Wrong password or unknown user → `400 application/problem+json` with only `title: "Bad Request"`.
- Empty fields → `400 application/problem+json` with `errors.Username` / `errors.Password`
  messages such as "The Username field is required."
