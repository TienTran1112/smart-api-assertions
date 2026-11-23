# Compare API assertions with LLM judges

**An LLM changes how a test decides whether a response is correct; it does not replace Python, Playwright, fixtures, or conventional assertions.** The recommended capstone is a hybrid: deterministic checks enforce the API contract, while an LLM evaluates selected requirements about language meaning. Its research contribution is measuring whether this reduces unnecessary failures on acceptable wording changes without allowing more real defects to escape. Connecting a model API to a test runner is the implementation; establishing when its judgments are reliable is the research. No model training, RAG, or vector database is necessary for this initial scope. All performance improvements below are hypotheses, not measured results.

Workspace context: the current [README](D:/FSB/AI_API/README.md), [package.json](D:/FSB/AI_API/package.json), and [pyproject.toml](D:/FSB/AI_API/pyproject.toml) describe TypeScript with Playwright Test for execution and Python for analysis. This report uses the requested Python/pytest example; the architecture also applies to that declared stack. Documentation was inspected; implementation behavior was not tested.

## The test runner stays; the correctness decision changes

Three uses of AI must be distinguished. AI can help write ordinary test code, with no model involved during execution. An API under test can return AI-generated content, while tests still check deterministic properties. This proposal instead introduces a **runtime LLM judge**, making a model call part of deciding the test result.

| Aspect | Conventional Python/Playwright | Hybrid with an LLM judge |
|---|---|---|
| Request execution | Playwright API client, fixtures, authentication | Same components |
| Structural correctness | Status, schema, types, required fields | Same checks, executed first |
| Business correctness | Explicit rules, calculations, identifiers | Retain explicit rules wherever possible |
| Flexible wording | Allowed variants, normalization, regex | Rubric describing required and forbidden meaning |
| Decision mechanism | Code evaluates explicit conditions | Model interprets text against trusted criteria |
| Reproducibility | Same inputs and rules give repeatable decisions | Repeated judgments can differ |
| Maintenance | Update rules when accepted behavior changes | Update and revalidate prompts, rubrics, and model configuration |
| Dependencies | Test environment and API under test | Adds model availability, credentials, quotas, and privacy constraints |
| Cost and latency | Local assertion overhead | Additional inference cost and delay |
| Principal danger | Rules miss a requirement or reject acceptable variation | Judge accepts fluent but incorrect content |

For example, “If the account exists, reset instructions will be emailed” and “We will email reset instructions if an account matches” can both satisfy a requirement. An exact-string assertion rejects one; a suitable regex or an LLM could accept both. “Your account exists and we sent instructions” violates an account-enumeration requirement despite sounding helpful. The judge must detect that distinction.

**Conventional assertions are not inherently brittle.** Ignoring irrelevant fields, validating contracts, and expressing allowed variation already improves robustness. Contract-breaking response changes remain defects. Playwright supports direct API requests without opening a browser, and pytest supplies ordinary assertions and failure reporting. ([Playwright API testing](https://playwright.dev/python/docs/api-testing), [pytest assertions](https://docs.pytest.org/en/stable/how-to/assert.html))

## A thin semantic adapter preserves hard checks

```text
Test request → API response → deterministic contract/business checks
                                      │ pass
                                      ▼
Selected text + sanitized context + trusted expected-behavior rubric
                                      ▼
Versioned prompt → model adapter → validated structured judgment
                                      ▼
                     PASS / FAIL / INCONCLUSIVE → test report
```

Hard-check failures stop evaluation. The LLM never overrides wrong status codes, permissions, identifiers, totals, or required fields. Supply trusted reference facts when correctness depends on facts: an LLM cannot verify a factual claim from plausibility alone. Require criterion-level verdicts, a short explanation, and supporting evidence where appropriate. Structured output constrains the result format; it does not establish that the judgment is correct. ([Structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs))

The following **illustrative interface sketch is not standalone runnable code**. `api` is a project-defined Playwright request fixture; `semantic_judge` is the adapter to implement. No provider SDK method is implied, and this example was not executed.

```python
def test_password_reset_message(api, semantic_judge):
    # Execute the request and enforce the hard contract.
    response = api.post(
        "/password-reset", data={"email": "test@example.invalid"}
    )
    assert response.status == 202
    body = response.json()
    assert isinstance(body.get("message"), str)

    # Judge only the flexible language against trusted criteria.
    result = semantic_judge(
        actual=body["message"],
        criteria=(
            "Explain that reset instructions will be sent if the account "
            "exists. Do not disclose whether this email is registered."
        ),
    )

    # A failed or inconclusive judgment cannot pass the test.
    assert result["verdict"] == "PASS", result["reason"]
```

Run with `pytest` after implementing those fixtures and configuring the test API. The adapter needs input minimization, bounded timeouts and retries, structured-result validation, and reporting of model/prompt versions, tokens, latency, and error categories. Timeout, refusal, malformed output, or missing required evidence becomes **INCONCLUSIVE**. It blocks a passing result but must be reported separately from a confirmed API defect. Never retry until a PASS appears.

## Evaluate semantic robustness and escaped defects together

**Research question:** For APIs containing variable natural-language responses, can hybrid deterministic-plus-LLM assertions reduce false alarms on acceptable paraphrases compared with well-designed deterministic assertions, while keeping escaped defects, cost, and latency within predefined limits?

**Hypothesis:** Hybrid assertions reduce the false-alarm rate on valid paraphrases by a prespecified amount, while the upper 95% confidence bound for the increase in escaped-defect rate remains below a prespecified margin. Illustrative planning targets are a 20% relative false-alarm reduction and a 2-percentage-point margin; select justified targets and sample size after a pilot with the supervisor. These are not achieved results. Prior LLM-judge studies motivate the approach but concern generation quality and chatbot preferences, not this project's API defect detection. ([MT-Bench](https://arxiv.org/abs/2306.05685), [G-Eval](https://aclanthology.org/2023.emnlp-main.153/))

Start with a 100–150-case pilot, then plan roughly 600–1,000 cases across descriptive fields, errors, and AI-generated content. Final size must support the chosen error margin, with enough independent defective cases. Store request context, trusted rubric/reference facts, selected response, provenance, family identifier, human label, defect category, and severity in JSONL. Combine permitted sanitized responses, controlled fixtures, acceptable paraphrases, and realistic seeded defects. Include negation, missing meaning, contradiction, wrong cause, unsupported guarantees, fluent irrelevant content, and prompt injections. State limits if most data is synthetic.

Two testers independently label cases as valid, defective, or ambiguous while blind to system verdicts. A third reviewer adjudicates disagreements. Record agreement before adjudication; keep ambiguous cases separate. An LLM may propose examples but must not supply the sole gold labels. Split development/validation/test by original case or semantic family, keeping all derived paraphrases and mutations together. Freeze prompts and rules before the final test; never retrieve final-test labels into prompts. Group-disjoint splits prevent closely related examples leaking across evaluation stages. ([Cross-validation guidance](https://scikit-learn.org/stable/modules/cross_validation.html))

| Comparison | Purpose |
|---|---|
| Exact-string baseline | Diagnostic illustration of wording brittleness |
| Strong deterministic baseline, primary | Same hard checks plus normalization, allowed variants, regex, and domain rules |
| Hybrid | Same hard checks plus semantic judge |
| Optional ablations | LLM-only, embedding similarity, additional model or voting strategy |

Give rules and prompts equal development-data access and record engineering effort. Evaluate both end-to-end results and the subset passing hard checks, so shared structural detections do not hide weak semantic judgments.

Define **defect as the positive class**: TP is a rejected defect; FN is a passed defect; FP is a rejected valid response; TN is a passed valid response. Thus a false pass is a false negative, not a false positive. ([Metric definitions](https://scikit-learn.org/stable/modules/model_evaluation.html))

| Metric | Definition or measurement |
|---|---|
| Defect precision / recall | TP/(TP+FP); TP/(TP+FN) |
| False-alarm rate | FP/(FP+TN) |
| Escaped-defect rate | FN/(TP+FN), among defective decisive cases |
| Defects among passed cases | FN/(TN+FN); depends on defect prevalence |
| Abstention | INCONCLUSIVE rate, overall and by true class |
| Coverage | Decisive judgments / all judgments |
| Operational safety/burden | Defects passed / all defects; valid cases blocked / all valid cases, including inconclusive outcomes |
| Human agreement | Raw agreement and Cohen's kappa before adjudication; oracle agreement with gold labels |
| Consistency | 5–10 uncached runs per case; verdict-flip rate and per-case verdict distribution |
| Efficiency | Judge and total latency p50/p95, tokens, actual cost per assertion/suite, retries, failures |
| Maintenance | Time and edits needed after controlled acceptable wording changes |

Report confidence intervals and category/severity breakdowns. Use paired comparisons and bootstrap original groups, not related variants or repeated calls as independent samples. Low observed escape counts in a small dataset do not establish low population risk. Record pricing at experiment time; separate API latency from judge latency.

## Use only pipeline stages the scope needs

Statuses below apply to the minimum capstone using a pretrained hosted judge.

| Stage | Status | Reason and suitable tools |
|---|---|---|
| Data ingestion | REQUIRED | Capture permitted cases and provenance; JSONL, Playwright |
| Human labeling | REQUIRED | Independent reference labels; CSV annotation form, documented rubric |
| EDA | REQUIRED | Inspect class balance, lengths, duplicates, sources; pandas, matplotlib |
| Preprocessing | REQUIRED | Parse, select fields, redact secrets; Python `json`, explicit redaction rules |
| Feature engineering | OPTIONAL | Length/category metadata for analysis or classical baselines; pandas |
| Training from scratch | NOT APPLICABLE | Research evaluates pretrained judgments |
| Fine-tuning | OPTIONAL | Separate extension only if pilot identifies a justified need; provider-supported tooling |
| Prompt/rubric development | REQUIRED | Operationalize expected meaning; versioned Markdown/JSON |
| Validation | REQUIRED | Choose prompts/rules using separate data; pytest, pandas |
| Held-out testing | REQUIRED | Estimate generalization and uncertainty; pytest, statistical analysis |
| LLM integration | REQUIRED | Model adapter, structured outputs, error handling; provider SDK or HTTP client |
| RAG | OPTIONAL | Retrieve trusted specifications only if they exceed practical prompt context |
| Embeddings/vector store | OPTIONAL | Only if semantic retrieval or an embedding baseline is justified; FAISS or pgvector |
| Metrics/experiment tracking | REQUIRED | Preserve reproducible results; JSONL/CSV plus Git; MLflow optional |
| Deployment | REQUIRED, minimal | Reproducible local/CI runner; virtual environment and lockfile; service deployment optional |
| CI/CD | OPTIONAL | Useful integration demonstration; GitHub Actions or Azure Pipelines |
| DevOps | REQUIRED, minimal | Git, dependency versions, secrets and environment configuration; Docker optional |
| Traditional training MLOps | NOT APPLICABLE | No model training/retraining lifecycle in the minimum scope |
| LLMOps | REQUIRED, minimal | Version prompts/models, track budget, reevaluate changes, retain audit metadata |
| Production model serving | NOT APPLICABLE | Hosted model inference avoids GPU serving/Kubernetes infrastructure |

## Control judge risks before using release gates

| Risk | Controls |
|---|---|
| Non-determinism | Freeze versions/settings where available; measure uncached repeated runs; low temperature is not a guarantee |
| False passes | Preserve hard checks, use explicit forbidden meanings and adversarial defects, report uncertainty and severity; do not trust self-reported confidence |
| Prompt injection | Treat response text as untrusted data; separate trusted rubric, restrict fields, disable tools/browsing/code execution, and test injected instructions |
| Cost | Judge selected cases after hard checks; cap text/output, concurrency, retries, and suite budget; log actual usage |
| Privacy | Prefer synthetic/public cases; remove secrets and identifiers; approve provider retention/access terms; redact logs |
| Model/provider changes | Reevaluate a fixed regression set before adopting changes; preserve configuration and comparison records |

Delimiters and instructions reduce ambiguity but do not guarantee injection resistance. Structured JSON does not make a verdict trustworthy. Provider guidance supports explicit trust boundaries for untrusted content. ([Injection mitigation](https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/mitigate-jailbreaks)) Provider training-use policies and retention policies are separate; verify applicable terms before sending private responses. ([API data retention](https://platform.claude.com/docs/en/manage-claude/api-and-data-retention))

Cache whole judgments only with keys covering input, context, rubric, prompt, model, and configuration; disable this cache for consistency experiments. Begin CI integration in shadow mode, retaining conventional release gates. Promote selected semantic checks only after demonstrating acceptable escaped-defect risk and review burden. A defensible capstone can also conclude that the LLM is unsuitable for particular response categories: identifying that boundary is a useful result.
