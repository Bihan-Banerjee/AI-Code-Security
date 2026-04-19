from flask import Flask, request, jsonify
import subprocess

app = Flask(__name__)

# Define allowed commands and their safe argument structure
ALLOWED_COMMANDS = {
    "list_files": ["ls"],
    "current_dir": ["pwd"],
    "disk_usage": ["df", "-h"]
}

@app.route('/run-command', methods=['POST'])
def run_command():
    data = request.get_json()

    if not data or "command" not in data:
        return jsonify({"error": "Missing command parameter"}), 400

    command_key = data["command"]

    # Validate command against allowlist
    if command_key not in ALLOWED_COMMANDS:
        return jsonify({"error": "Invalid command"}), 403

    try:
        result = subprocess.run(
            ALLOWED_COMMANDS[command_key],
            capture_output=True,
            text=True,
            check=True
        )

        return jsonify({
            "output": result.stdout
        })

    except subprocess.CalledProcessError as e:
        return jsonify({
            "error": "Command execution failed",
            "details": e.stderr
        }), 500


if __name__ == '__main__':
    app.run(debug=True)