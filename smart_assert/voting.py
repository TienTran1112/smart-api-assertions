"""Majority voting over several judge calls, exposed as a pytest assertion."""

import pytest

from .judge import judge


def assert_semantic(actual: str, expected: str, context: str = "", votes: int = 3) -> None:
    verdicts = [judge(actual, expected, context) for _ in range(votes)]
    passes = sum(v.verdict == "PASS" for v in verdicts)
    if passes * 2 <= votes:  # PASS needs a strict majority
        worst = next(v for v in verdicts if v.verdict != "PASS")
        pytest.fail(f"Semantic assertion failed ({passes}/{votes} PASS): "
                    f"{worst.reason} | evidence: {worst.evidence!r}")
