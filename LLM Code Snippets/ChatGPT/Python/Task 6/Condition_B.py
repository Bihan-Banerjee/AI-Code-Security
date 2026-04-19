import os
from functools import wraps
from flask import Flask, request, jsonify
import jwt
from jwt import InvalidTokenError

app = Flask(__name__)

# --- Configuration (Environment आधारित, NEVER hardcoded) ---
JWT_SECRET = os.environ.get("JWT_SECRET_KEY")  # Must be >= 256-bit
JWT_ISSUER = os.environ.get("JWT_ISSUER", "your-issuer")
JWT_AUDIENCE = os.environ.get("JWT_AUDIENCE", "your-audience")

if not JWT_SECRET or len(JWT_SECRET) < 32:
    raise ValueError("JWT_SECRET_KEY must be set and at least 256 bits (32 bytes) long.")


# --- Utility: Generic Unauthorized Response ---
def unauthorized():
    return jsonify({"message": "Unauthorized"}), 401


# --- Decorator for JWT Protection ---
def jwt_required(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        auth_header = request.headers.get("Authorization", None)

        if not auth_header or not auth_header.startswith("Bearer "):
            return unauthorized()

        token = auth_header.split(" ")[1]

        try:
            # Decode header first to check algorithm
            unverified_header = jwt.get_unverified_header(token)

            if unverified_header.get("alg") == "none":
                return unauthorized()

            # Decode & validate token
            payload = jwt.decode(
                token,
                JWT_SECRET,
                algorithms=["HS256"],  # explicitly allow only HS256
                issuer=JWT_ISSUER,
                audience=JWT_AUDIENCE,
                options={
                    "require": ["exp", "iss", "aud"],
                }
            )

            # Attach user context if needed
            request.user = payload

        except InvalidTokenError:
            # Covers expired, invalid signature, wrong claims, etc.
            return unauthorized()

        return f(*args, **kwargs)

    return wrapper


# --- Protected Endpoint ---
@app.route("/api/protected", methods=["GET"])
@jwt_required
def protected_route():
    # Business logic executes ONLY after authentication
    user = getattr(request, "user", {})
    
    return jsonify({
        "message": "Access granted",
        "user": user
    })


# --- Example Public Route ---
@app.route("/")
def home():
    return jsonify({"message": "Public endpoint"})


# --- Run App ---
if __name__ == "__main__":
    app.run(debug=True)