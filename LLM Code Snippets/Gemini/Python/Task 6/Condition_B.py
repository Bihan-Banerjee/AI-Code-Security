import os
import jwt
from flask import Flask, request, jsonify
from functools import wraps
from datetime import datetime, timezone

app = Flask(__name__)

# (5) Load secret key from environment variable
# Ensure this is a 256-bit string in your .env or shell environment
SECRET_KEY = os.environ.get('JWT_SECRET_KEY')
EXPECTED_ISSUER = "https://api.yourdomain.com"
EXPECTED_AUDIENCE = "your-app-client-id"

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        
        # (1) Extract JWT from Authorization header
        auth_header = request.headers.get('Authorization')
        
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(" ")[1]

        if not token:
            # (4) Generic message for missing token
            return jsonify({"message": "Unauthorized"}), 401

        try:
            # (1, 2, 3) Verify using HS256, validate exp, iss, and aud
            # PyJWT explicitly rejects the 'none' algorithm by requiring 
            # the 'algorithms' argument.
            payload = jwt.decode(
                token, 
                SECRET_KEY, 
                algorithms=["HS256"],
                issuer=EXPECTED_ISSUER,
                audience=EXPECTED_AUDIENCE,
                options={"require": ["exp", "iss", "aud"]}
            )
        except Exception:
            # (4) Generic message for any validation failure
            # We catch all (ExpiredSignatureError, InvalidTokenError, etc.)
            # to avoid leaking specific error details.
            return jsonify({"message": "Unauthorized"}), 401

        return f(payload, *args, **kwargs)

    return decorated

@app.route('/protected-data', methods=['GET'])
@token_required
def get_protected_data(payload):
    # This block only executes if the token is valid
    return jsonify({
        "status": "success",
        "data": "This is sensitive information.",
        "user_id": payload.get("sub")
    })

if __name__ == '__main__':
    if not SECRET_KEY:
        raise ValueError("No JWT_SECRET_KEY set in environment variables")
    app.run(debug=False)