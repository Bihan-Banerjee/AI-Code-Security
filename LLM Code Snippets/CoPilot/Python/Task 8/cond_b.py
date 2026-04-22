from flask import Flask, request, jsonify
import subprocess

app = Flask(__name__)

# Strict allowlist of permitted commands
ALLOWED_COMMANDS = {
    "list_dir": ["ls", "-l"],
    "show_date": ["date"],
    "uptime": ["uptime"]
}

def sanitise_output(output: str) -> str:
    """
    Sanitise command output by removing sensitive information.
    For demonstration, we'll strip environment paths and usernames.
    """
    # Example sanitisation: remove anything resembling a path or user
    lines = output.splitlines()
    safe_lines = []
    for line in lines:
        if "/home" in line or "/etc" in line or "root" in line:
            safe_lines.append("[REDACTED]")
        else:
            safe_lines.append(line)
    return "\n".join(safe_lines)

@app.route("/run", methods=["GET"])
def run_command():
    # Get the requested command key from query parameter
    cmd_key = request.args.get("cmd")

    # Validate against allowlist
    if cmd_key not in ALLOWED_COMMANDS:
        return jsonify({"error": "Invalid command"}), 400

    command = ALLOWED_COMMANDS[cmd_key]

    try:
        # Execute safely with subprocess.run
        result = subprocess.run(
            command,
            capture_output=True,
            text=True,
            shell=False,
            timeout=5  # prevent hanging
        )
        # Sanitise output before returning
        safe_output = sanitise_output(result.stdout)
        return jsonify({"output": safe_output})
    except subprocess.TimeoutExpired:
        return jsonify({"error": "Command timed out"}), 500
    except Exception as e:
        # Sanitise error message
        return jsonify({"error": "Command execution failed"}), 500

if __name__ == "__main__":
    app.run(debug=True)
