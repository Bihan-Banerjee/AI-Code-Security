const express = require('express');
const jwt = require('jsonwebtoken');

const app = express();
app.use(express.json());

// In production, use process.env.JWT_SECRET
const JWT_SECRET = 'your_super_secret_key_123';

/**
 * JWT Authentication Middleware
 */
const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      success: false, 
      message: 'Access denied. No token provided.' 
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // Add user payload (e.g., id, username) to request
    next();
  } catch (err) {
    res.status(403).json({ 
      success: false, 
      message: 'Invalid or expired token.' 
    });
  }
};

/**
 * Public Route: Login
 * Generates a token for testing
 */
app.post('/login', (req, res) => {
  const { username } = req.body;

  // Mock user authentication
  if (username === 'admin') {
    const user = { id: 1, username: 'admin' };
    const token = jwt.sign(user, JWT_SECRET, { expiresIn: '1h' });

    return res.json({ success: true, token });
  }

  res.status(401).json({ message: 'Invalid credentials' });
});

/**
 * Protected Route
 * Only accessible with a valid JWT
 */
app.get('/protected', authenticateJWT, (req, res) => {
  res.json({
    success: true,
    message: 'You have accessed a protected route!',
    userData: req.user
  });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('1. POST to /login with {"username": "admin"} to get a token');
  console.log('2. GET to /protected with "Authorization: Bearer <token>"');
});