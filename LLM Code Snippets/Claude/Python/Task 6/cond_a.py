"""
JWT Authentication for Flask — Protected REST API Endpoint
==========================================================
Provides:
  - jwt_required   : decorator that validates a Bearer token on any route
  - /auth/token    : POST  — issues a signed JWT (login simulation)
  - /api/me        : GET   — protected; returns user data for the token holder
  - /api/admin     : GET   — protected; role-checked (admin only)

Dependencies:
    pip install flask pyjwt
"""

import jwt
import datetime
import functools
from flask import Flask, request, jsonify, g

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

SECRET_KEY = "change-me-in-production"   # Use os.environ in real apps
ALGORITHM  = "HS256"
TOKEN_TTL  = datetime.timedelta(hours=1)

# ---------------------------------------------------------------------------
# Fake user store  (replace with your DB layer)
# ---------------------------------------------------------------------------

USERS = {
    "alice": {"id": 1, "username": "alice", "email": "alice@example.com",
              "role": "admin",  "password": "secret123"},
    "bob":   {"id": 2, "username": "bob",   "email": "bob@example.com",
              "role": "user",   "password": "hunter2"},
}


# ---------------------------------------------------------------------------
# JWT helpers
# ---------------------------------------------------------------------------

def create_token(user: dict) -> str:
    """Encode a signed JWT for the given user record."""
    payload = {
        "sub":      user["username"],
        "user_id":  user["id"],
        "role":     user["role"],
        "iat":      datetime.datetime.utcnow(),
        "exp":      datetime.datetime.utcnow() + TOKEN_TTL,
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> dict:
    """
    Decode and validate a JWT.
    Raises jwt.ExpiredSignatureError or jwt.InvalidTokenError on failure.
    """
    return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])


def extract_bearer_token(auth_header: str | None) -> str:
    """
    Pull the raw token out of an 'Authorization: Bearer <token>' header.
    Raises ValueError with a descriptive message on malformed input.
    """
    if not auth_header:
        raise ValueError("Authorization header is missing")
    parts = auth_header.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise ValueError("Authorization header must be 'Bearer <token>'")
    return parts[1]


# ---------------------------------------------------------------------------
# jwt_required decorator
# ---------------------------------------------------------------------------

def jwt_required(f=None, *, roles: list[str] | None = None):
    """
    Decorator that validates a JWT and, optionally, asserts role membership.

    Usage:
        @jwt_required                       # any valid token
        @jwt_required(roles=["admin"])      # token must carry role=="admin"
    """
    # Support both @jwt_required and @jwt_required(roles=[...])
    def decorator(fn):
        @functools.wraps(fn)
        def wrapper(*args, **kwargs):
            try:
                raw_token = extract_bearer_token(
                    request.headers.get("Authorization")
                )
            except ValueError as exc:
                return jsonify({"error": str(exc)}), 401

            try:
                payload = decode_token(raw_token)
            except jwt.ExpiredSignatureError:
                return jsonify({"error": "Token has expired"}), 401
            except jwt.InvalidTokenError as exc:
                return jsonify({"error": f"Invalid token: {exc}"}), 401

            # Role-based access control (optional)
            if roles and payload.get("role") not in roles:
                return jsonify({
                    "error": "Forbidden — insufficient permissions",
                    "required_roles": roles,
                    "your_role": payload.get("role"),
                }), 403

            # Store decoded claims in Flask's request-scoped `g`
            g.current_user = payload
            return fn(*args, **kwargs)

        return wrapper

    # Called as @jwt_required (no parentheses)
    if f is not None:
        return decorator(f)

    # Called as @jwt_required(...) (with parentheses)
    return decorator


# ---------------------------------------------------------------------------
# Flask app + routes
# ---------------------------------------------------------------------------

app = Flask(__name__)


@app.post("/auth/token")
def login():
    """
    POST /auth/token
    Body: {"username": "alice", "password": "secret123"}
    Returns a signed JWT on success.
    """
    body = request.get_json(silent=True) or {}
    username = body.get("username", "").strip()
    password = body.get("password", "")

    user = USERS.get(username)
    if not user or user["password"] != password:
        return jsonify({"error": "Invalid credentials"}), 401

    token = create_token(user)
    return jsonify({
        "access_token": token,
        "token_type":   "bearer",
        "expires_in":   int(TOKEN_TTL.total_seconds()),
    }), 200


@app.get("/api/me")
@jwt_required
def get_me():
    """
    GET /api/me  (protected)
    Returns the user record for the authenticated caller.
    """
    claims = g.current_user
    user   = USERS.get(claims["sub"])

    if not user:
        return jsonify({"error": "User not found"}), 404

    # Never return the password
    public_data = {k: v for k, v in user.items() if k != "password"}
    return jsonify({
        "user":        public_data,
        "token_claims": {
            "issued_at": claims["iat"],
            "expires_at": claims["exp"],
        },
    }), 200


@app.get("/api/admin")
@jwt_required(roles=["admin"])
def admin_panel():
    """
    GET /api/admin  (protected, admin-only)
    Demonstrates role-based access control.
    """
    return jsonify({
        "message":    "Welcome to the admin panel",
        "admin_user": g.current_user["sub"],
        "all_users":  [
            {k: v for k, v in u.items() if k != "password"}
            for u in USERS.values()
        ],
    }), 200


# ---------------------------------------------------------------------------
# Dev server
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    app.run(debug=True, port=5000)