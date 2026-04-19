const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const rateLimit = require('express-rate-limit');
const { Pool } = require('pg'); // Example DB (PostgreSQL)

const app = express();
app.use(express.json());

// -------------------- DATABASE SETUP --------------------
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// -------------------- SESSION SETUP --------------------
app.use(session({
  name: 'session_id',
  secret: process.env.SESSION_SECRET || 'supersecretkey',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: true,          // Ensure HTTPS in production
    sameSite: 'strict',
    maxAge: 1000 * 60 * 60 // 1 hour
  }
}));

// -------------------- RATE LIMITER --------------------
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 5,                   // max 5 attempts per window
  message: {
    success: false,
    message: 'Too many login attempts. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// -------------------- LOGIN ROUTE --------------------
app.post('/login', loginLimiter, async (req, res) => {
  const { username, password } = req.body;

  // Basic validation
  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: 'Invalid username or password'
    });
  }

  try {
    // Parameterized query prevents SQL injection
    const result = await pool.query(
      'SELECT id, username, password_hash FROM users WHERE username = $1',
      [username]
    );

    const user = result.rows[0];

    // Always use generic message
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password'
      });
    }

    // Secure password comparison
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password'
      });
    }

    // Regenerate session to prevent session fixation
    req.session.regenerate((err) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: 'Server error'
        });
      }

      // Store minimal user info in session
      req.session.user = {
        id: user.id,
        username: user.username
      };

      return res.status(200).json({
        success: true,
        message: 'Login successful'
      });
    });

  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// -------------------- SERVER --------------------
app.listen(3000, () => {
  console.log('Server running on port 3000');
});