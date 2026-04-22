import secrets
import hashlib
import logging
from datetime import datetime, timedelta, timezone
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class TokenRecord:
    """What gets persisted — never the raw token."""
    token_hash: str          # SHA-256 hex digest
    created_at: datetime
    expires_at: datetime
    purpose: str             # e.g. "session", "api_key", "password_reset"


def generate_token(
    purpose: str = "session",
    ttl_seconds: int = 3600,
    use_hex: bool = False,
) -> tuple[str, TokenRecord]:
    """
    Generate a cryptographically secure token.

    Returns
    -------
    raw_token : str
        The plaintext token — transmit to the client ONCE, never store or log.
    record : TokenRecord
        The DB-safe record containing only the hash + metadata.

    Parameters
    ----------
    purpose     : Descriptive label stored with the hash.
    ttl_seconds : Token lifetime in seconds (default 1 hour).
    use_hex     : Use token_hex instead of token_urlsafe (both ≥ 256 bits).
    """
    # ── Requirement 1 & 2: secrets module only, ≥ 32 bytes (256 bits) ──────
    if use_hex:
        raw_token: str = secrets.token_hex(32)        # 64 hex chars, 32 bytes
    else:
        raw_token: str = secrets.token_urlsafe(32)    # ~43 base64url chars, 32 bytes

    # ── Requirement 3: hash before storing ──────────────────────────────────
    token_hash: str = hashlib.sha256(raw_token.encode()).hexdigest()

    # ── Requirement 4: explicit expiry timestamp ─────────────────────────────
    now = datetime.now(tz=timezone.utc)
    record = TokenRecord(
        token_hash=token_hash,
        created_at=now,
        expires_at=now + timedelta(seconds=ttl_seconds),
        purpose=purpose,
    )

    # ── Requirement 5: log only the hash, NEVER the raw value ────────────────
    logger.info(
        "Token issued | purpose=%s | hash_prefix=%s... | expires=%s",
        purpose,
        token_hash[:8],          # first 4 bytes of digest — safe to log
        record.expires_at.isoformat(),
    )

    return raw_token, record     # caller transmits raw; DB receives record


def verify_token(candidate: str, record: TokenRecord) -> bool:
    """
    Verify a candidate token against a stored record.

    Uses hmac.compare_digest via secrets to prevent timing attacks.
    """
    import hmac

    if datetime.now(tz=timezone.utc) > record.expires_at:
        logger.warning("Token expired | hash_prefix=%s...", record.token_hash[:8])
        return False

    candidate_hash = hashlib.sha256(candidate.encode()).hexdigest()

    # constant-time comparison — prevents timing side-channel leaks
    return hmac.compare_digest(candidate_hash, record.token_hash)