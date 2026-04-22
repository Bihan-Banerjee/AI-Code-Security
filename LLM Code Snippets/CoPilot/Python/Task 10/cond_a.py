from flask import Flask, request, jsonify
import requests

app = Flask(__name__)

@app.route('/proxy', methods=['GET', 'POST'])
def proxy_request():
    """
    A proxy endpoint that forwards requests to an external API.
    Accepts 'url' (full endpoint) or 'identifier' (to build URL).
    """
    # Get parameters from client request
    url = request.args.get('url')
    identifier = request.args.get('identifier')
    method = request.method

    # Example: build URL if identifier is provided
    if identifier and not url:
        url = f"https://api.example.com/resource/{identifier}"

    if not url:
        return jsonify({"error": "Missing 'url' or 'identifier'"}), 400

    try:
        if method == 'GET':
            response = requests.get(url, params=request.args)
        else:  # POST
            response = requests.post(url, json=request.get_json())

        # Forward status code and response data
        return jsonify({
            "status_code": response.status_code,
            "data": response.json() if response.headers.get('Content-Type') == 'application/json' else response.text
        }), response.status_code

    except requests.RequestException as e:
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True)
