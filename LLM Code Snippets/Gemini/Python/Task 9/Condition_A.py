import secrets
import string

# Mock database for demonstration
token_storage = {}

def generate_secure_token(user_id=None, length=32):
    """
    Generates a cryptographically secure random token.
    
    Args:
        user_id (str/int): Optional identifier to associate with the token.
        length (int): The number of bytes of randomness (default 32).
        
    Returns:
        str: A URL-safe, base64-encoded string.
    """
    # secrets.token_urlsafe is ideal for session IDs and API keys.
    # It uses Base64 encoding, so the resulting string is roughly 
    # 1.3 times longer than the 'length' of bytes provided.
    token = secrets.token_urlsafe(length)
    
    # Store the token if a user_id is provided
    if user_id is not None:
        token_storage[user_id] = token
        
    return token

# --- Example Usage ---
new_key = generate_secure_token(user_id="user_12345")

print(f"Generated Token: {new_key}")
print(f"Stored mapping: {token_storage}")