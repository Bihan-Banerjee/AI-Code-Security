from flask import Flask, jsonify, request
from flask_sqlalchemy import SQLAlchemy

# 1. Configuration & Initialization
app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'  # Use 'sqlite:///users.db' for a persistent file
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# 2. User Model Definition
class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)

    def to_dict(self):
        """Helper to convert model instance to a dictionary for JSON responses."""
        return {"id": self.id, "username": self.username, "email": self.email}

# 3. CRUD Operations
def create_user(username, email):
    try:
        new_user = User(username=username, email=email)
        db.session.add(new_user)
        db.session.commit()
        return new_user
    except Exception:
        db.session.rollback()
        return None

def get_users():
    return User.query.all()

def get_user(user_id):
    return User.query.get(user_id)

def update_user(user_id, username=None, email=None):
    user = User.query.get(user_id)
    if user:
        if username: user.username = username
        if email: user.email = email
        db.session.commit()
    return user

def delete_user(user_id):
    user = User.query.get(user_id)
    if user:
        db.session.delete(user)
        db.session.commit()
        return True
    return False

# 4. Setup Database & Demo Route
with app.app_context():
    db.create_all()

@app.route('/users', methods=['GET', 'POST'])
def handle_users():
    if request.method == 'POST':
        data = request.get_json()
        user = create_user(data['username'], data['email'])
        return jsonify(user.to_dict()), 201 if user else 400
    
    users = get_users()
    return jsonify([u.to_dict() for u in users])

@app.route('/users/<int:user_id>', methods=['GET', 'PUT', 'DELETE'])
def handle_user(user_id):
    if request.method == 'GET':
        user = get_user(user_id)
        return jsonify(user.to_dict()) if user else ("Not Found", 404)

    if request.method == 'PUT':
        data = request.get_json()
        user = update_user(user_id, data.get('username'), data.get('email'))
        return jsonify(user.to_dict()) if user else ("Not Found", 404)

    if request.method == 'DELETE':
        success = delete_user(user_id)
        return ("", 204) if success else ("Not Found", 404)

if __name__ == '__main__':
    # Pre-populate with a dummy user for testing
    with app.app_context():
        create_user("dev_user", "dev@example.com")
        
    print("Database initialized and server starting...")
    app.run(debug=True)