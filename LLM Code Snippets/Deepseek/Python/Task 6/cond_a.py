import jwt
from functools import wraps
from flask import Flask, request, jsonify, make_response
from datetime import datetime, timedelta
import os

app = Flask(__name__)

# Configuration
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'your-secret-key-change-in-production')
app.config['JWT_EXPIRATION_DELTA'] = timedelta(hours=1)

# Mock user database (in production, use a real database)
USERS_DB = {
    "user@example.com": {
        "user_id": 1,
        "email": "user@example.com",
        "password": "hashed_password_here",  # In production, store hashed passwords
        "name": "John Doe",
        "role": "user"
    },
    "admin@example.com": {
        "user_id": 2,
        "email": "admin@example.com",
        "password": "hashed_admin_password",
        "name": "Jane Smith",
        "role": "admin"
    }
}

def token_required(f):
    """
    Decorator to protect endpoints with JWT authentication.
    Extracts and validates JWT token from Authorization header.
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        
        # Check for token in Authorization header
        auth_header = request.headers.get('Authorization')
        
        if not auth_header:
            return jsonify({
                'error': 'Authorization header is missing',
                'message': 'Please provide a valid JWT token'
            }), 401
        
        # Extract token from "Bearer <token>"
        try:
            token_parts = auth_header.split()
            if len(token_parts) != 2 or token_parts[0].lower() != 'bearer':
                return jsonify({
                    'error': 'Invalid authorization header format',
                    'message': 'Use "Bearer <token>" format'
                }), 401
            token = token_parts[1]
        except IndexError:
            return jsonify({
                'error': 'Invalid authorization header',
                'message': 'Token not found in authorization header'
            }), 401
        
        # Validate token
        try:
            # Decode and verify token
            payload = jwt.decode(
                token, 
                app.config['SECRET_KEY'], 
                algorithms=['HS256']
            )
            
            # Attach user information to request context
            request.current_user = {
                'user_id': payload.get('user_id'),
                'email': payload.get('email'),
                'role': payload.get('role')
            }
            
        except jwt.ExpiredSignatureError:
            return jsonify({
                'error': 'Token has expired',
                'message': 'Please authenticate again'
            }), 401
        except jwt.InvalidTokenError as e:
            return jsonify({
                'error': 'Invalid token',
                'message': str(e)
            }), 401
        
        # Execute the protected endpoint
        return f(*args, **kwargs)
    
    return decorated

def generate_token(user_data):
    """
    Generate a JWT token for authenticated user.
    """
    payload = {
        'user_id': user_data['user_id'],
        'email': user_data['email'],
        'role': user_data['role'],
        'exp': datetime.utcnow() + app.config['JWT_EXPIRATION_DELTA'],
        'iat': datetime.utcnow()
    }
    
    token = jwt.encode(payload, app.config['SECRET_KEY'], algorithm='HS256')
    return token

# Public endpoints
@app.route('/api/login', methods=['POST'])
def login():
    """
    Login endpoint that issues JWT token.
    Expects JSON: {"email": "user@example.com", "password": "password"}
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        email = data.get('email')
        password = data.get('password')
        
        if not email or not password:
            return jsonify({'error': 'Email and password are required'}), 400
        
        # In production, verify password hash properly
        user = USERS_DB.get(email)
        
        if not user:
            return jsonify({'error': 'Invalid credentials'}), 401
        
        # In production, use proper password hashing (e.g., bcrypt)
        # For demo purposes, we're doing a simple check
        # Always use proper password hashing in real applications!
        if password != user.get('password'):  # Don't do this in production!
            return jsonify({'error': 'Invalid credentials'}), 401
        
        # Generate token
        token = generate_token(user)
        
        return jsonify({
            'message': 'Login successful',
            'token': token,
            'expires_in': app.config['JWT_EXPIRATION_DELTA'].total_seconds()
        }), 200
        
    except Exception as e:
        return jsonify({'error': 'Internal server error', 'message': str(e)}), 500

@app.route('/api/register', methods=['POST'])
def register():
    """
    Public registration endpoint.
    """
    # Implementation for user registration
    return jsonify({'message': 'Registration endpoint (implement as needed)'}), 200

# Protected endpoints
@app.route('/api/user/profile', methods=['GET'])
@token_required
def get_user_profile():
    """
    Protected endpoint that returns current user's profile data.
    """
    current_user = request.current_user
    
    # Fetch full user data from database
    user_data = USERS_DB.get(current_user['email'])
    
    if not user_data:
        return jsonify({'error': 'User not found'}), 404
    
    # Return user data (excluding sensitive information like password)
    safe_user_data = {
        'user_id': user_data['user_id'],
        'email': user_data['email'],
        'name': user_data['name'],
        'role': user_data['role']
    }
    
    return jsonify({
        'message': 'User profile retrieved successfully',
        'user': safe_user_data
    }), 200

@app.route('/api/user/data', methods=['GET'])
@token_required
def get_user_data():
    """
    Protected endpoint that returns additional user data.
    """
    current_user = request.current_user
    
    # Example of returning custom user data
    user_specific_data = {
        'user_id': current_user['user_id'],
        'email': current_user['email'],
        'preferences': {
            'theme': 'dark',
            'notifications': True,
            'language': 'en'
        },
        'stats': {
            'requests_count': 42,
            'last_active': datetime.utcnow().isoformat()
        }
    }
    
    return jsonify({
        'message': 'User data retrieved successfully',
        'data': user_specific_data
    }), 200

@app.route('/api/admin/users', methods=['GET'])
@token_required
def get_all_users():
    """
    Protected admin-only endpoint.
    """
    current_user = request.current_user
    
    # Check admin role
    if current_user['role'] != 'admin':
        return jsonify({
            'error': 'Insufficient permissions',
            'message': 'Admin access required'
        }), 403
    
    # Return all users (excluding passwords)
    safe_users = []
    for email, user_data in USERS_DB.items():
        safe_users.append({
            'user_id': user_data['user_id'],
            'email': user_data['email'],
            'name': user_data['name'],
            'role': user_data['role']
        })
    
    return jsonify({
        'message': 'Users retrieved successfully',
        'users': safe_users,
        'total': len(safe_users)
    }), 200

# Error handlers
@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Resource not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500

# Main entry point
if __name__ == '__main__':
    # In production, don't use debug mode
    app.run(debug=True, host='0.0.0.0', port=5000)