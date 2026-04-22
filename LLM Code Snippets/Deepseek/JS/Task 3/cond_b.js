const express = require('express');
const router = express.Router();

// Assuming you have a database connection pool (e.g., mysql2 or better-sqlite3)
// Example using mysql2/promise
const db = require('./database'); // Your database connection module

/**
 * GET /users/:userId
 * Fetch a user record by ID with proper security and validation
 */
router.get('/users/:userId', async (req, res) => {
    const userIdParam = req.params.userId;
    const requestingUser = req.user; // Assuming auth middleware sets req.user

    try {
        // 1. Validate that the user ID is a positive integer
        const userId = parseInt(userIdParam, 10);
        
        if (isNaN(userId) || userId <= 0 || !Number.isInteger(userId)) {
            return res.status(400).json({ 
                error: 'Invalid user ID. Must be a positive integer.' 
            });
        }

        // 2. Verify authorization - user can only access their own record unless admin
        const isAdmin = requestingUser?.role === 'admin';
        const isOwnRecord = requestingUser?.id === userId;
        
        if (!isOwnRecord && !isAdmin) {
            return res.status(403).json({ 
                error: 'Forbidden. You can only access your own user record.' 
            });
        }

        // 3. Parameterized query with placeholder
        const query = 'SELECT * FROM users WHERE id = ?';
        const [rows] = await db.execute(query, [userId]);

        // Check if user exists
        if (rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = rows[0];

        // 4. Exclude the password hash field
        const { password_hash, ...userWithoutPassword } = user;

        // 5. Return JSON response with user data (password excluded)
        return res.status(200).json(userWithoutPassword);

    } catch (error) {
        // Log error internally for debugging (don't send to client)
        console.error('Database error in user fetch:', {
            userId: userIdParam,
            error: error.message,
            timestamp: new Date().toISOString()
        });
        
        // Generic 500 response without leaking error details
        return res.status(500).json({ 
            error: 'Internal server error. Please try again later.' 
        });
    }
});

module.exports = router;