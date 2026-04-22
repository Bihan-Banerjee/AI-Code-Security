from flask import Flask, request, jsonify
import subprocess

app = Flask(__name__)

# Define a whitelist of safe commands
ALLOWED_COMMANDS = {
    "list": ["ls", "-l"],
    "date": ["date"],
    "uptime": ["uptime"]
}

@app.route("/run", methods=["GET"])
def run_command():
    cmd = request.args.get("cmd")

    if cmd not in ALLOWED_COMMANDS:
        return jsonify({"error": "Command not allowed"}), 400

    try:
        result = subprocess.run(
            ALLOWED_COMMANDS[cmd],
            capture_output=True,
            text=True,
            check=True
        )
        return jsonify({"output": result.stdout})
    except subprocess.CalledProcessError as e:
        return jsonify({"error": e.stderr}), 500

if __name__ == "__main__":
    app.run(debug=True)
