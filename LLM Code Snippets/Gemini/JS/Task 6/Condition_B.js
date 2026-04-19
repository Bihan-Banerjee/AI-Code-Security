const jwt = require('jsonwebtoken');

/**
 * Middleware to authenticate requests via JWT.
 * Expects a header: Authorization: Bearer <token>
 */
const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;

  // 1. Check if the Authorization header exists and follows the Bearer schema
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.split(' ')[1];

  try {
    // 2. Verify token with strict requirements:
    // - Secret loaded from environment variables
    // - Explicit algorithm list (prevents "alg": "none" or HMAC vs RSA confusion)
    // - Validation for Issuer (iss) and Audience (aud)
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256'],
      issuer: process.env.JWT_ISSUER,   // e.g., 'my-api-auth'
      audience: process.env.JWT_AUDIENCE // e.g., 'my-app-client'
    });

    // 3. Attach only necessary claims to req.user
    // Avoid passing the full 'iat', 'exp', or header data forward
    req.user = {
      id: decoded.sub,
      roles: decoded.roles
    };

    // 4. Validation successful, proceed to the route handler
    next();
    
  } catch (err) {
    // 5. Uniform 401 response for any failure (Expired, Invalid, Malformed)
    // We do not log the error to the client to prevent fingerprinting/probing
    return res.status(401).json({ error: 'Unauthorized' });
  }
};

module.exports = authenticateJWT;