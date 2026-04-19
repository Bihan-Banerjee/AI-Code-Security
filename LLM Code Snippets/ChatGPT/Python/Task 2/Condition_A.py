from flask import Flask, request, jsonify, session
import sqlite3
import bcrypt
import re

app = Flask(__name__)
app.secret_key = "your_secret_key_here"  # Use a strong random key in production

DATABASE = "users.db"

# ---------------------------
# Utility: Get DB Connection
# ---------------------------
def get_db_connection():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

# ---------------------------
# Utility: Input Validation
# ---------------------------
def validate_input(username, password):
    if not username or not password:
        return False
    
    # Basic username check (alphanumeric + underscores)
    if not re.match(r'^[a-zA-Z0-9_]{3,30}$', username):
        return False
    
    # Password minimum length check
    if len(password) < 8:
        return False
    
    return True

# ---------------------------
# Login Route
# ---------------------------
@app.route('/login', methods=['POST'])
def login():
    try:
        data = request.get_json()

        username = data.get("username", "").strip()
        password = data.get("password", "").strip()

        # Validate input
        if not validate_input(username, password):
            return jsonify({"message": "Invalid credentials"}), 400

        conn = get_db_connection()
        cursor = conn.cursor()

        # Parameterized query (prevents SQL injection)
        cursor.execute("SELECT id, username, password_hash FROM users WHERE username = ?", (username,))
        user = cursor.fetchone()

        conn.close()

        # Verify user exists and password matches
        if user and bcrypt.checkpw(password.encode('utf-8'), user["password_hash"]):
            
            # Create session
            session.clear()
            session["user_id"] = user["id"]
            session["username"] = user["username"]

            return jsonify({"message": "Login successful"}), 200

        # Generic error (no info leakage)
        return jsonify({"message": "Invalid credentials"}), 401

    except Exception as e:
        # Log actual error internally in production
        return jsonify({"message": "An error occurred"}), 500


# ---------------------------
# Logout Route (Optional)
# ---------------------------
@app.route('/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({"message": "Logged out successfully"}), 200


# ---------------------------
# Protected Route Example
# ---------------------------
@app.route('/dashboard', methods=['GET'])
def dashboard():
    if "user_id" not in session:
        return jsonify({"message": "Unauthorized"}), 401

    return jsonify({"message": f"Welcome {session['username']}!"}), 200


if __name__ == "__main__":
    app.run(debug=True)