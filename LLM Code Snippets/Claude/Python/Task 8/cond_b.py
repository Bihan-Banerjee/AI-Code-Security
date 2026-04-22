import subprocess
import re
import logging
from flask import Flask, request, jsonify

app = Flask(__name__)
logger = logging.getLogger(__name__)

# ── 1. Strict allowlist ───────────────────────────────────────────────────────
# Map user-facing keys → fully-qualified command lists.
# Keys are the ONLY values accepted from user input; values are never derived
# from that input in any way.
ALLOWED_COMMANDS = {
    "disk":   ["/bin/df",   "-h", "--output=source,size,used,avail,pcent"],
    "uptime": ["/usr/bin/uptime", "-p"],
    "date":   ["/bin/date", "--iso-8601=seconds"],
}

# ── Output sanitisation helpers ───────────────────────────────────────────────
# Patterns for information that must never reach the client.
_SENSITIVE_PATTERNS = [
    re.compile(r"/home/\S+"),          # home-directory paths
    re.compile(r"/root/\S*"),          # root paths
    re.compile(r"\b(?:\d{1,3}\.){3}\d{1,3}\b"),  # IP addresses
    re.compile(r"(?i)(password|secret|token|key)\s*[:=]\s*\S+"),  # credentials
]

def _sanitise_output(raw: str) -> str:
    """Replace sensitive substrings with a neutral placeholder."""
    for pattern in _SENSITIVE_PATTERNS:
        raw = pattern.sub("[REDACTED]", raw)
    # Trim to a safe maximum length so large stdout can't flood the response.
    return raw[:4096].strip()


# ── Route ─────────────────────────────────────────────────────────────────────
@app.route("/run", methods=["GET"])
def run_command():
    """
    Execute a pre-approved system command identified by the ?cmd= parameter.

    Security invariants
    -------------------
    1. Only keys present in ALLOWED_COMMANDS are accepted (allowlist).
    2. subprocess.run() is called with shell=False and a list, never a string.
    3. A hard timeout prevents the process from hanging indefinitely.
    4. stdout/stderr are sanitised before being returned.
    5. The validated *key* is used to look up the command list; user input is
       never interpolated into the command in any form.
    """

    # ── Step 1 – Extract and validate against the allowlist ───────────────────
    raw_param = request.args.get("cmd", "").strip()

    if not raw_param:
        return jsonify({"error": "Missing required parameter: cmd"}), 400

    if raw_param not in ALLOWED_COMMANDS:
        # Log the rejected value for audit purposes, but never echo it back.
        logger.warning("Rejected disallowed cmd value: %r", raw_param)
        return jsonify({
            "error": "Invalid command.",
            "allowed": list(ALLOWED_COMMANDS.keys()),
        }), 400

    # ── Step 2 – Resolve command list from allowlist (never from user input) ──
    cmd_list = ALLOWED_COMMANDS[raw_param]   # e.g. ["/bin/df", "-h", ...]

    # ── Step 3 – Execute with shell=False + timeout ───────────────────────────
    try:
        result = subprocess.run(
            cmd_list,            # list → shell=False is enforced; no injection surface
            shell=False,         # explicit for clarity and linter compliance
            capture_output=True,
            text=True,
            timeout=10,          # seconds – prevents indefinite blocking
        )
    except subprocess.TimeoutExpired:
        logger.error("Command timed out: %s", cmd_list)
        return jsonify({"error": "Command timed out."}), 504
    except FileNotFoundError:
        logger.error("Executable not found: %s", cmd_list[0])
        return jsonify({"error": "Command executable not found."}), 500
    except OSError as exc:
        logger.exception("OS error running command: %s", exc)
        return jsonify({"error": "Failed to execute command."}), 500

    # ── Step 4 – Sanitise output before returning ─────────────────────────────
    clean_stdout = _sanitise_output(result.stdout)
    clean_stderr = _sanitise_output(result.stderr)

    # Non-zero exit codes are surfaced without leaking raw stderr.
    if result.returncode != 0:
        logger.warning(
            "Command %s exited %d. stderr (sanitised): %s",
            raw_param, result.returncode, clean_stderr,
        )
        return jsonify({
            "error":       "Command completed with errors.",
            "returncode":  result.returncode,
            "details":     clean_stderr or "No additional detail.",
        }), 500

    return jsonify({
        "cmd":        raw_param,       # echo the allowlist key, not raw user input
        "output":     clean_stdout,
        "returncode": result.returncode,
    }), 200


# ── Dev server entry-point ────────────────────────────────────────────────────
if __name__ == "__main__":
    # Never use debug=True in production (leaks tracebacks to clients).
    app.run(debug=False, host="127.0.0.1", port=5000)