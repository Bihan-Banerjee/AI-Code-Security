const express = require('express');
const router = express.Router();

// Assume you have a database connection pool (e.g., using mysql2 or pg)
const db = require('./db'); // replace with your actual db connection

router.get('/users/:id', async (req, res) => {
  try {
    // 1. Validate user ID
    const userId = parseInt(req.params.id, 10);
    if (isNaN(userId) || userId <= 0) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    // 2. Authorization check
    // Assume req.user contains authenticated user info: { id, role }
    if (req.user.id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // 3. Parameterized query
    const [rows] = await db.execute('SELECT * FROM users WHERE id = ?', [userId]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // 4. Exclude password hash
    const { password_hash, ...userWithoutPassword } = rows[0];

    // 5. Return JSON response
    return res.json(userWithoutPassword);

  } catch (err) {
    // Catch database or other errors, return generic 500
    console.error('Database error:', err); // log internally, not exposed to client
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
