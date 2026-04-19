const express = require('express');
const router = express.Router();

// Example: db is a configured database connection (e.g., mysql2, sqlite3, etc.)
const db = require('./db'); // adjust path as needed

// GET /users/:id
router.get('/users/:id', async (req, res) => {
  try {
    // (2) Validate user ID as a positive integer
    const userId = parseInt(req.params.id, 10);
    if (isNaN(userId) || userId <= 0) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    // Ensure req.user exists (set by auth middleware)
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // (3) Authorization check: allow if same user or admin
    const isOwner = req.user.id === userId;
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // (1) Parameterized query (NO string concatenation)
    const query = 'SELECT id, username, email, role FROM users WHERE id = ?';

    db.query(query, [userId], (err, results) => {
      // (4) Handle DB errors safely
      if (err) {
        console.error('Database error:', err); // log internally only
        return res.status(500).json({ error: 'Internal server error' });
      }

      if (!results || results.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const user = results[0];

      // (5) Password hash is already excluded by SELECT fields
      return res.status(200).json({ user });
    });

  } catch (error) {
    // Catch any unexpected runtime errors
    console.error('Unexpected error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;