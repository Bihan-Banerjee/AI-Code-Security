import secrets
import string
from typing import Optional, Dict

# In-memory store (replace with DB/Redis in production)
_token_store: Dict[str, str] = {}

def generate_token(user_id: Optional[str] = None, length: int = 32) -> str:
    """
    Generate a cryptographically secure random token.

    Args:
        user_id (Optional[str]): If provided, associate token with this user.
        length (int): Length of the token.

    Returns:
        str: Generated secure token.
    """
    # Use a safe character set (URL-safe)
    alphabet = string.ascii_letters + string.digits

    # Generate secure token
    token = ''.join(secrets.choice(alphabet) for _ in range(length))

    # Optionally store token
    if user_id:
        _token_store[token] = user_id

    return token