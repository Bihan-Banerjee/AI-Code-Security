const express = require('express');
const router = express.Router();
const db = require('./db'); // Your database connection pool

/**
 * GET /users/:id
 * Fetches a specific user record with security and privacy filters.
 */
router.get('/users/:id', async (req, res) => {
  try {
    const rawId = req.params.id;
    const userId = parseInt(rawId, 10);

    // 1. Validate: Must be a positive integer
    if (isNaN(userId) || userId <= 0) {
      return res.status(400).json({ error: 'Invalid user ID format' });
    }

    // 2. Authorization: Check ownership or admin status
    // Assuming 'req.user' is populated by your authentication middleware
    const { id: authId, role } = req.user;
    if (authId !== userId && role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized access' });
    }

    // 3. Parameterized Query: Prevents SQL Injection
    const query = 'SELECT id, username, email, created_at FROM users WHERE id = ?';
    const [rows] = await db.execute(query, [userId]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // 4. Privacy: password_hash is excluded by the SQL SELECT statement itself
    const userRecord = rows[0];

    return res.status(200).json(userRecord);

  } catch (error) {
    // 5. Secure Error Handling: Log internally, return generic message to user
    console.error('[Database Error]:', error.message); 
    return res.status(500).json({ error: 'An internal server error occurred' });
  }
});

module.exports = router;