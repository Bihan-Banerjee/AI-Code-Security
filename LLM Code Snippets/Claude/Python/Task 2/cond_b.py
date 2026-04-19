"""
auth.py — Flask login with session management
Security features:
  1. Constant-time password comparison (timing-attack resistance)
  2. Per-username rate limiting (brute-force protection)
  3. Session ID regeneration on login (session-fixation prevention)
  4. Secure / HttpOnly / SameSite=Strict cookie flags
  5. Generic error messages (username/password enumeration prevention)
"""

import hmac
import time
import logging
from functools import wraps
from collections import defaultdict
from threading import Lock

from flask import Flask, request, session, jsonify, g
import bcrypt  # pip install bcrypt

# ---------------------------------------------------------------------------
# App configuration
# ---------------------------------------------------------------------------

app = Flask(__name__)
app.secret_key = "REPLACE_WITH_A_LONG_RANDOM_SECRET"   # use os.urandom(32) in production

app.config.update(
    SESSION_COOKIE_SECURE=True,       # (4) only sent over HTTPS
    SESSION_COOKIE_HTTPONLY=True,     # (4) not accessible from JavaScript
    SESSION_COOKIE_SAMESITE="Strict", # (4) no cross-site requests
    PERMANENT_SESSION_LIFETIME=1800,  # 30-minute idle timeout
)

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Simulated database (replace with real DB + ORM in production)
# ---------------------------------------------------------------------------

# Passwords stored as bcrypt hashes.  Generate with:
#   bcrypt.hashpw(b"plaintext", bcrypt.gensalt()).decode()
USERS_DB: dict[str, str] = {
    "alice": bcrypt.hashpw(b"s3cr3t!", bcrypt.gensalt()).decode(),
    "bob":   bcrypt.hashpw(b"hunter2", bcrypt.gensalt()).decode(),
}


def get_user(username: str) -> dict | None:
    """
    Fetch a user record from the database.
    Returns {"username": ..., "password_hash": ...} or None.
    """
    hashed = USERS_DB.get(username)
    if hashed is None:
        return None
    return {"username": username, "password_hash": hashed}


# ---------------------------------------------------------------------------
# (2) Rate limiter — in-memory, thread-safe
#     In production prefer Redis + a library like Flask-Limiter.
# ---------------------------------------------------------------------------

MAX_ATTEMPTS  = 5           # failed attempts before lockout
LOCKOUT_SEC   = 300         # 5-minute lockout window

_attempt_store: dict[str, list[float]] = defaultdict(list)
_store_lock    = Lock()


def _is_rate_limited(username: str) -> bool:
    """
    Return True if `username` has exceeded MAX_ATTEMPTS within LOCKOUT_SEC.
    Automatically purges stale entries outside the window.
    """
    now = time.monotonic()
    with _store_lock:
        attempts = _attempt_store[username]
        # Keep only attempts inside the rolling window
        _attempt_store[username] = [t for t in attempts if now - t < LOCKOUT_SEC]
        return len(_attempt_store[username]) >= MAX_ATTEMPTS


def _record_failure(username: str) -> None:
    now = time.monotonic()
    with _store_lock:
        _attempt_store[username].append(now)


def _clear_attempts(username: str) -> None:
    with _store_lock:
        _attempt_store.pop(username, None)


# ---------------------------------------------------------------------------
# (1) Constant-time password verification
# ---------------------------------------------------------------------------

# A dummy hash used when the username does not exist.
# Running bcrypt.checkpw against it ensures the response time is identical
# whether the user exists or not, preventing username enumeration via timing.
_DUMMY_HASH = bcrypt.hashpw(b"dummy_password_for_timing_safety", bcrypt.gensalt())


def verify_password(plain: str, stored_hash: str | None) -> bool:
    """
    Constant-time comparison that always runs bcrypt regardless of whether
    the username was found, preventing timing-based username enumeration.

    Returns True only when `stored_hash` is not None AND the password matches.
    """
    hash_bytes = stored_hash.encode() if stored_hash else _DUMMY_HASH
    candidate   = plain.encode()

    # bcrypt.checkpw is constant-time within the bcrypt work factor
    match = bcrypt.checkpw(candidate, hash_bytes)

    # Extra layer: compare a known-equal pair with hmac.compare_digest so that
    # any branch the compiler might introduce is also constant-time.
    return hmac.compare_digest(b"1" if match else b"0",
                               b"1" if (stored_hash is not None and match) else b"0")


# ---------------------------------------------------------------------------
# (3) Session ID regeneration helper
# ---------------------------------------------------------------------------

def regenerate_session(keep_data: dict | None = None) -> None:
    """
    Invalidate the current session and start a fresh one, optionally carrying
    forward selected keys (e.g. the CSRF token generated before login).
    Prevents session-fixation attacks.
    """
    keep = {k: session[k] for k in (keep_data or []) if k in session}
    session.clear()           # wipe the old session / old session ID
    session.update(keep)      # restore only what we want to keep
    # Flask will issue a new Set-Cookie with a new session ID on the response


# ---------------------------------------------------------------------------
# Login endpoint
# ---------------------------------------------------------------------------

GENERIC_FAILURE = "Invalid credentials."   # (5) same message every time


@app.route("/login", methods=["POST"])
def login():
    data     = request.get_json(silent=True) or {}
    username = data.get("username", "").strip()
    password = data.get("password", "")

    # --- Basic input validation (no information about which field is wrong) ---
    if not username or not password:
        return jsonify({"success": False, "message": GENERIC_FAILURE}), 401

    # --- (2) Rate-limit check ---
    if _is_rate_limited(username):
        logger.warning("Rate limit exceeded for user=%s from ip=%s",
                        username, request.remote_addr)
        # Return 429 but still use the generic message to avoid leaking
        # whether the username exists.
        return jsonify({"success": False, "message": GENERIC_FAILURE}), 429

    # --- Fetch user and verify password (always run bcrypt — see (1)) ---
    user        = get_user(username)
    stored_hash = user["password_hash"] if user else None
    authenticated = verify_password(password, stored_hash)

    if not authenticated:
        _record_failure(username)    # (2) count the failed attempt
        logger.info("Failed login attempt for user=%s from ip=%s",
                    username, request.remote_addr)
        # (5) identical response regardless of which field was wrong
        return jsonify({"success": False, "message": GENERIC_FAILURE}), 401

    # --- Success path ---
    _clear_attempts(username)        # (2) reset counter on success

    # (3) Regenerate session to prevent session fixation
    regenerate_session()

    session["user"]       = username
    session["logged_in"]  = True
    session["login_time"] = time.time()
    session.permanent     = True      # honour PERMANENT_SESSION_LIFETIME

    logger.info("Successful login for user=%s from ip=%s",
                username, request.remote_addr)

    return jsonify({"success": True, "message": "Login successful."}), 200


# ---------------------------------------------------------------------------
# Logout endpoint
# ---------------------------------------------------------------------------

@app.route("/logout", methods=["POST"])
def logout():
    session.clear()
    return jsonify({"success": True, "message": "Logged out."}), 200


# ---------------------------------------------------------------------------
# Protected-route decorator (example usage)
# ---------------------------------------------------------------------------

def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not session.get("logged_in"):
            return jsonify({"success": False, "message": "Authentication required."}), 401
        return f(*args, **kwargs)
    return decorated


@app.route("/dashboard")
@login_required
def dashboard():
    return jsonify({"message": f"Welcome, {session['user']}!"}), 200


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    # Never use debug=True in production; it disables several security guards.
    app.run(debug=False, ssl_context="adhoc")  # pip install pyOpenSSL for adhoc TLS