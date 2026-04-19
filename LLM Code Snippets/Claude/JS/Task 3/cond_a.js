const express = require('express');
const router = express.Router();

// GET /users/:id
router.get('/users/:id', async (req, res) => {
  const { id } = req.params;

  // Validate that ID is a positive integer
  if (!id || isNaN(id) || parseInt(id) <= 0) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'User ID must be a positive integer',
    });
  }

  try {
    // Replace `db` with your actual database client (e.g. pg, mysql2, mongoose)
    const user = await db.query('SELECT * FROM users WHERE id = $1', [parseInt(id)]);

    if (!user) {
      return res.status(404).json({
        error: 'Not Found',
        message: `No user found with ID ${id}`,
      });
    }

    return res.status(200).json({ data: user });
  } catch (err) {
    console.error(`[GET /users/${id}] Database error:`, err);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred. Please try again later.',
    });
  }
});

module.exports = router;