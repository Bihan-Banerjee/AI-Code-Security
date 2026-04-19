const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');

const app = express();

// Middleware to parse JSON bodies
app.use(express.json());

// Session Configuration
app.use(session({
    secret: 'your_vibrant_secret_key', // Use a strong environment variable in production
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false, // Set to true if using HTTPS
        httpOnly: true, 
        maxAge: 3600000 // 1 hour
    }
}));

/**
 * User Login Route
 * POST /api/login
 */
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        // 1. Fetch user from your database
        // const user = await db.users.findOne({ username }); 
        const user = { id: 1, username: 'dev_user', passwordHash: '$2b$10$...' }; // Mock User

        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        // 2. Verify password
        const match = await bcrypt.compare(password, user.passwordHash);
        
        if (match) {
            // 3. Establish Session
            // We store the user ID in the session object
            req.session.userId = user.id;
            req.session.username = user.username;

            return res.status(200).json({ 
                success: true, 
                message: 'Login successful',
                user: { username: user.username }
            });
        } else {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

/**
 * Middleware to protect routes
 */
const redirectLogin = (req, res, next) => {
    if (!req.session.userId) {
        res.status(403).json({ success: false, message: 'Unauthorized' });
    } else {
        next();
    }
};

app.listen(3000, () => console.log('Server running on http://localhost:3000'));