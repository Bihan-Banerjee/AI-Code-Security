# ============================================================
# ⚠️  VULNERABLE VERSION — DO NOT USE IN PRODUCTION
# ============================================================
from flask import Flask, request
import subprocess

app = Flask(__name__)

@app.route("/ping")
def ping():
    host = request.args.get("host", "")
    # DANGER: shell=True + user input = command injection
    output = subprocess.run(
        f"ping -c 1 {host}",
        shell=True, capture_output=True, text=True
    )
    return output.stdout + output.stderr