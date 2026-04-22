const express = require('express');
const bcrypt = require('bcrypt');
const { body, validationResult } = require('express-validator');
const xss = require('xss');
const mysql = require('mysql2/promise'); // Using promise-based MySQL

const app = express();
app.use(express.json());

// Database connection pool (configure with your credentials)
const pool = mysql.createPool({
    host: 'localhost',
    user: 'your_user',
    password: 'your_password',
    database: 'your_database',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Helper function to sanitize inputs
const sanitizeInput = (input) => {
    if (typeof input !== 'string') return input;
    return xss(input.trim());
};

// Password complexity validation
const validatePasswordComplexity = (password) => {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    return password.length >= minLength && 
           hasUpperCase && 
           hasLowerCase && 
           hasNumbers && 
           hasSpecialChar;
};

// Registration endpoint
app.post('/api/register',
    // Validation rules
    body('username').isLength({ min: 3, max: 50 }).trim(),
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }),
    
    async (req, res) => {
        // Check validation results
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                error: 'Invalid input data' 
            });
        }
        
        try {
            // Sanitize inputs
            const username = sanitizeInput(req.body.username);
            const email = sanitizeInput(req.body.email).toLowerCase();
            const password = req.body.password; // Don't sanitize password
            
            // Validate password complexity
            if (!validatePasswordComplexity(password)) {
                return res.status(400).json({ 
                    error: 'Password must be at least 8 characters and contain uppercase, lowercase, number, and special character' 
                });
            }
            
            // Hash password with bcrypt (work factor 12)
            const saltRounds = 12;
            const hashedPassword = await bcrypt.hash(password, saltRounds);
            
            // Use parameterized query to prevent SQL injection
            const query = `
                INSERT INTO users (username, email, password_hash, created_at) 
                VALUES (?, ?, ?, NOW())
            `;
            
            const [result] = await pool.execute(query, [username, email, hashedPassword]);
            
            // Return generic success response
            return res.status(201).json({ 
                message: 'User registered successfully' 
            });
            
        } catch (error) {
            // Generic error handling - don't distinguish between duplicate username/email
            if (error.code === 'ER_DUP_ENTRY') {
                // Generic message for any duplicate entry (username or email)
                return res.status(409).json({ 
                    error: 'User already exists' 
                });
            }
            
            // Log the actual error for debugging (server-side only)
            console.error('Registration error:', error);
            
            // Generic error response
            return res.status(500).json({ 
                error: 'An error occurred during registration' 
            });
        }
    }
);

// Alternative implementation using Sequelize ORM (commented out as example)
/*
const { Sequelize, DataTypes } = require('sequelize');

const sequelize = new Sequelize('database', 'username', 'password', {
    host: 'localhost',
    dialect: 'mysql'
});

const User = sequelize.define('User', {
    username: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true
    },
    email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true
    },
    password_hash: {
        type: DataTypes.STRING(255),
        allowNull: false
    }
});

app.post('/api/register',
    body('username').isLength({ min: 3, max: 50 }).trim(),
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }),
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ error: 'Invalid input data' });
        }
        
        try {
            const username = sanitizeInput(req.body.username);
            const email = sanitizeInput(req.body.email).toLowerCase();
            const password = req.body.password;
            
            if (!validatePasswordComplexity(password)) {
                return res.status(400).json({ 
                    error: 'Password must be at least 8 characters and contain uppercase, lowercase, number, and special character' 
                });
            }
            
            const hashedPassword = await bcrypt.hash(password, 12);
            
            // ORM handles parameterization automatically
            await User.create({
                username,
                email,
                password_hash: hashedPassword
            });
            
            return res.status(201).json({ message: 'User registered successfully' });
            
        } catch (error) {
            // Sequelize unique constraint error
            if (error.name === 'SequelizeUniqueConstraintError') {
                return res.status(409).json({ error: 'User already exists' });
            }
            
            console.error('Registration error:', error);
            return res.status(500).json({ error: 'An error occurred during registration' });
        }
    }
);
*/

// Package.json dependencies required:
/*
{
  "dependencies": {
    "express": "^4.18.2",
    "bcrypt": "^5.1.1",
    "express-validator": "^7.0.1",
    "xss": "^1.0.14",
    "mysql2": "^3.6.0"
  }
}
*/

module.exports = app;