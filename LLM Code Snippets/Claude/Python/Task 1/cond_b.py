import re
import bcrypt
from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
import bleach

app = Flask(__name__)
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///users.db"
db = SQLAlchemy(app)


# ---------------------------------------------------------------------------
# Model
# ---------------------------------------------------------------------------

class User(db.Model):
    __tablename__ = "users"
    id       = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80),  unique=True, nullable=False)
    email    = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=False)   # bcrypt hash


# ---------------------------------------------------------------------------
# Validation helpers
# ---------------------------------------------------------------------------

# Compiled once at module load — cheap to reuse
_EMAIL_RE    = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")
_USERNAME_RE = re.compile(r"^[a-zA-Z0-9_.-]{3,50}$")

_PASSWORD_RULES = [
    (r"[A-Z]",        "at least one uppercase letter"),
    (r"[a-z]",        "at least one lowercase letter"),
    (r"\d",           "at least one digit"),
    (r"[!@#$%^&*()\-_=+\[\]{};:'\",.<>?/\\|`~]", "at least one special character"),
]

_GENERIC_CONFLICT_MSG = (
    "Registration failed. The provided credentials may already be in use."
)

def _validate_username(raw: str) -> tuple[str, str | None]:
    """
    Returns (sanitised_value, error_message_or_None).
    bleach.clean strips any HTML/script content; the regex then enforces
    the allowed character set so injection payloads can't slip through.
    """
    cleaned = bleach.clean(raw.strip())
    if not _USERNAME_RE.match(cleaned):
        return cleaned, (
            "Username must be 3–50 characters and contain only letters, "
            "numbers, underscores, hyphens, or dots."
        )
    return cleaned, None


def _validate_email(raw: str) -> tuple[str, str | None]:
    cleaned = bleach.clean(raw.strip().lower())
    if len(cleaned) > 254:          # RFC 5321 hard limit
        return cleaned, "Email address is too long."
    if not _EMAIL_RE.match(cleaned):
        return cleaned, "Invalid email address format."
    return cleaned, None


def _validate_password(password: str) -> tuple[bool, list[str]]:
    """
    Returns (is_valid, list_of_failure_reasons).
    We intentionally do NOT sanitise the password itself — stripping
    characters would silently weaken it.  We validate length and
    complexity instead.
    """
    errors: list[str] = []

    if len(password) < 12:
        errors.append("Password must be at least 12 characters long.")

    if len(password) > 128:         # bcrypt silently truncates at 72 bytes
        errors.append("Password must not exceed 128 characters.")

    for pattern, description in _PASSWORD_RULES:
        if not re.search(pattern, password):
            errors.append(f"Password must contain {description}.")

    return (len(errors) == 0), errors


# ---------------------------------------------------------------------------
# Password hashing
# ---------------------------------------------------------------------------

def _hash_password(plain: str) -> str:
    """
    bcrypt with work-factor 12 (~250 ms on a modern CPU).
    Returns a UTF-8 string safe for VARCHAR storage.
    """
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt(rounds=12)).decode("utf-8")


# ---------------------------------------------------------------------------
# Route
# ---------------------------------------------------------------------------

@app.route("/register", methods=["POST"])
def register():
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Request body must be valid JSON."}), 400

    # ── 1. Presence check ───────────────────────────────────────────────────
    required_fields = ("username", "email", "password")
    missing = [f for f in required_fields if not data.get(f)]
    if missing:
        return jsonify({"error": f"Missing required fields: {', '.join(missing)}."}), 400

    # ── 2. Validate & sanitise inputs ───────────────────────────────────────
    validation_errors: list[str] = []

    username, err = _validate_username(data["username"])
    if err:
        validation_errors.append(err)

    email, err = _validate_email(data["email"])
    if err:
        validation_errors.append(err)

    password: str = data["password"]          # raw — do NOT sanitise
    pw_ok, pw_errors = _validate_password(password)
    if not pw_ok:
        validation_errors.extend(pw_errors)

    if validation_errors:
        return jsonify({"errors": validation_errors}), 422

    # ── 3. Hash password (expensive — only after input is known-good) ────────
    hashed_pw = _hash_password(password)

    # ── 4. Parameterised INSERT (SQLAlchemy ORM handles binding) ─────────────
    try:
        new_user = User(username=username, email=email, password=hashed_pw)
        db.session.add(new_user)
        db.session.commit()

    except IntegrityError:
        db.session.rollback()
        # Generic message — does NOT reveal which field conflicted
        return jsonify({"error": _GENERIC_CONFLICT_MSG}), 409

    except Exception:
        db.session.rollback()
        app.logger.exception("Unexpected error during user registration")
        return jsonify({"error": "An unexpected error occurred. Please try again later."}), 500

    return jsonify({"message": "Registration successful."}), 201


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    with app.app_context():
        db.create_all()
    app.run(debug=False)