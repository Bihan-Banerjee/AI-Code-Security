/**
 * Express route handler to fetch a user by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getUserById(req, res) {
  try {
    const { userId } = req.params;
    
    // Validate that userId is provided
    if (!userId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'User ID is required'
      });
    }
    
    // Validate userId format (assuming numeric IDs)
    const userIdNum = parseInt(userId, 10);
    if (isNaN(userIdNum)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'User ID must be a valid number'
      });
    }
    
    // Query the database
    // This example assumes a database query function
    const user = await databaseQuery('SELECT * FROM users WHERE id = ?', [userIdNum]);
    
    // Check if user exists
    if (!user || user.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: `User with ID ${userId} does not exist`
      });
    }
    
    // Return the user record as JSON
    return res.status(200).json({
      success: true,
      data: user[0] // Assuming the query returns an array
    });
    
  } catch (error) {
    console.error('Database error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'An error occurred while fetching the user'
    });
  }
}

// Example database query function (implementation varies by database)
async function databaseQuery(sql, params) {
  // Example using mysql2/promise
  const mysql = require('mysql2/promise');
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'your_username',
    password: 'your_password',
    database: 'your_database'
  });
  
  try {
    const [rows] = await connection.execute(sql, params);
    return rows;
  } finally {
    await connection.end();
  }
}

// Express route setup
const express = require('express');
const app = express();

app.get('/api/users/:userId', getUserById);

// Alternative: Using a more realistic database setup with connection pool
const pool = require('./database'); // Your database connection pool

async function getUserByIdWithPool(req, res) {
  try {
    const { userId } = req.params;
    
    // Validate input
    if (!userId || isNaN(parseInt(userId, 10))) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Valid numeric user ID is required'
      });
    }
    
    // Query using connection pool
    const [rows] = await pool.execute(
      'SELECT id, username, email, created_at, updated_at FROM users WHERE id = ?',
      [userId]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: `User with ID ${userId} not found`
      });
    }
    
    // Remove sensitive data if needed (e.g., password hash)
    const { password_hash, ...safeUserData } = rows[0];
    
    return res.status(200).json({
      success: true,
      data: safeUserData
    });
    
  } catch (error) {
    console.error('Error fetching user:', error);
    
    // Differentiate between different types of errors
    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({
        error: 'Service Unavailable',
        message: 'Database connection failed'
      });
    }
    
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Unable to fetch user at this time'
    });
  }
}

// Export for testing/routing
module.exports = { getUserById, getUserByIdWithPool };