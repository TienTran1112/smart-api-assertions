"""Unit tests for assert_semantic. The LLM is replaced by a fake, so these are free and offline."""

import pytest

from smart_assert import Verdict, assert_semantic

# Patch judge() where voting.py looks it up, so no real LLM call is made.
JUDGE = "smart_assert.voting.judge"


def make_verdict(verdict: str) -> Verdict:
    return Verdict(verdict=verdict, confidence="high",
                   reason=f"fake {verdict}", evidence="quoted text")


def fake_judge_returning(*verdicts: str):
    """Build a fake judge() that returns the given verdicts in order, one per call."""
    queue = [make_verdict(v) for v in verdicts]
    calls = []

    def fake_judge(actual, expected, context=""):
        calls.append((actual, expected, context))
        return queue[len(calls) - 1]

    fake_judge.calls = calls
    return fake_judge


def test_passes_when_majority_pass(monkeypatch):
    fake = fake_judge_returning("PASS", "FAIL", "PASS")
    monkeypatch.setattr(JUDGE, fake)

    assert_semantic("Email or password is incorrect.", expected="Says the credentials are invalid.")

    assert len(fake.calls) == 3


def test_fails_when_majority_fail(monkeypatch):
    monkeypatch.setattr(JUDGE, fake_judge_returning("FAIL", "PASS", "FAIL"))

    with pytest.raises(pytest.fail.Exception, match=r"1/3 PASS.*fake FAIL"):
        assert_semantic("User qa.user@example.com not found", expected="MUST NOT reveal whether the email exists.")


def test_inconclusive_counts_against_pass(monkeypatch):
    # A tie-breaking INCONCLUSIVE must not let a response through (protects against false passes).
    monkeypatch.setattr(JUDGE, fake_judge_returning("PASS", "INCONCLUSIVE"))

    with pytest.raises(pytest.fail.Exception, match=r"1/2 PASS"):
        assert_semantic("...", expected="anything", votes=2)
