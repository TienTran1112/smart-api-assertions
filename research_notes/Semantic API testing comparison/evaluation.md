# Capstone evaluation for semantic API assertions

## What research contribution is defensible?

### Takeaway
Evaluate a hybrid oracle: deterministic checks protect hard contracts; an LLM judges only selected semantic requirements. The contribution is a measured tradeoff between robustness to acceptable wording changes and the risk of accepting genuine defects, rather than merely connecting a model API to pytest.

### Cited Findings
- MT-Bench demonstrated useful agreement with human preferences while documenting position, verbosity, self-enhancement and reasoning limitations. Its chatbot preference results do not establish API defect detection accuracy. [Zheng et al., NeurIPS 2023](https://arxiv.org/abs/2306.05685)
- G-Eval evaluates summarization and dialogue generation, reports improved human alignment for its tasks and flags preference toward LLM-generated text. It motivates semantic evaluation but is not an API-testing benchmark. [Liu et al., EMNLP 2023](https://aclanthology.org/2023.emnlp-main.153/)

### Inferences
- Proposed research question: On APIs containing variable natural-language responses, does a hybrid deterministic-plus-LLM assertion approach reduce false alarms caused by acceptable paraphrases, compared with well-designed deterministic assertions, without an unacceptable increase in false passes, cost or latency?
- Proposed primary hypothesis: hybrid assertions reduce false alarms on valid paraphrases, with a prespecified minimum improvement (example: 20% relative reduction), while the upper 95% confidence bound for the increase in false-pass rate remains below a prespecified noninferiority margin (example: 2 percentage points). These numbers are planning examples, not established achievable results; choose margins with supervisor after pilot and size the held-out data accordingly.
- Secondary hypotheses: hybrid detects semantic contradictions missed by schema-only checks; frozen prompt/model configuration has acceptable repeatability; selecting only semantic fields reduces spend relative to sending full responses.
- A capstone remains valid if the hypothesis is rejected and analysis explains the limitations. Do not promise LLM superiority or zero false passes.

### Gaps
- There is no demonstrated performance on this project's API corpus yet. Dataset size needed for narrow noninferiority margins requires a pilot/power calculation and enough independent groups, not merely many near-duplicate paraphrases.

## How should the labeled dataset and comparisons be built?

### Takeaway
Use independently human-labeled request/response examples with known expected behavior, keep related cases in one split, and compare all approaches on exactly the same held-out examples and hard checks.

### Cited Findings
- Testing on data used to choose model settings or hyperparameters leaks information; independent validation and test sets are needed. Group-aware splitters keep groups disjoint. [scikit-learn cross-validation documentation](https://scikit-learn.org/stable/modules/cross_validation.html)
- Precision, recall, confusion matrices, F scores and chance-corrected agreement are defined in the official metrics guide. [scikit-learn model evaluation documentation](https://scikit-learn.org/stable/modules/model_evaluation.html)

### Inferences
- Feasible starting plan: pilot 100-150 responses, then a target corpus of roughly 600-1,000 cases across 10-20 scenario families and the three proposed response types (descriptive fields, errors, AI-generated content). These are planning ranges, not a power guarantee. Report independent families and samples per category.
- Store JSONL records with case_id, group_id, source/provenance, request, expected rubric, trusted contextual facts, selected response text, hard-check results, human label, defect type, severity, and annotator notes. Human gold labels should be valid/invalid/ambiguous; ambiguous cases reported separately, not forced into binary labels.
- Mix sanitized real responses (when permitted), controlled mocks, valid paraphrases, and seeded realistic mutations. Include missing required meaning, negation, contradictory facts, wrong cause, invented guarantees, numerical changes, irrelevant but fluent text, empty content, multilingual cases if in scope, and injected instructions. LLMs may propose variants but must not be the sole gold-label source.
- Two testers independently label with the same explicit rubric while blind to system judgments; resolve disagreement with a third reviewer. Record raw agreement and Cohen's kappa before adjudication, and agreement of each oracle with adjudicated labels. Trustworthy reference facts are essential for checking factual correctness; an LLM cannot establish truth from plausibility alone.
- Split by original case/template/semantic family (e.g. 40% development, 20% validation, 40% untouched final test) and keep every paraphrase/mutation of an original case together. Optionally add a separate held-out endpoint/domain test to measure transfer. Do not place gold labels or test examples in prompts or retrieval. Development split is for prompt/rule design, not model training.
- Compare B0: exact-string/snapshot baseline to demonstrate brittleness; B1 (primary): strong deterministic baseline with identical schema/status checks plus normalization, regex/synonym alternatives, numeric checks and domain rules; H: identical hard checks plus LLM semantic judge. Optionally add embedding similarity with validation-tuned threshold and an LLM-only ablation, both clearly secondary. Give rules and prompts the same development/validation access and record engineering effort.
- Evaluate both end-to-end behavior and the subset that passes hard checks; otherwise the same deterministic failures can hide weak semantic judging. Measure maintenance effort under controlled acceptable response changes: time and edits to restore correct behavior, never edits based on test labels.

### Gaps
- No particular API or endpoint permissions are confirmed. Use controlled fixtures initially, then validate on a held-out real API subset if feasible. Explicitly limit generalization if the corpus is primarily synthetic.

## Which metrics and operational controls matter?

### Takeaway
Define the positive class before naming false positives. Count invalid or uncertain judge results as non-passing operational outcomes, but report abstentions separately so conservative behavior cannot inflate apparent safety.

### Cited Findings
- Binary classification metrics depend on the selected positive label; precision and recall summarize different error tradeoffs. Cohen's kappa adjusts agreement for chance. [scikit-learn metrics documentation](https://scikit-learn.org/stable/modules/model_evaluation.html)
- Model judges' biases and agreement limitations justify direct human calibration and robustness checks rather than trusting a judge's explanation. [MT-Bench](https://arxiv.org/abs/2306.05685)

### Inferences
- Declare defect-positive convention: TP = defective response rejected; FN = defective response passed (false pass); FP = valid response rejected (false alarm); TN = valid response passed. Defect precision TP/(TP+FP); defect recall TP/(TP+FN); FPR FP/(FP+TN); false-pass rate among defective responses FN/(TP+FN). Also report escaped-defect proportion among passed cases FN/(TN+FN), as these answer different operational questions.
- For tri-state pass/fail/inconclusive outputs, report binary metrics on decisive outcomes plus coverage = decisive/total, class-specific coverage, and number/rate of inconclusive outcomes. Separately report end-to-end defect escape rate = defective cases passed / all defective cases and valid blocking rate = valid cases failed or inconclusive / all valid cases. This prevents gaming by abstaining. Timeouts, invalid JSON, refusal and provider failures must never become pass.
- Report F1, balanced accuracy, confusion matrix and results by response category, defect severity, injection status and source. Accuracy alone is insufficient on imbalanced data. Treat self-reported LLM confidence as uncalibrated unless calibrated and evaluated on held-out data.
- Freeze prompt, rubric, model identifier/snapshot if available, decoding settings, schema, retry policy and dataset. Repeat each held-out semantic case 5-10 times without result caching; report fraction of cases with any verdict flip, pairwise agreement and per-case verdict distributions. Same labels repeated are not independent samples for confidence intervals.
- Use paired comparisons because approaches share cases; obtain 95% confidence intervals by bootstrapping original groups, not individual related variants. McNemar can test paired binary disagreement where suitable, but structured correlated cases require group-aware inference.
- Measure end-to-end latency and incremental judge latency (p50/p95), tokens, actual spend per assertion and suite, retry counts, timeout/provider failure rate, and per-category results. Hold environment/concurrency fixed. Distinguish judge latency from the API under test's latency.
- Cost estimate = judged cases × repeats × average cost per call, plus retry and development budget. Log actual token counts and use provider pricing captured at experiment time rather than assuming a fixed per-call price. Cache valid for normal CI with keys covering selected input, rubric, prompt, model and schema versions; bypass cache for repeatability evaluation.
- CI initially runs deterministic gates and collects LLM judgments in shadow mode. Promote selected semantic checks only when validation criteria are met. Deterministic failures cannot be overridden; uncertain judgments block/flag for review under a documented policy, and report that manual-review burden.

### Gaps
- Thresholds for acceptable false-pass risk, latency and spend depend on project constraints. A low observed rate on a small sample is not proof of a low population rate; report uncertainty and remaining risks.
