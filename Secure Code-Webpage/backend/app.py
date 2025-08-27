from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager, jwt_required, get_jwt_identity
from routes.auth import auth_bp
from dotenv import load_dotenv
from model import enhance_code
import tempfile
import os
import subprocess
import json
from pymongo import MongoClient
from routes.reviews import reviews_bp
from datetime import datetime
from bson import ObjectId
from models.reviews import reviews_collection

load_dotenv()

app = Flask(__name__)
CORS(app)

app.config['MONGO_URI'] = os.getenv("MONGO_URI")
app.config['SECRET_KEY'] = os.getenv('JWT_SECRET') or 'super-secret-key'
app.config["JWT_SECRET_KEY"] = os.getenv('JWT_SECRET') or 'super-secret-key'
app.register_blueprint(reviews_bp)
jwt = JWTManager(app)

client = MongoClient(app.config['MONGO_URI'])
db = client["codewhisperer"]
users = db["users"]
enhance_history = db["enhance_history"]
scan_history = db["scan_history"]

app.register_blueprint(auth_bp, url_prefix="/api")

@app.route('/api/scan', methods=['POST'])
@jwt_required()
def scan_code():
    try:
        data = request.get_json()
        files = data.get("files", [])
        language = data.get("language", "python").lower()
        username = get_jwt_identity()

        written_files = []
        with tempfile.TemporaryDirectory() as temp_dir:
            for f in files:
                filepath = os.path.join(temp_dir, f["filename"])
                with open(filepath, "w", encoding="utf-8") as code_file:
                    code_file.write(f["content"])
                written_files.append(filepath)

            if language == "python":
                scan_command = ["python", "-m", "bandit", "-r", temp_dir, "-f", "json"]
            elif language == "javascript":
                scan_command = ["semgrep", "--config=p/javascript", temp_dir, "--json"]
            else:
                return jsonify({"error": "Unsupported language"}), 400

            result = subprocess.run(scan_command, capture_output=True, text=True)

            if result.returncode not in (0, 1, 2):
                return jsonify({"error": result.stderr}), 500

            try:
                output_json = json.loads(result.stdout)
            except json.JSONDecodeError:
                return jsonify({"error": "Invalid JSON output from scanner"}), 500

            scan_history.insert_one({
                "username": username,
                "language": language,
                "files": files,
                "result": output_json
            })

            return jsonify({"result": output_json})

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/health")
def health():
    return jsonify({"status": "ok"})

@app.route('/api/enhance', methods=['POST'])
@jwt_required()
def enhance():
    try:
        data = request.get_json()
        code = data.get("code", "")
        language = data.get("language", "python").lower()
        username = get_jwt_identity()

        if language not in ["python", "javascript"]:
            return jsonify({"error": "Unsupported language"}), 400

        if not code.strip():
            return jsonify({"error": "No code provided"}), 400

        enhanced_code, diff = enhance_code(code, language)

        enhance_history.insert_one({
            "username": username,
            "code": code,
            "language": language,
            "enhanced_code": enhanced_code,
            "diff": diff
        })

        return jsonify({
            "enhanced_code": enhanced_code,
            "diff": diff
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/history', methods=['GET'])
@jwt_required()
def get_history():
    username = get_jwt_identity()
    enhance_logs = list(enhance_history.find({"username": username}, {"_id": 0}))
    scan_logs = list(scan_history.find({"username": username}, {"_id": 0}))

    return jsonify({
        "enhance": enhance_logs,
        "scan": scan_logs
    })

@app.route("/api/reviews", methods=["POST"])
def submit_review():
    try:
        data = request.get_json()

        name = data.get("name")
        email = data.get("email")
        rating = data.get("rating")
        review = data.get("review")
        date = data.get("date", datetime.utcnow().isoformat())

        if not all([name, email, rating, review]):
            return jsonify({"error": "All fields are required"}), 400

        review_doc = {
            "name": name,
            "email": email,
            "rating": rating,
            "review": review,
            "date": date,
        }

        result = reviews_collection.insert_one(review_doc)

        return jsonify({
            "message": "Review submitted successfully",
            "id": str(result.inserted_id)
        }), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host="0.0.0.0", port=5000, debug=True)
