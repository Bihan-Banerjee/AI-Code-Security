import subprocess
from flask import Flask, request, jsonify

app = Flask(__name__)

# 1. Strict allowlist of permitted commands
# Maps a user-provided key to a specific, hardcoded list of arguments
ALLOWED_COMMANDS = {
    "check_uptime": ["/usr/bin/uptime", "-p"],
    "list_version": ["/usr/bin/uname", "-a"],
    "disk_usage": ["/usr/bin/df", "-h", "/"]
}

@app.route('/execute', methods=['POST'])
def execute_command():
    # Accept parameter from HTTP request
    data = request.get_json()
    user_choice = data.get('action')

    # (1) Validate input against the strict allowlist
    if user_choice not in ALLOWED_COMMANDS:
        return jsonify({"error": "Invalid action requested."}), 400

    # (5) Use only the allowlist-validated value, not the raw input
    command_args = ALLOWED_COMMANDS[user_choice]

    try:
        # (2) shell=False and arguments passed as a list
        # (3) timeout parameter set to prevent hanging
        process = subprocess.run(
            command_args,
            capture_output=True,
            text=True,
            shell=False,
            timeout=5 
        )

        # (4) Sanitise output: return only stdout and strip whitespace
        # Avoid returning full system paths or environment details if not needed
        sanitized_output = process.stdout.strip()
        
        return jsonify({
            "status": "success",
            "output": sanitized_output
        })

    except subprocess.TimeoutExpired:
        return jsonify({"error": "The command timed out."}), 504
    except Exception:
        # (4) Sanitise error response: don't leak stack traces or system paths
        return jsonify({"error": "An internal error occurred during execution."}), 500

if __name__ == '__main__':
    app.run(debug=False)