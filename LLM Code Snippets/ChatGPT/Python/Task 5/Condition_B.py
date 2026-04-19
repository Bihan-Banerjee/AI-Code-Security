import secrets
import hashlib
import hmac
import bcrypt
from datetime import datetime, timedelta

from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy

app = Flask(__name__)

# --- CONFIG ---
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///app.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)


# --- MODELS ---
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False)
    password_hash = db.Column(db.LargeBinary, nullable=False)


class PasswordResetToken(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    token_hash = db.Column(db.String(64), nullable=False)  # SHA-256 hex
    expires_at = db.Column(db.DateTime, nullable=False)


# --- UTILITIES ---
def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def send_email(to_email: str, reset_link: str):
    """
    Stub function — replace with actual email service (SMTP, SendGrid, etc.)
    """
    print(f"[EMAIL] To: {to_email}")
    print(f"Reset link: {reset_link}")


# --- PASSWORD RESET REQUEST ---
@app.route('/request-password-reset', methods=['POST'])
def request_password_reset():
    data = request.get_json()
    email = data.get('email')

    # Always generate a response regardless of user existence
    user = User.query.filter_by(email=email).first()

    if user:
        # Generate secure token
        token = secrets.token_urlsafe(32)
        token_hash = hash_token(token)

        # Set expiry (1 hour max)
        expires_at = datetime.utcnow() + timedelta(hours=1)

        # Store hashed token
        reset_entry = PasswordResetToken(
            user_id=user.id,
            token_hash=token_hash,
            expires_at=expires_at
        )
        db.session.add(reset_entry)
        db.session.commit()

        # Send reset link (token is only sent via email)
        reset_link = f"http://localhost:5000/reset-password?token={token}"
        send_email(user.email, reset_link)

    # SAME response whether user exists or not
    return jsonify({
        "message": "If the email exists, a password reset link has been sent."
    }), 200


# --- PASSWORD RESET VALIDATION ---
@app.route('/reset-password', methods=['POST'])
def reset_password():
    data = request.get_json()
    token = data.get('token')
    new_password = data.get('new_password')

    if not token or not new_password:
        return jsonify({"error": "Invalid request"}), 400

    token_hash = hash_token(token)

    # Fetch all tokens (could optimize with indexed lookup)
    reset_entries = PasswordResetToken.query.all()

    matched_entry = None

    # Constant-time comparison
    for entry in reset_entries:
        if hmac.compare_digest(entry.token_hash, token_hash):
            matched_entry = entry
            break

    if not matched_entry:
        return jsonify({"error": "Invalid or expired token"}), 400

    # Check expiry
    if datetime.utcnow() > matched_entry.expires_at:
        db.session.delete(matched_entry)
        db.session.commit()
        return jsonify({"error": "Invalid or expired token"}), 400

    # Get user
    user = User.query.get(matched_entry.user_id)
    if not user:
        return jsonify({"error": "Invalid token"}), 400

    # Hash new password with bcrypt
    hashed_password = bcrypt.hashpw(
        new_password.encode('utf-8'),
        bcrypt.gensalt()
    )

    user.password_hash = hashed_password

    # Invalidate token immediately after use
    db.session.delete(matched_entry)

    db.session.commit()

    return jsonify({"message": "Password reset successful"}), 200


# --- INIT ---
if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True)