# Smart API Assertions: one-page proposal (Checkpoint 1)

Tran Thuy Tien · MSE Applied Capstone · draft of 2026-11-18

## Problem

API tests check server-written text (error and validation messages, status explanations) with
exact match, keywords or regex. These checks break when a message is reworded but still
correct, and they miss a message that is worded fine but wrong in meaning, for example one that
leaks an internal exception or reveals that an account exists.

## Research question and hypotheses

**RQ1.** To what extent can a rubric-guided LLM judge, added on top of deterministic API
assertions, accept meaning-preserving text changes while still detecting semantic defects?

- **H1 (benefit):** on reworded-but-correct cases, the hybrid method has a lower false-failure
  rate than expert-written rules.
- **H2 (safety):** on the whole test set, its defect detection rate is not more than 5
  percentage points below expert-written rules (non-inferiority).

Exploratory: RQ2 verdict stability and 3-vote majority, RQ3 cost of a cheaper model, RQ4 prompt
injection inside responses and resilience to wording changes.

## Method

- **System under test:** the Onix Work public API (test environment).
- **Tool:** `smart-assert`, a TypeScript + Playwright Test library. Deterministic checks run
  first. Then Claude judges the text against tester-written criteria and returns PASS / FAIL /
  INCONCLUSIVE with a quoted evidence. Pass needs a strict majority; INCONCLUSIVE fails.
- **Dataset:** about 150 families × 4 variants (original, rewording, clear defect, hard case),
  about 600 cases. Labeled by two people; Cohen's kappa ≥ 0.70 as the target. Split by family:
  40% dev / 20% validation / 40% test. The test set is frozen in week 10.
- **Compared with:** B0 exact match, B1 expert regex/keyword rules (main comparison, effort
  logged), B2 embedding similarity.
- **Statistics:** bootstrap 95% CIs over families, McNemar's test, non-inferiority check for H2.

## Feasibility (done in W2, details in `docs/feasibility.md`)

- The judge runs end to end: 2 live Onix login tests pass with a semantic check. The
  TypeScript port gives the same verdicts as the Python prototype on 3/3 test inputs.
- 39 safe bad-request probes on 26 endpoints (plus login) gave **30 distinct real messages
  from 15 templates**, including real defects (a 500 that shows a .NET exception, parser messages with
  .NET type names).
- **Proposed track: Mixed.** About 40–60 families are seeded from real Onix text. The rest come
  from a small mock API with Onix-shaped responses. The two groups are reported separately.

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| No permission to send Onix text to an LLM | Redaction step; if still no, Track B (mock only), Onix only for the demo. Asked in writing in W1 |
| Too few real messages | Mixed track (above); mock families for the missing scenarios |
| Judge too lenient on LLM-written variants | Test-set variants written by hand or with a different tool; results per provenance |
| Weak baseline makes the result look better | Real, logged effort on B1; tuned on dev only |
| Result is negative or inconclusive | Reported honestly; the benchmark and the error analysis are still contributions |
| No second labeler | Blind self-relabel after 10 days + supervisor checks 30 cases; stated as a limitation |

## Asked from the supervisor at Checkpoint 1

1. Agree on RQ1, H1 and H2 as written.
2. Agree on the Mixed track (or choose A / B).
3. Confirm the data-permission answer, if it is not in yet.
