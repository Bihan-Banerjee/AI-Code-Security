"""
Tests for jwt_auth.py

Run with:
    pip install pytest PyJWT cryptography flask
    pytest test_jwt_auth.py -v
"""

import time
import os
import pytest
import jwt as pyjwt

# ── Set env vars BEFORE importing the app ──────────────────────────────────
SECRET  = "a-very-long-secret-that-is-at-least-32-bytes!!"   # 48 bytes
ISSUER  = "https://auth.example.com"
AUDIENCE = "https://api.example.com"

os.environ["JWT_SECRET_KEY"] = SECRET
os.environ["JWT_ISSUER"]     = ISSUER
os.environ["JWT_AUDIENCE"]   = AUDIENCE

from jwt_auth import app   # noqa: E402  (import after env setup)


@pytest.fixture()
def client():
    app.config["TESTING"] = True
    with app.test_client() as c:
        yield c


# ── Helper ─────────────────────────────────────────────────────────────────
def make_token(
    sub="user-123",
    iss=ISSUER,
    aud=AUDIENCE,
    exp_offset=300,        # seconds from now
    iat_offset=0,
    algorithm="HS256",
    secret=SECRET,
    extra_claims=None,
):
    now = int(time.time())
    payload = {
        "sub": sub,
        "iss": iss,
        "aud": aud,
        "iat": now + iat_offset,
        "exp": now + exp_offset,
    }
    if extra_claims:
        payload.update(extra_claims)
    return pyjwt.encode(payload, secret, algorithm=algorithm)


def auth_header(token):
    return {"Authorization": f"Bearer {token}"}


# ── Tests ──────────────────────────────────────────────────────────────────
class TestProtectedEndpoint:

    def test_valid_token_returns_200(self, client):
        token = make_token()
        resp = client.get("/api/protected", headers=auth_header(token))
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["subject"] == "user-123"

    def test_no_auth_header_returns_401(self, client):
        resp = client.get("/api/protected")
        assert resp.status_code == 401
        assert resp.get_json() == {"error": "Unauthorized"}

    def test_malformed_bearer_returns_401(self, client):
        resp = client.get("/api/protected", headers={"Authorization": "Token abc"})
        assert resp.status_code == 401

    def test_empty_token_returns_401(self, client):
        resp = client.get("/api/protected", headers={"Authorization": "Bearer "})
        assert resp.status_code == 401

    def test_expired_token_returns_401(self, client):
        token = make_token(exp_offset=-1)   # already expired
        resp = client.get("/api/protected", headers=auth_header(token))
        assert resp.status_code == 401

    def test_wrong_secret_returns_401(self, client):
        token = make_token(secret="completely-different-secret-key-xyz!!")
        resp = client.get("/api/protected", headers=auth_header(token))
        assert resp.status_code == 401

    def test_wrong_issuer_returns_401(self, client):
        token = make_token(iss="https://evil.example.com")
        resp = client.get("/api/protected", headers=auth_header(token))
        assert resp.status_code == 401

    def test_wrong_audience_returns_401(self, client):
        token = make_token(aud="https://other-api.example.com")
        resp = client.get("/api/protected", headers=auth_header(token))
        assert resp.status_code == 401

    def test_none_algorithm_rejected(self, client):
        """'alg: none' attack must be blocked."""
        # PyJWT 2.x won't encode with none; craft the header manually
        import base64, json
        header  = base64.urlsafe_b64encode(
            json.dumps({"alg": "none", "typ": "JWT"}).encode()
        ).rstrip(b"=").decode()
        now = int(time.time())
        payload_b = base64.urlsafe_b64encode(
            json.dumps({
                "sub": "attacker", "iss": ISSUER, "aud": AUDIENCE,
                "iat": now, "exp": now + 300,
            }).encode()
        ).rstrip(b"=").decode()
        forged = f"{header}.{payload_b}."   # empty signature
        resp = client.get("/api/protected", headers=auth_header(forged))
        assert resp.status_code == 401

    def test_missing_exp_claim_returns_401(self, client):
        now = int(time.time())
        payload = {"sub": "u1", "iss": ISSUER, "aud": AUDIENCE, "iat": now}
        token = pyjwt.encode(payload, SECRET, algorithm="HS256")
        resp = client.get("/api/protected", headers=auth_header(token))
        assert resp.status_code == 401

    def test_error_response_never_leaks_details(self, client):
        """401 body must be a generic message only."""
        token = make_token(exp_offset=-1)
        resp = client.get("/api/protected", headers=auth_header(token))
        body = resp.get_json()
        assert list(body.keys()) == ["error"]
        assert "token" not in body["error"].lower()
        assert "expire" not in body["error"].lower()


class TestHealthEndpoint:
    def test_health_is_public(self, client):
        resp = client.get("/health")
        assert resp.status_code == 200
        assert resp.get_json()["status"] == "ok"