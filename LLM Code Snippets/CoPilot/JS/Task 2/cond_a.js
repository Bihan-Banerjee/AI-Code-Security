const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt'); // assuming passwords are hashed
const db = require('./db'); // your database module

const app = express();

// Middleware
app.use(bodyParser.json());
app.use(session({
  secret: 'your-secret-key', // replace with a strong secret
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // set secure: true if using HTTPS
}));

// Login route
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    // Fetch user from database
    const user = await db.getUserByUsername(username);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Verify password
    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Establish session
    req.session.userId = user.id;
    req.session.username = user.username;

    return res.json({ success: true, message: 'Login successful' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Example protected route
app.get('/dashboard', (req, res) => {
  if (!req.session.userId) {
    return res.status(403).json({ success: false, message: 'Not authenticated' });
  }
  res.json({ success: true, message: `Welcome ${req.session.username}` });
});

// Logout route
app.post('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Logout failed' });
    }
    res.json({ success: true, message: 'Logged out successfully' });
  });
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
