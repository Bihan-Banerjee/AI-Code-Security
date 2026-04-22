import logging
import re
import urllib.parse
from typing import Any

import requests
from flask import Flask, jsonify, Response

app = Flask(__name__)
logger = logging.getLogger(__name__)

# ── 1. Hardcoded allowlist — never built from user input ──────────────────────
ALLOWED_SERVICES: dict[str, str] = {
    "weather":   "https://api.openweathermap.org/data/2.5",
    "geocoding": "https://geocoding-api.open-meteo.com/v1",
    "exchange":  "https://api.exchangerate.host",
}

# Query-parameter names whose values must be redacted before logging
_SENSITIVE_PARAMS: frozenset[str] = frozenset(
    {"api_key", "apikey", "token", "access_token", "secret", "key"}
)

# ── 2/3. Shared session: SSL verification ON, explicit timeouts everywhere ────
_SESSION = requests.Session()
_SESSION.verify = True          # never False
_TIMEOUT = (3, 10)              # (connect_timeout_s, read_timeout_s)


# ── 5. URL sanitiser for safe logging ────────────────────────────────────────
def _redact_url(url: str) -> str:
    """Return `url` with sensitive query-parameter values replaced by ***."""
    parsed = urllib.parse.urlparse(url)
    qs = urllib.parse.parse_qs(parsed.query, keep_blank_values=True)
    for key in qs:
        if key.lower() in _SENSITIVE_PARAMS:
            qs[key] = ["***"]
    safe_query = urllib.parse.urlencode(qs, doseq=True)
    return parsed._replace(query=safe_query).geturl()


# ── Core helper ───────────────────────────────────────────────────────────────
def fetch_from_service(
    service_id: str,
    path: str = "",
    params: dict[str, Any] | None = None,
) -> tuple[dict, int]:
    """
    Make a GET request to a pre-approved external API.

    Args:
        service_id: Key into ALLOWED_SERVICES (e.g. "weather").
        path:       Optional sub-path appended to the base URL.
        params:     Query parameters forwarded to the upstream API.

    Returns:
        A (response_dict, http_status) tuple suitable for jsonify().

    Security guarantees
    -------------------
    • URL is constructed from the hardcoded allowlist + controlled path only.
    • SSL certificates are always verified.
    • Timeouts prevent indefinite blocking.
    • Upstream error detail is never forwarded to the caller.
    • URLs containing secrets are redacted before reaching log sinks.
    """
    # ── 1. Validate service identifier ───────────────────────────────────────
    base_url = ALLOWED_SERVICES.get(service_id)
    if base_url is None:
        logger.warning("fetch_from_service: unknown service_id=%r", service_id)
        return {"error": "Unknown service identifier."}, 400

    # Build the full URL from trusted components only
    safe_path = path.lstrip("/")
    full_url = f"{base_url}/{safe_path}" if safe_path else base_url

    # ── 5. Redact before logging ──────────────────────────────────────────────
    loggable_url = _redact_url(
        full_url + ("?" + urllib.parse.urlencode(params) if params else "")
    )
    logger.info("Outbound request → %s", loggable_url)

    try:
        # ── 2. Explicit timeout  3. verify=True (session default) ────────────
        response = _SESSION.get(full_url, params=params, timeout=_TIMEOUT)
        response.raise_for_status()         # surfaces 4xx / 5xx as exceptions

        payload = response.json()
        # Return only the JSON body; do NOT reflect headers or raw text
        return {"data": payload}, 200

    # ── 4. Catch the full RequestException hierarchy ──────────────────────────
    except requests.exceptions.Timeout:
        logger.warning("Timeout reaching %s", loggable_url)
        return {"error": "The upstream service did not respond in time."}, 504

    except requests.exceptions.SSLError:
        logger.error("SSL verification failed for %s", loggable_url)
        return {"error": "A secure connection to the upstream service could not be established."}, 502

    except requests.exceptions.ConnectionError:
        logger.error("Connection error for %s", loggable_url)
        return {"error": "Could not reach the upstream service."}, 502

    except requests.exceptions.HTTPError as exc:
        # Log status code internally; never forward upstream body to the client
        logger.warning(
            "HTTP %s from %s", exc.response.status_code, loggable_url
        )
        return {"error": "The upstream service returned an error."}, 502

    except requests.exceptions.RequestException:
        logger.exception("Unexpected requests error for %s", loggable_url)
        return {"error": "An unexpected error occurred while contacting the upstream service."}, 502


# ── Example Flask route ───────────────────────────────────────────────────────
@app.get("/proxy/<service_id>")
def proxy(service_id: str) -> Response:
    body, status = fetch_from_service(
        service_id=service_id,
        path="",          # add sub-path from trusted config if needed
        params={},        # populate from validated/allowlisted query params
    )
    return jsonify(body), status