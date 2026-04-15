from flask import Flask, request, jsonify, Response, stream_with_context
from flask_cors import CORS
from flask_jwt_extended import JWTManager, jwt_required, get_jwt_identity
from routes.auth import auth_bp
from dotenv import load_dotenv
from model import enhance_code
import tempfile
import os
import subprocess
import json
import time
import sys
from pymongo import MongoClient
from routes.reviews import reviews_bp
from extensions import limiter
from datetime import datetime
from datetime import timedelta
from models.reviews import reviews_collection
from schemas import ScanRequest
from pydantic import ValidationError
from flask_compress import Compress
from flask_caching import Cache
import hashlib
load_dotenv()

app = Flask(__name__)
Compress(app)

# FIX: Restrict CORS to known frontend origins instead of allowing all
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
allowed_origins = list({FRONTEND_URL, "http://localhost:5173", "http://localhost:3000", "http://localhost:8080"})
CORS(app, origins=allowed_origins)

# FIX: Limit max upload size to 1 MB to prevent oversized payloads
app.config['MAX_CONTENT_LENGTH'] = 1 * 1024 * 1024

# Load environment variables
env = os.getenv('FLASK_ENV', 'development')
if env == 'development':
    load_dotenv('.env.development')
else:
    load_dotenv('.env.production')

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

cache.init_app(app)  # FIX: removed the duplicate cache.init_app(app) call that was here

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

# FIX: Import limiter from extensions and init with app (single shared instance)
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
                scan_command = [sys.executable, "-m", "bandit", "-r", temp_dir, "-f", "json"]
            elif language == "javascript":
                scan_command = [sys.executable, "-m", "semgrep", "--config=p/javascript", "--json", temp_dir]
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

        result = enhance_code(code, language)

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

        enhance_records = list(enhance_history.find({"username": username}).sort("timestamp", -1))
        scan_records = list(scan_history.find({"username": username}).sort("timestamp", -1))

        def clean(record, record_type):
            return {
                "id": str(record.get("_id")),
                "language": record.get("language"),
                "code": record.get("code"),
                "enhanced_code": record.get("enhanced_code"),
                "diff": record.get("diff"),
                "candidates": record.get("candidates", []),
                "explanations": record.get("explanations", []),
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


# FIX: Added @limiter.limit and history saving; captured username before generator
@app.route("/api/enhance-stream", methods=["POST"])
@limiter.limit("5/minute")
@jwt_required()
def enhance_stream():
    data = request.get_json()
    code = data.get("code", "")
    language = data.get("language", "python")
    username = get_jwt_identity()  # FIX: capture before generator runs

    if not code.strip():
        return jsonify({"error": "No code"}), 400

    def generate():
        try:
            # 1️⃣ starting
            yield json.dumps({
                "type": "progress",
                "progress": 5
            }) + "\n"

            time.sleep(0.5)

            # 2️⃣ preprocessing
            yield json.dumps({
                "type": "progress",
                "progress": 20
            }) + "\n"

            # 3️⃣ heavy AI call
            result = enhance_code(code, language)

            # FIX: Save to history so it appears in dashboard
            try:
                enhance_history.insert_one({
                    "username": username,
                    "code": code,
                    "language": language,
                    "enhanced_code": result.get("enhanced_code", ""),
                    "diff": result.get("diff", []),
                    "candidates": result.get("candidates", []),
                    "explanations": result.get("explanations", []),
                    "timestamp": datetime.utcnow().isoformat()
                })
            except Exception:
                pass  # Don't let a DB write failure kill the stream response

            # 4️⃣ done
            yield json.dumps({
                "type": "result",
                "data": result
            }) + "\n"

        except Exception as e:
            yield json.dumps({
                "type": "error",
                "message": str(e)
            }) + "\n"

    return Response(
        stream_with_context(generate()),
        mimetype="text/plain"
    )


if __name__ == '__main__':
    app.run(host="0.0.0.0", port=5000, debug=True)