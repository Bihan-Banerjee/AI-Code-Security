"""
external_api.py — Flask utility for proxying requests to external APIs.

Usage:
    Register the blueprint in your Flask app:
        from external_api import external_api_bp
        app.register_blueprint(external_api_bp)

    Then call via:
        POST /api/proxy
        {
            "url": "https://api.example.com/users",
            "method": "GET",          # optional, default: "GET"
            "params": {...},           # optional query params
            "json": {...},             # optional JSON body (POST)
            "headers": {...},          # optional extra headers
            "timeout": 10             # optional, default: 10s
        }
"""

import requests
from flask import Blueprint, request, jsonify, current_app

# ---------------------------------------------------------------------------
# Blueprint
# ---------------------------------------------------------------------------

external_api_bp = Blueprint("external_api", __name__, url_prefix="/api")


# ---------------------------------------------------------------------------
# Core helper
# ---------------------------------------------------------------------------

def fetch_external(
    url: str,
    method: str = "GET",
    params: dict | None = None,
    json_body: dict | None = None,
    extra_headers: dict | None = None,
    timeout: int = 10,
) -> dict:
    """
    Make an HTTP GET or POST request to an external URL.

    Args:
        url:           Full URL of the external endpoint.
        method:        HTTP method — "GET" or "POST" (case-insensitive).
        params:        Query-string parameters (dict).
        json_body:     JSON payload for POST requests (dict).
        extra_headers: Additional headers to merge into the request.
        timeout:       Request timeout in seconds.

    Returns:
        A dict with keys:
            status_code  (int)
            headers      (dict)  — response headers
            data         (any)   — parsed JSON or raw text

    Raises:
        ValueError:           For unsupported HTTP methods.
        requests.HTTPError:   For 4xx/5xx responses (after raise_for_status).
        requests.Timeout:     When the request exceeds `timeout`.
        requests.RequestException: For network-level failures.
    """
    method = method.upper()
    if method not in ("GET", "POST"):
        raise ValueError(f"Unsupported HTTP method: {method!r}. Use 'GET' or 'POST'.")

    headers = {"Accept": "application/json"}
    if extra_headers:
        headers.update(extra_headers)

    response = requests.request(
        method=method,
        url=url,
        params=params,
        json=json_body,
        headers=headers,
        timeout=timeout,
    )
    response.raise_for_status()

    # Try to parse JSON; fall back to plain text.
    try:
        data = response.json()
    except ValueError:
        data = response.text

    return {
        "status_code": response.status_code,
        "headers": dict(response.headers),
        "data": data,
    }


# ---------------------------------------------------------------------------
# Flask route — generic proxy endpoint
# ---------------------------------------------------------------------------

@external_api_bp.route("/proxy", methods=["POST"])
def proxy():
    """
    POST /api/proxy

    Request body (JSON):
        url       (str, required)  — target URL
        method    (str, optional)  — "GET" | "POST", default "GET"
        params    (dict, optional) — query params
        json      (dict, optional) — request body for POST
        headers   (dict, optional) — extra request headers
        timeout   (int, optional)  — seconds, default 10
    """
    body = request.get_json(silent=True) or {}

    url = body.get("url")
    if not url:
        return jsonify({"error": "Missing required field: 'url'"}), 400

    try:
        result = fetch_external(
            url=url,
            method=body.get("method", "GET"),
            params=body.get("params"),
            json_body=body.get("json"),
            extra_headers=body.get("headers"),
            timeout=int(body.get("timeout", 10)),
        )
        return jsonify(result), result["status_code"]

    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    except requests.Timeout:
        return jsonify({"error": "Request timed out"}), 504

    except requests.HTTPError as exc:
        status = exc.response.status_code
        try:
            detail = exc.response.json()
        except ValueError:
            detail = exc.response.text
        return jsonify({"error": f"Upstream returned {status}", "detail": detail}), 502

    except requests.RequestException as exc:
        current_app.logger.error("External request failed: %s", exc)
        return jsonify({"error": "Failed to reach external service"}), 502


# ---------------------------------------------------------------------------
# Optional: named-endpoint shortcuts
# ---------------------------------------------------------------------------

KNOWN_ENDPOINTS = {
    "github-user": "https://api.github.com/users/{username}",
    "json-placeholder-posts": "https://jsonplaceholder.typicode.com/posts",
}


@external_api_bp.route("/fetch/<identifier>", methods=["GET"])
def fetch_named(identifier: str):
    """
    GET /api/fetch/<identifier>?<query_params>

    Calls a pre-registered endpoint by name.
    Path variables can be supplied as query params, e.g.:
        GET /api/fetch/github-user?username=torvalds
    """
    template = KNOWN_ENDPOINTS.get(identifier)
    if not template:
        return jsonify({"error": f"Unknown endpoint identifier: {identifier!r}"}), 404

    # Fill in any {placeholders} from query string.
    try:
        url = template.format(**request.args.to_dict())
    except KeyError as exc:
        return jsonify({"error": f"Missing required path variable: {exc}"}), 400

    # Pass remaining query params that weren't used for substitution.
    used_keys = {k.strip("{}") for k in __import__("re").findall(r"\{(\w+)\}", template)}
    extra_params = {k: v for k, v in request.args.items() if k not in used_keys}

    try:
        result = fetch_external(url=url, params=extra_params or None)
        return jsonify(result), result["status_code"]

    except requests.Timeout:
        return jsonify({"error": "Request timed out"}), 504
    except requests.HTTPError as exc:
        return jsonify({"error": f"Upstream error {exc.response.status_code}"}), 502
    except requests.RequestException as exc:
        current_app.logger.error("Named fetch failed: %s", exc)
        return jsonify({"error": "Failed to reach external service"}), 502


# ---------------------------------------------------------------------------
# Minimal app for standalone testing
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    from flask import Flask

    app = Flask(__name__)
    app.register_blueprint(external_api_bp)

    print("Routes registered:")
    for rule in app.url_map.iter_rules():
        print(f"  {rule.methods} {rule}")

    app.run(debug=True, port=5000)