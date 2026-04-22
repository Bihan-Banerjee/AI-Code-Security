const jwt = require('jsonwebtoken');

/**
 * JWT Authentication Middleware
 * - Extracts token from Authorization header
 * - Verifies with explicit algorithm list
 * - Validates exp, iss, and aud claims
 * - Returns uniform 401 JSON response on failure
 * - Attaches only necessary claims to req.user
 */
function jwtAuthMiddleware(requiredClaims = []) {
  return (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET not set in environment variables');
    }

    try {
      const payload = jwt.verify(token, secret, {
        algorithms: ['HS256'],
        issuer: process.env.JWT_ISSUER,   // expected issuer
        audience: process.env.JWT_AUDIENCE // expected audience
      });

      // Attach only required claims to req.user
      req.user = {};
      for (const claim of requiredClaims) {
        if (payload[claim] !== undefined) {
          req.user[claim] = payload[claim];
        }
      }

      return next();
    } catch (err) {
      // Uniform error response without revealing details
      return res.status(401).json({ error: 'Unauthorized' });
    }
  };
}

module.exports = jwtAuthMiddleware;
