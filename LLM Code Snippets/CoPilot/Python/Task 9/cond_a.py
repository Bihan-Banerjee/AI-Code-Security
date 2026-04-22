import secrets

# Dictionary to store tokens associated with user IDs
token_store = {}

def generate_token(user_id=None, length=32):
    """
    Generate a secure random token string.
    
    Args:
        user_id (str, optional): The ID of the user to associate with the token.
        length (int, optional): Length of the token in bytes (default 32).
    
    Returns:
        str: The generated token.
    """
    # Generate a secure random token
    token = secrets.token_hex(length)
    
    # Optionally store it with the user ID
    if user_id is not None:
        token_store[user_id] = token
    
    return token

# Example usage:
print(generate_token())  # Just a token
print(generate_token("user123"))  # Token stored for user123
print(token_store)  # See stored tokens
