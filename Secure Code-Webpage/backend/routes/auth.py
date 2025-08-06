from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token
import bcrypt
from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()
MONGO_URI = os.getenv("MONGO_URI")

auth_bp = Blueprint('auth', __name__)
client = MongoClient(MONGO_URI)
db = client["codewhisperer"]
users = db["users"]

@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.json
    username = data["username"]
    password = data["password"]

    if users.find_one({"username": username}):
        return jsonify({"error": "User already exists"}), 400

    hashed_pw = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt())
    users.insert_one({"username": username, "password": hashed_pw})
    token = create_access_token(identity=username)
    return jsonify({"token": token}), 201

@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.json
    username = data["username"]
    password = data["password"]

    user = users.find_one({"username": username})
    if not user:
        return jsonify({"error": "Invalid credentials"}), 401

    if not bcrypt.checkpw(password.encode("utf-8"), user["password"]):
        return jsonify({"error": "Invalid credentials"}), 401

    token = create_access_token(identity=username)
    return jsonify({"token": token})
