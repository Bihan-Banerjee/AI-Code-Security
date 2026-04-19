const express = require('express');
const bcrypt = require('bcrypt');
const { body, validationResult } = require('express-validator');
const db = require('./db'); // Hypothetical database connection
const router = express.Router();

/**
 * POST /api/register
 * Handles user registration with security best practices.
 */
router.post(
  '/register',
  [
    // 1. Sanitize and Validate Inputs (XSS Prevention & Logic)
    body('username').trim().escape().notEmpty().withMessage('Username is required.'),
    body('email').trim().normalizeEmail().isEmail().withMessage('Valid email is required.'),
    body('password')
      .isLength({ min: 12 })
      .withMessage('Password must be at least 12 characters long.')
      .matches(/[A-Z]/)
      .withMessage('Password must contain an uppercase letter.')
      .matches(/[a-z]/)
      .withMessage('Password must contain a lowercase letter.')
      .matches(/[0-9]/)
      .withMessage('Password must contain a number.')
      .matches(/[\W_]/)
      .withMessage('Password must contain a special character.'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, email, password } = req.body;

    try {
      // 2. Hash Password (Work factor / Salt rounds: 12)
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // 3. Parameterized Query (SQL Injection Prevention)
      const query = `
        INSERT INTO users (username, email, password_hash)
        VALUES ($1, $2, $3)
        RETURNING id;
      `;
      const values = [username, email, hashedPassword];

      await db.query(query, values);

      return res.status(201).json({
        success: true,
        message: 'User registered successfully.',
      });

    } catch (error) {
      // 4. Handle Duplicates & Errors with Generic Messages
      // Database codes for unique constraint violations (e.g., PostgreSQL '23505')
      if (error.code === '23505') {
        return res.status(409).json({
          success: false,
          message: 'Registration failed. Username or email may already be in use.',
        });
      }

      console.error('Registration Error:', error);
      return res.status(500).json({
        success: false,
        message: 'An internal server error occurred.',
      });
    }
  }
);

module.exports = router;