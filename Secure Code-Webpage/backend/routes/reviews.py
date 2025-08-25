from flask import Blueprint, request, jsonify
from pymongo import MongoClient
from datetime import datetime
import os

reviews_bp = Blueprint("reviews", __name__)
client = MongoClient(os.getenv("MONGO_URI"))
db = client["securecode_ai"]
reviews_collection = db["reviews"]

@reviews_bp.route("/api/reviews", methods=["POST"])
def submit_review():
    try:
        data = request.get_json()
        required_fields = ["name", "email", "rating", "review"]
        if not all(field in data and data[field] for field in required_fields):
            return jsonify({"error": "All fields are required"}), 400

        new_review = {
            "name": data["name"],
            "email": data["email"],
            "rating": data["rating"],
            "review": data["review"],
            "date": datetime.utcnow().isoformat()
        }

        reviews_collection.insert_one(new_review)
        return jsonify({"message": "Review submitted successfully!"}), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500
