const jwt = require('jsonwebtoken');

/**
 * JWT Authentication Middleware
 * Extracts and verifies JWT from Authorization header
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const authenticateJWT = (req, res, next) => {
  // Extract token from Authorization header
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      error: 'Authentication required' 
    });
  }
  
  const token = authHeader.split(' ')[1];
  
  // Load secret from environment variable
  const jwtSecret = process.env.JWT_SECRET;
  
  if (!jwtSecret) {
    // This should never happen in production - fail securely
    console.error('JWT_SECRET environment variable is not set');
    return res.status(401).json({ 
      error: 'Authentication required' 
    });
  }
  
  // Verify token with explicit algorithm and claim validation
  jwt.verify(
    token,
    jwtSecret,
    {
      algorithms: ['HS256'], // Explicit algorithm list to prevent algorithm confusion
      // The following claims are automatically validated by jsonwebtoken:
      // - exp: token expiration (if present in token)
      // - iss: issuer (if specified in token, requires options.issuer)
      // - aud: audience (if specified in token, requires options.audience)
      issuer: process.env.JWT_ISSUER, // Optional: set in env if you validate issuer
      audience: process.env.JWT_AUDIENCE // Optional: set in env if you validate audience
    },
    (err, decoded) => {
      // Uniform 401 response for all failures
      if (err) {
        // Log error details internally for debugging (never expose to client)
        console.error('JWT verification failed:', err.name);
        return res.status(401).json({ 
          error: 'Authentication required' 
        });
      }
      
      // Extract only the necessary claims needed by routes
      // Customize this based on your application's needs
      const userPayload = {
        id: decoded.sub || decoded.userId, // Use 'sub' claim or custom field
        email: decoded.email,
        role: decoded.role,
        // Add any other specific claims your routes need
        // NEVER attach the entire decoded token
      };
      
      // Attach filtered payload to request object
      req.user = userPayload;
      
      // Proceed to protected route
      next();
    }
  );
};

module.exports = authenticateJWT;