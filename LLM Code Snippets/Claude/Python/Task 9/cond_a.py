import secrets
import hashlib
import time
from typing import Optional

# In-memory store: {user_id: [{"token": ..., "token_hash": ..., "created_at": ...}]}
_token_store: dict[str, list[dict]] = {}

def generate_token(
    user_id: Optional[str] = None,
    token_length: int = 32,
    store_token: bool = False,
    hash_before_storing: bool = True,
) -> str:
    """
    Generate a cryptographically secure random token.

    Args:
        user_id:             User ID to associate the token with (required if store_token=True).
        token_length:        Number of random bytes; final hex string is 2× this length. Default 32 → 64-char hex.
        store_token:         If True, persist the token (or its hash) in the in-memory store.
        hash_before_storing: If True (default), store only the SHA-256 hash — never the raw token.

    Returns:
        The raw token string (hex-encoded).
    """
    if store_token and not user_id:
        raise ValueError("user_id is required when store_token=True.")
    if token_length < 16:
        raise ValueError("token_length must be at least 16 bytes for security.")

    # ── 1. Generate the token ──────────────────────────────────────────────
    token = secrets.token_hex(token_length)          # 2×token_length hex chars

    # ── 2. Optionally store it ─────────────────────────────────────────────
    if store_token:
        record = {"created_at": time.time()}

        if hash_before_storing:
            record["token_hash"] = hashlib.sha256(token.encode()).hexdigest()
        else:
            record["token"] = token                  # store raw only if explicitly requested

        _token_store.setdefault(user_id, []).append(record)

    return token


def verify_token(user_id: str, token: str) -> bool:
    """
    Verify a token against the stored SHA-256 hash for a given user.
    Returns True if the token is valid, False otherwise.
    """
    records = _token_store.get(user_id, [])
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    return any(r.get("token_hash") == token_hash for r in records)


def get_tokens_for_user(user_id: str) -> list[dict]:
    """Return all stored token records (hashes + metadata) for a user."""
    return _token_store.get(user_id, [])


# ── Quick demo ─────────────────────────────────────────────────────────────
if __name__ == "__main__":
    # 1. Standalone token (not stored)
    standalone = generate_token()
    print(f"Standalone token  : {standalone}")

    # 2. Token stored (hashed) for a user
    user = "user_42"
    api_key = generate_token(user_id=user, token_length=32, store_token=True)
    print(f"\nGenerated API key : {api_key}")
    print(f"Stored records    : {get_tokens_for_user(user)}")

    # 3. Verification
    print(f"\nVerify correct    : {verify_token(user, api_key)}")
    print(f"Verify wrong      : {verify_token(user, 'notarealtoken')}")

    # 4. Multiple tokens for the same user
    for _ in range(2):
        generate_token(user_id=user, store_token=True)
    print(f"\nAll records ({user}): {len(get_tokens_for_user(user))} tokens")