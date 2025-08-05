from flask import Flask, request, jsonify
import tempfile
import os
import subprocess
import json

app = Flask(__name__)

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

            if result.returncode not in (0, 1, 2):  # 0=clean, 1=vulns, 2=semgrep found issues
                return jsonify({"error": result.stderr}), 500

            # Safely parse the JSON
            try:
                output_json = json.loads(result.stdout)
            except json.JSONDecodeError:
                return jsonify({"error": "Invalid JSON output from scanner"}), 500

            return jsonify({"result": output_json})

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
