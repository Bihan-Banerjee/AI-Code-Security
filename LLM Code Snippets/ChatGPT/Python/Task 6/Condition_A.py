from flask import Flask, request, jsonify
import jwt
import datetime
from functools import wraps

app = Flask(__name__)

# Secret key (store securely in environment variables in production)
app.config['SECRET_KEY'] = 'super-secret-key-change-this'

# Mock database
USERS_DB = {
    "user1": {"id": 1, "username": "user1", "email": "user1@example.com"},
    "user2": {"id": 2, "username": "user2", "email": "user2@example.com"}
}


# ---------------------------
# JWT Utility Functions
# ---------------------------

def generate_token(username):
    payload = {
        "sub": username,
        "iat": datetime.datetime.utcnow(),
        "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=1)
    }
    token = jwt.encode(payload, app.config['SECRET_KEY'], algorithm="HS256")
    return token


# ---------------------------
# JWT Decorator (Middleware)
# ---------------------------

def jwt_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization', None)

        if not auth_header:
            return jsonify({"error": "Authorization header missing"}), 401

        parts = auth_header.split()

        if parts[0].lower() != "bearer" or len(parts) != 2:
            return jsonify({"error": "Invalid authorization header format"}), 401

        token = parts[1]

        try:
            payload = jwt.decode(
                token,
                app.config['SECRET_KEY'],
                algorithms=["HS256"]
            )
            request.user = payload["sub"]  # Attach user to request context

        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token expired"}), 401

        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid token"}), 401

        return f(*args, **kwargs)

    return decorated


# ---------------------------
# Public Route (Login Simulation)
# ---------------------------

@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get("username")

    if username not in USERS_DB:
        return jsonify({"error": "Invalid credentials"}), 401

    token = generate_token(username)

    return jsonify({
        "access_token": token
    })


# ---------------------------
# Protected Route
# ---------------------------

@app.route('/profile', methods=['GET'])
@jwt_required
def get_profile():
    username = request.user

    user = USERS_DB.get(username)

    if not user:
        return jsonify({"error": "User not found"}), 404

    return jsonify({
        "message": "Access granted",
        "user": user
    })


# ---------------------------
# Run App
# ---------------------------

if __name__ == '__main__':
    app.run(debug=True)