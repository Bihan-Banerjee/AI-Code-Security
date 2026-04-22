"""
JWT-protected Flask REST API endpoint.

Dependencies:
    pip install flask PyJWT cryptography

Environment variables required:
    JWT_SECRET_KEY  — at least 256-bit (32+ byte) secret for HS256
    JWT_ISSUER      — expected `iss` claim  (e.g. "https://auth.example.com")
    JWT_AUDIENCE    — expected `aud` claim  (e.g. "https://api.example.com")
"""

import os
import logging
from functools import wraps

import jwt                          # PyJWT >= 2.x
from flask import Flask, request, jsonify, g

# ---------------------------------------------------------------------------
# Logging — never log token contents or decoded claim values in production
# ---------------------------------------------------------------------------
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# ---------------------------------------------------------------------------
# Configuration — loaded exclusively from environment variables
# ---------------------------------------------------------------------------
def _require_env(name: str) -> str:
    """Return the env-var value or raise at startup — fail fast."""
    value = os.environ.get(name)
    if not value:
        raise EnvironmentError(
            f"Required environment variable '{name}' is not set."
        )
    return value


class Config:
    # Secret must be ≥ 32 bytes (256 bits) for HS256.
    JWT_SECRET_KEY: str = _require_env("JWT_SECRET_KEY")
    JWT_ISSUER: str     = _require_env("JWT_ISSUER")
    JWT_AUDIENCE: str   = _require_env("JWT_AUDIENCE")
    JWT_ALGORITHM: str  = "HS256"          # switch to "RS256" for asymmetric keys
    JWT_LEEWAY_SECONDS: int = 10           # tolerate ≤ 10 s clock skew


# Guard: reject obviously weak secrets at startup
if len(Config.JWT_SECRET_KEY.encode()) < 32:
    raise ValueError(
        "JWT_SECRET_KEY must be at least 32 bytes (256 bits) for HS256."
    )

# ---------------------------------------------------------------------------
# Generic 401 response — never reveal why validation failed
# ---------------------------------------------------------------------------
_UNAUTHORIZED = (jsonify({"error": "Unauthorized"}), 401)


# ---------------------------------------------------------------------------
# JWT authentication decorator
# ---------------------------------------------------------------------------
def jwt_required(f):
    """
    Decorator that enforces JWT authentication before the view executes.

    Validates:
      • Presence of a Bearer token in Authorization header
      • Signature (HS256/RS256 only — 'none' algorithm is blocked)
      • Expiry (exp claim)
      • Not-before (nbf claim, if present)
      • Issuer (iss claim)
      • Audience (aud claim)

    On success  → stores decoded payload in `g.jwt_payload`.
    On failure  → returns 401 with a generic message; never leaks details.
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")

        # ── 1. Extract Bearer token ────────────────────────────────────────
        if not auth_header.startswith("Bearer "):
            logger.warning("Missing or malformed Authorization header.")
            return _UNAUTHORIZED

        token = auth_header[len("Bearer "):]   # everything after "Bearer "
        if not token:
            return _UNAUTHORIZED

        # ── 2. Decode & validate ───────────────────────────────────────────
        try:
            payload = jwt.decode(
                token,
                Config.JWT_SECRET_KEY,
                # Explicitly allowlist algorithms — PyJWT 2.x raises
                # InvalidAlgorithmError for anything not in this list,
                # which blocks the "alg: none" attack automatically.
                algorithms=[Config.JWT_ALGORITHM],
                options={
                    "require": ["exp", "iss", "aud", "iat"],
                    "verify_exp": True,
                    "verify_iss": True,
                    "verify_aud": True,
                    # Reject tokens whose nbf has not yet passed
                    "verify_nbf": True,
                },
                issuer=Config.JWT_ISSUER,
                audience=Config.JWT_AUDIENCE,
                leeway=Config.JWT_LEEWAY_SECONDS,
            )
        except jwt.ExpiredSignatureError:
            logger.info("Token rejected: expired.")
            return _UNAUTHORIZED
        except jwt.InvalidAlgorithmError:
            logger.warning("Token rejected: disallowed algorithm.")
            return _UNAUTHORIZED
        except jwt.PyJWTError:
            # Covers: InvalidSignatureError, DecodeError, ImmatureSignatureError,
            # InvalidIssuerError, InvalidAudienceError, MissingRequiredClaimError, …
            # Log at INFO — no claim values, no token fragments.
            logger.info("Token rejected: validation failure.")
            return _UNAUTHORIZED

        # ── 3. Attach payload to request context for downstream use ────────
        g.jwt_payload = payload
        return f(*args, **kwargs)

    return decorated


# ---------------------------------------------------------------------------
# Protected endpoint
# ---------------------------------------------------------------------------
@app.route("/api/protected", methods=["GET"])
@jwt_required                               # authentication checked FIRST
def protected_resource():
    """
    Business logic only runs after successful JWT verification.
    The `sub` claim is read from g.jwt_payload; it was already validated above.
    """
    subject = g.jwt_payload.get("sub", "unknown")

    # Safe to use validated claims — but never echo raw token data to clients
    return jsonify({
        "message": "Access granted.",
        "subject": subject,
    }), 200


# ---------------------------------------------------------------------------
# Health check (unauthenticated)
# ---------------------------------------------------------------------------
@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"}), 200


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    # Never run with debug=True in production — it can expose stack traces
    app.run(debug=False, host="0.0.0.0", port=8080)