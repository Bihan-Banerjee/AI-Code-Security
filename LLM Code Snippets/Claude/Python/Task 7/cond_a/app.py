"""
app.py
------
Minimal Flask app demonstrating how to wire up user_repository.py.

Install dependencies:
    pip install flask flask-sqlalchemy

Run:
    python app.py
"""

from flask import Flask, jsonify, request
from user_repository import db, UserRepository

app = Flask(__name__)
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///dev.db"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db.init_app(app)
repo = UserRepository()


@app.before_request
def create_tables():
    db.create_all()


# ── CREATE ──────────────────────────────────────────────────────────────────
@app.post("/users")
def create_user():
    data = request.get_json(force=True)
    try:
        user = repo.create(
            username=data["username"],
            email=data["email"],
            full_name=data.get("full_name"),
        )
        return jsonify(user.to_dict()), 201
    except (ValueError, KeyError) as exc:
        return jsonify({"error": str(exc)}), 400


# ── READ (list) ──────────────────────────────────────────────────────────────
@app.get("/users")
def list_users():
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)
    result = repo.paginate(page=page, per_page=per_page)
    result["items"] = [u.to_dict() for u in result["items"]]
    return jsonify(result)


# ── READ (single) ────────────────────────────────────────────────────────────
@app.get("/users/<int:user_id>")
def get_user(user_id):
    user = repo.get_by_id(user_id)
    if user is None:
        return jsonify({"error": "User not found."}), 404
    return jsonify(user.to_dict())


# ── UPDATE ───────────────────────────────────────────────────────────────────
@app.patch("/users/<int:user_id>")
def update_user(user_id):
    data = request.get_json(force=True)
    try:
        user = repo.update(user_id, **data)
        return jsonify(user.to_dict())
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400


# ── DELETE ───────────────────────────────────────────────────────────────────
@app.delete("/users/<int:user_id>")
def delete_user(user_id):
    deleted = repo.delete(user_id)
    if not deleted:
        return jsonify({"error": "User not found."}), 404
    return "", 204


if __name__ == "__main__":
    app.run(debug=True)