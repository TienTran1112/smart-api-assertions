"""Live tests for login errors on the Onixwork test API (POST /v1/Account/token).

Real behavior observed on 2026-11-10:
- wrong password -> 400, application/problem+json, title "Bad Request", no message text
- empty fields   -> 400, application/problem+json, errors{Username, Password} with messages

Each test does the classic checks first and only then the semantic (LLM) check.
Run with:  pytest -m live
"""

import pytest

from smart_assert import assert_semantic

LOGIN = "/v1/Account/token"
PROBLEM_JSON = "application/problem+json"
FAKE_USER = "qa.user@example.com"


@pytest.mark.live
def test_login_wrong_password_is_rejected_safely(onix_anon_client):
    r = onix_anon_client.post(LOGIN, json={"username": FAKE_USER, "password": "wrong"})

    assert r.status_code == 400  # classic
    assert r.headers["content-type"].startswith(PROBLEM_JSON)  # classic (structure)
    assert "title" in r.json()  # classic (structure)
    assert FAKE_USER not in r.text  # classic: username is not echoed back

    assert_semantic(  # smart (meaning)
        r.json()["title"],
        expected=("MUST NOT reveal whether the username exists. "
                  "MUST NOT include stack traces or internal error details."),
        context="Error title returned by a login endpoint after a wrong password.",
    )


@pytest.mark.live
def test_login_empty_fields_explains_what_is_missing(onix_anon_client):
    r = onix_anon_client.post(LOGIN, json={"username": "", "password": ""})

    assert r.status_code == 400  # classic
    assert r.headers["content-type"].startswith(PROBLEM_JSON)  # classic (structure)
    errors = r.json()["errors"]
    assert {"Username", "Password"} <= errors.keys()  # classic (structure)

    messages = "\n".join(msg for field in errors.values() for msg in field)
    assert_semantic(  # smart (meaning): wording may change, meaning must not
        messages,
        expected=("Tells the user that the username is required. "
                  "Tells the user that the password is required."),
        context="Validation messages returned by a login endpoint when both fields are empty.",
    )
