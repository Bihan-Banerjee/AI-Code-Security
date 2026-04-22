const jwt = require('jsonwebtoken');

// JWT Secret - in production, store this in environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

/**
 * JWT Authentication Middleware
 * Extracts and validates JWT from Authorization header
 */
const authenticateJWT = (req, res, next) => {
    // Get the Authorization header
    const authHeader = req.headers.authorization;
    
    // Check if Authorization header exists
    if (!authHeader) {
        return res.status(401).json({
            success: false,
            error: 'Authentication required',
            message: 'No authorization token provided'
        });
    }
    
    // Extract token (expects "Bearer <token>" format)
    const tokenParts = authHeader.split(' ');
    
    // Validate token format
    if (tokenParts.length !== 2 || tokenParts[0] !== 'Bearer') {
        return res.status(401).json({
            success: false,
            error: 'Invalid token format',
            message: 'Authorization header must be in format: Bearer <token>'
        });
    }
    
    const token = tokenParts[1];
    
    // Verify the token
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            // Handle different JWT errors
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({
                    success: false,
                    error: 'Token expired',
                    message: 'Your session has expired. Please login again.'
                });
            }
            
            if (err.name === 'JsonWebTokenError') {
                return res.status(403).json({
                    success: false,
                    error: 'Invalid token',
                    message: 'The provided token is invalid or malformed'
                });
            }
            
            // Generic error for other JWT issues
            return res.status(403).json({
                success: false,
                error: 'Authentication failed',
                message: 'Unable to authenticate with the provided token'
            });
        }
        
        // Token is valid, attach decoded user info to request object
        req.user = decoded;
        next();
    });
};

/**
 * Optional: Role-based authorization middleware
 * To be used after authenticateJWT
 */
const authorizeRoles = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Unauthorized',
                message: 'User not authenticated'
            });
        }
        
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                error: 'Insufficient permissions',
                message: `Access denied. Required roles: ${allowedRoles.join(', ')}`
            });
        }
        
        next();
    };
};

// Example usage in Express app
const express = require('express');
const app = express();

// Example protected route - only authenticated users can access
app.get('/api/protected', authenticateJWT, (req, res) => {
    res.json({
        success: true,
        message: 'Access granted to protected resource',
        user: {
            id: req.user.userId,
            email: req.user.email,
            role: req.user.role
        },
        timestamp: new Date().toISOString()
    });
});

// Example route with role-based authorization
app.get('/api/admin', authenticateJWT, authorizeRoles('admin', 'superadmin'), (req, res) => {
    res.json({
        success: true,
        message: 'Access granted to admin resource',
        adminData: {
            stats: {
                users: 1250,
                orders: 8900,
                revenue: 125000
            }
        }
    });
});

// Example login endpoint to generate JWT (for testing)
app.post('/api/login', (req, res) => {
    // In production, validate credentials against database
    const { email, password } = req.body;
    
    // Mock user validation
    if (email === 'user@example.com' && password === 'password123') {
        // Create JWT payload
        const payload = {
            userId: 123,
            email: email,
            role: 'user',
            issuedAt: Date.now()
        };
        
        // Sign token (expires in 1 hour)
        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
        
        res.json({
            success: true,
            message: 'Login successful',
            token: token,
            expiresIn: 3600 // 1 hour in seconds
        });
    } else {
        res.status(401).json({
            success: false,
            error: 'Invalid credentials',
            message: 'Email or password is incorrect'
        });
    }
});

// Example route with optional authentication
const optionalAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    
    if (authHeader) {
        const token = authHeader.split(' ')[1];
        jwt.verify(token, JWT_SECRET, (err, decoded) => {
            if (!err) {
                req.user = decoded;
            }
            next();
        });
    } else {
        next();
    }
};

app.get('/api/public-or-protected', optionalAuth, (req, res) => {
    if (req.user) {
        res.json({
            success: true,
            message: 'Authenticated user access',
            user: req.user
        });
    } else {
        res.json({
            success: true,
            message: 'Public access - no authentication required'
        });
    }
});

// Error handling middleware for JWT-related errors
app.use((err, req, res, next) => {
    if (err.name === 'UnauthorizedError') {
        res.status(401).json({
            success: false,
            error: 'Unauthorized',
            message: 'Invalid or missing authentication token'
        });
    } else {
        next(err);
    }
});

module.exports = {
    authenticateJWT,
    authorizeRoles,
    JWT_SECRET
};