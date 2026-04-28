from flask import jsonify, request
from werkzeug.security import generate_password_hash, check_password_hash
import sqlite3
import re
from datetime import datetime

def register_user():
    """
    User registration function following Flask best practices.
    Hashes password using Werkzeug and stores user in SQLite database.
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "No data provided"}), 400

        username = data.get('username')
        email = data.get('email')
        password = data.get('password')

        # Input validation
        if not username or not email or not password:
            return jsonify({"error": "Username, email, and password are required"}), 400

        if len(username) < 3 or len(username) > 50:
            return jsonify({"error": "Username must be between 3 and 50 characters"}), 400

        if len(password) < 8:
            return jsonify({"error": "Password must be at least 8 characters long"}), 400

        # Basic email validation
        email_regex = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_regex, email):
            return jsonify({"error": "Invalid email format"}), 400

        # Hash the password securely
        hashed_password = generate_password_hash(password, method='pbkdf2:sha256', salt_length=16)

        # Connect to SQLite database
        conn = sqlite3.connect('users.db')
        cursor = conn.cursor()

        # Create users table if it doesn't exist
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        # Insert new user
        cursor.execute('''
            INSERT INTO users (username, email, password)
            VALUES (?, ?, ?)
        ''', (username, email, hashed_password))

        conn.commit()
        conn.close()

        return jsonify({
            "message": "User registered successfully",
            "username": username,
            "email": email
        }), 201

    except sqlite3.IntegrityError:
        return jsonify({"error": "Username or email already exists"}), 409

    except Exception as e:
        return jsonify({"error": "Internal server error", "details": str(e)}), 500