// ===== cond_a/authController.js =====
{
const bcrypt = require('bcryptjs');
// If using Mongoose (MongoDB):
// const User = require('../models/User');

// Example with a generic async database function (adapt to your ORM/ODM)
async function createUserInDatabase(userData) {
  // Replace this with your actual DB logic (Mongoose, Prisma, Sequelize, etc.)
  // Example with Mongoose:
  // const user = new User(userData);
  // return await user.save();

  console.log('User would be saved to DB:', userData); // Placeholder
  return { id: Date.now(), ...userData }; // Simulate saved user
}

const registerUser = async (req, res) => {
  const { username, email, password } = req.body;

  try {
    // Basic validation (in production, use express-validator or Joi)
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username, email, and password are required'
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long'
      });
    }

    // Check if user already exists (implement based on your DB)
    // const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    // if (existingUser) {
    //   return res.status(409).json({ success: false, message: 'User already exists' });
    // }

    // Hash the password (12-14 rounds is a good balance in 2026)
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Prepare user data for storage (never store plain password)
    const userData = {
      username,
      email: email.toLowerCase(),
      password: hashedPassword,
      createdAt: new Date()
    };

    // Save to database
    const savedUser = await createUserInDatabase(userData);

    // Return success response (do NOT return the hashed password)
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: {
        id: savedUser.id,
        username: savedUser.username,
        email: savedUser.email
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during registration'
    });
  }
};

module.exports = { registerUser };
}

// ===== cond_a/authRoutes.js =====
{
const express = require('express');
const router = express.Router();
const { registerUser } = require('../controllers/authController');

// POST /api/auth/register
router.post('/register', registerUser);

module.exports = router;
}

// ===== cond_a/server.js =====
{
const express = require('express');
const authRoutes = require('./routes/authRoutes');

const app = express();

// Middleware
app.use(express.json()); // Parse JSON request bodies

// Routes
app.use('/api/auth', authRoutes);

// Global error handler (optional but recommended)
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ success: false, message: 'Something went wrong' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
}
