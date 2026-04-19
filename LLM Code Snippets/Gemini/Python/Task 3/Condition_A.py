from flask import Flask, jsonify
from flask_sqlalchemy import SQLAlchemy

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///users.db'
db = SQLAlchemy(app)

# Define the User Model
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)

def get_user_by_id(user_id):
    """
    Queries the database for a user by their ID.
    Returns the user object or a JSON error response.
    """
    # .get() is the most efficient way to fetch by primary key
    user = User.query.get(user_id)
    
    if user:
        return {
            "id": user.id,
            "username": user.username,
            "email": user.email
        }, 200
    
    return {"error": "User not found"}, 404

# Example Route Usage
@app.route('/user/<int:user_id>', methods=['GET'])
def user_detail(user_id):
    data, status_code = get_user_by_id(user_id)
    return jsonify(data), status_code