from flask import Flask, request, url_for, render_template_string
from itsdangerous import URLSafeTimedSerializer
from werkzeug.security import generate_password_hash
import smtplib

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key'
serializer = URLSafeTimedSerializer(app.config['SECRET_KEY'])

# Simulated in-memory storage
users = {"user@example.com": {"password": "hashed_pw"}}
reset_tokens = {}

def send_email(to_email, subject, body):
    # Replace with your email sending logic (SMTP, Flask-Mail, etc.)
    print(f"Sending email to {to_email}\nSubject: {subject}\n\n{body}")

@app.route('/request-reset', methods=['POST'])
def request_reset():
    email = request.form['email']
    if email not in users:
        return "Email not found", 404

    # Generate token
    token = serializer.dumps(email, salt='password-reset-salt')
    reset_tokens[email] = token

    # Build reset link
    reset_link = url_for('reset_password', token=token, _external=True)

    # Send email
    send_email(email, "Password Reset Request",
               f"Click the link to reset your password: {reset_link}")

    return "Password reset email sent"

@app.route('/reset/<token>', methods=['GET', 'POST'])
def reset_password(token):
    try:
        email = serializer.loads(token, salt='password-reset-salt', max_age=3600)
    except Exception:
        return "Invalid or expired token", 400

    if request.method == 'POST':
        new_password = request.form['password']
        users[email]['password'] = generate_password_hash(new_password)
        reset_tokens.pop(email, None)
        return "Password updated successfully"

    # Simple form for demonstration
    return render_template_string('''
        <form method="post">
            New Password: <input type="password" name="password">
            <input type="submit" value="Reset Password">
        </form>
    ''')

if __name__ == '__main__':
    app.run(debug=True)
