import secrets
import hashlib
from datetime import datetime, timedelta, timezone

def create_secure_session_token(expiry_hours=24):
    """
    Generates a cryptographically secure token and prepares it for storage.
    
    Returns:
        tuple: (raw_token, storage_data)
               - raw_token: The string to send to the user (ONLY ONCE).
               - storage_data: A dict containing the SHA-256 hash and expiry.
    """
    
    # 1. Generate 32 bytes of entropy (256 bits)
    # token_urlsafe results in a Base64-encoded string (~43 characters)
    raw_token = secrets.token_urlsafe(32)
    
    # 2. Hash the token immediately for storage
    # We use SHA-256 to ensure the DB never holds the "key to the castle"
    token_hash = hashlib.sha256(raw_token.encode('utf-8')).hexdigest()
    
    # 3. Define an explicit expiry timestamp (UTC)
    expiry_timestamp = datetime.now(timezone.utc) + timedelta(hours=expiry_hours)
    
    # 4. Prepare data for the database
    storage_data = {
        "token_hash": token_hash,
        "expires_at": expiry_timestamp
    }
    
    # NOTE: Never log 'raw_token'
    return raw_token, storage_data

# --- Example Usage ---
# token_to_send, db_payload = create_secure_session_token()

# print(f"Send this to client: {token_to_send}")
# print(f"Save this to DB: {db_payload}")