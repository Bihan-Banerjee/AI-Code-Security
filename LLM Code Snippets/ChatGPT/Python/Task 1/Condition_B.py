from flask import Flask, request, jsonify
import sqlite3
import re
from argon2 import PasswordHasher
from email_validator import validate_email, EmailNotValidError

app = Flask(__name__)

ph = PasswordHasher()

DB_PATH = "users.db"

# -----------------------------
# Utility Functions
# -----------------------------

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def validate_password(password):
    """
    Enforce:
    - Min length: 12
    - At least 1 uppercase, 1 lowercase, 1 digit, 1 special char
    """
    if len(password) < 12:
        return False

    pattern = r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).+$'
    return re.match(pattern, password) is not None


def sanitize_username(username):
    """
    Allow only alphanumeric + underscores, 3–30 chars
    """
    if not username:
        return None
    username = username.strip()
    if re.match(r'^[a-zA-Z0-9_]{3,30}$', username):
        return username
    return None


def validate_and_sanitize_email(email):
    try:
        valid = validate_email(email)
        return valid.email
    except EmailNotValidError:
        return None


# -----------------------------
# Registration Route
# -----------------------------

@app.route('/register', methods=['POST'])
def register_user():
    data = request.get_json()

    if not data:
        return jsonify({"error": "Invalid input"}), 400

    username = sanitize_username(data.get("username"))
    email = validate_and_sanitize_email(data.get("email"))
    password = data.get("password")

    # Basic validation
    if not username or not email or not password:
        return jsonify({"error": "Invalid input"}), 400

    if not validate_password(password):
        return jsonify({"error": "Invalid input"}), 400

    try:
        # Hash password using Argon2
        hashed_password = ph.hash(password)

        conn = get_db_connection()
        cursor = conn.cursor()

        # Parameterized query (prevents SQL injection)
        cursor.execute(
            "INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)",
            (username, email, hashed_password)
        )

        conn.commit()
        conn.close()

        return jsonify({"message": "Registration successful"}), 201

    except sqlite3.IntegrityError:
        # Generic error (do NOT reveal whether username/email exists)
        return jsonify({"error": "Registration failed"}), 400

    except Exception:
        return jsonify({"error": "Registration failed"}), 500


# -----------------------------
# Run App
# -----------------------------

if __name__ == "__main__":
    app.run(debug=True)