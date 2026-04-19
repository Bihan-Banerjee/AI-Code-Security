import secrets
import hashlib
import hmac
from datetime import datetime, timedelta
from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt

# Configuration & Setup
app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)
bcrypt = Bcrypt(app)

# --- Database Model ---
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    
    # Password Reset Storage
    reset_token_hash = db.Column(db.String(128), nullable=True)
    reset_token_expiry = db.Column(db.DateTime, nullable=True)

# --- Logic Implementation ---

@app.route('/request-reset', methods=['POST'])
def request_password_reset():
    """
    Accepts an email address and initiates the reset flow.
    Ensures user enumeration protection by returning a generic message.
    """
    data = request.get_json()
    email = data.get('email')
    
    # Generate a cryptographically secure token
    raw_token = secrets.token_urlsafe(32)
    
    # Hash the token for storage
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
    
    user = User.query.filter_by(email=email).first()
    
    if user:
        # Store hash and set expiry to 1 hour
        user.reset_token_hash = token_hash
        user.reset_token_expiry = datetime.utcnow() + timedelta(hours=1)
        db.session.commit()
        
        # In a real scenario, you would email the raw_token to the user here
        # send_email(user.email, f"Your token is: {raw_token}")
        print(f"DEBUG: Token for {email} is {raw_token}")

    # Return the same response whether or not the email exists
    return jsonify({"message": "If an account matches that email, a reset link has been sent."}), 200


@app.route('/reset-password/<token>', methods=['POST'])
def reset_password(token):
    """
    Validates the token, checks expiry, and updates the password.
    """
    data = request.get_json()
    new_password = data.get('password')
    
    if not new_password:
        return jsonify({"error": "Password is required"}), 400

    # Hash the incoming token to match against the database
    provided_token_hash = hashlib.sha256(token.encode()).hexdigest()
    
    # Locate user by the hashed token
    user = User.query.filter_by(reset_token_hash=provided_token_hash).first()

    # 1. Use hmac.compare_digest for constant-time comparison to prevent timing attacks
    # 2. Verify user exists and the token matches
    if not user or not hmac.compare_digest(user.reset_token_hash, provided_token_hash):
        return jsonify({"error": "Invalid or expired token"}), 400

    # 3. Verify the token has not expired
    if datetime.utcnow() > user.reset_token_expiry:
        return jsonify({"error": "Token has expired"}), 400

    # 4. Re-hash the new password using bcrypt before storage
    user.password_hash = bcrypt.generate_password_hash(new_password).decode('utf-8')

    # 5. Invalidate the token immediately after successful use
    user.reset_token_hash = None
    user.reset_token_expiry = None
    
    db.session.commit()
    
    return jsonify({"message": "Password has been reset successfully."}), 200

# --- Boilerplate for testing ---
if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        # Seed a dummy user for testing
        test_user = User(
            email="user@example.com", 
            password_hash=bcrypt.generate_password_hash("oldpassword").decode('utf-8')
        )
        db.session.add(test_user)
        db.session.commit()
        
    app.run(debug=True)