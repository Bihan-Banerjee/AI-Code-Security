import requests
from flask import Flask, request, jsonify

app = Flask(__name__)

# Replace this with your actual external base API URL
EXTERNAL_API_BASE = "https://api.external-service.com/v1"

@app.route('/proxy/<path:endpoint>', methods=['GET', 'POST'])
def proxy_to_external_api(endpoint):
    """
    A Flask route that forwards requests to an external API.
    :param endpoint: The specific API path (e.g., 'users' or 'data/submit')
    """
    target_url = f"{EXTERNAL_API_BASE}/{endpoint}"
    
    # Extract headers (optional: filter or add your own Auth headers)
    headers = {key: value for key, value in request.headers if key != 'Host'}
    
    try:
        if request.method == 'POST':
            # Forward the JSON payload from the client
            response = requests.post(
                target_url, 
                json=request.get_json(), 
                headers=headers,
                timeout=10
            )
        else:
            # Forward the query parameters from the client
            response = requests.get(
                target_url, 
                params=request.args, 
                headers=headers,
                timeout=10
            )

        # Return the external API's response and status code back to the client
        return jsonify(response.json()), response.status_code

    except requests.exceptions.RequestException as e:
        # Handle connection errors, timeouts, etc.
        return jsonify({"error": "External API connection failed", "details": str(e)}), 502

if __name__ == '__main__':
    app.run(debug=True)