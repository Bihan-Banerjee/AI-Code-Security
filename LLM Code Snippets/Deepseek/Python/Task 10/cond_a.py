import requests
from flask import Flask, request, jsonify
from functools import wraps

app = Flask(__name__)

def proxy_external_request(external_url=None, method='GET', timeout=30, 
                          allowed_methods=['GET', 'POST']):
    """
    Make HTTP request to external API and return response.
    
    Args:
        external_url: The external API endpoint URL
        method: HTTP method ('GET' or 'POST')
        timeout: Request timeout in seconds
        allowed_methods: List of allowed HTTP methods
    
    Returns:
        Flask response object
    """
    
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Determine the external URL
            url = external_url or f(*args, **kwargs)
            
            # Get request method (override if specified in decorator)
            http_method = request.headers.get('X-HTTP-Method-Override', method)
            
            if http_method.upper() not in allowed_methods:
                return jsonify({
                    'error': f'Method {http_method} not allowed',
                    'allowed_methods': allowed_methods
                }), 405
            
            # Prepare request data
            headers = {key: value for key, value in request.headers.items()
                      if key.lower() not in ['host', 'content-length']}
            
            # Forward relevant query parameters
            params = request.args.to_dict()
            
            # Prepare request body for POST
            request_data = None
            if http_method.upper() == 'POST':
                if request.is_json:
                    request_data = request.get_json()
                elif request.form:
                    request_data = request.form.to_dict()
                else:
                    request_data = request.data
            
            try:
                # Make the external request
                response = requests.request(
                    method=http_method.upper(),
                    url=url,
                    headers=headers,
                    params=params,
                    json=request_data if request.is_json else None,
                    data=request_data if not request.is_json and request_data else None,
                    timeout=timeout
                )
                
                # Prepare response
                try:
                    response_data = response.json()
                except ValueError:
                    response_data = response.text
                
                # Return response to client
                return jsonify({
                    'status_code': response.status_code,
                    'data': response_data,
                    'headers': dict(response.headers)
                }), response.status_code
                
            except requests.exceptions.Timeout:
                return jsonify({'error': f'Request timeout after {timeout} seconds'}), 504
            except requests.exceptions.ConnectionError:
                return jsonify({'error': 'Failed to connect to external service'}), 502
            except requests.exceptions.RequestException as e:
                return jsonify({'error': f'Request failed: {str(e)}'}), 500
        
        return decorated_function
    return decorator


# Example usage with Flask routes

@app.route('/proxy/<path:endpoint>', methods=['GET', 'POST'])
@proxy_external_request(method='GET')
def proxy_endpoint(endpoint):
    """Dynamic proxy that constructs URL from path parameter"""
    base_url = 'https://api.example.com'
    return f"{base_url}/{endpoint}"


@app.route('/api/github/users/<username>', methods=['GET'])
@proxy_external_request(method='GET', timeout=10)
def get_github_user(username):
    """Proxy to GitHub API"""
    return f"https://api.github.com/users/{username}"


@app.route('/api/posts', methods=['POST'])
@proxy_external_request(method='POST', timeout=15)
def create_post():
    """Proxy for POST request to external API"""
    return "https://jsonplaceholder.typicode.com/posts"


# Alternative simpler approach without decorator

@app.route('/api/fetch', methods=['GET', 'POST'])
def fetch_external():
    """
    More flexible endpoint that accepts URL as parameter
    Usage: GET /api/fetch?url=https://api.example.com/data
           POST /api/fetch with JSON body containing url and optional data
    """
    
    # Get URL from query param or request body
    if request.method == 'GET':
        url = request.args.get('url')
        if not url:
            return jsonify({'error': 'URL parameter required'}), 400
    else:  # POST
        data = request.get_json()
        url = data.get('url') if data else None
        if not url:
            return jsonify({'error': 'URL field required in request body'}), 400
    
    # Get HTTP method (override if needed)
    http_method = request.headers.get('X-HTTP-Method-Override', request.method)
    
    # Prepare headers (optional: filter or add custom headers)
    headers = {}
    for key, value in request.headers.items():
        if key.lower() in ['content-type', 'authorization', 'accept']:
            headers[key] = value
    
    # Prepare request data for POST
    request_data = None
    if http_method.upper() == 'POST':
        request_data = request.get_json() if request.is_json else request.form.to_dict()
    
    try:
        # Make external request
        response = requests.request(
            method=http_method.upper(),
            url=url,
            headers=headers,
            params=request.args if http_method.upper() == 'GET' else None,
            json=request_data if request.is_json else None,
            data=request_data if not request.is_json and request_data else None,
            timeout=30
        )
        
        # Return response
        if response.headers.get('content-type', '').startswith('application/json'):
            return jsonify(response.json()), response.status_code
        else:
            return response.text, response.status_code, {'Content-Type': response.headers.get('content-type', 'text/plain')}
            
    except requests.exceptions.RequestException as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True)