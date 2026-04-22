import os
import sys
from functools import wraps
from flask import Flask, request, jsonify
import jwt
from datetime import datetime, timezone, timedelta
from dotenv import load_dotenv

# Load environment variables from .env file (for development)
load_dotenv()

app = Flask(__name__)

# Configuration from environment variables
SECRET_KEY = os.environ.get('JWT_SECRET_KEY')
JWT_ALGORITHM = os.environ.get('JWT_ALGORITHM', 'HS256')
JWT_ISSUER = os.environ.get('JWT_ISSUER', 'your-app-name')
JWT_AUDIENCE = os.environ.get('JWT_AUDIENCE', 'your-api')

# Validate secret key at startup
if not SECRET_KEY:
    print("ERROR: JWT_SECRET_KEY environment variable is not set", file=sys.stderr)
    sys.exit(1)

# Ensure minimum key length for HS256 (256 bits = 32 bytes)
if JWT_ALGORITHM == 'HS256' and len(SECRET_KEY.encode('utf-8')) < 32:
    print("ERROR: JWT_SECRET_KEY must be at least 32 bytes (256 bits) for HS256", 
          file=sys.stderr)
    sys.exit(1)


def verify_jwt(token):
    """
    Verify JWT token with comprehensive validation.
    Returns (is_valid, payload) tuple.
    Never exposes token parsing errors.
    """
    try:
        # Explicitly reject 'none' algorithm
        # First, decode without verification to check the algorithm header
        unverified_header = jwt.get_unverified_header(token)
        if unverified_header.get('alg') == 'none':
            return False, None
        
        # Verify token with all required validations
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[JWT_ALGORITHM],
            issuer=JWT_ISSUER,
            audience=JWT_AUDIENCE,
            options={
                'require': ['exp', 'iss', 'aud'],  # Require these claims
                'verify_exp': True,                 # Verify expiry
                'verify_iss': True,                 # Verify issuer
                'verify_aud': True,                 # Verify audience
                'verify_signature': True            # Verify signature
            }
        )
        
        # Additional check: ensure token hasn't expired (jwt.decode already does this,
        # but we do an explicit check with proper timezone handling)
        exp_timestamp = payload.get('exp')
        if exp_timestamp:
            exp_datetime = datetime.fromtimestamp(exp_timestamp, tz=timezone.utc)
            if exp_datetime < datetime.now(timezone.utc):
                return False, None
        
        return True, payload
        
    except jwt.InvalidTokenError:
        # Catch all JWT validation errors (expired, invalid signature, etc.)
        return False, None
    except Exception:
        # Catch any unexpected errors (should never happen with proper JWT library)
        return False, None


def jwt_required(f):
    """
    Decorator to protect endpoints with JWT authentication.
    Returns 401 for any validation failure.
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Extract token from Authorization header
        auth_header = request.headers.get('Authorization')
        
        if not auth_header:
            return jsonify({'error': 'Authentication required'}), 401
        
        # Expected format: "Bearer <token>"
        parts = auth_header.split()
        if len(parts) != 2 or parts[0].lower() != 'bearer':
            return jsonify({'error': 'Authentication required'}), 401
        
        token = parts[1]
        
        # Verify the token
        is_valid, payload = verify_jwt(token)
        
        if not is_valid:
            # Generic message - never expose details
            return jsonify({'error': 'Authentication required'}), 401
        
        # Attach user info from token to the request context
        # (available as request.user_info in the endpoint)
        request.user_info = payload
        
        return f(*args, **kwargs)
    
    return decorated_function


# Example protected endpoint
@app.route('/api/protected', methods=['GET'])
@jwt_required
def protected_endpoint():
    """
    Protected REST API endpoint.
    Business logic executes only after successful authentication.
    """
    # Business logic here
    user_id = request.user_info.get('sub', 'unknown')
    
    return jsonify({
        'message': 'Access granted to protected resource',
        'user_id': user_id,
        'timestamp': datetime.now(timezone.utc).isoformat()
    }), 200


# Example endpoint to demonstrate token generation (for testing)
@app.route('/api/login', methods=['POST'])
def login():
    """
    Example login endpoint to generate a test token.
    In production, validate credentials first.
    """
    # In production: validate username/password here
    # For demo purposes, create a token with standard claims
    
    payload = {
        'sub': 'user123',
        'iss': JWT_ISSUER,
        'aud': JWT_AUDIENCE,
        'exp': datetime.now(timezone.utc) + timedelta(hours=1),
        'iat': datetime.now(timezone.utc)
    }
    
    token = jwt.encode(payload, SECRET_KEY, algorithm=JWT_ALGORITHM)
    
    # jwt.encode returns a string in PyJWT >= 2.0
    return jsonify({'token': token}), 200


# Health check endpoint (no authentication required)
@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy'}), 200


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)