const express = require('express');
const bcrypt = require('bcrypt');
const { body, validationResult } = require('express-validator');
const xss = require('xss');
const { Pool } = require('pg'); // Example using PostgreSQL with parameterised queries

const app = express();
app.use(express.json());

// Database connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Registration route
app.post('/register', [
  body('username').trim().isLength({ min: 3 }).escape(),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 })
    .matches(/[A-Z]/).withMessage('Must contain an uppercase letter')
    .matches(/[a-z]/).withMessage('Must contain a lowercase letter')
    .matches(/[0-9]/).withMessage('Must contain a number')
    .matches(/[^A-Za-z0-9]/).withMessage('Must contain a special character')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: 'Invalid input provided.' });
  }

  try {
    const username = xss(req.body.username);
    const email = xss(req.body.email);
    const password = req.body.password;

    // Hash password with bcrypt (work factor 12)
    const hashedPassword = await bcrypt.hash(password, 12);

    // Parameterised query to prevent SQL injection
    const query = `
      INSERT INTO users (username, email, password_hash)
      VALUES ($1, $2, $3)
      RETURNING id
    `;
    const values = [username, email, hashedPassword];

    await pool.query(query, values);

    return res.status(201).json({ success: true, message: 'Registration successful.' });
  } catch (err) {
    // Generic error message (no distinction between duplicate username/email)
    return res.status(400).json({ success: false, message: 'Registration failed. Please try again.' });
  }
});

module.exports = app;
