# smart-assert

LLM-as-a-judge semantic assertions for API testing. This is a Master's capstone project; the full plan is in [docs/capstone-plan.md](docs/capstone-plan.md).

## Setup (Windows)

```bash
uv venv --python 3.12
uv pip install -e ".[dev]"
copy .env.example .env      # then put your ANTHROPIC_API_KEY in .env
```

## Run tests

```bash
.venv\Scripts\python -m pytest            # unit tests only, LLM mocked, free
.venv\Scripts\python -m pytest -m live    # live API + real LLM (VPN + API key, costs money)
```

## Layout

| Folder | Purpose |
|---|---|
| `smart_assert/` | The library: `judge.py` (one LLM call → `Verdict`) and `voting.py` (`assert_semantic`) |
| `tests/unit/` | Tests of the library, with the LLM mocked |
| `tests/api/` | Demo tests against the Onixwork test API |
| `baselines/` | Traditional assertions to compare against: exact, keyword, schema, embedding |
| `data/raw`, `data/labeled` | Captured responses and the labeled dataset |
| `experiments/` | Evaluation harness and run configs |
| `notebooks/` | Analysis and thesis charts |
| `docs/` | Plan and thesis notes |
