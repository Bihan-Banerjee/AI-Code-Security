import secrets
import string
from typing import Optional, Dict, Any
from datetime import datetime, timedelta
import json

class TokenManager:
    """Simple in-memory token storage manager."""
    
    def __init__(self):
        self._storage: Dict[str, Dict[str, Any]] = {}
    
    def store(self, token: str, user_id: str, expires_in: Optional[int] = None) -> None:
        """Store token with user ID and optional expiration."""
        token_data = {
            "user_id": user_id,
            "created_at": datetime.utcnow().isoformat(),
            "expires_at": None
        }
        
        if expires_in:
            expiry_time = datetime.utcnow() + timedelta(seconds=expires_in)
            token_data["expires_at"] = expiry_time.isoformat()
        
        self._storage[token] = token_data
    
    def retrieve(self, token: str) -> Optional[Dict[str, Any]]:
        """Retrieve token data if valid and not expired."""
        token_data = self._storage.get(token)
        
        if token_data and token_data.get("expires_at"):
            expiry = datetime.fromisoformat(token_data["expires_at"])
            if datetime.utcnow() > expiry:
                del self._storage[token]
                return None
        
        return token_data
    
    def revoke(self, token: str) -> bool:
        """Revoke a token."""
        if token in self._storage:
            del self._storage[token]
            return True
        return False


# Global token storage instance (for demo purposes)
_token_storage = TokenManager()


def generate_token(
    user_id: Optional[str] = None,
    length: int = 32,
    store: bool = True,
    expires_in: Optional[int] = None,
    storage: Optional[TokenManager] = None
) -> str:
    """
    Generate a secure random token for use as a session identifier or API key.
    
    Args:
        user_id: Optional user ID to associate with the token
        length: Length of the token in characters (default: 32)
        store: Whether to store the token (default: True)
        expires_in: Token expiration time in seconds (default: None = no expiration)
        storage: Custom storage manager (default: uses in-memory storage)
    
    Returns:
        Generated token string
    
    Raises:
        ValueError: If store=True but no user_id provided
        ValueError: If length is less than 16 characters (for security)
    
    Examples:
        >>> # Generate a standalone token
        >>> token = generate_token()
        >>> print(len(token))
        32
        
        >>> # Generate and store token for a user
        >>> token = generate_token(user_id="user123", expires_in=3600)
        
        >>> # Generate token without storing
        >>> token = generate_token(store=False)
    """
    
    # Security validation
    if length < 16:
        raise ValueError("Token length must be at least 16 characters for security")
    
    # Validate storage requirements
    if store and not user_id:
        raise ValueError("user_id is required when store=True")
    
    # Generate a cryptographically secure random token
    alphabet = string.ascii_letters + string.digits
    token = ''.join(secrets.choice(alphabet) for _ in range(length))
    
    # Store the token if requested
    if store:
        storage_manager = storage or _token_storage
        storage_manager.store(token, user_id, expires_in)
    
    return token


# Optional: Additional utility functions
def validate_token(token: str, storage: Optional[TokenManager] = None) -> Optional[str]:
    """
    Validate a token and return the associated user ID if valid.
    
    Args:
        token: The token to validate
        storage: Custom storage manager (default: uses in-memory storage)
    
    Returns:
        User ID if token is valid, None otherwise
    """
    storage_manager = storage or _token_storage
    token_data = storage_manager.retrieve(token)
    
    if token_data:
        return token_data.get("user_id")
    return None


def revoke_token(token: str, storage: Optional[TokenManager] = None) -> bool:
    """
    Revoke (invalidate) a token.
    
    Args:
        token: The token to revoke
        storage: Custom storage manager (default: uses in-memory storage)
    
    Returns:
        True if token was revoked, False otherwise
    """
    storage_manager = storage or _token_storage
    return storage_manager.revoke(token)


# Example usage
if __name__ == "__main__":
    # Example 1: Generate a simple session token
    session_token = generate_token()
    print(f"Session token: {session_token}")
    
    # Example 2: Generate and store an API key for a user
    api_key = generate_token(user_id="alice@example.com", expires_in=86400)
    print(f"API key for alice: {api_key}")
    
    # Example 3: Validate a token
    user = validate_token(api_key)
    print(f"Token belongs to user: {user}")
    
    # Example 4: Generate a token without storing
    temp_token = generate_token(store=False, length=24)
    print(f"Temporary token (not stored): {temp_token}")
    
    # Example 5: Revoke a token
    revoked = revoke_token(api_key)
    print(f"Token revoked: {revoked}")
    
    # Check if revoked token is still valid
    user_after_revoke = validate_token(api_key)
    print(f"After revocation, belongs to: {user_after_revoke}")