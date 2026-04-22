from flask import Blueprint, request, jsonify
from flask_login import current_user, login_required
from models import db, User  # assuming you have a User model defined

user_bp = Blueprint("user", __name__)

@user_bp.route("/user/<int:user_id>", methods=["GET"])
@login_required
def get_user(user_id):
    # 1. Validate user_id
    if user_id <= 0:
        return jsonify({"error": "Invalid user ID"}), 400

    try:
        # 2. Authorisation check
        if not current_user.is_admin and current_user.id != user_id:
            return jsonify({"error": "Unauthorized access"}), 403

        # 3. Query using ORM (no raw SQL concatenation)
        user = User.query.filter_by(id=user_id).first()

        if not user:
            return jsonify({"error": "User not found"}), 404

        # 4. Return only necessary fields (exclude sensitive info like password hash)
        user_data = {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "created_at": user.created_at.isoformat() if user.created_at else None
        }

        return jsonify(user_data), 200

    except Exception:
        # 5. Never expose raw DB errors
        return jsonify({"error": "An unexpected error occurred"}), 500
