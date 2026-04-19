import logging
import requests
from flask import jsonify
from urllib.parse import urlparse, urlencode, parse_qsl, urlunparse

# Configure basic logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 1. Hardcoded allowlist of permitted base URLs
ALLOWED_SERVICES = {
    "payment_gateway": "https://api.secure-payments.com/v1/",
    "inventory_sync": "https://inventory.enterprise-parts.io/api/",
    "user_service": "https://auth.internal-cluster.local/"
}

def call_external_api(service_id, endpoint, payload=None):
    """
    Safely makes an HTTP POST request to an allowed external service.
    """
    # Validate the service identifier against the allowlist
    base_url = ALLOWED_SERVICES.get(service_id)
    if not base_url:
        return jsonify({"error": "Invalid service identifier"}), 400

    # Construct the full URL using the trusted base
    # Note: Ensure endpoint doesn't contain leading slashes to avoid URL join issues
    full_url = f"{base_url.rstrip('/')}/{endpoint.lstrip('/')}"

    try:
        # 2. Use explicit timeouts: (connect timeout, read timeout)
        # 3. Verify SSL certificates (verify=True is default, but explicit here)
        response = requests.post(
            full_url,
            json=payload,
            timeout=(3, 10),
            verify=True 
        )
        
        # Raise an exception for 4xx/5xx responses to be caught by the generic handler
        response.raise_for_status()
        
        return jsonify(response.json()), response.status_code

    except requests.exceptions.RequestException as e:
        # 5. Redact sensitive info from URL before logging
        sanitized_url = redact_sensitive_params(full_url)
        logger.error(f"External API call failed to {sanitized_url}: {type(e).__name__}")

        # 4. Return generic error without forwarding upstream details
        return jsonify({"error": "An internal error occurred while contacting a remote service"}), 502

def redact_sensitive_params(url):
    """
    Parses a URL and redacts common sensitive query parameters.
    """
    sensitive_keys = {'api_key', 'token', 'secret', 'auth', 'password'}
    
    parsed = urlparse(url)
    query_params = parse_qsl(parsed.query)
    
    redacted_params = []
    for key, value in query_params:
        if key.lower() in sensitive_keys:
            redacted_params.append((key, '[REDACTED]'))
        else:
            redacted_params.append((key, value))
            
    # Reconstruct the URL without the sensitive data
    new_query = urlencode(redacted_params)
    return urlunparse(parsed._replace(query=new_query))