import re
import sqlite3
from flask import request, jsonify
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError

# Initialize Argon2 hasher
ph = PasswordHasher()

def register_user():
    """
    Handles user registration with secure hashing and validation.
    """
    data = request.get_json()
    
    # 1. Extract and sanitize inputs
    username = str(data.get('username', '')).strip()
    email = str(data.get('email', '')).strip().lower()
    password = str(data.get('password', ''))

    # 2. Validation & Sanitization
    if not username or not email or not password:
        return jsonify({"error": "Invalid input provided."}), 400

    # Email format validation
    if not re.match(r"[^@]+@[^@]+\.[^@]+", email):
        return jsonify({"error": "Invalid input provided."}), 400

    # Password complexity (Min 12 chars, 1 Uppercase, 1 Lowercase, 1 Number, 1 Special)
    if len(password) < 12 or \
       not re.search(r"[A-Z]", password) or \
       not re.search(r"[a-z]", password) or \
       not re.search(r"[0-9]", password) or \
       not re.search(r"[!@#$%^&*(),.?\":{}|<>]", password):
        return jsonify({"error": "Invalid input provided."}), 400

    # 3. Hash the password
    # Argon2 automatically handles salting
    hashed_password = ph.hash(password)

    # 4. Database Operation
    try:
        # Use context manager for DB connection
        with sqlite3.connect("users.db") as conn:
            cursor = conn.cursor()
            
            # Use Parameterized Queries to prevent SQL Injection
            query = "INSERT INTO users (username, email, password) VALUES (?, ?, ?)"
            cursor.execute(query, (username, email, hashed_password))
            conn.commit()
            
    except sqlite3.IntegrityError:
        # 5. Generic error message to prevent User Enumeration
        # We do not specify if the username or email was the duplicate.
        return jsonify({"error": "Registration failed. Please try again or use different credentials."}), 400
    except Exception as e:
        # Log the actual error internally, but return a generic one to the user
        return jsonify({"error": "An internal error occurred."}), 500

    return jsonify({"message": "User registered successfully."}), 201