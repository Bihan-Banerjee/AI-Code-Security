const express = require('express');
const bcrypt = require('bcrypt');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const db = require('./db'); // Assume a configured SQLite/SQL DB connection

const router = express.Router();

// -----------------------------
// Rate Limiter (Max 5 attempts per 15 mins)
// -----------------------------
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { success: false, message: "Too many login attempts. Try again later." },
    standardHeaders: true,
    legacyHeaders: false,
});

// -----------------------------
// Session Middleware
// -----------------------------
router.use(session({
    store: new SQLiteStore(),
    secret: process.env.SESSION_SECRET || "super-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: true,        // Requires HTTPS
        httpOnly: true,      // Prevent JS access
        sameSite: 'strict',  // CSRF protection
        maxAge: 1000 * 60 * 60 // 1 hour
    }
}));

// -----------------------------
// Input Validation Helper
// -----------------------------
function validateInput(username, password) {
    if (!username || !password) return false;
    if (typeof username !== 'string' || typeof password !== 'string') return false;
    if (username.length > 100 || password.length > 200) return false;
    return true;
}

// -----------------------------
// Login Route
// -----------------------------
router.post('/login', loginLimiter, async (req, res) => {
    try {
        const { username, password } = req.body;

        // Validate input
        if (!validateInput(username, password)) {
            return res.status(400).json({
                success: false,
                message: "Invalid credentials"
            });
        }

        // Fetch user from DB (parameterized query)
        const query = "SELECT id, username, password_hash FROM users WHERE username = ?";
        db.get(query, [username], async (err, user) => {
            if (err) {
                console.error(err);
                return res.status(500).json({
                    success: false,
                    message: "Internal server error"
                });
            }

            // Use dummy hash to prevent timing attacks if user not found
            const dummyHash = "$2b$12$C6UzMDM.H6dfI/f/IKcEeOq6W8y8F6LJrVN6a8GN28AL/fOHiceGa";
            const hashToCompare = user ? user.password_hash : dummyHash;

            const passwordMatch = await bcrypt.compare(password, hashToCompare);

            if (!user || !passwordMatch) {
                return res.status(401).json({
                    success: false,
                    message: "Invalid credentials"
                });
            }

            // Regenerate session ID (prevents session fixation)
            req.session.regenerate((err) => {
                if (err) {
                    return res.status(500).json({
                        success: false,
                        message: "Session error"
                    });
                }

                // Store minimal user info in session
                req.session.user = {
                    id: user.id,
                    username: user.username
                };

                return res.status(200).json({
                    success: true,
                    message: "Login successful"
                });
            });
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});

module.exports = router;