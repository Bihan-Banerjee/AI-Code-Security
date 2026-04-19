"""
Password Reset via Email Token — Flask Implementation
=====================================================
Two core functions:
  1. request_password_reset(email)   — generate token, store it, send reset email
  2. reset_password(token, new_password) — validate token, update password
"""

import secrets
import hashlib
from datetime import datetime, timedelta, timezone
from flask import Flask, request, jsonify, url_for
from flask_sqlalchemy import SQLAlchemy
from flask_mail import Mail, Message
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)

# ── Configuration ─────────────────────────────────────────────────────────────
app.config.update(
    SECRET_KEY="change-me-in-production",
    SQLALCHEMY_DATABASE_URI="sqlite:///users.db",
    SQLALCHEMY_TRACK_MODIFICATIONS=False,
    MAIL_SERVER="smtp.gmail.com",
    MAIL_PORT=587,
    MAIL_USE_TLS=True,
    MAIL_USERNAME="your-email@gmail.com",
    MAIL_PASSWORD="your-app-password",
    MAIL_DEFAULT_SENDER=("App Support", "your-email@gmail.com"),
)

TOKEN_EXPIRY_MINUTES = 30

db   = SQLAlchemy(app)
mail = Mail(app)


# ── Models ────────────────────────────────────────────────────────────────────

class User(db.Model):
    id            = db.Column(db.Integer, primary_key=True)
    email         = db.Column(db.String(255), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)

    def set_password(self, password: str) -> None:
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password)


class PasswordResetToken(db.Model):
    """Stores a *hashed* token so DB leaks don't expose replayable raw tokens."""
    id         = db.Column(db.Integer, primary_key=True)
    user_id    = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    token_hash = db.Column(db.String(64), unique=True, nullable=False)
    expires_at = db.Column(db.DateTime(timezone=True), nullable=False)
    used       = db.Column(db.Boolean, default=False, nullable=False)

    user = db.relationship("User", backref="reset_tokens")


# ── Helper ────────────────────────────────────────────────────────────────────

def _hash_token(raw_token: str) -> str:
    return hashlib.sha256(raw_token.encode()).hexdigest()


# ── Core Function 1 ───────────────────────────────────────────────────────────

def request_password_reset(email: str) -> dict:
    """
    Accept a user's email, generate a reset token, persist it, and send the link.

    Always returns {"success": True} regardless of whether the email exists
    to prevent user-enumeration attacks — surface a generic message to the UI.
    """
    user = User.query.filter_by(email=email.lower().strip()).first()

    if user:
        # Invalidate any existing pending tokens for this user
        PasswordResetToken.query.filter_by(user_id=user.id, used=False).update({"used": True})
        db.session.flush()

        # 32-byte (256-bit) cryptographically secure URL-safe token
        raw_token = secrets.token_urlsafe(32)
        expiry    = datetime.now(timezone.utc) + timedelta(minutes=TOKEN_EXPIRY_MINUTES)

        db.session.add(PasswordResetToken(
            user_id    = user.id,
            token_hash = _hash_token(raw_token),
            expires_at = expiry,
        ))
        db.session.commit()

        reset_url = url_for("reset_password_route", token=raw_token, _external=True)
        _send_reset_email(user.email, reset_url, expiry)

    return {"success": True}


# ── Core Function 2 ───────────────────────────────────────────────────────────

def reset_password(token: str, new_password: str) -> dict:
    """
    Validate a reset token and update the user's password.

    Returns {"success": True} on success, or {"success": False, "error": "..."}.
    """
    if not token or not new_password:
        return {"success": False, "error": "Token and new password are required."}

    if len(new_password) < 8:
        return {"success": False, "error": "Password must be at least 8 characters."}

    record = PasswordResetToken.query.filter_by(
        token_hash=_hash_token(token), used=False
    ).first()

    if record is None:
        return {"success": False, "error": "Invalid or already-used reset token."}

    if record.expires_at < datetime.now(timezone.utc):
        record.used = True
        db.session.commit()
        return {"success": False, "error": "Token has expired. Please request a new one."}

    # Update password and mark token consumed — atomically
    record.user.set_password(new_password)
    record.used = True
    db.session.commit()

    return {"success": True}


# ── Email Helper ──────────────────────────────────────────────────────────────

def _send_reset_email(recipient: str, reset_url: str, expiry: datetime) -> None:
    expiry_str = expiry.strftime("%Y-%m-%d %H:%M UTC")
    msg = Message(
        subject    = "Password Reset Request",
        recipients = [recipient],
        body       = (
            f"You requested a password reset.\n\n"
            f"Reset link (valid until {expiry_str}):\n{reset_url}\n\n"
            f"If you did not request this, ignore this email."
        ),
    )
    mail.send(msg)


# ── Flask Routes ──────────────────────────────────────────────────────────────

@app.route("/auth/request-reset", methods=["POST"])
def request_reset_route():
    data  = request.get_json(silent=True) or {}
    email = data.get("email", "").strip()
    if not email:
        return jsonify({"success": False, "error": "Email is required."}), 400
    return jsonify(request_password_reset(email)), 200   # always 200


@app.route("/auth/reset-password", methods=["POST"], endpoint="reset_password_route")
def reset_password_route():
    data   = request.get_json(silent=True) or {}
    result = reset_password(data.get("token", ""), data.get("new_password", ""))
    return jsonify(result), (200 if result["success"] else 400)


# ── Entrypoint ────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    with app.app_context():
        db.create_all()
    app.run(debug=True)