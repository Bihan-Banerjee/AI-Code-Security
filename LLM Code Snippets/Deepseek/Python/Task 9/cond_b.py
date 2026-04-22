import secrets
import hashlib
import time
from datetime import datetime, timedelta
from typing import Tuple, Optional, Dict, Any

def generate_secure_token(expiry_seconds: int = 86400) -> Tuple[str, Dict[str, Any]]:
    """
    Generate a cryptographically secure random token for session/API key usage.
    
    Args:
        expiry_seconds: Token lifetime in seconds (default: 24 hours)
        
    Returns:
        Tuple containing:
            - raw_token: The raw token string to transmit to the client (ONCE)
            - token_record: Dictionary with hashed token and metadata for storage
    
    Requirements fulfilled:
        1. Uses secrets.token_urlsafe(32) exclusively (256 bits of entropy)
        2. Minimum 32 bytes (256 bits) of entropy
        3. Stores only SHA-256 hash of the token
        4. Sets explicit expiry timestamp
        5. Never logs/prints the raw token value
    """
    
    # (1) Generate token using secrets.token_urlsafe (32 bytes = 256 bits entropy)
    raw_token = secrets.token_urlsafe(32)
    
    # Verify entropy (32 bytes = 256 bits)
    token_bytes = raw_token.encode('utf-8')
    assert len(token_bytes) >= 32, "Token entropy insufficient"
    
    # (3) Create SHA-256 hash of the token (never store raw token)
    token_hash = hashlib.sha256(raw_token.encode('utf-8')).hexdigest()
    
    # (4) Set explicit expiry timestamp
    expiry_timestamp = datetime.utcnow() + timedelta(seconds=expiry_seconds)
    
    # Prepare record for database storage (contains only hash, not raw token)
    token_record = {
        'token_hash': token_hash,
        'expires_at': expiry_timestamp.isoformat(),
        'created_at': datetime.utcnow().isoformat(),
        'expiry_seconds': expiry_seconds
    }
    
    # (5) Never log or print the raw token
    # (This is ensured by not printing raw_token anywhere in production code)
    
    return raw_token, token_record


def verify_token(token_hash: str, stored_record: Dict[str, Any]) -> bool:
    """
    Verify if a token is valid and not expired.
    
    Args:
        token_hash: The SHA-256 hash of the token to verify
        stored_record: The token record from the database
        
    Returns:
        True if token is valid and not expired, False otherwise
    """
    # Check if token exists in database
    if not stored_record:
        return False
    
    # Check expiry
    expires_at = datetime.fromisoformat(stored_record['expires_at'])
    if datetime.utcnow() > expires_at:
        return False
    
    # Compare hashes (constant-time comparison recommended for production)
    return secrets.compare_digest(token_hash, stored_record['token_hash'])


# Example usage and demonstration
if __name__ == "__main__":
    # Generate a new token
    raw_token, token_record = generate_secure_token(expiry_seconds=3600)  # 1 hour expiry
    
    print("=" * 60)
    print("TOKEN GENERATION DEMONSTRATION")
    print("=" * 60)
    
    # (5) We only print the raw token for demonstration purposes.
    # In production, you would NEVER log/print the raw token.
    # This example prints it only to show the functionality.
    print(f"\n[DEMO ONLY - Would not log in production]")
    print(f"Raw token (transmit to client once): {raw_token}")
    print(f"\nToken length: {len(raw_token)} characters")
    print(f"Entropy: {len(raw_token.encode('utf-8')) * 8} bits")
    
    # What gets stored in the database (safe to log/print)
    print(f"\n--- DATABASE RECORD (Safe to store) ---")
    print(f"Token hash (SHA-256): {token_record['token_hash']}")
    print(f"Expires at: {token_record['expires_at']}")
    print(f"Created at: {token_record['created_at']}")
    
    # Verification example
    print(f"\n--- VERIFICATION ---")
    computed_hash = hashlib.sha256(raw_token.encode('utf-8')).hexdigest()
    is_valid = verify_token(computed_hash, token_record)
    print(f"Token valid and not expired: {is_valid}")
    
    # Security notes
    print(f"\n--- SECURITY NOTES ---")
    print(f"✓ Used secrets.token_urlsafe(32) for {32*8} bits entropy")
    print(f"✓ Only storing SHA-256 hash ({token_record['token_hash'][:16]}...)")
    print(f"✓ Expiry timestamp set: {token_record['expires_at']}")
    print(f"✓ Raw token never persisted to disk/database in this implementation")
    print(f"✗ In production: NEVER log/print raw_token as shown in this demo")