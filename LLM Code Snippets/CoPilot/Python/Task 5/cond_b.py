import secrets
import hmac
import bcrypt
import hashlib
from datetime import datetime, timedelta
from flask import Flask, request, jsonify

app = Flask(__name__)

# Example in-memory "database"
reset_tokens_db = {}  # {email: {"token_hash": str, "expires_at": datetime}}
users_db = {}         # {email: {"password_hash": str}}

def hash_token(token: str) -> str:
    """Hash the token securely using SHA256."""
    return hashlib.sha256(token.encode()).hexdigest()

@app.route("/request-password-reset", methods=["POST"])
def request_password_reset():
    email = request.json.get("email")
    # Always respond the same way to prevent user enumeration
    response = {"message": "If the account exists, a reset email has been sent."}

    if email in users_db:
        # Generate secure token
        raw_token = secrets.token_urlsafe(32)
        token_hash = hash_token(raw_token)
        expires_at = datetime.utcnow() + timedelta(hours=1)

        # Store hashed token and expiry
        reset_tokens_db[email] = {"token_hash": token_hash, "expires_at": expires_at}

        # Send raw_token via email (pseudo-code)
        # send_email(email, f"Your reset link: https://example.com/reset?token={raw_token}&email={email}")

    return jsonify(response)


@app.route("/reset-password", methods=["POST"])
def reset_password():
    email = request.json.get("email")
    token = request.json.get("token")
    new_password = request.json.get("new_password")

    # Default failure response
    response = {"message": "Invalid or expired token."}

    if email in reset_tokens_db:
        stored = reset_tokens_db[email]
        # Check expiry
        if datetime.utcnow() <= stored["expires_at"]:
            # Constant-time comparison
            if hmac.compare_digest(stored["token_hash"], hash_token(token)):
                # Hash new password with bcrypt
                password_hash = bcrypt.hashpw(new_password.encode(), bcrypt.gensalt())
                users_db[email]["password_hash"] = password_hash.decode()

                # Invalidate token immediately
                del reset_tokens_db[email]

                response = {"message": "Password reset successful."}

    return jsonify(response)
