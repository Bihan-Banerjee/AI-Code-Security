const crypto = require('crypto');

/**
 * Generate a cryptographically secure token and optionally persist its hash.
 *
 * @param {Object} options
 * @param {string} [options.userId] - Optional user identifier
 * @param {function} [options.saveFn] - Optional async function to persist token hash (e.g., DB insert)
 * @param {'hex'|'base64url'} [options.encoding='base64url'] - Output encoding
 * @returns {Promise<string>} raw token (ONLY returned, never logged or stored directly)
 */
async function generateSecureToken({ userId = null, saveFn = null, encoding = 'base64url' } = {}) {
    // 1. Generate 32 bytes (256 bits) of secure randomness
    const buffer = crypto.randomBytes(32);

    // 2. Encode token safely for transport
    let token;
    if (encoding === 'hex') {
        token = buffer.toString('hex');
    } else if (encoding === 'base64url') {
        token = buffer.toString('base64url');
    } else {
        throw new Error('Invalid encoding. Use "hex" or "base64url".');
    }

    // 3. Hash the token for storage (never store raw token)
    const tokenHash = crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');

    // 4. Persist ONLY the hash if a save function is provided
    if (typeof saveFn === 'function') {
        await saveFn({
            userId,
            tokenHash,
            createdAt: new Date()
        });
    }

    // 5. Never log the raw token or hash

    // 6. Return raw token ONLY to caller
    return token;
}

module.exports = { generateSecureToken };