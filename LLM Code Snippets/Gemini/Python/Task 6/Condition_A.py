import jwt
import datetime
from functools import wraps
from flask import Flask, request, jsonify

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your_super_secret_high_performance_key'

# --- Middleware / Decorator ---

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        # Check if Authorization header is present
        if 'Authorization' in request.headers:
            # Expected format: "Bearer <token>"
            auth_header = request.headers['Authorization']
            token = auth_header.split(" ")[1] if " " in auth_header else auth_header

        if not token:
            return jsonify({'message': 'Token is missing!'}), 401

        try:
            # Decode the token using the secret key
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
            current_user_id = data['user_id']
        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'Token has expired!'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'message': 'Invalid token!'}), 401

        # Pass the user identity to the route function
        return f(current_user_id, *args, **kwargs)

    return decorated

# --- Routes ---

@app.route('/login', methods=['POST'])
def login():
    """
    Dummy login route to generate a JWT.
    In a real app, you would verify username/password here.
    """
    # Create a payload with a 30-minute expiration
    payload = {
        'user_id': 123,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(minutes=30)
    }
    token = jwt.encode(payload, app.config['SECRET_KEY'], algorithm="HS256")
    
    return jsonify({'token': token})

@app.route('/user/profile', methods=['GET'])
@token_required
def get_user_profile(current_user_id):
    """
    A protected endpoint that only authenticated users can access.
    """
    # Mock user data retrieval
    user_data = {
        'user_id': current_user_id,
        'name': 'Alex Dev',
        'email': 'alex@example.com',
        'status': 'Active'
    }
    return jsonify(user_data)

if __name__ == '__main__':
    app.run(debug=True)