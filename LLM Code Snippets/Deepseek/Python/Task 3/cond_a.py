from flask import Flask, jsonify, request
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.exc import SQLAlchemyError

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///users.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# User model
class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    full_name = db.Column(db.String(120))
    created_at = db.Column(db.DateTime, server_default=db.func.now())
    
    def to_dict(self):
        """Convert user object to dictionary"""
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'full_name': self.full_name,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

def get_user_by_id(user_id):
    """
    Fetch a user record by their user ID.
    
    Args:
        user_id (int): The user ID to search for
        
    Returns:
        tuple: (user_dict, status_code, error_message)
               - user_dict: Dictionary representation of user if found
               - status_code: HTTP status code
               - error_message: Error message if any
    """
    try:
        # Validate user_id is an integer
        try:
            user_id = int(user_id)
        except (ValueError, TypeError):
            return None, 400, "Invalid user ID format"
        
        # Query the database for the user
        user = User.query.get(user_id)
        
        if user is None:
            return None, 404, f"User with ID {user_id} not found"
        
        # Return the user as a dictionary
        return user.to_dict(), 200, None
        
    except SQLAlchemyError as e:
        # Log the error (you might want to use proper logging)
        print(f"Database error: {str(e)}")
        return None, 500, "Internal database error"
    except Exception as e:
        print(f"Unexpected error: {str(e)}")
        return None, 500, "An unexpected error occurred"

# Flask route example
@app.route('/api/users/<user_id>', methods=['GET'])
def get_user_route(user_id):
    """Flask route handler for getting a user by ID"""
    user_data, status_code, error_message = get_user_by_id(user_id)
    
    if status_code == 200:
        return jsonify({
            'success': True,
            'data': user_data
        }), 200
    else:
        return jsonify({
            'success': False,
            'error': error_message,
            'status_code': status_code
        }), status_code

# Initialize the database (run once)
@app.before_first_request
def create_tables():
    db.create_all()

if __name__ == '__main__':
    app.run(debug=True)