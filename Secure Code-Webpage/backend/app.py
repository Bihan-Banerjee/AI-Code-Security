from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from routes.auth import auth_bp
from dotenv import load_dotenv
from routes.auth import auth_bp
from model import enhance_code
import tempfile
import os
import subprocess
import json

load_dotenv()

app = Flask(__name__)
CORS(app)

app.config['MONGO_URI'] = os.getenv("MONGO_URI")
app.config['SECRET_KEY'] = os.getenv('JWT_SECRET') or 'super-secret-key'
app.config["JWT_SECRET_KEY"] = os.getenv('JWT_SECRET') or 'super-secret-key'

jwt = JWTManager(app)

app.register_blueprint(auth_bp, url_prefix="/api")

@app.route('/api/scan', methods=['POST'])
def scan_code():
    try:
        data = request.get_json()
        files = data.get("files", [])
        language = data.get("language", "python").lower()

        written_files = []
        with tempfile.TemporaryDirectory() as temp_dir:
            for f in files:
                filepath = os.path.join(temp_dir, f["filename"])
                with open(filepath, "w", encoding="utf-8") as code_file:
                    code_file.write(f["content"])
                written_files.append(filepath)

            print(f"[DEBUG] Files written to: {written_files}")

            if language == "python":
                scan_command = ["python", "-m", "bandit", "-r", temp_dir, "-f", "json"]
            elif language == "javascript":
                scan_command = ["semgrep", "--config=p/javascript", temp_dir, "--json"]
            else:
                return jsonify({"error": "Unsupported language"}), 400

            print(f"[DEBUG] Command run: {' '.join(scan_command)}")

            result = subprocess.run(scan_command, capture_output=True, text=True)
            print(f"[DEBUG] Bandit return code: {result.returncode}")
            print(f"[DEBUG] STDOUT: {result.stdout}")
            print(f"[DEBUG] STDERR: {result.stderr}")

            if result.returncode not in (0, 1, 2):
                return jsonify({"error": result.stderr}), 500

            try:
                output_json = json.loads(result.stdout)
            except json.JSONDecodeError:
                return jsonify({"error": "Invalid JSON output from scanner"}), 500

            return jsonify({"result": output_json})

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/health")
def health():
    return jsonify({"status": "ok"})

@app.route('/api/enhance', methods=['POST'])
def enhance():
    try:
        data = request.get_json()
        code = data.get("code", "")
        language = data.get("language", "python").lower()

        if language not in ["python", "javascript"]:
            return jsonify({"error": "Unsupported language"}), 400

        if not code.strip():
            return jsonify({"error": "No code provided"}), 400

        enhanced_code, diff = enhance_code(code, language)
        return jsonify({
            "enhanced_code": diff,
            "diff": enhanced_code
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host="0.0.0.0", port=5000, debug=True)
