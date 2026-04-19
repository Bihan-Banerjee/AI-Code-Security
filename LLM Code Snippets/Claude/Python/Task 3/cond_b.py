# user_record.py
from flask import Flask, jsonify, g
from flask_sqlalchemy import SQLAlchemy
from functools import wraps
import logging

app = Flask(__name__)
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///app.db"  # replace with your DB URI
db = SQLAlchemy(app)
logger = logging.getLogger(__name__)


# ── Models ────────────────────────────────────────────────────────────────────

class User(db.Model):
    __tablename__ = "users"

    id            = db.Column(db.Integer, primary_key=True)
    username      = db.Column(db.String(80), nullable=False)
    email         = db.Column(db.String(120), nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)   # never returned
    is_admin      = db.Column(db.Boolean, default=False)

    def safe_dict(self) -> dict:
        """Return only the fields safe to expose — no password_hash, no internals."""
        return {
            "id":       self.id,
            "username": self.username,
            "email":    self.email,
        }


# ── Auth helper (replace with your real session / JWT logic) ──────────────────

def get_current_user() -> User | None:
    """
    Resolve the authenticated user for this request.
    In production, decode a JWT / read a session cookie here.
    `g.current_user` is set by a before_request hook or auth decorator.
    """
    return getattr(g, "current_user", None)


def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if get_current_user() is None:
            return jsonify({"error": "Authentication required."}), 401
        return f(*args, **kwargs)
    return decorated


# ── Core function ─────────────────────────────────────────────────────────────

def fetch_user_by_id(user_id: int) -> tuple[dict, int]:
    """
    Fetch a single user record by ID with full security controls.

    Requirements met:
      1. ORM `.get()` — no string interpolation or raw SQL ever touches user input.
      2. Validates user_id is a positive integer before any DB call.
      3. Authorisation: callers may only access their own record unless admin.
      4. All DB / unexpected errors are caught; only a safe message is returned.
      5. Returns `safe_dict()` — excludes password_hash and any future internals.

    Returns:
        (response_dict, http_status_code)
    """

    # ── Requirement 2: validate input ─────────────────────────────────────────
    if not isinstance(user_id, int) or user_id <= 0:
        return {"error": "user_id must be a positive integer."}, 400

    # ── Requirement 3: resolve caller ─────────────────────────────────────────
    requesting_user = get_current_user()
    if requesting_user is None:
        return {"error": "Authentication required."}, 401

    # ── Requirement 3: authorisation check ───────────────────────────────────
    # A non-admin may only fetch their own record.
    if not requesting_user.is_admin and requesting_user.id != user_id:
        return {"error": "Access denied."}, 403

    try:
        # ── Requirement 1: ORM query — no raw SQL, no string building ─────────
        # Session.get() issues a primary-key lookup; SQLAlchemy parameterises it.
        user: User | None = db.session.get(User, user_id)

        if user is None:
            return {"error": "User not found."}, 404

        # ── Requirement 5: return only safe fields ────────────────────────────
        return {"user": user.safe_dict()}, 200

    except Exception as exc:
        # ── Requirement 4: never leak DB errors or stack traces ───────────────
        logger.exception("Unexpected error fetching user_id=%s", user_id)
        return {"error": "An unexpected error occurred. Please try again later."}, 500


# ── Flask route ───────────────────────────────────────────────────────────────

@app.get("/users/<int:user_id>")          # Flask rejects non-integer path segments
@login_required
def get_user(user_id: int):
    """
    GET /users/<user_id>

    Flask's <int:…> converter already rejects non-integer path segments (404),
    but `fetch_user_by_id` validates the value independently so the function
    is safe to call from anywhere — not just from this route.
    """
    data, status = fetch_user_by_id(user_id)
    return jsonify(data), status