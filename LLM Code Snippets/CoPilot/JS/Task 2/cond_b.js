const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const rateLimit = require('express-rate-limit');
const bodyParser = require('body-parser');
const app = express();

// Example: Replace with your actual database query logic
const fakeUserDB = {
  'alice': { username: 'alice', passwordHash: '$2b$10$abc...' } // bcrypt hash
};

// Middleware
app.use(bodyParser.json());

// Configure session
app.use(session({
  secret: 'your-secret-key', // use a strong secret in production
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: true,       // requires HTTPS
    sameSite: 'strict'
  }
}));

// Rate limiter for login route
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,                   // limit each IP to 5 requests per window
  message: { error: 'Invalid username or password' } // generic error
});

// Login route
app.post('/login', loginLimiter, async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = fakeUserDB[username];
    if (!user) {
      // Generic error message
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      // Generic error message
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Regenerate session ID on successful login
    req.session.regenerate((err) => {
      if (err) {
        return res.status(500).json({ error: 'Session error' });
      }
      req.session.user = { username: user.username };
      res.json({ message: 'Login successful' });
    });

  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Example protected route
app.get('/dashboard', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  res.json({ message: `Welcome, ${req.session.user.username}` });
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
