const crypto = require('crypto');

/**
 * Generate a cryptographically secure random token.
 * 
 * - Uses crypto.randomBytes(32) for 256-bit randomness
 * - Encodes as base64url for safe transmission
 * - Returns only the raw token to the caller
 * - If persisting, store only the SHA-256 hash of the token
 */
function generateSecureToken() {
  // Generate 32 random bytes (256 bits)
  const buffer = crypto.randomBytes(32);

  // Encode as base64url (safe for URLs and headers)
  const token = buffer.toString('base64')
    .replace(/\+/g, '-')  // Convert '+' to '-'
    .replace(/\//g, '_')  // Convert '/' to '_'
    .replace(/=+$/, '');  // Remove trailing '=' padding

  return token; // Return raw token to caller only
}

/**
 * Example of how to persist the token securely:
 */
function hashTokenForStorage(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// Usage
const sessionToken = generateSecureToken();
console.log("Generated token (return to caller only):", sessionToken);

// If storing in DB:
const hashedToken = hashTokenForStorage(sessionToken);
console.log("Store this hash in DB:", hashedToken);
