from flask import Flask, request, jsonify, render_template, redirect, url_for, flash
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from flask_sqlalchemy import SQLAlchemy
from werkzeug.utils import secure_filename
from werkzeug.security import generate_password_hash, check_password_hash
from models import db, User
from config import Config
import os

app = Flask(__name__)
app.config.from_object(Config)

db.init_app(app)
jwt = JWTManager(app)

with app.app_context():
    db.create_all()

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/')
def home():
    return redirect(url_for('login'))

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form['username']
        email = request.form['email']
        password = request.form['password']
        bio = request.form.get('bio')
        phone = request.form.get('phone')
        file = request.files.get('profile_pic')

        if User.query.filter_by(username=username).first() or User.query.filter_by(email=email).first():
            flash('Username or Email already exists!', 'danger')
            return redirect(url_for('register'))

        profile_pic_path = None
        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            profile_pic_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(profile_pic_path)

        hashed_pw = generate_password_hash(password)

        new_user = User(username=username, email=email, password=hashed_pw, bio=bio, phone=phone, profile_pic=profile_pic_path)
        db.session.add(new_user)
        db.session.commit()
        flash('Registration successful! Please login.', 'success')
        return redirect(url_for('login'))

    return render_template('register.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email = request.form['email']
        password = request.form['password']
        user = User.query.filter_by(email=email).first()

        if user and check_password_hash(user.password, password):
            access_token = create_access_token(identity=user.id)
            return jsonify({'access_token': access_token})

        flash('Invalid credentials', 'danger')
        return redirect(url_for('login'))

    return render_template('login.html')

@app.route('/dashboard', methods=['GET'])
@jwt_required()
def dashboard():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if user:
        user_data = {
            'username': user.username,
            'email': user.email,
            'bio': user.bio,
            'phone': user.phone,
            'profile_pic': user.profile_pic
        }
        return jsonify(user_data)
    return jsonify({'msg': 'User not found'}), 404

@app.errorhandler(413)
def file_too_large(e):
    return "File too large", 413

if __name__ == '__main__':
    app.run(debug=True)
