import os
import secrets
import smtplib
from datetime import datetime, timedelta
from email.mime.text import MIMEText

from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash

# -------------------- CONFIG --------------------

app = Flask(__name__)

app.config['SECRET_KEY'] = 'super-secret-key'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///app.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Email configuration (use environment variables in production)
app.config['SMTP_SERVER'] = 'smtp.gmail.com'
app.config['SMTP_PORT'] = 587
app.config['SMTP_USERNAME'] = 'your_email@gmail.com'
app.config['SMTP_PASSWORD'] = 'your_email_password'
app.config['EMAIL_SENDER'] = 'your_email@gmail.com'

# Frontend URL for reset link
app.config['FRONTEND_URL'] = 'http://localhost:3000'

db = SQLAlchemy(app)

# -------------------- MODELS --------------------

class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(200), nullable=False)


class PasswordResetToken(db.Model):
    __tablename__ = 'password_reset_tokens'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    token_hash = db.Column(db.String(200), nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False)
    used = db.Column(db.Boolean, default=False)

# -------------------- EMAIL FUNCTION --------------------

def send_reset_email(to_email, reset_link):
    msg = MIMEText(f"Click the link to reset your password:\n\n{reset_link}")
    msg['Subject'] = "Password Reset Request"
    msg['From'] = app.config['EMAIL_SENDER']
    msg['To'] = to_email

    try:
        with smtplib.SMTP(app.config['SMTP_SERVER'], app.config['SMTP_PORT']) as server:
            server.starttls()
            server.login(app.config['SMTP_USERNAME'], app.config['SMTP_PASSWORD'])
            server.send_message(msg)
    except Exception as e:
        print(f"Email sending failed: {e}")

# -------------------- ROUTES --------------------

@app.route('/request-password-reset', methods=['POST'])
def request_password_reset():
    data = request.get_json()
    email = data.get('email')

    if not email:
        return jsonify({"error": "Email is required"}), 400

    user = User.query.filter_by(email=email).first()

    # Prevent user enumeration
    if not user:
        return jsonify({"message": "If the email exists, a reset link has been sent"}), 200

    # Generate secure token
    raw_token = secrets.token_urlsafe(32)
    token_hash = generate_password_hash(raw_token)

    # Store token
    reset_token = PasswordResetToken(
        user_id=user.id,
        token_hash=token_hash,
        expires_at=datetime.utcnow() + timedelta(minutes=30),
        used=False
    )

    db.session.add(reset_token)
    db.session.commit()

    # Create reset link
    reset_link = f"{app.config['FRONTEND_URL']}/reset-password?token={raw_token}"

    # Send email
    send_reset_email(user.email, reset_link)

    return jsonify({"message": "If the email exists, a reset link has been sent"}), 200


@app.route('/reset-password', methods=['POST'])
def reset_password():
    data = request.get_json()
    raw_token = data.get('token')
    new_password = data.get('password')

    if not raw_token or not new_password:
        return jsonify({"error": "Token and password are required"}), 400

    # Find matching token (hashed comparison)
    tokens = PasswordResetToken.query.filter_by(used=False).all()

    valid_token = None

    for token_entry in tokens:
        if check_password_hash(token_entry.token_hash, raw_token):
            valid_token = token_entry
            break

    if not valid_token:
        return jsonify({"error": "Invalid or expired token"}), 400

    if valid_token.expires_at < datetime.utcnow():
        return jsonify({"error": "Token has expired"}), 400

    # Update password
    user = User.query.get(valid_token.user_id)
    user.password_hash = generate_password_hash(new_password)

    # Mark token as used
    valid_token.used = True

    db.session.commit()

    return jsonify({"message": "Password has been reset successfully"}), 200

# -------------------- INIT --------------------

@app.before_first_request
def create_tables():
    db.create_all()

# -------------------- RUN --------------------

if __name__ == '__main__':
    app.run(debug=True)