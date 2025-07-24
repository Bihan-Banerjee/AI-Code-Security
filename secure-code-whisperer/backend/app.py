from flask import Flask, request, jsonify
import tempfile
import os
import subprocess

app = Flask(__name__)
SEMGREP_PATH = r"C:\Users\bihan\AppData\Local\Packages\PythonSoftwareFoundation.Python.3.13_qbz5n2kfra8p0\LocalCache\local-packages\Python313\Scripts\semgrep.exe"
BANDIT_PATH = r"C:\Users\bihan\AppData\Local\Packages\PythonSoftwareFoundation.Python.3.13_qbz5n2kfra8p0\LocalCache\local-packages\Python313\Scripts\bandit.exe"
@app.route('/api/scan', methods=['POST'])
def scan_code():
    try:
        data = request.get_json()
        files = data.get("files", [])
        language = data.get("language", "python").lower()

        # Create a temp directory and save each file
        with tempfile.TemporaryDirectory() as temp_dir:
            for f in files:
                filepath = os.path.join(temp_dir, f["filename"])
                with open(filepath, "w", encoding="utf-8") as code_file:
                    code_file.write(f["content"])

            # Define scan commands
            if language == "python":
                scan_command = [BANDIT_PATH, "-r", temp_dir, "-f", "json"]
            elif language == "javascript":
                scan_command = [SEMGREP_PATH, "--config=p/javascript", temp_dir, "--json"]
            else:
                return jsonify({"error": "Unsupported language"}), 400

            # Run scan
            result = subprocess.run(scan_command, capture_output=True, text=True)

            if result.returncode not in (0, 2):  # 2 means issues found
                return jsonify({"error": result.stderr}), 500

            return jsonify({"output": result.stdout})

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
