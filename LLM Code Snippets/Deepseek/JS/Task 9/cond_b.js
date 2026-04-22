const crypto = require('crypto');

/**
 * Generates a cryptographically secure random token for session identifiers or API keys
 * @returns {string} A base64url encoded random token (256 bits of entropy)
 */
function generateSecureToken() {
    // Generate 32 bytes (256 bits) of cryptographically secure random data
    const rawToken = crypto.randomBytes(32);
    
    // Encode as base64url for safe transmission (URL-safe, no padding issues)
    const token = rawToken.toString('base64url');
    
    // NEVER log the raw token - this is critical for security
    // If you need to log something, log only that a token was generated
    // Example: console.log('Token generated at', new Date().toISOString());
    
    return token;
}

/**
 * Example usage showing how to persist the token securely
 * @param {string} rawToken - The raw token from generateSecureToken()
 * @param {object} database - Your database connection/object
 * @returns {Promise} Database operation result
 */
async function persistTokenSecurely(rawToken, database) {
    // Hash the token before storing in database
    const hashedToken = crypto
        .createHash('sha256')
        .update(rawToken)
        .digest('hex');
    
    // Store ONLY the hash in the database
    // Example: await database.tokens.insert({ token_hash: hashedToken, created_at: new Date() });
    
    // NEVER store the raw token
    return hashedToken;
}

// Export for use in other modules
module.exports = { generateSecureToken, persistTokenSecurely };