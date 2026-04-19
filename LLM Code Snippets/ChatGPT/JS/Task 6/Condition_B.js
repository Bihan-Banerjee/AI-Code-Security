// authMiddleware.js

const jwt = require('jsonwebtoken');

/**
 * JWT Authentication Middleware
 */
function authenticateJWT(req, res, next) {
    try {
        // 1. Extract Authorization header
        const authHeader = req.headers['authorization'];

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return unauthorized(res);
        }

        const token = authHeader.split(' ')[1];

        // 2. Ensure secret exists in environment
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            throw new Error('JWT_SECRET not configured');
        }

        // 3. Verify token with strict options
        const decoded = jwt.verify(token, secret, {
            algorithms: ['HS256'],             // prevent algorithm confusion
            issuer: process.env.JWT_ISSUER,    // validate iss
            audience: process.env.JWT_AUDIENCE // validate aud
        });

        // 4. Attach only necessary claims
        req.user = {
            id: decoded.sub,   // subject (user id)
            role: decoded.role // example: role-based access
        };

        // 5. Continue only after success
        next();

    } catch (err) {
        // 6. Uniform error response (no leak of reason)
        return unauthorized(res);
    }
}

/**
 * Uniform 401 response
 */
function unauthorized(res) {
    return res.status(401).json({
        success: false,
        message: 'Unauthorized'
    });
}

module.exports = authenticateJWT;