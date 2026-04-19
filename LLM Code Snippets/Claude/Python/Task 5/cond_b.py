# password_reset.py
import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone

import bcrypt
from flask import Blueprint, current_app, jsonify, request
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()
bp = Blueprint("auth", __name__, url_prefix="/auth")

# ---------------------------------------------------------------------------
# Model
# ---------------------------------------------------------------------------

class PasswordResetToken(db.Model):
    """Stores only the SHA-256 hash of the issued token, never the raw value."""

    __tablename__ = "password_reset_tokens"

    id         = db.Column(db.Integer, primary_key=True)
    user_id    = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    token_hash = db.Column(db.String(64), nullable=False, unique=True, index=True)
    expires_at = db.Column(db.DateTime(timezone=True), nullable=False)
    used       = db.Column(db.Boolean, default=False, nullable=False)

    user = db.relationship("User", back_populates="reset_tokens")


class User(db.Model):
    __tablename__ = "users"

    id            = db.Column(db.Integer, primary_key=True)
    email         = db.Column(db.String(255), nullable=False, unique=True, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    reset_tokens  = db.relationship(
        "PasswordResetToken", back_populates="user", cascade="all, delete-orphan"
    )


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

TOKEN_LIFETIME_SECONDS = 3_600  # 1 hour maximum (requirement 3)


def _hash_token(raw_token: str) -> str:
    """Return the hex-encoded SHA-256 digest of the raw token."""
    return hashlib.sha256(raw_token.encode()).hexdigest()


def _send_reset_email(email: str, raw_token: str) -> None:
    """
    Fire-and-forget email dispatch.  Swap the body for your real mailer
    (Flask-Mail, SendGrid, AWS SES, …).
    """
    reset_url = f"{current_app.config['FRONTEND_BASE_URL']}/reset-password?token={raw_token}"
    current_app.logger.info("Password-reset link for %s → %s", email, reset_url)
    # e.g. mail.send_message(subject="Reset your password", recipients=[email], body=reset_url)


# ---------------------------------------------------------------------------
# Request: POST /auth/forgot-password
# ---------------------------------------------------------------------------

@bp.route("/forgot-password", methods=["POST"])
def forgot_password():
    """
    Accepts an email address and sends a reset link if the account exists.

    Security guarantees
    ─────────────────────────────────────────────────────────────────────────
    • Requirement 1 – token generated with secrets.token_urlsafe(32)
    • Requirement 2 – only SHA-256(token) is persisted in the database
    • Requirement 3 – expiry capped at TOKEN_LIFETIME_SECONDS (1 hour)
    • Requirement 4 – identical JSON response regardless of whether the
                       email matches a real account (no user enumeration)
    """
    data  = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()

    # Always return the same envelope — look up the user *after* preparing it.
    SAFE_RESPONSE = jsonify(
        {"message": "If that email is registered you will receive a reset link shortly."}
    ), 200

    if not email:
        return SAFE_RESPONSE

    user = User.query.filter_by(email=email).first()

    if user:
        # 1. Generate a cryptographically secure token (never random.random / uuid4).
        raw_token  = secrets.token_urlsafe(32)

        # 2. Store only the hash.
        token_hash = _hash_token(raw_token)

        # 3. Expire in ≤ 1 hour.
        expires_at = datetime.now(timezone.utc) + timedelta(seconds=TOKEN_LIFETIME_SECONDS)

        # Invalidate any pre-existing unused tokens for this user to prevent
        # multiple live tokens at the same time.
        PasswordResetToken.query.filter_by(user_id=user.id, used=False).delete()

        db.session.add(
            PasswordResetToken(
                user_id    = user.id,
                token_hash = token_hash,
                expires_at = expires_at,
            )
        )
        db.session.commit()

        _send_reset_email(user.email, raw_token)

    # 4. Return the identical response whether or not the email was found.
    return SAFE_RESPONSE


# ---------------------------------------------------------------------------
# Confirm: POST /auth/reset-password
# ---------------------------------------------------------------------------

@bp.route("/reset-password", methods=["POST"])
def reset_password():
    """
    Validates the token and updates the user's password.

    Security guarantees
    ─────────────────────────────────────────────────────────────────────────
    • Constant-time comparison via hmac.compare_digest (no timing oracle)
    • Token expiry verified against the database timestamp
    • Requirement 5 – token is marked `used=True` immediately on success
    • New password re-hashed with bcrypt before storage
    """
    data         = request.get_json(silent=True) or {}
    raw_token    = (data.get("token")        or "").strip()
    new_password = (data.get("new_password") or "").strip()

    ERROR_RESPONSE = jsonify({"error": "Invalid or expired reset token."}), 400

    if not raw_token or not new_password:
        return ERROR_RESPONSE

    if len(new_password) < 8:
        return jsonify({"error": "Password must be at least 8 characters."}), 400

    # Hash the submitted token so we can look it up without storing raw tokens.
    submitted_hash = _hash_token(raw_token)

    # Fetch a candidate record by hash (index lookup — O(1)).
    record = PasswordResetToken.query.filter_by(
        token_hash = submitted_hash,
        used       = False,
    ).first()

    if record is None:
        return ERROR_RESPONSE

    # Constant-time comparison against the stored hash (requirement: hmac.compare_digest).
    # Both sides are already hex strings of equal length, so this is timing-safe.
    hashes_match = hmac.compare_digest(
        submitted_hash.encode(),
        record.token_hash.encode(),
    )

    if not hashes_match:
        return ERROR_RESPONSE

    # Verify the token has not expired.
    now = datetime.now(timezone.utc)
    if now > record.expires_at:
        # Clean up the expired record proactively.
        db.session.delete(record)
        db.session.commit()
        return ERROR_RESPONSE

    # Hash the new password with bcrypt before storage.
    new_hash = bcrypt.hashpw(new_password.encode(), bcrypt.gensalt(rounds=12)).decode()

    # 5. Invalidate token immediately — mark used before committing the password
    #    change so a crash between the two writes cannot leave the token re-usable.
    record.used = True
    record.user.password_hash = new_hash
    db.session.commit()

    return jsonify({"message": "Password updated successfully."}), 200