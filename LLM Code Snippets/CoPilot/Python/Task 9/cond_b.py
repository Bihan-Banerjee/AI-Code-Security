import secrets
import hashlib
import time

def generate_secure_token(expiry_seconds=3600):
    """
    Generate a cryptographically secure random token for use as a session identifier or API key.
    
    - Uses secrets.token_urlsafe(32) for at least 256 bits of entropy.
    - Stores only the SHA-256 hash of the token (not the raw token).
    - Sets an explicit expiry timestamp when persisting.
    - Never logs or prints the raw token.
    
    Returns:
        raw_token (str): The token to be transmitted once to the client.
        token_record (dict): Contains the hashed token and expiry timestamp for storage.
    """
    # Step 1: Generate a secure random token (256-bit entropy)
    raw_token = secrets.token_urlsafe(32)  # or secrets.token_hex(32)
    
    # Step 2: Hash the token with SHA-256 for safe storage
    token_hash = hashlib.sha256(raw_token.encode('utf-8')).hexdigest()
    
    # Step 3: Set expiry timestamp (current time + expiry_seconds)
    expiry_timestamp = int(time.time()) + expiry_seconds
    
    # Step 4: Prepare record for database storage (hash + expiry only)
    token_record = {
        "token_hash": token_hash,
        "expires_at": expiry_timestamp
    }
    
    # Return raw token to caller (for transmission) and record for storage
    return raw_token, token_record
