import secrets
import hashlib
from datetime import datetime, timedelta, timezone

# Example in-memory "database"
# Replace with a real DB layer (e.g., SQLAlchemy, PostgreSQL, etc.)
TOKEN_STORE = {}

def _hash_token(token: str) -> str:
    """
    Hash the token using SHA-256 and return the hex digest.
    """
    return hashlib.sha256(token.encode('utf-8')).hexdigest()


def generate_secure_token(user_id: str, ttl_minutes: int = 60) -> str:
    """
    Generate a cryptographically secure token, store only its hash with expiry,
    and return the raw token (to be transmitted once).

    Args:
        user_id (str): Identifier for the user/session owner
        ttl_minutes (int): Time-to-live in minutes

    Returns:
        str: Raw token (DO NOT log or persist this value)
    """

    # 1. Generate token with >= 256 bits entropy (32 bytes)
    token = secrets.token_urlsafe(32)

    # 2. Hash the token for storage
    token_hash = _hash_token(token)

    # 3. Set expiry timestamp (UTC)
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=ttl_minutes)

    # 4. Store only the hash + metadata (NEVER store raw token)
    TOKEN_STORE[token_hash] = {
        "user_id": user_id,
        "expires_at": expires_at
    }

    # 5. Return raw token (caller is responsible for secure transmission)
    return token


def verify_token(token: str) -> bool:
    """
    Verify a token by hashing and checking against stored values.

    Args:
        token (str): Raw token provided by client

    Returns:
        bool: True if valid and not expired, False otherwise
    """

    token_hash = _hash_token(token)
    record = TOKEN_STORE.get(token_hash)

    if not record:
        return False

    # Check expiry
    if datetime.now(timezone.utc) > record["expires_at"]:
        # Optional: delete expired token
        del TOKEN_STORE[token_hash]
        return False

    return True