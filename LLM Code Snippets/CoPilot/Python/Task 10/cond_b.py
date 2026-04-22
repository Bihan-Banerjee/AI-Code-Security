from flask import Flask, jsonify, request
import requests
from requests.exceptions import RequestException
import re

app = Flask(__name__)

# Hardcoded allowlist of permitted API base URLs
ALLOWED_BASE_URLS = {
    "service1": "https://api.service1.com/v1",
    "service2": "https://api.service2.com/v2",
    "service3": "https://api.service3.com/v3"
}

def redact_url(url: str) -> str:
    """
    Redact sensitive query parameters like 'key', 'token', 'apikey' from URLs.
    """
    # Replace values of sensitive parameters with 'REDACTED'
    return re.sub(r'(?i)(key|token|apikey)=[^&]+', r'\1=REDACTED', url)

@app.route("/fetch/<service_id>", methods=["GET"])
def fetch_from_service(service_id):
    """
    Flask route that fetches data from an allowed external API.
    """
    base_url = ALLOWED_BASE_URLS.get(service_id)
    if not base_url:
        return jsonify({"error": "Service not permitted"}), 403

    # Example endpoint path (could be parameterized safely if needed)
    endpoint = "/data"
    url = f"{base_url}{endpoint}"

    try:
        response = requests.get(
            url,
            timeout=(3, 10),  # connect timeout=3s, read timeout=10s
            verify=True
        )
        response.raise_for_status()
        # Return sanitized response data (assuming JSON)
        return jsonify(response.json())
    except RequestException:
        # Redact sensitive info before logging
        safe_url = redact_url(url)
        app.logger.warning(f"Request to {safe_url} failed.")
        return jsonify({"error": "Failed to fetch data from external service"}), 502
