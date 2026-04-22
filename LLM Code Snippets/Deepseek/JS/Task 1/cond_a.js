const express = require('express');
const bcrypt = require('bcrypt');

const app = express();

// Middleware to parse JSON request bodies
app.use(express.json());

// In-memory database (replace with actual database in production)
const users = [];

/**
 * User Registration Endpoint
 * POST /api/register
 * Body: { username, email, password }
 */
app.post('/api/register', async (req, res) => {
  try {
    // 1. Extract user data from request body
    const { username, email, password } = req.body;

    // 2. Validate required fields
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'Username, email, and password are required'
      });
    }

    // 3. Validate email format (basic validation)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format',
        message: 'Please provide a valid email address'
      });
    }

    // 4. Validate password strength
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Weak password',
        message: 'Password must be at least 6 characters long'
      });
    }

    // 5. Check if user already exists
    const existingUser = users.find(
      user => user.email === email || user.username === username
    );

    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'User already exists',
        message: 'Username or email is already taken'
      });
    }

    // 6. Hash the password (10 salt rounds is a good default)
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // 7. Create user object (never store plain text password!)
    const newUser = {
      id: users.length + 1,
      username,
      email,
      passwordHash: hashedPassword,  // Store only the hash
      createdAt: new Date().toISOString()
    };

    // 8. Store user in database
    users.push(newUser);

    // 9. Return success response (don't include sensitive data)
    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        createdAt: newUser.createdAt
      }
    });

  } catch (error) {
    // Handle any unexpected errors
    console.error('Registration error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'An error occurred during registration'
    });
  }
});

// Optional: Login endpoint example for demonstration
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Find user by email
    const user = users.find(user => user.email === email);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Compare password with stored hash
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    return res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app; // For testing purposes