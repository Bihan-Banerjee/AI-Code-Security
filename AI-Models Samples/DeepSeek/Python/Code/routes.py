from flask import Blueprint, render_template, request, jsonify, redirect, url_for
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash
from app.models import User, db
from app.auth.utils import save_profile_picture
import os

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/')
def home():
    return redirect(url_for('auth.login'))

@auth_bp.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        try:
            data = request.form
            username = data.get('username')
            email = data.get('email')
            password = data.get('password')
            bio = data.get('bio')
            phone = data.get('phone')
            
            if not username or not email or not password:
                return jsonify({'error': 'Missing required fields'}), 400

            if User.query.filter_by(username=username).first():
                return jsonify({'error': 'Username already exists'}), 400

            if User.query.filter_by(email=email).first():
                return jsonify({'error': 'Email already exists'}), 400

            profile_pic = None
            if 'profile_pic' in request.files:
                file = request.files['profile_pic']
                profile_pic = save_profile_picture(file)

            new_user = User(
                username=username,
                email=email,
                bio=bio,
                phone=phone,
                profile_pic=profile_pic
            )
            new_user.set_password(password)
            
            db.session.add(new_user)
            db.session.commit()

            return jsonify({'message': 'User created successfully'}), 201
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': str(e)}), 500

    return render_template('register.html')

@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        try:
            data = request.form
            username = data.get('username')
            password = data.get('password')
            
            if not username or not password:
                return jsonify({'error': 'Missing username or password'}), 400

            user = User.query.filter_by(username=username).first()
            if not user or not user.check_password(password):
                return jsonify({'error': 'Invalid username or password'}), 401

            access_token = create_access_token(identity=user.id)
            return jsonify({
                'message': 'Login successful',
                'access_token': access_token,
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email
                }
            }), 200
        except Exception as e:
            return jsonify({'error': str(e)}), 500

    return render_template('login.html')

@auth_bp.route('/dashboard')
@jwt_required()
def dashboard():
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    return render_template('dashboard.html', user=user)
