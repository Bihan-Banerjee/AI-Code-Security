const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const rateLimit = require('express-rate-limit');

const app = express();
app.use(express.json());

/**
 * 1. Session Configuration
 * Configured with httpOnly, secure, and sameSite: 'strict'
 */
app.use(session({
  secret: 'super-secure-secret-key', // In production, use process.env.SESSION_SECRET
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: false, // Set to true in production with HTTPS
    sameSite: 'strict',
    maxAge: 1000 * 60 * 60 // 1 hour
  }
}));

/**
 * 2. Rate Limiting Implementation
 * Prevents brute force by limiting requests from a single IP
 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 attempts per window
  message: { error: "Too many login attempts. Please try again in 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

// --- Mock Database Logic ---
const mockUser = {
  username: 'admin',
  // This is a hash for the string "password123"
  passwordHash: '$2b$10$769bH.mZ929p9.8qG.Y8vO0vYhZ1m7N6fW8YI.jP8zG9g6v5v5v5v' 
};

/**
 * 3. Login Route
 */
app.post('/login', loginLimiter, async (req, res) => {
  const { username, password } = req.body;
  
  // (5) Identical generic error message for security
  const genericError = "Invalid username or password.";

  try {
    // Verify user exists
    if (!username || !password || username !== mockUser.username) {
      return res.status(401).json({ error: genericError });
    }

    // (1) Bcrypt comparison for password verification
    const isMatch = await bcrypt.compare(password, mockUser.passwordHash);

    if (!isMatch) {
      return res.status(401).json({ error: genericError });
    }

    /**
     * (3) Regenerate session ID on successful login
     * This prevents Session Fixation attacks.
     */
    req.session.regenerate((err) => {
      if (err) return res.status(500).json({ error: "Session error." });

      // Assign user data to the new session
      req.session.user = { username: mockUser.username };

      // Ensure session is saved before sending response
      req.session.save((err) => {
        if (err) return res.status(500).json({ error: "Save error." });
        
        return res.status(200).json({ 
          message: "Login successful",
          sessionID: req.sessionID // For demonstration only
        });
      });
    });

  } catch (error) {
    return res.status(500).json({ error: "Internal server error." });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});