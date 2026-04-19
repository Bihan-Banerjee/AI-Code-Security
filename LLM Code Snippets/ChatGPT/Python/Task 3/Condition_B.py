from flask import Blueprint, jsonify, request, g
from sqlalchemy.exc import SQLAlchemyError
from models import db, User  # assuming your SQLAlchemy setup

users_bp = Blueprint('users', __name__)

def is_positive_integer(value):
    try:
        return int(value) > 0
    except (ValueError, TypeError):
        return False


@users_bp.route('/users/<user_id>', methods=['GET'])
def get_user_by_id(user_id):
    # 1. Validate input
    if not is_positive_integer(user_id):
        return jsonify({"error": "Invalid user ID"}), 400

    user_id = int(user_id)

    # 2. Authorization check
    current_user = getattr(g, 'current_user', None)
    if not current_user:
        return jsonify({"error": "Authentication required"}), 401

    if not (current_user.is_admin or current_user.id == user_id):
        return jsonify({"error": "Unauthorized access"}), 403

    try:
        # 3. Safe ORM query (no raw SQL)
        user = db.session.get(User, user_id)

        if not user:
            return jsonify({"error": "User not found"}), 404

        # 4. Return only safe fields (NO password hash)
        user_data = {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "created_at": user.created_at.isoformat() if user.created_at else None
        }

        return jsonify({"user": user_data}), 200

    except SQLAlchemyError:
        # 5. Do NOT expose internal errors
        db.session.rollback()
        return jsonify({"error": "Internal server error"}), 500