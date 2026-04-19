/**
 * login.js — Express.js User Login with Session Management
 *
 * Dependencies:
 *   npm install express express-session bcryptjs express-rate-limit
 *
 * Optional (production DB example):
 *   npm install pg  (for PostgreSQL)
 */

const express = require("express");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const rateLimit = require("express-rate-limit");

const router = express.Router();

// ─────────────────────────────────────────────
// 1.  Mock database (replace with real DB call)
// ─────────────────────────────────────────────

/**
 * Simulated user store.
 * In production, query your database instead:
 *
 *   const { rows } = await pool.query(
 *     "SELECT * FROM users WHERE username = $1",
 *     [username]
 *   );
 *   const user = rows[0];
 */
const MOCK_USERS = [
  {
    id: 1,
    username: "nethra",
    // bcrypt hash of "password123"
    passwordHash: "$2a$12$KIXbQv6yqCq1W0mzRJhXB.2GV7mKb1ZWzNqE4vYpjFhOGxNjB9qCa",
    role: "admin",
    email: "nethra@example.com",
  },
  {
    id: 2,
    username: "student",
    passwordHash: "$2a$12$KIXbQv6yqCq1W0mzRJhXB.2GV7mKb1ZWzNqE4vYpjFhOGxNjB9qCa",
    role: "user",
    email: "student@example.com",
  },
];

/**
 * Lookup user by username from your data store.
 * @param {string} username
 * @returns {Promise<object|null>}
 */
async function findUserByUsername(username) {
  // ── Replace this block with a real DB query ──────────────────
  return MOCK_USERS.find(
    (u) => u.username.toLowerCase() === username.toLowerCase()
  ) || null;
  // ─────────────────────────────────────────────────────────────
}

// ─────────────────────────────────────────────
// 2.  Session middleware (mount in your app.js)
// ─────────────────────────────────────────────

/**
 * Call this once in your main app file:
 *   app.use(sessionMiddleware);
 */
const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || "change-me-in-production",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,          // JS cannot access the cookie
    secure: process.env.NODE_ENV === "production", // HTTPS only in prod
    sameSite: "strict",      // CSRF protection
    maxAge: 1000 * 60 * 60,  // 1 hour (milliseconds)
  },
});

// ─────────────────────────────────────────────
// 3.  Rate limiter — brute-force protection
// ─────────────────────────────────────────────

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15-minute window
  max: 10,                   // max attempts per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many login attempts. Please try again after 15 minutes.",
  },
});

// ─────────────────────────────────────────────
// 4.  Input validation helper
// ─────────────────────────────────────────────

/**
 * Returns an error string if input is invalid, otherwise null.
 * @param {string} username
 * @param {string} password
 * @returns {string|null}
 */
function validateLoginInput(username, password) {
  if (!username || typeof username !== "string" || username.trim() === "") {
    return "Username is required.";
  }
  if (!password || typeof password !== "string" || password.length === 0) {
    return "Password is required.";
  }
  if (username.trim().length > 50) {
    return "Username must be 50 characters or fewer.";
  }
  if (password.length > 128) {
    return "Password must be 128 characters or fewer.";
  }
  return null;
}

// ─────────────────────────────────────────────
// 5.  POST /login — main handler
// ─────────────────────────────────────────────

/**
 * POST /login
 *
 * Request body (JSON):
 *   { "username": "nethra", "password": "password123" }
 *
 * Success response (200):
 *   {
 *     "success": true,
 *     "message": "Login successful.",
 *     "user": { "id": 1, "username": "nethra", "role": "admin" }
 *   }
 *
 * Failure responses:
 *   400 — missing / invalid input
 *   401 — wrong credentials
 *   429 — rate limited
 *   500 — server error
 */
router.post("/login", loginLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;

    // ── 5a. Validate input ─────────────────────────────────────
    const validationError = validateLoginInput(username, password);
    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    // ── 5b. Look up user ────────────────────────────────────────
    const user = await findUserByUsername(username.trim());

    // ── 5c. Verify password (always run bcrypt to prevent timing attacks) ──
    //   If no user is found we compare against a dummy hash so the response
    //   time is indistinguishable from a real password mismatch.
    const dummyHash =
      "$2a$12$invalidhashfortimingprotectionxxxxxxxxxxxxxxxxxxxxxxxx";
    const hashToCompare = user ? user.passwordHash : dummyHash;
    const passwordMatch = await bcrypt.compare(password, hashToCompare);

    if (!user || !passwordMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid username or password.",
      });
    }

    // ── 5d. Regenerate session (prevents session fixation) ──────
    req.session.regenerate((err) => {
      if (err) {
        console.error("Session regeneration error:", err);
        return res.status(500).json({
          success: false,
          message: "An internal error occurred. Please try again.",
        });
      }

      // ── 5e. Store safe user data in session ───────────────────
      req.session.user = {
        id:       user.id,
        username: user.username,
        role:     user.role,
        email:    user.email,
      };
      req.session.loginAt = new Date().toISOString();

      // ── 5f. Save session then respond ─────────────────────────
      req.session.save((saveErr) => {
        if (saveErr) {
          console.error("Session save error:", saveErr);
          return res.status(500).json({
            success: false,
            message: "An internal error occurred. Please try again.",
          });
        }

        return res.status(200).json({
          success: true,
          message: "Login successful.",
          user: {
            id:       user.id,
            username: user.username,
            role:     user.role,
          },
        });
      });
    });
  } catch (error) {
    console.error("Unexpected login error:", error);
    return res.status(500).json({
      success: false,
      message: "An internal server error occurred.",
    });
  }
});

// ─────────────────────────────────────────────
// 6.  POST /logout
// ─────────────────────────────────────────────

router.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Session destruction error:", err);
      return res.status(500).json({
        success: false,
        message: "Could not log out. Please try again.",
      });
    }
    res.clearCookie("connect.sid"); // default cookie name for express-session
    return res.status(200).json({
      success: true,
      message: "Logged out successfully.",
    });
  });
});

// ─────────────────────────────────────────────
// 7.  Authentication middleware (reusable guard)
// ─────────────────────────────────────────────

/**
 * Attach to any route that requires a logged-in user:
 *   router.get("/dashboard", requireAuth, dashboardHandler);
 */
function requireAuth(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  return res.status(401).json({
    success: false,
    message: "Authentication required. Please log in.",
  });
}

/**
 * Role-based guard factory:
 *   router.delete("/admin/user/:id", requireRole("admin"), deleteUserHandler);
 */
function requireRole(role) {
  return (req, res, next) => {
    if (req.session?.user?.role === role) {
      return next();
    }
    return res.status(403).json({
      success: false,
      message: "You do not have permission to access this resource.",
    });
  };
}

// ─────────────────────────────────────────────
// 8.  Exports
// ─────────────────────────────────────────────

module.exports = {
  router,           // mount with:  app.use("/auth", router)
  sessionMiddleware,
  requireAuth,
  requireRole,
};