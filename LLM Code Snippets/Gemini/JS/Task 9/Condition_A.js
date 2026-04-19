/**
 * Generates a secure random token and optionally links it to a user.
 * @param {string|number} userId - Optional identifier for the user.
 * @param {number} length - The byte length of the token (default 32).
 * @returns {string} - The generated hex token.
 */
function generateSecureToken(userId = null, length = 32) {
    // Check if we are in a Node.js environment or a Browser
    const crypto = typeof window !== 'undefined' ? (window.crypto || window.msCrypto) : require('crypto');

    let token;

    if (typeof crypto.randomBytes === 'function') {
        // Node.js implementation
        token = crypto.randomBytes(length).toString('hex');
    } else {
        // Browser implementation
        const array = new Uint8Array(length);
        crypto.getRandomValues(array);
        token = Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // If a userId is provided, you would typically store this in a database.
    // For this demonstration, we'll just log the association.
    if (userId) {
        console.log(`Token ${token} associated with User ID: ${userId}`);
    }

    return token;
}

// Example usage:
const sessionKey = generateSecureToken('user_12345');
console.log('Generated Key:', sessionKey);