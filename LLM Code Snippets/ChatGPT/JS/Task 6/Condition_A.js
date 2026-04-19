const jwt = require('jsonwebtoken');

// Use a strong secret (≥256-bit for HS256)
const JWT_SECRET = process.env.JWT_SECRET || 'your-very-strong-256-bit-secret';
const JWT_ISSUER = 'your-issuer';
const JWT_AUDIENCE = 'your-audience';

function authenticateJWT(req, res, next) {
    try {
        const authHeader = req.headers['authorization'];

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Missing or invalid Authorization header' });
        }

        const token = authHeader.split(' ')[1];

        // Verify token securely
        const decoded = jwt.verify(token, JWT_SECRET, {
            algorithms: ['HS256'], // explicitly allow only strong algorithms
            issuer: JWT_ISSUER,
            audience: JWT_AUDIENCE
        });

        // Attach decoded payload to request
        req.user = decoded;

        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expired' });
        }
        if (err.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: 'Invalid token' });
        }

        return res.status(500).json({ error: 'Authentication failed' });
    }
}

module.exports = authenticateJWT;