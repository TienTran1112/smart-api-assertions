"""Smoke test: the test account can log in and receive a token."""

import pytest


@pytest.mark.live
def test_login_returns_token(onix_token):
    assert isinstance(onix_token, str)
    assert len(onix_token) > 20
