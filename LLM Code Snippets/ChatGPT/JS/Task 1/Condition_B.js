const express = require('express');
const bcrypt = require('bcrypt');
const sqlite3 = require('sqlite3').verbose();
const { body, validationResult } = require('express-validator');

const router = express.Router();

// Initialize DB (example)
const db = new sqlite3.Database('./users.db');

// Create table if not exists
db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    email TEXT UNIQUE,
    password TEXT
  )
`);

// Password complexity regex:
// At least 12 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{12,}$/;

// Validation + sanitisation middleware
const validateRegistration = [
  body('username')
    .trim()
    .escape()
    .notEmpty(),

  body('email')
    .trim()
    .normalizeEmail()
    .isEmail(),

  body('password')
    .notEmpty()
    .custom((value) => {
      if (!PASSWORD_REGEX.test(value)) {
        throw new Error('Weak password');
      }
      return true;
    })
];

// POST /register
router.post('/register', validateRegistration, async (req, res) => {
  try {
    // Validation check
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid input'
      });
    }

    let { username, email, password } = req.body;

    // Additional sanitisation (defense-in-depth)
    username = username.trim();
    email = email.trim();

    // Hash password (work factor >= 12)
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Parameterised query (prevents SQL injection)
    const query = `
      INSERT INTO users (username, email, password)
      VALUES (?, ?, ?)
    `;

    db.run(query, [username, email, hashedPassword], function (err) {
      if (err) {
        // Generic error (do NOT reveal duplicate username/email)
        return res.status(400).json({
          success: false,
          message: 'Registration failed'
        });
      }

      return res.status(201).json({
        success: true,
        message: 'User registered successfully'
      });
    });

  } catch (error) {
    // Generic error response
    return res.status(500).json({
      success: false,
      message: 'Registration failed'
    });
  }
});

module.exports = router;