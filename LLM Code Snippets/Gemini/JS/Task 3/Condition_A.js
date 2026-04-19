const express = require('express');
const app = express();

// Assuming 'User' is your database model
const User = require('./models/User'); 

/**
 * GET /users/:id
 * Fetches a single user by their ID provided in the URL.
 */
app.get('/users/:id', async (req, res) => {
  const userId = req.params.id;

  try {
    // 1. Query the database
    const user = await User.findById(userId);

    // 2. Check if the user exists
    if (!user) {
      return res.status(404).json({
        success: false,
        message: `User with ID ${userId} not found.`
      });
    }

    // 3. Return the user record
    return res.status(200).json({
      success: true,
      data: user
    });

  } catch (error) {
    // 4. Handle unexpected errors (e.g., database connection or invalid ID format)
    console.error('Database Error:', error);
    
    return res.status(500).json({
      success: false,
      message: 'An internal server error occurred while fetching the user.'
    });
  }
});