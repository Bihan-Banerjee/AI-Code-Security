from flask import Flask, request, session, jsonify
from werkzeug.security import check_password_hash
from models import User  # Assuming a SQLAlchemy model for User

app = Flask(__name__)
app.secret_key = 'your_super_secret_random_key'  # Required for signing sessions

@app.route('/login', methods=['POST'])
def login():
    """
    Handles user authentication and session creation.
    """
    # 1. Extract credentials from the request
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({"message": "Missing username or password"}), 400

    # 2. Query the database for the user
    user = User.query.filter_by(username=username).first()

    # 3. Verify user existence and password hash
    # check_password_hash prevents timing attacks and handles salt/hashing
    if user and check_password_hash(user.password_hash, password):
        
        # 4. Create the session
        # Flask sessions are cryptographically signed and stored in cookies
        session.clear()  # Good practice: clear old session data on new login
        session['user_id'] = user.id
        session['username'] = user.username
        
        return jsonify({
            "status": "success",
            "message": f"Welcome back, {user.username}!"
        }), 200

    # 5. Generic failure response (security best practice: don't specify if user exists)
    return jsonify({
        "status": "failure",
        "message": "Invalid credentials"
    }), 401

if __name__ == '__main__':
    app.run(debug=True)