from flask import Flask, request, jsonify
import requests
import logging
from urllib.parse import urljoin, urlparse, parse_qs, urlencode, urlunparse

app = Flask(__name__)

# Hardcoded allowlist of permitted external API base URLs
ALLOWED_SERVICES = {
    "jsonplaceholder": "https://jsonplaceholder.typicode.com/",
    "httpbin": "https://httpbin.org/",
    # Add more services here
}

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def redact_url(url: str) -> str:
    """
    Redact sensitive query parameters (like api_key, token).
    """
    parsed = urlparse(url)
    query_params = parse_qs(parsed.query)

    redacted_params = {}
    for key, value in query_params.items():
        if "key" in key.lower() or "token" in key.lower():
            redacted_params[key] = ["REDACTED"]
        else:
            redacted_params[key] = value

    redacted_query = urlencode(redacted_params, doseq=True)

    return urlunparse((
        parsed.scheme,
        parsed.netloc,
        parsed.path,
        parsed.params,
        redacted_query,
        parsed.fragment
    ))


@app.route('/proxy', methods=['GET', 'POST'])
def proxy_request():
    service_id = request.args.get('service')
    endpoint = request.args.get('endpoint', '')

    # Validate service identifier
    if service_id not in ALLOWED_SERVICES:
        return jsonify({"error": "Invalid service identifier"}), 400

    base_url = ALLOWED_SERVICES[service_id]

    # Safely construct URL (no user-controlled base URL)
    target_url = urljoin(base_url, endpoint)

    try:
        # Log safely (redacted)
        logger.info(f"Requesting URL: {redact_url(target_url)}")

        if request.method == 'GET':
            resp = requests.get(
                target_url,
                params=request.args.to_dict(flat=True),
                timeout=(3, 10),
                verify=True
            )
        else:  # POST
            resp = requests.post(
                target_url,
                json=request.get_json(silent=True),
                timeout=(3, 10),
                verify=True
            )

        # Sanitize response (avoid passing headers like Set-Cookie)
        return jsonify({
            "status": resp.status_code,
            "data": resp.json() if "application/json" in resp.headers.get("Content-Type", "") else resp.text
        }), resp.status_code

    except requests.exceptions.RequestException:
        # Do NOT leak upstream error details
        return jsonify({"error": "External service request failed"}), 502


if __name__ == "__main__":
    app.run(debug=True)