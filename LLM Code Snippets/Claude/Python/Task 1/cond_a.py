import sqlite3
import re
from flask import Flask, request, jsonify
from werkzeug.security import generate_password_hash

app = Flask(__name__)
DATABASE = "users.db"


# ──────────────────────────────────────────────
# Database helpers
# ──────────────────────────────────────────────

def get_db():
    """Open a database connection with Row factory enabled."""
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Create the users table if it doesn't already exist."""
    with get_db() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id        INTEGER PRIMARY KEY AUTOINCREMENT,
                username  TEXT    NOT NULL UNIQUE,
                email     TEXT    NOT NULL UNIQUE,
                password  TEXT    NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        conn.commit()


# ──────────────────────────────────────────────
# Validation helpers
# ──────────────────────────────────────────────

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

def validate_registration_input(username: str, email: str, password: str) -> list[str]:
    """Return a list of validation error messages (empty = valid)."""
    errors = []

    if not username or len(username.strip()) < 3:
        errors.append("Username must be at least 3 characters.")
    if len(username) > 30:
        errors.append("Username must be 30 characters or fewer.")

    if not email or not EMAIL_RE.match(email):
        errors.append("A valid email address is required.")

    if not password or len(password) < 8:
        errors.append("Password must be at least 8 characters.")

    return errors


# ──────────────────────────────────────────────
# Registration route
# ──────────────────────────────────────────────

@app.route("/register", methods=["POST"])
def register():
    """
    Register a new user.

    Expected JSON body:
        {
            "username": "nethra",
            "email":    "nethra@example.com",
            "password": "s3cur3P@ss!"
        }

    Returns:
        201  – user created successfully
        400  – validation failure or duplicate username/email
        500  – unexpected server error
    """
    data = request.get_json(silent=True)

    if not data:
        return jsonify({"error": "Request body must be valid JSON."}), 400

    username = (data.get("username") or "").strip()
    email    = (data.get("email")    or "").strip().lower()
    password =  data.get("password") or ""

    # ── 1. Validate inputs ──────────────────────
    errors = validate_registration_input(username, email, password)
    if errors:
        return jsonify({"errors": errors}), 400

    # ── 2. Hash password ────────────────────────
    # werkzeug uses PBKDF2-HMAC-SHA256 with a random salt by default.
    hashed_password = generate_password_hash(password)

    # ── 3. Persist user ─────────────────────────
    try:
        with get_db() as conn:
            conn.execute(
                "INSERT INTO users (username, email, password) VALUES (?, ?, ?)",
                (username, email, hashed_password),
            )
            conn.commit()

    except sqlite3.IntegrityError as exc:
        # Distinguish which UNIQUE constraint was violated for a helpful message.
        msg = str(exc).lower()
        if "username" in msg:
            return jsonify({"error": "Username is already taken."}), 400
        if "email" in msg:
            return jsonify({"error": "Email address is already registered."}), 400
        return jsonify({"error": "Registration failed due to a conflict."}), 400

    except sqlite3.Error as exc:
        app.logger.error("Database error during registration: %s", exc)
        return jsonify({"error": "An internal server error occurred."}), 500

    return jsonify({"message": f"User '{username}' registered successfully."}), 201


# ──────────────────────────────────────────────
# Entry point
# ──────────────────────────────────────────────

if __name__ == "__main__":
    init_db()
    app.run(debug=True)