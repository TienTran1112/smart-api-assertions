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

> **Status:** moving to **TypeScript + Playwright Test** (weeks 1–2). Week 1 is done: the
> framework layer, the Onix login layer and the deterministic login tests run in TypeScript
> (see [TypeScript side](#typescript-side-playwright-test)). The judge still lives in the Python
> prototype in `smart_assert/` until it is ported in W2; then `smart_assert/` and `tests/api/`
> are deleted and Python is used only for analysis. See
> [section 3 of the plan](docs/capstone-plan.md#3-architecture) for the target layout.

## TypeScript side (Playwright Test)

Requires Node 24. No browser is installed or used (API tests only).

```bash
npm install
```

`.env` needs `ONIX_WORK_API_BASE_URL`, `ONIX_WORK_USERNAME`, `ONIX_WORK_PASSWORD` and
`ONIX_VERIFY_TLS` (see [`.env.example`](.env.example)).

| Command | What it runs |
|---|---|
| `npm test` | Offline unit tests (`tests/unit/`), no keys needed |
| `npm run test:api` | Live tests against the Onix Work test API (`tests/**/api/**`), one worker |
| `npm run test:api:smoke` | Only tests tagged `@smoke` |
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

```python
from smart_assert import assert_semantic

assert r.status_code == 400                                   # classic checks first
assert r.headers["content-type"].startswith("application/problem+json")

assert_semantic(                                              # semantic check last
    r.json()["title"],
    expected=("MUST NOT reveal whether the username exists. "
              "MUST NOT include stack traces or internal error details."),
    context="Error title returned by a login endpoint after a wrong password.",
)
```

- [`smart_assert/judge.py`](smart_assert/judge.py) — `judge(actual, expected, context)` makes one
  structured-output call to Claude and returns a `Verdict` (`PASS` / `FAIL` / `INCONCLUSIVE`,
  confidence, reason, exact quote as evidence). The response under test is wrapped in
  `<response_under_test>` and treated as data, never as instructions. A model refusal becomes
  `INCONCLUSIVE`. Bump `PROMPT_VERSION` whenever the system prompt changes.
- [`smart_assert/voting.py`](smart_assert/voting.py) — `assert_semantic(..., votes=3)` calls the
  judge several times and needs a **strict majority of `PASS`**; `INCONCLUSIVE` counts against
  passing. On failure it calls `pytest.fail` with the reason and the quoted evidence.

Deterministic checks always run first, so a broken response never costs an LLM call.

## Setup (Windows)

Requires Python 3.12+ and [uv](https://docs.astral.sh/uv/).

```bash
uv venv --python 3.12
```

```bash
uv pip install -e ".[dev]"
```

```bash
copy .env.example .env
```

Then fill in `.env`:

| Variable | Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | Key for the judge (live tests only) |
| `JUDGE_MODEL` | `claude-opus-5-5` (default), `claude-sonnet-5-5` or `claude-haiku-5-5` |
| `ONIX_BASE_URL` | Onixwork test API, default `https://openapi-test.onixwork.com` |
| `ONIX_USERNAME`, `ONIX_PASSWORD` | Test account used to get a short-lived token |
| `ONIX_VERIFY_TLS` | `true` by default. The test server's certificate is currently expired, so live tests need `false` |

Never commit `.env`. Values in `.env` also fill variables that exist but are **empty** in the
Windows environment (e.g. a blank `ANTHROPIC_API_KEY` in user settings); non-empty OS values win.

## Run tests

Unit tests only — the LLM is mocked, so they are offline and free (this is the default):

```bash
.venv\Scripts\python -m pytest
```

Live tests against the Onixwork test API with the real LLM (needs VPN and an API key; costs money):

```bash
.venv\Scripts\python -m pytest -m live
```

HTML report (from the `dev` extra):

```bash
.venv\Scripts\python -m pytest -m live --html=report.html
```

| Test file | What it checks |
|---|---|
| [`tests/unit/test_voting.py`](tests/unit/test_voting.py) | Majority voting: passes on a majority, fails on a minority, `INCONCLUSIVE` breaks ties against `PASS` |
| [`tests/api/test_login.py`](tests/api/test_login.py) | `POST /v1/Account/token` returns a token for the test account |
| [`tests/api/test_auth_errors.py`](tests/api/test_auth_errors.py) | Wrong password does not leak whether the user exists; empty fields explain that username and password are required |
| [`tests/api/conftest.py`](tests/api/conftest.py) | Fixtures: `onix_token` (one login per session), `onix_client` (Bearer token), `onix_anon_client` (no token) |

## Layout

| Path | Purpose |
|---|---|
| `smart_assert/` | The library: `judge.py` (one LLM call → `Verdict`) and `voting.py` (`assert_semantic`) |
| `tests/unit/` | Library tests with the LLM mocked |
| `tests/api/` | Live demo tests against the Onixwork test API (marker `live`) |
| `data/raw/`, `data/labeled/` | Captured responses and the labeled dataset (empty for now) |
| `experiments/configs/` | One config per experiment arm (empty for now); `experiments/results/` is git-ignored |
| `baselines/` | Placeholder for traditional assertions to compare against (exact, rules, embedding) |
| `notebooks/` | Analysis and thesis charts (empty for now) |
| `dashboard/` | Optional demo dashboard (placeholder) |
| `docs/` | The 16-week plan and the capstone proposal documents (`.docx`) |

## Notes on the API under test

Server-written text is what this project targets; stored user text is better checked with exact
match. Known behavior of `POST /v1/Account/token` (details and more cases in section 2 of the plan):

- Valid login → `200`, body is a JSON string holding a JWT (valid about 60 minutes), used as
  `Authorization: Bearer <token>`.
- Wrong password or unknown user → `400 application/problem+json` with only `title: "Bad Request"`.
- Empty fields → `400 application/problem+json` with `errors.Username` / `errors.Password`
  messages such as "The Username field is required."
