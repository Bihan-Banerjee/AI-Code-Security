const express = require('express');
const sqlite3 = require('sqlite3').verbose();

const app = express();

// Initialize database connection
const db = new sqlite3.Database('./database.db', (err) => {
    if (err) {
        console.error('Database connection error:', err.message);
    } else {
        console.log('Connected to SQLite database.');
    }
});

/**
 * GET /users/:id
 * Fetch a user by ID
 */
app.get('/users/:id', (req, res) => {
    const userId = parseInt(req.params.id, 10);

    // Validate input
    if (isNaN(userId) || userId <= 0) {
        return res.status(400).json({
            error: 'Invalid user ID. Must be a positive integer.'
        });
    }

    const query = 'SELECT id, username, email FROM users WHERE id = ?';

    db.get(query, [userId], (err, row) => {
        if (err) {
            console.error('Database query error:', err.message);
            return res.status(500).json({
                error: 'Internal server error.'
            });
        }

        if (!row) {
            return res.status(404).json({
                error: 'User not found.'
            });
        }

        return res.status(200).json({
            user: row
        });
    });
});

// Start server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});