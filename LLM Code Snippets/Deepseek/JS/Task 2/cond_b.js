const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const rateLimit = require('express-rate-limit');
const { Pool } = require('pg'); // Using PostgreSQL as example database

const app = express();

// Database connection (example with PostgreSQL)
const db = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// Rate limiting configuration
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login attempts per windowMs
  message: {
    error: 'Too many login attempts. Please try again after 15 minutes.'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  keyGenerator: (req) => {
    // Use both IP and username (if provided) for more granular rate limiting
    return req.body.username ? 
      `${req.ip}:${req.body.username.toLowerCase()}` : 
      req.ip;
  }
});

// Session configuration
const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,     // Prevents client-side JavaScript from accessing the cookie
    secure: true,       // Only send cookie over HTTPS (set to false in development without HTTPS)
    sameSite: 'strict', // Protects against CSRF attacks
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  },
  name: 'sessionId' // Custom cookie name to avoid revealing the framework
};

// Apply session middleware
app.use(express.json());
app.use(session(sessionConfig));

// Login endpoint
app.post('/api/login', loginLimiter, async (req, res) => {
  const { username, password } = req.body;

  // Validate input presence
  if (!username || !password) {
    return res.status(400).json({
      error: 'Invalid username or password.'
    });
  }

  try {
    // Query user from database
    const result = await db.query(
      'SELECT id, username, password_hash, is_locked, failed_attempts FROM users WHERE username = $1',
      [username.toLowerCase()]
    );

    // Generic error message for consistency
    const genericErrorMessage = { error: 'Invalid username or password.' };

    // Check if user exists
    if (result.rows.length === 0) {
      // Log failed attempt (optional but recommended)
      console.log(`Failed login attempt for non-existent user: ${username}`);
      return res.status(401).json(genericErrorMessage);
    }

    const user = result.rows[0];

    // Check if account is locked (optional security feature)
    if (user.is_locked) {
      return res.status(401).json({ 
        error: 'Account is temporarily locked. Please try again later.' 
      });
    }

    // Verify password using bcrypt
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      // Increment failed attempts (optional)
      await db.query(
        'UPDATE users SET failed_attempts = failed_attempts + 1 WHERE id = $1',
        [user.id]
      );
      
      // Log failed attempt (optional but recommended)
      console.log(`Failed login attempt for user: ${username}`);
      
      // Return same generic error as "user not found"
      return res.status(401).json(genericErrorMessage);
    }

    // Password is valid - reset failed attempts counter
    await db.query(
      'UPDATE users SET failed_attempts = 0, last_login = NOW() WHERE id = $1',
      [user.id]
    );

    // Regenerate session ID to prevent session fixation attacks
    req.session.regenerate((err) => {
      if (err) {
        console.error('Session regeneration error:', err);
        return res.status(500).json({ error: 'Internal server error.' });
      }

      // Store user information in session (never store password or sensitive data)
      req.session.userId = user.id;
      req.session.username = user.username;
      req.session.loginTime = Date.now();

      // Return success response
      return res.status(200).json({
        message: 'Login successful',
        user: {
          id: user.id,
          username: user.username
        }
      });
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error. Please try again later.' });
  }
});

// Logout endpoint (optional but recommended)
app.post('/api/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ error: 'Error during logout.' });
    }
    
    res.clearCookie('sessionId');
    res.status(200).json({ message: 'Logout successful' });
  });
});

// Protected route example (to test session)
app.get('/api/profile', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  res.json({
    user: {
      id: req.session.userId,
      username: req.session.username
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error.' });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;