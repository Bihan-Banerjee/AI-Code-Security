from flask import Flask, request, jsonify, Response, stream_with_context
from flask_cors import CORS
from flask_jwt_extended import JWTManager, jwt_required, get_jwt_identity
from werkzeug.middleware.proxy_fix import ProxyFix
from dotenv import load_dotenv
from model import enhance_code
from llm import test_llm, SUPPORTED as LLM_PROVIDERS
import tempfile
import os
import subprocess
import json
import sys
import hashlib
from datetime import datetime, timedelta
from pydantic import ValidationError
from flask_compress import Compress
from flask_caching import Cache

from routes.auth import auth_bp
from routes.reviews import reviews_bp
from extensions import limiter
from schemas import ScanRequest
from db import enhance_history, scan_history, ensure_indexes

load_dotenv()

ENV = os.getenv("FLASK_ENV", "development")
IS_DEV = ENV == "development"
load_dotenv(".env.development" if IS_DEV else ".env.production")

app = Flask(__name__)
# Trust one proxy hop (HF Spaces / Vercel) so the limiter sees real client IPs.
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1)
Compress(app)

# CORS: localhost is only allowed in development.
# Trailing slashes must be stripped — browsers send the Origin header without
# one, so "https://site/" would never match and every request would be blocked.
def _clean_origin(url):
    return (url or "").strip().rstrip("/")

FRONTEND_URL = _clean_origin(os.getenv("FRONTEND_URL", "http://localhost:5173"))
# Optional comma-separated extra origins (e.g. Vercel preview deployments).
_extra_origins = [_clean_origin(o) for o in os.getenv("ALLOWED_ORIGINS", "").split(",") if o.strip()]
if IS_DEV:
    allowed_origins = list({FRONTEND_URL, "http://localhost:5173", "http://localhost:3000", "http://localhost:8080", *_extra_origins})
else:
    allowed_origins = list({FRONTEND_URL, *_extra_origins})
allowed_origins = [o for o in allowed_origins if o]
CORS(app, origins=allowed_origins)

app.config["MAX_CONTENT_LENGTH"] = 1 * 1024 * 1024

# Cache backend (Redis in prod when configured, in-memory otherwise).
if os.getenv("USE_REDIS", "false").lower() == "true":
    cache = Cache(config={
        "CACHE_TYPE": "RedisCache",
        "CACHE_REDIS_URL": os.getenv("REDIS_URL", "redis://localhost:6379/0"),
        "CACHE_DEFAULT_TIMEOUT": 3600,
    })
else:
    cache = Cache(config={"CACHE_TYPE": "SimpleCache", "CACHE_DEFAULT_TIMEOUT": 3600})
cache.init_app(app)

# Secrets: never fall back to a public default in production.
JWT_SECRET = os.getenv("JWT_SECRET") or os.getenv("SECRET_KEY")
if not JWT_SECRET:
    if IS_DEV:
        JWT_SECRET = "dev-only-insecure-secret"
        app.logger.warning("JWT_SECRET not set; using an insecure development key.")
    else:
        raise RuntimeError("JWT_SECRET (or SECRET_KEY) must be set in production.")

app.config["SECRET_KEY"] = JWT_SECRET
app.config["JWT_SECRET_KEY"] = JWT_SECRET
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(minutes=60)

jwt = JWTManager(app)
limiter.init_app(app)

app.register_blueprint(auth_bp, url_prefix="/api")
app.register_blueprint(reviews_bp)

ensure_indexes()


@app.after_request
def set_security_headers(resp):
    resp.headers["X-Content-Type-Options"] = "nosniff"
    resp.headers["X-Frame-Options"] = "DENY"
    resp.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    resp.headers.setdefault("Cache-Control", "no-store")
    return resp


@app.errorhandler(404)
def _handle_404(e):
    return jsonify({"error": "Not found"}), 404


@app.errorhandler(405)
def _handle_405(e):
    return jsonify({"error": "Method not allowed"}), 405


@app.errorhandler(413)
def _handle_413(e):
    return jsonify({"error": "Payload too large"}), 413


@app.errorhandler(429)
def _handle_429(e):
    return jsonify({"error": "Rate limit exceeded. Please slow down."}), 429


@app.errorhandler(500)
def _handle_500(e):
    return jsonify({"error": "Internal server error"}), 500


def files_hash(files):
    h = hashlib.sha256()
    for f in sorted(files, key=lambda x: x["filename"]):
        h.update(f["filename"].encode())
        h.update(b"\0")
        h.update(f["content"].encode())
    return h.hexdigest()


def _write_files_safely(files, temp_dir):
    """Write files into temp_dir, refusing anything that escapes it. Returns True on success."""
    real_root = os.path.realpath(temp_dir)
    for f in files:
        safe_name = os.path.basename(f["filename"])
        target = os.path.realpath(os.path.join(temp_dir, safe_name))
        if target != real_root and not target.startswith(real_root + os.sep):
            return False
        with open(target, "w", encoding="utf-8") as code_file:
            code_file.write(f["content"])
    return True


@app.route("/api/scan", methods=["POST"])
@limiter.limit("5/minute")
@jwt_required()
def scan_code():
    try:
        data = request.get_json(silent=True) or {}
        try:
            req = ScanRequest(**data)
        except ValidationError as e:
            # pydantic v2 errors() embeds the original exception under ctx, which
            # is not JSON-serialisable; flatten to field/message pairs.
            details = [
                {"field": ".".join(str(x) for x in err.get("loc", [])), "message": err.get("msg", "Invalid value")}
                for err in e.errors()
            ]
            return jsonify({"error": "Validation failed", "details": details}), 400

        files = [f.model_dump() for f in req.files]
        language = req.language.lower()
        username = get_jwt_identity()

        key = f"scan:{username}:{language}:{files_hash(files)}"
        output_json = cache.get(key)
        cached = output_json is not None

        if not cached:
            with tempfile.TemporaryDirectory() as temp_dir:
                if not _write_files_safely(files, temp_dir):
                    return jsonify({"error": "Invalid filename"}), 400

                if language == "python":
                    scan_command = [sys.executable, "-m", "bandit", "-r", temp_dir, "-f", "json"]
                elif language == "javascript":
                    scan_command = [sys.executable, "-m", "semgrep", "--config=p/javascript", "--json", temp_dir]
                else:
                    return jsonify({"error": "Unsupported language"}), 400

                result = subprocess.run(scan_command, capture_output=True, text=True)

                if result.returncode not in (0, 1, 2):
                    app.logger.error("Scanner failed (rc=%s): %s", result.returncode, result.stderr)
                    return jsonify({"error": "Scanner failed to run"}), 500

                if not result.stdout.strip():
                    app.logger.error("Scanner produced no output: %s", result.stderr)
                    return jsonify({"error": "Scanner produced no output"}), 500

                try:
                    output_json = json.loads(result.stdout)
                except Exception as e:
                    app.logger.error("Scanner JSON parse failed: %s", e)
                    return jsonify({"error": "Failed to parse scanner output"}), 500

                cache.set(key, output_json)

        # Record every scan the user runs, even cache hits, so it shows in history.
        try:
            scan_history.insert_one({
                "username": username,
                "language": language,
                "files": files,
                "result": output_json,
                "timestamp": datetime.utcnow().isoformat(),
            })
        except Exception as e:
            app.logger.error("Failed to record scan history: %s", e)

        return jsonify({"result": output_json, "cached": cached})

    except Exception as e:
        app.logger.exception("Unexpected error in /api/scan: %s", e)
        return jsonify({"error": "Internal server error"}), 500


@app.route("/api/health")
def health():
    return jsonify({"status": "ok"})


def _extract_llm(data):
    """Pull per-request LLM config out of the request body. Never stored."""
    raw = data.get("llm")
    if not isinstance(raw, dict):
        # also accept flat fields for convenience
        raw = {
            "provider": data.get("provider"),
            "api_key": data.get("api_key"),
            "model": data.get("model"),
            "base_url": data.get("base_url"),
        }
    return {
        "provider": str(raw.get("provider") or "").strip().lower(),
        "api_key": str(raw.get("api_key") or ""),
        "model": str(raw.get("model") or "").strip(),
        "base_url": str(raw.get("base_url") or "").strip(),
    }


def _resolve_llm(cfg):
    """Resolve the request LLM config to a concrete provider.

    A provider of "" or "default" means "use the built-in free model": the
    server-side OpenRouter key + model. Users who supply their own provider/key
    are passed through untouched. Returns None when "default" is requested but
    the server has no OpenRouter key configured.
    """
    provider = (cfg or {}).get("provider", "")
    if provider in ("", "default", "fortiscan"):
        key = os.getenv("OPENROUTER_API_KEY", "")
        if not key:
            return None
        # The shared key is server-controlled: force the configured model so it
        # can't be pointed at an arbitrary (costly) model by the client.
        return {
            "provider": "openrouter",
            "api_key": key,
            "model": os.getenv("OPENROUTER_FALLBACK_MODEL", "nvidia/nemotron-3-super-120b-a12b:free"),
            "base_url": "",
        }
    return cfg


@app.route("/api/test-llm", methods=["POST"])
@limiter.limit("10/minute")
@jwt_required()
def test_llm_connection():
    """Live-check a user-supplied LLM provider/key before enhancing. Key not stored."""
    try:
        data = request.get_json(silent=True) or {}
        resolved = _resolve_llm(_extract_llm(data))
        if resolved is None:
            return jsonify({
                "ok": False,
                "message": "The built-in free AI isn't configured on the server. Choose a provider and enter your own key.",
            }), 400
        if resolved["provider"] not in LLM_PROVIDERS:
            return jsonify({"ok": False, "message": "Unsupported provider"}), 400
        ok, message = test_llm(
            resolved["provider"], api_key=resolved["api_key"], model=resolved["model"], base_url=resolved["base_url"]
        )
        return jsonify({"ok": ok, "message": message}), (200 if ok else 400)
    except Exception as e:
        app.logger.exception("Unexpected error in /api/test-llm: %s", e)
        return jsonify({"ok": False, "message": "Connection test failed"}), 500


@app.route("/api/enhance", methods=["POST"])
@limiter.limit("5/minute")
@jwt_required()
def enhance():
    try:
        data = request.get_json(silent=True) or {}
        code = data.get("code", "")
        language = str(data.get("language", "python")).lower()
        username = get_jwt_identity()

        if not isinstance(code, str) or not code.strip():
            return jsonify({"error": "No code provided"}), 400
        if language not in ("python", "javascript"):
            return jsonify({"error": "Unsupported language"}), 400

        engine = str(data.get("engine", "deterministic")).lower()
        llm = _resolve_llm(_extract_llm(data)) if engine == "ai" else None
        result = enhance_code(code, language, engine=engine, llm=llm)

        try:
            enhance_history.insert_one({
                "username": username,
                "code": code,
                "language": language,
                "enhanced_code": result["enhanced_code"],
                "diff": result["diff"],
                "candidates": result.get("candidates", []),
                "explanations": result.get("explanations", []),
                "timestamp": datetime.utcnow().isoformat(),
            })
        except Exception as e:
            app.logger.error("Failed to record enhance history: %s", e)

        return jsonify(result), 200

    except Exception as e:
        app.logger.exception("Unexpected error in /api/enhance: %s", e)
        return jsonify({"error": "Internal server error"}), 500


@app.route("/api/history", methods=["GET"])
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

        return jsonify({
            "enhance": [clean(r, "enhance") for r in enhance_records],
            "scan": [clean(r, "scan") for r in scan_records],
        })

    except Exception as e:
        app.logger.exception("Unexpected error in /api/history: %s", e)
        return jsonify({"error": "Internal server error"}), 500


@app.route("/api/enhance-stream", methods=["POST"])
@limiter.limit("5/minute")
@jwt_required()
def enhance_stream():
    data = request.get_json(silent=True) or {}
    code = data.get("code", "")
    language = str(data.get("language", "python")).lower()
    username = get_jwt_identity()

    if not isinstance(code, str) or not code.strip():
        return jsonify({"error": "No code"}), 400
    if language not in ("python", "javascript"):
        return jsonify({"error": "Unsupported language"}), 400

    engine = str(data.get("engine", "deterministic")).lower()
    llm = _resolve_llm(_extract_llm(data)) if engine == "ai" else None

    def generate():
        try:
            yield json.dumps({"type": "progress", "progress": 10}) + "\n"

            result = enhance_code(code, language, engine=engine, llm=llm)

            yield json.dumps({"type": "progress", "progress": 90}) + "\n"

            try:
                enhance_history.insert_one({
                    "username": username,
                    "code": code,
                    "language": language,
                    "enhanced_code": result.get("enhanced_code", ""),
                    "diff": result.get("diff", []),
                    "candidates": result.get("candidates", []),
                    "explanations": result.get("explanations", []),
                    "timestamp": datetime.utcnow().isoformat(),
                })
            except Exception:
                pass

            yield json.dumps({"type": "result", "data": result}) + "\n"

        except Exception as e:
            app.logger.exception("enhance-stream failed: %s", e)
            yield json.dumps({"type": "error", "message": "Enhancement failed"}) + "\n"

    return Response(stream_with_context(generate()), mimetype="text/plain")


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", "5000")), debug=IS_DEV)
