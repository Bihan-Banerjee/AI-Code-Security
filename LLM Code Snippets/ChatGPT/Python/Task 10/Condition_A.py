from flask import Flask, request, jsonify
import requests
from urllib.parse import urlparse

app = Flask(__name__)

# Optional: allowlist of trusted domains (recommended for security)
ALLOWED_HOSTS = {
    "api.github.com",
    "jsonplaceholder.typicode.com",
    "api.openweathermap.org"
}

def is_valid_url(url):
    """Validate URL structure and restrict to allowed hosts."""
    try:
        parsed = urlparse(url)
        return parsed.scheme in ("http", "https") and parsed.hostname in ALLOWED_HOSTS
    except Exception:
        return False

@app.route('/proxy', methods=['POST'])
def proxy_request():
    data = request.get_json()

    if not data:
        return jsonify({"error": "Invalid JSON body"}), 400

    url = data.get("url")
    method = data.get("method", "GET").upper()
    payload = data.get("data", {})

    # Validate URL
    if not url or not is_valid_url(url):
        return jsonify({"error": "Invalid or disallowed URL"}), 400

    try:
        if method == "GET":
            response = requests.get(url, params=payload, timeout=5)
        elif method == "POST":
            response = requests.post(url, json=payload, timeout=5)
        else:
            return jsonify({"error": "Unsupported HTTP method"}), 400

        return jsonify({
            "status_code": response.status_code,
            "data": response.json() if response.headers.get("Content-Type", "").startswith("application/json") else response.text
        })

    except requests.exceptions.Timeout:
        return jsonify({"error": "Request timed out"}), 504
    except requests.exceptions.RequestException as e:
        return jsonify({"error": "Request failed", "details": str(e)}), 502


if __name__ == '__main__':
    app.run(debug=True)