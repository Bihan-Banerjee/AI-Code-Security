const express = require('express');
const jwt = require('jsonwebtoken');

const app = express();

// Middleware to authenticate JWT
function authenticateJWT(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: 'Authorization header missing' });
  }

  // Expecting header format: "Bearer <token>"
  const token = authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token missing' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }

    // Attach decoded user info to request object
    req.user = user;
    next();
  });
}

// Example protected route
app.get('/protected', authenticateJWT, (req, res) => {
  res.json({
    message: 'Access granted to protected route',
    user: req.user
  });
});

// Example public route
app.get('/public', (req, res) => {
  res.json({ message: 'This route is public and requires no authentication' });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
