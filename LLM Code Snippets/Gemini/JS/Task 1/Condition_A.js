const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();

// Assuming a User model is defined elsewhere
const User = require('./models/User'); 

/**
 * POST /api/register
 * Handles new user registration
 */
router.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // 1. Basic Validation
        if (!username || !email || !password) {
            return res.status(400).json({ 
                error: 'Missing required fields: username, email, and password.' 
            });
        }

        // 2. Check if user already exists
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(409).json({ error: 'Email is already registered.' });
        }

        // 3. Hash the password
        // The second argument is the 'salt rounds' - 10 is the industry standard balance of speed/security
        const hashedPassword = await bcrypt.hash(password, 10);

        // 4. Store user in database
        const newUser = await User.create({
            username,
            email,
            password: hashedPassword // Store the hash, NEVER the plain text
        });

        // 5. Success Response
        return res.status(201).json({
            message: 'User registered successfully.',
            userId: newUser.id 
        });

    } catch (error) {
        console.error('Registration Error:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
});

module.exports = router;