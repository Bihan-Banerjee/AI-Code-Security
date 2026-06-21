import re
from flask import Blueprint, request, jsonify
from datetime import datetime
from db import reviews_collection
from extensions import limiter

reviews_bp = Blueprint("reviews", __name__)

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


@reviews_bp.route("/api/reviews", methods=["GET"])
@limiter.limit("30/minute")
def list_reviews():
    try:
        docs = list(reviews_collection.find().sort("date", -1).limit(50))
        reviews = [
            {
                "id": str(d.get("_id")),
                "name": d.get("name"),
                "rating": d.get("rating"),
                "review": d.get("review"),
                "date": d.get("date"),
            }
            for d in docs
        ]
        return jsonify({"reviews": reviews})
    except Exception:
        return jsonify({"error": "Internal server error"}), 500


@reviews_bp.route("/api/reviews", methods=["POST"])
@limiter.limit("5/minute")
def submit_review():
    try:
        data = request.get_json(silent=True) or {}
        name = str(data.get("name", "")).strip()
        email = str(data.get("email", "")).strip()
        review = str(data.get("review", "")).strip()
        rating = data.get("rating")

        if not name or not email or not review or rating is None:
            return jsonify({"error": "All fields are required"}), 400

        try:
            rating = int(rating)
        except (TypeError, ValueError):
            return jsonify({"error": "Rating must be a number"}), 400
        if rating < 1 or rating > 5:
            return jsonify({"error": "Rating must be between 1 and 5"}), 400

        if len(name) > 80 or len(email) > 120 or len(review) > 2000:
            return jsonify({"error": "One or more fields are too long"}), 400
        if not EMAIL_RE.match(email):
            return jsonify({"error": "Invalid email"}), 400

        result = reviews_collection.insert_one(
            {
                "name": name,
                "email": email,
                "rating": rating,
                "review": review,
                "date": datetime.utcnow().isoformat(),
            }
        )
        return jsonify({"message": "Review submitted successfully!", "id": str(result.inserted_id)}), 201
    except Exception:
        return jsonify({"error": "Internal server error"}), 500
