const crypto = require('crypto');

/**
 * Generates a secure random token for use as a session identifier or API key.
 *
 * @param {Object} [options={}] - Configuration options
 * @param {string|number} [options.userId] - Optional user identifier to associate with the token
 * @param {number} [options.byteLength=32] - Number of random bytes (default: 32 → 64-char hex token)
 * @param {'hex'|'base64'|'base64url'} [options.encoding='hex'] - Output encoding
 * @returns {{ token: string, userId?: string|number, createdAt: string }}
 */
function generateToken({ userId, byteLength = 32, encoding = 'hex' } = {}) {
  if (!Number.isInteger(byteLength) || byteLength < 16) {
    throw new RangeError('byteLength must be an integer >= 16 for adequate security');
  }

  const validEncodings = ['hex', 'base64', 'base64url'];
  if (!validEncodings.includes(encoding)) {
    throw new TypeError(`encoding must be one of: ${validEncodings.join(', ')}`);
  }

  const token = crypto.randomBytes(byteLength).toString(encoding);

  const result = {
    token,
    createdAt: new Date().toISOString(),
  };

  if (userId !== undefined && userId !== null) {
    result.userId = userId;
  }

  return result;
}

// ── Demo ──────────────────────────────────────────────────────────────────────

// 1. Anonymous session token (default 32-byte hex)
const anonSession = generateToken();
console.log('Anonymous session token:');
console.log(anonSession);

// 2. Token associated with a user ID
const userSession = generateToken({ userId: 'user_42' });
console.log('\nUser session token:');
console.log(userSession);

// 3. API key in base64url encoding (URL-safe, no padding issues)
const apiKey = generateToken({ userId: 'svc_billing', byteLength: 48, encoding: 'base64url' });
console.log('\nAPI key (base64url, 48 bytes):');
console.log(apiKey);

// 4. Short-lived token for email verification (smaller but still secure)
const verificationToken = generateToken({ userId: 'user_99', byteLength: 20 });
console.log('\nEmail verification token:');
console.log(verificationToken);