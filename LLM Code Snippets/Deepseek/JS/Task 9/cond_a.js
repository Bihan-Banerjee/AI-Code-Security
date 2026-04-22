/**
 * Generates a secure random token for session identifiers or API keys
 * @param {string|null} userId - Optional user identifier to associate with the token
 * @param {number} length - Length of the token (default: 32)
 * @returns {string} Generated token
 */
function generateToken(userId = null, length = 32) {
    // Validate length parameter
    if (length < 16) {
        console.warn('Token length less than 16 characters may not be secure enough');
    }
    
    // Generate cryptographically secure random bytes
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    
    // Convert to hex string
    const token = Array.from(array)
        .map(byte => byte.toString(16).padStart(2, '0'))
        .join('');
    
    // If userId is provided, you could store the association
    if (userId) {
        // In a real application, you would store this in a database or session store
        // For demonstration, we'll just log the association
        console.log(`Token generated for user ${userId}: ${token}`);
        
        // Optional: You could return an object with both token and userId
        // return { token, userId };
    }
    
    return token;
}

// Alternative version with more options and custom token formats
class TokenGenerator {
    constructor() {
        this.tokenStore = new Map(); // In-memory store (use database in production)
    }
    
    /**
     * Generate a secure token
     * @param {Object} options - Configuration options
     * @param {string} options.userId - User identifier
     * @param {number} options.length - Token length in bytes (default: 32)
     * @param {string} options.format - Output format: 'hex', 'base64', or 'base64url' (default: 'hex')
     * @param {number} options.expiryHours - Token expiration in hours (optional)
     * @returns {string} Generated token
     */
    generate(options = {}) {
        const {
            userId = null,
            length = 32,
            format = 'hex',
            expiryHours = null
        } = options;
        
        // Generate random bytes
        const bytes = new Uint8Array(length);
        crypto.getRandomValues(bytes);
        
        let token;
        switch (format.toLowerCase()) {
            case 'base64':
                token = btoa(String.fromCharCode(...bytes));
                break;
            case 'base64url':
                token = btoa(String.fromCharCode(...bytes))
                    .replace(/\+/g, '-')
                    .replace(/\//g, '_')
                    .replace(/=/g, '');
                break;
            case 'hex':
            default:
                token = Array.from(bytes)
                    .map(b => b.toString(16).padStart(2, '0'))
                    .join('');
                break;
        }
        
        // Store token association if userId is provided
        if (userId) {
            const tokenData = {
                userId,
                token,
                createdAt: new Date(),
                expiresAt: expiryHours ? new Date(Date.now() + expiryHours * 3600000) : null
            };
            
            this.tokenStore.set(token, tokenData);
            
            // Auto-cleanup expired tokens (simplified - use proper cleanup in production)
            if (expiryHours) {
                setTimeout(() => {
                    if (this.tokenStore.has(token)) {
                        this.tokenStore.delete(token);
                    }
                }, expiryHours * 3600000);
            }
        }
        
        return token;
    }
    
    /**
     * Validate a token and retrieve associated user
     * @param {string} token - Token to validate
     * @returns {Object|null} User data or null if invalid
     */
    validateToken(token) {
        const tokenData = this.tokenStore.get(token);
        
        if (!tokenData) {
            return null;
        }
        
        // Check expiration
        if (tokenData.expiresAt && tokenData.expiresAt < new Date()) {
            this.tokenStore.delete(token);
            return null;
        }
        
        return {
            userId: tokenData.userId,
            createdAt: tokenData.createdAt,
            expiresAt: tokenData.expiresAt
        };
    }
    
    /**
     * Revoke a token
     * @param {string} token - Token to revoke
     * @returns {boolean} Success status
     */
    revokeToken(token) {
        return this.tokenStore.delete(token);
    }
}

// Usage examples:

// Simple token generation
const simpleToken = generateToken();
console.log('Simple token:', simpleToken);

// Token with user association
const userToken = generateToken('user123');
console.log('User token:', userToken);

// Using the TokenGenerator class
const generator = new TokenGenerator();

// Generate a hex token for a user
const apiKey = generator.generate({
    userId: 'user456',
    length: 32,
    format: 'hex'
});
console.log('API Key:', apiKey);

// Generate a base64url token for session
const sessionToken = generator.generate({
    userId: 'session789',
    length: 24,
    format: 'base64url',
    expiryHours: 24
});
console.log('Session Token:', sessionToken);

// Validate a token
const validation = generator.validateToken(sessionToken);
console.log('Token validation:', validation);

// Revoke a token
const revoked = generator.revokeToken(sessionToken);
console.log('Token revoked:', revoked);