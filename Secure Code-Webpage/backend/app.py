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
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from datetime import datetime
from datetime import timedelta
from bson import ObjectId
from models.reviews import reviews_collection
from schemas import ScanRequest
from pydantic import ValidationError
from flask_compress import Compress
from flask_caching import Cache
import hashlib
load_dotenv()

app = Flask(__name__)
Compress(app)
CORS(app)

if os.getenv("USE_REDIS", "false").lower() == "true":
    cache = Cache(config={
        "CACHE_TYPE": "RedisCache",
        "CACHE_REDIS_URL": os.getenv("REDIS_URL", "redis://localhost:6379/0"),
        "CACHE_DEFAULT_TIMEOUT": 3600
    })
else:
    cache = Cache(config={
        "CACHE_TYPE": "SimpleCache",
        "CACHE_DEFAULT_TIMEOUT": 3600
    })

cache.init_app(app)

cache.init_app(app)

def files_hash(files):
    h = hashlib.sha256()
    for f in sorted(files, key=lambda x: x["filename"]):
        h.update(f["filename"].encode())
        h.update(b"\0")
        h.update(f["content"].encode())
    return h.hexdigest()

app.config['MONGO_URI'] = os.getenv("MONGO_URI")
app.config['SECRET_KEY'] = os.getenv('JWT_SECRET') or 'super-secret-key'
app.config["JWT_SECRET_KEY"] = os.getenv('JWT_SECRET') or 'super-secret-key'
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(minutes=60)

app.register_blueprint(reviews_bp)
jwt = JWTManager(app)

client = MongoClient(app.config['MONGO_URI'])
db = client["codewhisperer"]
users = db["users"]
enhance_history = db["enhance_history"]
scan_history = db["scan_history"]

app.register_blueprint(auth_bp, url_prefix="/api")

limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["20 per minute"]
)
limiter.init_app(app)

@app.route('/api/scan', methods=['POST'])
@limiter.limit("5/minute")
@jwt_required()
def scan_code():
    try:
        data = request.get_json()
        app.logger.info(f"Incoming request: {data}")   

        try:
            req = ScanRequest(**data)
        except ValidationError as e:
            app.logger.error(f"Validation error: {e.errors()}")
            return jsonify({"error": e.errors()}), 400

        files = [f.dict() for f in req.files]
        language = req.language.lower()
        username = get_jwt_identity()

        key = f"scan:{username}:{files_hash(files)}"
        cached = cache.get(key)
        if cached:
            return jsonify({"result": cached, "cached": True})

        with tempfile.TemporaryDirectory() as temp_dir:
            for f in files:
                path = os.path.join(temp_dir, f["filename"])
                with open(path, "w", encoding="utf-8") as code_file:
                    code_file.write(f["content"])

            if language == "python":
                scan_command = ["python", "-m", "bandit", "-r", temp_dir, "-f", "json"]
            elif language == "javascript":
                scan_command = ["python", "-m", "semgrep", "--config=p/javascript", "--json", temp_dir]
            else:
                return jsonify({"error": "Unsupported language"}), 400

            app.logger.info(f"Running: {' '.join(scan_command)}")
            result = subprocess.run(scan_command, capture_output=True, text=True)

            app.logger.info(f"stdout: {result.stdout[:500]}")
            app.logger.info(f"stderr: {result.stderr}")

            if result.returncode not in (0, 1, 2):
                return jsonify({"error": result.stderr}), 500

            try:
                output_json = json.loads(result.stdout)
            except Exception as e:
                return jsonify({"error": f"JSON parse failed: {str(e)}", "raw": result.stdout}), 500

            cache.set(key, output_json)
            scan_history.insert_one({
                "username": username,
                "language": language,
                "files": files,
                "result": output_json,
                "timestamp": datetime.utcnow().isoformat()
            })

            return jsonify({"result": output_json})

    except Exception as e:
        app.logger.error(f"Unexpected error: {str(e)}")
        return jsonify({"error": str(e)}), 500



@app.route("/api/health")
def health():
    return jsonify({"status": "ok"})

@app.route('/api/enhance', methods=['POST'])
@limiter.limit("5/minute")
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

        # 🔹 New format (returns dict)
        result = enhance_code(code, language)

        # Save to history (with candidates + explanations)
        enhance_history.insert_one({
            "username": username,
            "code": code,
            "language": language,
            "enhanced_code": result["enhanced_code"],
            "diff": result["diff"],
            "candidates": result.get("candidates", []),
            "explanations": result.get("explanations", []),
            "timestamp": datetime.utcnow().isoformat()
        })

        return jsonify(result), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/history', methods=['GET'])
@limiter.limit("10/minute")
@jwt_required()
def history():
    try:
        username = get_jwt_identity()

        # Fetch both histories
        enhance_records = list(enhance_history.find({"username": username}).sort("timestamp", -1))
        scan_records = list(scan_history.find({"username": username}).sort("timestamp", -1))

        # Convert ObjectId to string & return only relevant fields
        def clean(record, record_type):
            return {
                "id": str(record.get("_id")),
                "language": record.get("language"),
                "code": record.get("code"),
                "enhanced_code": record.get("enhanced_code"),
                "diff": record.get("diff"),
                "candidates": record.get("candidates", []),   # ✅ added
                "explanations": record.get("explanations", []), # ✅ added
                "result": record.get("result") if record_type == "scan" else None,
                "timestamp": record.get("timestamp"),
            }

        enhance_list = [clean(r, "enhance") for r in enhance_records]
        scan_list = [clean(r, "scan") for r in scan_records]

        return jsonify({
            "enhance": enhance_list,
            "scan": scan_list
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/reviews", methods=["POST"])
@limiter.limit("5/minute")
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
