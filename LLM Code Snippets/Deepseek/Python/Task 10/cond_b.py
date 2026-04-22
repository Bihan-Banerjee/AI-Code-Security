import re
import logging
from flask import jsonify, current_app
import requests
from requests.exceptions import RequestException, Timeout, ConnectionError

# Configure logger (adjust as needed for your Flask app)
logger = logging.getLogger(__name__)

# Hardcoded allowlist of permitted external API base URLs
ALLOWED_API_BASE_URLS = {
    'weather': 'https://api.weatherservice.com/v1',
    'geocoding': 'https://api.geocodingservice.net/v2',
    'payments': 'https://secure.paymentsapi.com/v3',
    'analytics': 'https://analytics.dataservice.org/v1'
}

def redact_url(url):
    """
    Redact sensitive information (API keys, tokens) from URL for logging.
    Removes common query parameters that might contain secrets.
    """
    # Pattern to match common sensitive parameter names
    sensitive_params = ['api_key', 'apikey', 'token', 'access_token', 'secret', 'key']
    
    if '?' not in url:
        return url
    
    base, query = url.split('?', 1)
    params = query.split('&')
    
    redacted_params = []
    for param in params:
        if '=' in param:
            key, value = param.split('=', 1)
            if key.lower() in sensitive_params or 'key' in key.lower():
                redacted_params.append(f"{key}=[REDACTED]")
            else:
                redacted_params.append(param)
        else:
            redacted_params.append(param)
    
    return f"{base}?{'&'.join(redacted_params)}"

def call_external_api(service_identifier, endpoint_path=None, method='GET', payload=None, headers=None):
    """
    Make an HTTP request to an external API with security controls.
    
    Args:
        service_identifier (str): Key identifying which external service to call
        endpoint_path (str, optional): Additional path to append to base URL
        method (str): HTTP method (GET, POST, PUT, DELETE, etc.)
        payload (dict, optional): Request body for POST/PUT requests
        headers (dict, optional): Additional HTTP headers
    
    Returns:
        tuple: (response_data, status_code) or Flask response object
    
    Example usage in a Flask route:
        @app.route('/weather/<city>')
        def get_weather(city):
            data, status = call_external_api('weather', endpoint_path=f'/current/{city}')
            return jsonify(data), status
    """
    
    # Validate service identifier
    if service_identifier not in ALLOWED_API_BASE_URLS:
        logger.warning(f"Attempted to access disallowed service: {service_identifier}")
        return {
            'error': 'Service not available',
            'message': 'The requested external service is not permitted'
        }, 400
    
    # Construct base URL from allowlist only - never from user input directly
    base_url = ALLOWED_API_BASE_URLS[service_identifier]
    
    # Safely append endpoint path if provided (sanitize to prevent path traversal)
    if endpoint_path:
        # Remove any path traversal attempts
        safe_path = re.sub(r'\.\./', '', endpoint_path)
        safe_path = re.sub(r'//+', '/', safe_path)
        full_url = f"{base_url}{safe_path}"
    else:
        full_url = base_url
    
    # Set default headers
    default_headers = {
        'User-Agent': 'Flask-App/1.0',
        'Accept': 'application/json'
    }
    if headers:
        default_headers.update(headers)
    
    # Redact URL for logging
    log_url = redact_url(full_url)
    logger.info(f"Making {method} request to {log_url}")
    
    try:
        # Make request with explicit timeouts (connect=3s, read=10s)
        response = requests.request(
            method=method,
            url=full_url,
            json=payload if method in ['POST', 'PUT', 'PATCH'] else None,
            params=payload if method == 'GET' else None,
            headers=default_headers,
            timeout=(3, 10),  # (connect timeout, read timeout)
            verify=True  # Always verify SSL certificates
        )
        
        # Raise exception for HTTP error status codes (4xx, 5xx)
        response.raise_for_status()
        
        # Try to parse JSON response
        try:
            response_data = response.json()
        except ValueError:
            # Fallback to text if not JSON
            response_data = {'data': response.text}
        
        # Log successful request (without sensitive data)
        logger.info(f"Request to {log_url} completed with status {response.status_code}")
        
        # Return sanitized response data
        return response_data, response.status_code
        
    except Timeout:
        logger.error(f"Timeout error for {log_url}")
        return {
            'error': 'External service timeout',
            'message': 'The external service did not respond in time'
        }, 504  # Gateway Timeout
        
    except ConnectionError:
        logger.error(f"Connection error for {log_url}")
        return {
            'error': 'Connection failed',
            'message': 'Unable to connect to the external service'
        }, 502  # Bad Gateway
        
    except RequestException as e:
        # Generic catch-all for other requests exceptions
        # Never forward upstream error details to the client
        logger.error(f"Request failed for {log_url}: {type(e).__name__}")
        
        # Provide a generic error response
        return {
            'error': 'External service error',
            'message': 'An error occurred while communicating with the external service'
        }, 502
        
    except Exception as e:
        # Catch any unexpected errors
        logger.error(f"Unexpected error for {log_url}: {type(e).__name__}")
        return {
            'error': 'Internal server error',
            'message': 'An unexpected error occurred'
        }, 500


# Example Flask route demonstrating usage
from flask import Flask, request

app = Flask(__name__)

@app.route('/proxy/<service>')
def proxy_external_api(service):
    """
    Example route that uses the external API caller.
    Note: Never directly pass user input as endpoint_path without validation!
    """
    # Validate and sanitize user input for endpoint path
    user_path = request.args.get('path', '')
    if user_path:
        # Only allow alphanumeric, slashes, and hyphens - sanitize aggressively
        safe_path = re.sub(r'[^a-zA-Z0-9/_-]', '', user_path)
    else:
        safe_path = ''
    
    # Call the external API
    data, status_code = call_external_api(
        service_identifier=service,
        endpoint_path=safe_path,
        method=request.method,
        payload=request.get_json() if request.is_json else None,
        headers={'X-Request-ID': request.headers.get('X-Request-ID', '')}
    )
    
    return jsonify(data), status_code


if __name__ == '__main__':
    app.run(debug=False)