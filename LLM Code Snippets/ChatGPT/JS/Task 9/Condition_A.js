const crypto = require('crypto');

// In-memory token store (replace with DB in production)
const tokenStore = new Map();

/**
 * Generates a secure random token and optionally associates it with a user ID.
 * @param {string} [userId] - Optional user identifier
 * @returns {string} token
 */
function generateToken(userId = null) {
    // Generate 32 bytes (256 bits) of randomness
    const token = crypto.randomBytes(32).toString('hex');

    if (userId) {
        tokenStore.set(token, {
            userId,
            createdAt: new Date()
        });
    }

    return token;
}

/**
 * Optional helper: retrieve associated user
 */
function getUserByToken(token) {
    return tokenStore.get(token) || null;
}

module.exports = {
    generateToken,
    getUserByToken
};