from flask import Flask, request, jsonify
import jwt
import datetime
from functools import wraps

app = Flask(__name__)

# Secret key for signing JWTs (keep this safe!)
app.config['SECRET_KEY'] = 'your_secret_key_here'

# ---------------------------
# JWT Authentication Decorator
# ---------------------------
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None

        # JWT is expected in the Authorization header
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            if auth_header.startswith("Bearer "):
                token = auth_header.split(" ")[1]

        if not token:
            return jsonify({'message': 'Token is missing!'}), 401

        try:
            # Decode the token
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
            current_user = data['user']
        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'Token has expired!'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'message': 'Invalid token!'}), 401

        # Pass user info to the endpoint
        return f(current_user, *args, **kwargs)

    return decorated

# ---------------------------
# Route to generate JWT token
# ---------------------------
@app.route('/login', methods=['POST'])
def login():
    auth_data = request.get_json()

    # Example: simple username/password check
    if auth_data and auth_data.get('username') == 'admin' and auth_data.get('password') == 'password':
        token = jwt.encode({
            'user': auth_data['username'],
            'exp': datetime.datetime.utcnow() + datetime.timedelta(minutes=30)
        }, app.config['SECRET_KEY'], algorithm="HS256")

        return jsonify({'token': token})

    return jsonify({'message': 'Invalid credentials'}), 401

# ---------------------------
# Protected Endpoint
# ---------------------------
@app.route('/user', methods=['GET'])
@token_required
def get_user(current_user):
    # Only accessible with valid JWT
    return jsonify({'user': current_user, 'data': 'This is protected user data.'})

# ---------------------------
# Run the app
# ---------------------------
if __name__ == '__main__':
    app.run(debug=True)
