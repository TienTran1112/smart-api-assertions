# Conventional API testing and LLM semantic assertions

## What changes in the framework and current workspace?

### Takeaway
The HTTP client, fixtures, authentication, test data, runner, structural assertions and reporting remain conventional. The new component is a probabilistic semantic oracle, invoked only for requirements that allow meaningful variation.

### Cited Findings
- Playwright Python sends REST requests directly through APIRequestContext and integrates with pytest fixtures; browser page execution is unnecessary for this API flow. [Playwright API testing](https://playwright.dev/python/docs/api-testing)
- pytest evaluates ordinary Python assert statements and reports expressions and optional failure messages. [pytest assertions](https://docs.pytest.org/en/stable/how-to/assert.html)
- Structured model outputs constrain JSON shape and fields. They address machine-readable verdicts, not the truth of the semantic decision. [Claude structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs)
- Local current-source evidence: D:/FSB/AI_API/README.md explicitly states tests and judge are now TypeScript + Playwright Test and Python is analysis-only; package.json contains @playwright/test, @anthropic-ai/sdk, zod and ajv; pyproject.toml describes smart-assert-analysis. These files were read, but no source implementation or prior execution claim was independently verified. [README](D:/FSB/AI_API/README.md), [package.json](D:/FSB/AI_API/package.json), [pyproject.toml](D:/FSB/AI_API/pyproject.toml).

### Inferences
- Explain the conceptual Python/Playwright comparison requested by the user while briefly noting that their actual workspace declares TypeScript execution. Do not imply their current tests have been run or validated.
- AI writing a test is separate from an LLM deciding the test result. AI-generated Python exact assertions still run deterministically without a runtime model dependency.
- Without LLM: request -> hard contract/business checks -> explicit text/regex/rules -> report. With LLM: same request and hard checks -> allowlisted text/context -> prompt and criteria -> judge -> validate verdict -> report. No judge override of status, types, identifiers, money, permissions or required contract fields.
- Conventional tests are not inherently brittle: ignore irrelevant fields, validate schema, normalize only permitted differences, use ranges, property-based and metamorphic rules. An LLM is helpful when the remaining acceptance criterion genuinely depends on language meaning.
- A test target returning AI text does not force an AI test oracle; machine-checkable requirements should still use deterministic code.
- No benefit should be claimed merely from accepting schema drift: contract-breaking missing fields remain defects.

### Gaps
- User has not requested implementation. No API calls, credentials, .env content or paid execution were used. Workspace README behavior descriptions are documentation claims, not verified runtime findings.

## What is the minimal architecture and illustrative Python example?

### Takeaway
Build a thin reusable semantic assertion adapter, retain hard checks first and preserve PASS, FAIL and INCONCLUSIVE internally. Only PASS permits the semantic check to succeed.

### Cited Findings
- Playwright provides standalone isolated request contexts and explicit disposal. [APIRequestContext](https://playwright.dev/python/docs/api/class-apirequestcontext)
- Schema-constrained outputs support fields and enumerations appropriate for verdict, criterion results, short explanation and evidence. [Structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs)

### Inferences
- Recommended flow: trusted expected behavior + minimum sanitized request context + selected response text -> versioned prompt -> fixed model/config via adapter -> JSON/schema and evidence validation -> test report with model/prompt/rubric version, tokens, latency and error category.
- Adapter must treat timeout, refusal, API error, truncated output, malformed verdict and missing evidence as INCONCLUSIVE. A failed or inconclusive assertion blocks the test; report the latter as judge infrastructure uncertainty rather than a confirmed API defect. Never retry until PASS.
- Require criterion-level verdicts and exact evidence spans; validate quotations occur in submitted text. This catches fabricated citations but does not prove semantic reasoning correct. Requirements about absence need explicit full-text review; a single quotation cannot establish absence.
- Suggested illustrative code below intentionally depends on project-defined api and semantic_judge fixtures. It is an interface sketch, not runnable standalone and not a fabricated SDK method. The semantic_judge fixture must implement bounded timeout/retries, input minimization, structured parsing, and inconclusive errors. The code has not been executed.

```python
def test_password_reset_message(api, semantic_judge):
    # Execute the API and retain hard contract checks.
    response = api.post('/password-reset', data={'email': 'test@example.invalid'})
    assert response.status == 202
    body = response.json()
    assert isinstance(body.get('message'), str)

    # Evaluate only the flexible text against a trusted requirement.
    result = semantic_judge(
        actual=body['message'],
        criteria=(
            'State that reset instructions will be sent if the account exists. '
            'Do not disclose whether this email is registered.'
        ),
    )

    # FAIL and INCONCLUSIVE both prevent a passing test.
    assert result['verdict'] == 'PASS', result['reason']
```

### Gaps
- Specific model names, provider-specific SDK details, pricing and sampling controls should not be invented. Use supported controls of the selected provider and pin model/version where available; even low temperature is not a determinism guarantee.

## Which risks and pipeline stages matter?

### Takeaway
Evaluation data and judge operations are required, while model training, RAG, embeddings and production serving are not prerequisites. Each added component needs its own measurable benefit.

### Cited Findings
- Response bodies are analogous to other third-party content containing indirect prompt injection; provider guidance calls for explicit trust boundaries and constrained handling. [Claude injection mitigation](https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/mitigate-jailbreaks)
- Anthropic states commercial API data is not used for training unless agreed otherwise; this is not a blanket no-retention guarantee, and consumer and API terms differ. [Commercial API data use](https://privacy.claude.com/en/articles/7996875-can-you-delete-data-that-i-sent-via-api), [API retention](https://platform.claude.com/docs/en/manage-claude/api-and-data-retention)
- Provider prompt caching reuses prompt prefixes to reduce processing cost/latency. It differs from caching the entire verdict and does not make repeated judgments deterministic. [Prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)

### Inferences
- REQUIRED for research: ingestion/capture, labeling, basic EDA (class balance, families, text lengths, duplicates), preprocessing with audit trail, train/dev/test terminology adapted as prompt-development/validation/held-out test, model integration, metrics, reproducible runner, minimal LLMOps (versioning, budgets, logs, canary reevaluation).
- OPTIONAL: automated CI execution, Docker, dashboards, experiment tracking services, embeddings similarity baseline, retrieval when specification context is too large, vector DB only if semantic retrieval is justified, fine-tuning as a separately justified later study.
- NOT APPLICABLE to minimum pretrained-judge project: training a foundation model from scratch, supervised feature engineering as a required ML training pipeline, distributed training, full model registry/retraining orchestration, Kubernetes production inference serving. Basic environment/Git/secrets management still applies.
- False passes: retain hard checks, test negation and subtle wrong meanings, use blinded humans, prioritize false-pass confidence intervals and subgroup outcomes. Majority votes can share systematic errors and add cost; evaluate as an ablation rather than assume correctness.
- Injection: put trusted rubric outside untrusted response content, serialize/delimit safely, restrict to selected fields, no browsing/tools/code execution, test adversarial payloads. Delimiters or a system message alone are not a security boundary; schema only constrains form.
- Privacy: use approved synthetic/public data first, remove auth headers/tokens and identifiers before model submission, use authorized provider terms, redact traces, minimize retention and access. Do not redact away the very defect being tested; design synthetic privacy-leak cases with placeholders.
- Cost: hard checks first, input/output caps, per-suite budget, bounded concurrency/timeouts, one fixed model and selective suites. Full-verdict cache keys must include request/context, response, rubric, prompt, model/config version; disable verdict caching in independent repeated-run consistency experiments.
- Latency: report API latency separately from judge latency and total suite wall time, including retries/errors. A slow judge is not evidence that the API itself is slow.

### Gaps
- No experimentally demonstrated accuracy, maintenance reduction, cost or latency exists from this research. Treat all proposed improvements as hypotheses.
