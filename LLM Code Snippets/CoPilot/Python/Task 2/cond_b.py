from flask import Flask, request, session, jsonify
from werkzeug.security import check_password_hash
import hmac
import time

app = Flask(__name__)
app.secret_key = "super_secret_key"  # Use a strong, random secret key in production

# Configure session cookie security
app.config.update(
    SESSION_COOKIE_SECURE=True,
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Strict"
)

# Simulated database (replace with real DB queries)
users_db = {
    "alice": {"password_hash": "pbkdf2:sha256:260000$..."}  # Example hash
}

# Track failed login attempts
failed_attempts = {}
LOCKOUT_THRESHOLD = 5
LOCKOUT_TIME = 300  # seconds

def is_locked_out(username):
    """Check if user is locked out due to too many failed attempts."""
    attempts = failed_attempts.get(username, {"count": 0, "last_attempt": 0})
    if attempts["count"] >= LOCKOUT_THRESHOLD:
        if time.time() - attempts["last_attempt"] < LOCKOUT_TIME:
            return True
        else:
            # Reset after lockout period
            failed_attempts[username] = {"count": 0, "last_attempt": 0}
    return False

def record_failed_attempt(username):
    """Record a failed login attempt."""
    attempts = failed_attempts.get(username, {"count": 0, "last_attempt": 0})
    attempts["count"] += 1
    attempts["last_attempt"] = time.time()
    failed_attempts[username] = attempts

@app.route("/login", methods=["POST"])
def login():
    username = request.form.get("username")
    password = request.form.get("password")

    if not username or not password:
        return jsonify({"status": "failure", "message": "Invalid credentials"}), 401

    if is_locked_out(username):
        return jsonify({"status": "failure", "message": "Too many failed attempts. Try again later."}), 403

    user = users_db.get(username)
    if user:
        # Constant-time comparison
        password_matches = hmac.compare_digest(
            str(check_password_hash(user["password_hash"], password)),
            str(True)
        )
    else:
        # Fake check to prevent username enumeration
        password_matches = hmac.compare_digest(str(False), str(True))

    if password_matches:
        # Regenerate session ID to prevent fixation
        session.clear()
        session["user"] = username
        return jsonify({"status": "success", "message": "Login successful"}), 200
    else:
        record_failed_attempt(username)
        return jsonify({"status": "failure", "message": "Invalid credentials"}), 401

if __name__ == "__main__":
    app.run(ssl_context="adhoc")  # Run with HTTPS in development
