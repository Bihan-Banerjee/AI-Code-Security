from flask import abort, g
from models import db, User

def get_user_profile(user_id_input):
    """
    Fetches a user record securely.
    Ensures input validation, authorization, and data minimization.
    """
    
    # 1. Validate Input: Must be a positive integer
    try:
        user_id = int(user_id_input)
        if user_id <= 0:
            raise ValueError
    except (TypeError, ValueError):
        # We return a 400 without exposing internal logic
        abort(400, description="Invalid user ID format.")

    # 2. Authorization Check: Self-access or Admin only
    # Assumes g.current_user is populated by your auth middleware
    if not g.current_user:
        abort(401, description="Authentication required.")

    if g.current_user.id != user_id and not g.current_user.is_admin:
        abort(403, description="You do not have permission to view this record.")

    # 3. Secure Query: Using ORM methods (parameterized by default)
    # 4. Data Minimization: Use .with_entities() to fetch only specific fields
    try:
        user_data = db.session.query(User).with_entities(
            User.id, 
            User.username, 
            User.email, 
            User.created_at
        ).filter(User.id == user_id).first()

        if not user_data:
            abort(404, description="User record not found.")

        # Convert the Row object to a dictionary for the response
        return {
            "id": user_data.id,
            "username": user_data.username,
            "email": user_data.email,
            "created_at": user_data.created_at.isoformat()
        }

    except Exception:
        # 5. Shielding: Never expose raw DB errors or stack traces to the client
        # Log the actual error internally here (e.g., logger.error(e))
        abort(500, description="An internal server error occurred.")