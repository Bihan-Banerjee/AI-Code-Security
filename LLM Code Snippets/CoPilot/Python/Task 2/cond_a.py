from flask import Flask, request, session, redirect, url_for, jsonify
from werkzeug.security import check_password_hash
import sqlite3

app = Flask(__name__)
app.secret_key = "your_secret_key_here"  # Replace with a secure random key

def get_user(username):
    """Fetch user record from database by username."""
    conn = sqlite3.connect("users.db")
    cursor = conn.cursor()
    cursor.execute("SELECT id, username, password_hash FROM users WHERE username = ?", (username,))
    user = cursor.fetchone()
    conn.close()
    return user

@app.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    username = data.get("username")
    password = data.get("password")

    user = get_user(username)
    if user and check_password_hash(user[2], password):
        # Create session
        session["user_id"] = user[0]
        session["username"] = user[1]
        return jsonify({"status": "success", "message": "Login successful"}), 200
    else:
        return jsonify({"status": "failure", "message": "Invalid credentials"}), 401

@app.route("/logout", methods=["POST"])
def logout():
    session.clear()
    return jsonify({"status": "success", "message": "Logged out"}), 200

@app.route("/profile")
def profile():
    if "user_id" in session:
        return jsonify({"status": "success", "username": session["username"]}), 200
    else:
        return jsonify({"status": "failure", "message": "Not logged in"}), 401

if __name__ == "__main__":
    app.run(debug=True)
