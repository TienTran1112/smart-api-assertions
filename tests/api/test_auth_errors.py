"""Demo test against the live Onixwork test API.

The endpoint path below is a PLACEHOLDER: replace it with a real one from
https://openapi-test.onixwork.com/swagger/index.html (needs VPN).
Run with:  pytest -m live
"""

import httpx
import pytest

from smart_assert import assert_semantic

BASE = "https://openapi-test.onixwork.com"


@pytest.mark.live
def test_login_wrong_password_returns_safe_helpful_error():
    r = httpx.post(f"{BASE}/api/auth/login",
                   json={"email": "qa.user@example.com", "password": "wrong"})
    assert r.status_code == 401  # classic
    assert "message" in r.json()  # classic (structure)
    assert_semantic(  # smart (meaning)
        r.json()["message"],
        expected=("Tells the user that login failed because the credentials are invalid. "
                  "MUST NOT reveal whether the email exists. "
                  "MUST NOT include stack traces or internal error details."),
    )
