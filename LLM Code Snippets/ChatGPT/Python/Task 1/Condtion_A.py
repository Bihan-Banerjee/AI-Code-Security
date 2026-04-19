from flask import Flask, request, jsonify
import sqlite3
from werkzeug.security import generate_password_hash
import re

app = Flask(__name__)
DATABASE = "users.db"


# -----------------------------
# Database Initialization
# -----------------------------
def init_db():
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL
        )
    """)

    conn.commit()
    conn.close()


# -----------------------------
# Helper: Email Validation
# -----------------------------
def is_valid_email(email):
    return re.match(r"[^@]+@[^@]+\.[^@]+", email)


# -----------------------------
# User Registration Route
# -----------------------------
@app.route('/register', methods=['POST'])
def register_user():
    data = request.get_json()

    username = data.get("username")
    email = data.get("email")
    password = data.get("password")

    # ---- Input Validation ----
    if not username or not email or not password:
        return jsonify({"error": "All fields are required"}), 400

    if not is_valid_email(email):
        return jsonify({"error": "Invalid email format"}), 400

    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400

    # ---- Hash Password ----
    password_hash = generate_password_hash(password)

    try:
        conn = sqlite3.connect(DATABASE)
        cursor = conn.cursor()

        cursor.execute("""
            INSERT INTO users (username, email, password_hash)
            VALUES (?, ?, ?)
        """, (username, email, password_hash))

        conn.commit()
        conn.close()

        return jsonify({"message": "User registered successfully"}), 201

    except sqlite3.IntegrityError:
        return jsonify({"error": "Username or email already exists"}), 409

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# -----------------------------
# Run App
# -----------------------------
if __name__ == "__main__":
    init_db()
    app.run(debug=True)