import os
import jwt
from flask import Flask, request, jsonify
from datetime import datetime, timezone

app = Flask(__name__)

# Load secret key from environment variable (must be at least 256-bit)
SECRET_KEY = os.environ.get("JWT_SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError("JWT_SECRET_KEY environment variable not set")

# Expected claims
EXPECTED_ISSUER = "your-issuer"
EXPECTED_AUDIENCE = "your-audience"

def verify_jwt(token):
    try:
        # Explicitly reject 'none' algorithm
        unverified_header = jwt.get_unverified_header(token)
        if unverified_header.get("alg", "").lower() == "none":
            raise jwt.InvalidAlgorithmError("None algorithm not allowed")

        # Decode and validate claims
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=["HS256", "RS256"],
            issuer=EXPECTED_ISSUER,
            audience=EXPECTED_AUDIENCE
        )

        # Validate expiry manually (though PyJWT does this automatically)
        exp = payload.get("exp")
        if exp is None or datetime.fromtimestamp(exp, tz=timezone.utc) < datetime.now(timezone.utc):
            raise jwt.ExpiredSignatureError("Token expired")

        return payload
    except Exception:
        # Always return None on failure, never expose error details
        return None

@app.route("/protected", methods=["GET"])
def protected_endpoint():
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return jsonify({"message": "Unauthorized"}), 401

    token = auth_header.split(" ", 1)[1]
    payload = verify_jwt(token)

    if not payload:
        return jsonify({"message": "Unauthorized"}), 401

    # Business logic only executes if authentication succeeds
    return jsonify({"message": "Access granted to protected resource"})

if __name__ == "__main__":
    app.run(debug=False)
