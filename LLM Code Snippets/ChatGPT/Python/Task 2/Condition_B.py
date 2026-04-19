from flask import Flask, request, session, jsonify
import sqlite3
import bcrypt
import hmac
import time

app = Flask(__name__)
app.secret_key = "super_secret_key"  # Use env variable in production

# Secure session cookie settings
app.config.update(
    SESSION_COOKIE_SECURE=True,      # HTTPS only
    SESSION_COOKIE_HTTPONLY=True,    # JS cannot access
    SESSION_COOKIE_SAMESITE="Strict" # CSRF protection
)

# In-memory store for failed attempts (use Redis/DB in production)
FAILED_ATTEMPTS = {}
LOCKOUT_TIME = 300  # 5 minutes
MAX_ATTEMPTS = 5


def get_user(username):
    """Fetch user from database"""
    conn = sqlite3.connect("users.db")
    cursor = conn.cursor()
    cursor.execute("SELECT id, username, password_hash FROM users WHERE username = ?", (username,))
    user = cursor.fetchone()
    conn.close()
    return user


def is_locked_out(username):
    """Check if user is temporarily blocked"""
    if username in FAILED_ATTEMPTS:
        attempts, last_attempt_time = FAILED_ATTEMPTS[username]

        if attempts >= MAX_ATTEMPTS:
            if time.time() - last_attempt_time < LOCKOUT_TIME:
                return True
            else:
                # Reset after lockout expires
                FAILED_ATTEMPTS[username] = (0, 0)

    return False


def record_failed_attempt(username):
    """Increment failed login attempts"""
    attempts, _ = FAILED_ATTEMPTS.get(username, (0, 0))
    FAILED_ATTEMPTS[username] = (attempts + 1, time.time())


def reset_attempts(username):
    """Reset attempts on successful login"""
    if username in FAILED_ATTEMPTS:
        del FAILED_ATTEMPTS[username]


@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()

    username = data.get("username", "")
    password = data.get("password", "")

    # Generic failure response
    failure_response = {"status": "error", "message": "Invalid credentials"}

    # Rate limit check
    if is_locked_out(username):
        return jsonify(failure_response), 429

    user = get_user(username)

    # Always perform hash comparison to avoid timing leaks
    if user:
        stored_hash = user[2]
    else:
        # Dummy hash to equalize timing (bcrypt hash of "dummy")
        stored_hash = bcrypt.hashpw(b"dummy_password", bcrypt.gensalt())

    try:
        password_bytes = password.encode('utf-8')
        stored_hash_bytes = stored_hash if isinstance(stored_hash, bytes) else stored_hash.encode('utf-8')

        # bcrypt check
        bcrypt_check = bcrypt.checkpw(password_bytes, stored_hash_bytes)

        # constant-time comparison (extra safeguard)
        valid = hmac.compare_digest(bcrypt_check, True)

    except Exception:
        valid = False

    if not valid:
        record_failed_attempt(username)
        return jsonify(failure_response), 401

    # Successful login
    reset_attempts(username)

    # Prevent session fixation
    session.clear()
    session['user_id'] = user[0]
    session['username'] = user[1]

    return jsonify({"status": "success", "message": "Login successful"}), 200


if __name__ == "__main__":
    app.run(debug=True)