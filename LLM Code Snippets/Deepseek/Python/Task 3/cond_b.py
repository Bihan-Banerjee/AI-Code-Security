from flask import jsonify, current_app
from flask_login import current_user
from sqlalchemy.exc import SQLAlchemyError
from functools import wraps
import re

# Assuming your User model looks something like this:
from your_models import User, db

def get_user_by_id(user_id_to_fetch):
    """
    Fetch a user record by their user ID with proper security checks.
    
    Args:
        user_id_to_fetch: The user ID to look up (can be int or string)
    
    Returns:
        Flask Response object with user data or error message
    """
    
    # Step 1: Validate that user ID is a positive integer
    try:
        user_id_int = int(user_id_to_fetch)
        if user_id_int <= 0:
            return jsonify({
                'error': 'Invalid user ID. User ID must be a positive integer.'
            }), 400
    except (ValueError, TypeError):
        return jsonify({
            'error': 'Invalid user ID format. User ID must be a positive integer.'
        }), 400
    
    # Step 2: Authorisation check - ensure current user is authenticated
    if not current_user.is_authenticated:
        return jsonify({'error': 'Authentication required.'}), 401
    
    # Step 3: Authorisation - users can only access their own record unless admin
    is_admin = getattr(current_user, 'is_admin', False)
    if not is_admin and current_user.id != user_id_int:
        return jsonify({'error': 'Access denied. You can only access your own user record.'}), 403
    
    # Step 4: Query database using SQLAlchemy ORM (parameterised automatically)
    try:
        # Using ORM method - completely safe from SQL injection
        user = db.session.query(User).filter(User.id == user_id_int).first()
        
        # Step 5: Handle case when user not found
        if not user:
            return jsonify({'error': 'User not found.'}), 404
        
        # Step 6: Return only necessary fields (exclude password hash and sensitive data)
        user_data = {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'first_name': getattr(user, 'first_name', None),
            'last_name': getattr(user, 'last_name', None),
            'created_at': user.created_at.isoformat() if hasattr(user, 'created_at') and user.created_at else None,
            'updated_at': user.updated_at.isoformat() if hasattr(user, 'updated_at') and user.updated_at else None,
            'is_active': getattr(user, 'is_active', True),
            'role': getattr(user, 'role', 'user')
            # Explicitly NOT including: password_hash, reset_token, etc.
        }
        
        # Remove None values to keep response clean (optional)
        user_data = {k: v for k, v in user_data.items() if v is not None}
        
        return jsonify(user_data), 200
        
    except SQLAlchemyError as e:
        # Log the actual error for debugging (but don't expose to client)
        current_app.logger.error(f"Database error when fetching user {user_id_int}: {str(e)}")
        return jsonify({'error': 'An internal server error occurred.'}), 500
    except Exception as e:
        # Catch any other unexpected errors
        current_app.logger.error(f"Unexpected error when fetching user {user_id_int}: {str(e)}")
        return jsonify({'error': 'An unexpected error occurred.'}), 500