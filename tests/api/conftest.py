"""Login to the Onixwork test API and share an authenticated client with live tests.

Credentials come from .env (ONIX_USERNAME / ONIX_PASSWORD), never from code.
The token is short-lived (60 min), so one login per test session is enough.
"""

import os

import httpx
import pytest
from dotenv import dotenv_values

# Like load_dotenv(), but also fills variables that exist yet are EMPTY in the OS
# environment (e.g. a blank ANTHROPIC_API_KEY in Windows user settings), which
# load_dotenv() would skip. Non-empty OS values (CI secrets) still win.
for _key, _value in dotenv_values().items():
    if _value and not os.environ.get(_key):
        os.environ[_key] = _value

BASE = os.getenv("ONIX_BASE_URL", "https://openapi-test.onixwork.com")
VERIFY_TLS = os.getenv("ONIX_VERIFY_TLS", "true").lower() != "false"


def get_onix_token(username: str | None = None, password: str | None = None) -> str:
    """POST /v1/Account/token and return the access token string."""
    username = username or os.environ["ONIX_USERNAME"]
    password = password or os.environ["ONIX_PASSWORD"]
    r = httpx.post(f"{BASE}/v1/Account/token",
                   json={"username": username, "password": password},
                   verify=VERIFY_TLS, timeout=30)
    r.raise_for_status()
    return r.text.strip().strip('"')  # body is the bare token (text/plain)


@pytest.fixture(scope="session")
def onix_token() -> str:
    return get_onix_token()


@pytest.fixture(scope="session")
def onix_anon_client():
    """httpx client with base URL but no token, for login and auth-error tests."""
    with httpx.Client(base_url=BASE, verify=VERIFY_TLS, timeout=30) as client:
        yield client


@pytest.fixture(scope="session")
def onix_client(onix_token):
    """httpx client with base URL and 'Authorization: Bearer <token>' preset."""
    with httpx.Client(base_url=BASE, verify=VERIFY_TLS, timeout=30,
                      headers={"Authorization": f"Bearer {onix_token}"}) as client:
        yield client
