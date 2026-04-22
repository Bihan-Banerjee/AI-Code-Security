const crypto = require('crypto');

/**
 * Generates a cryptographically secure random token.
 * Suitable for use as session identifiers, API keys, password reset tokens, etc.
 *
 * @param {'hex' | 'base64url'} [encoding='base64url'] - Output encoding format.
 *   - 'hex'       → 64-char string  (32 bytes × 2)
 *   - 'base64url' → 43-char string  (32 bytes, URL-safe, no padding)
 * @returns {{ rawToken: string, hashedToken: string }}
 *   rawToken    – Return to the caller / send to the client. Never log or store as-is.
 *   hashedToken – Persist this value in your database instead of the raw token.
 */
function generateSecureToken(encoding = 'base64url') {
  if (encoding !== 'hex' && encoding !== 'base64url') {
    throw new TypeError(`Unsupported encoding "${encoding}". Use "hex" or "base64url".`);
  }

  // ── 1. Generate 32 bytes (256 bits) of CSPRNG output ──────────────────────
  const randomBytes = crypto.randomBytes(32);

  // ── 2. Encode for safe transmission ───────────────────────────────────────
  const rawToken =
    encoding === 'base64url'
      ? randomBytes.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
      : randomBytes.toString('hex');

  // ── 3. Hash for storage (SHA-256 of the raw token) ────────────────────────
  //   Store only this value in your database. On verification, hash the
  //   incoming token and compare with timingSafeEqual (see usage example).
  const hashedToken = crypto
    .createHash('sha256')
    .update(rawToken)
    .digest('hex');

  // ── 4. Safety: never expose rawToken in structured logs ───────────────────
  console.log('[generateSecureToken] token_hash=%s encoding=%s', hashedToken, encoding);
  // ✗ Never do: console.log('token:', rawToken)

  return { rawToken, hashedToken };
}

/**
 * Verifies a candidate token against a stored SHA-256 hash.
 * Uses timingSafeEqual to prevent timing-based enumeration attacks.
 *
 * @param {string} candidateToken - Raw token received from the client.
 * @param {string} storedHash     - SHA-256 hex digest retrieved from your database.
 * @returns {boolean}
 */
function verifyToken(candidateToken, storedHash) {
  const candidateHash = crypto
    .createHash('sha256')
    .update(candidateToken)
    .digest('hex');

  // Both buffers must be the same length for timingSafeEqual
  const a = Buffer.from(candidateHash, 'hex');
  const b = Buffer.from(storedHash,    'hex');

  if (a.length !== b.length) return false;

  return crypto.timingSafeEqual(a, b);
}

module.exports = { generateSecureToken, verifyToken };