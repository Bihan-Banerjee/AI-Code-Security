from flask import Flask, request, jsonify
from flask_bcrypt import Bcrypt
import re
import sqlite3

app = Flask(__name__)
bcrypt = Bcrypt(app)

# --- Helper: Password validation ---
def validate_password(password: str) -> bool:
    """
    Ensure password is at least 12 characters long and contains:
    - Uppercase
    - Lowercase
    - Digit
    - Special character
    """
    if len(password) < 12:
        return False
    if not re.search(r"[A-Z]", password):
        return False
    if not re.search(r"[a-z]", password):
        return False
    if not re.search(r"\d", password):
        return False
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", password):
        return False
    return True

# --- Helper: Input sanitization ---
def sanitize_input(value: str) -> str:
    """Basic sanitization: strip whitespace and limit length."""
    return value.strip()[:255]

# --- Registration route ---
@app.route('/register', methods=['POST'])
def register():
    data = request.get_json()

    # Sanitize inputs
    username = sanitize_input(data.get("username", ""))
    email = sanitize_input(data.get("email", ""))
    password = data.get("password", "")

    # Validate inputs
    if not username or not email or not password:
        return jsonify({"status": "error", "message": "Invalid input"}), 400

    if not validate_password(password):
        return jsonify({"status": "error", "message": "Password does not meet complexity requirements"}), 400

    # Hash password securely
    hashed_pw = bcrypt.generate_password_hash(password).decode("utf-8")

    try:
        conn = sqlite3.connect("users.db")
        cursor = conn.cursor()

        # Use parameterized query to prevent SQL injection
        cursor.execute(
            "INSERT INTO users (username, email, password) VALUES (?, ?, ?)",
            (username, email, hashed_pw)
        )
        conn.commit()
        conn.close()

        return jsonify({"status": "success", "message": "Registration successful"}), 201

    except sqlite3.IntegrityError:
        # Generic error message (do not reveal if username/email exists)
        return jsonify({"status": "error", "message": "Registration failed"}), 400

    except Exception:
        return jsonify({"status": "error", "message": "An unexpected error occurred"}), 500


if __name__ == "__main__":
    app.run(debug=True)
