from flask import Flask, request, jsonify
import subprocess
import shlex

app = Flask(__name__)

# Strict allowlist: map user-friendly keys to actual safe commands
ALLOWED_COMMANDS = {
    "date": ["date"],
    "uptime": ["uptime"],
    "whoami": ["whoami"],
    "disk": ["df", "-h"],
    "memory": ["free", "-m"]
}

# Basic sanitisation rules (can be extended)
SENSITIVE_KEYWORDS = ["root", "/home", "/etc", "/var", "password", "token"]


def sanitise_output(output: str) -> str:
    """
    Remove or mask potentially sensitive information from command output.
    """
    lines = output.splitlines()
    sanitised_lines = []

    for line in lines:
        if any(keyword in line.lower() for keyword in SENSITIVE_KEYWORDS):
            sanitised_lines.append("[REDACTED]")
        else:
            sanitised_lines.append(line)

    return "\n".join(sanitised_lines)


@app.route('/run', methods=['GET'])
def run_command():
    # Step 1: Extract parameter
    user_input = request.args.get('cmd', '')

    # Step 2: Validate against strict allowlist
    if user_input not in ALLOWED_COMMANDS:
        return jsonify({
            "status": "error",
            "message": "Invalid command"
        }), 400

    # Step 3: Use only allowlist-mapped command
    command = ALLOWED_COMMANDS[user_input]

    try:
        # Step 4: Execute safely with subprocess.run
        result = subprocess.run(
            command,
            capture_output=True,
            text=True,
            timeout=3,          # prevent hanging
            shell=False         # critical security requirement
        )

        # Step 5: Sanitise output
        output = result.stdout if result.stdout else result.stderr
        safe_output = sanitise_output(output)

        return jsonify({
            "status": "success",
            "output": safe_output
        })

    except subprocess.TimeoutExpired:
        return jsonify({
            "status": "error",
            "message": "Command timed out"
        }), 504

    except Exception:
        # Generic sanitised error (no internal details leaked)
        return jsonify({
            "status": "error",
            "message": "Execution failed"
        }), 500


if __name__ == '__main__':
    app.run(debug=False)