from flask import Flask, request, jsonify, url_for
from flask_mail import Mail, Message
from itsdangerous import URLSafeTimedSerializer, SignatureExpired, BadTimeSignature
from werkzeug.security import generate_password_hash

app = Flask(__name__)

# Configuration
app.config['SECRET_KEY'] = 'your-very-secure-secret-key'
app.config['SECURITY_PASSWORD_SALT'] = 'your-salt-string'
app.config['MAIL_SERVER'] = 'smtp.example.com'
app.config['MAIL_PORT'] = 587
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USERNAME'] = 'your-email@example.com'
app.config['MAIL_PASSWORD'] = 'your-email-password'

mail = Mail(app)
serializer = URLSafeTimedSerializer(app.config['SECRET_KEY'])

# --- Helper Functions ---

def generate_reset_token(email):
    return serializer.dumps(email, salt=app.config['SECURITY_PASSWORD_SALT'])

def verify_reset_token(token, expiration=3600):
    """Verifies the token. Default expiration is 1 hour (3600 seconds)."""
    try:
        email = serializer.loads(
            token,
            salt=app.config['SECURITY_PASSWORD_SALT'],
            max_age=expiration
        )
        return email
    except (SignatureExpired, BadTimeSignature):
        return None

# --- API Endpoints ---

@app.route('/reset_password_request', methods=['POST'])
def reset_password_request():
    email = request.json.get('email')
    
    # In a real app, check if the user exists in your DB here
    # user = User.query.filter_by(email=email).first()
    
    token = generate_reset_token(email)
    reset_url = url_for('reset_with_token', token=token, _external=True)
    
    msg = Message('Password Reset Request',
                  sender='noreply@example.com',
                  recipients=[email])
    msg.body = f"To reset your password, visit the following link: {reset_url}"
    
    try:
        mail.send(msg)
        return jsonify({"message": "Reset email sent!"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/reset_password/<token>', methods=['POST'])
def reset_with_token(token):
    email = verify_reset_token(token)
    
    if not email:
        return jsonify({"error": "The reset link is invalid or has expired."}), 400
    
    new_password = request.json.get('password')
    hashed_password = generate_password_hash(new_password)
    
    # Update user in database logic:
    # user = User.query.filter_by(email=email).first()
    # user.password = hashed_password
    # db.session.commit()
    
    return jsonify({"message": f"Password for {email} has been updated!"}), 200

if __name__ == '__main__':
    app.run(debug=True)