// register.js — Express.js User Registration Handler
// Dependencies: npm install express bcrypt joi pg (or your DB driver)

const express = require("express");
const bcrypt  = require("bcrypt");
const Joi     = require("joi");
const { Pool } = require("pg"); // swap for mysql2 / mongoose etc.

const router = express.Router();

// ─── Database connection pool ──────────────────────────────────────────────
const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  // ssl: { rejectUnauthorized: false }  // uncomment for hosted DBs (e.g. Heroku)
});

// ─── Input validation schema ───────────────────────────────────────────────
const registerSchema = Joi.object({
  username: Joi.string()
    .alphanum()
    .min(3)
    .max(30)
    .required()
    .messages({
      "string.alphanum": "Username may only contain letters and numbers.",
      "string.min":      "Username must be at least 3 characters.",
      "string.max":      "Username must be at most 30 characters.",
    }),

  email: Joi.string()
    .email({ tlds: { allow: false } })
    .max(254)
    .required()
    .messages({
      "string.email": "Please provide a valid email address.",
    }),

  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(/[A-Z]/, "uppercase")
    .pattern(/[a-z]/, "lowercase")
    .pattern(/[0-9]/, "number")
    .pattern(/[^A-Za-z0-9]/, "special character")
    .required()
    .messages({
      "string.min":     "Password must be at least 8 characters.",
      "string.pattern.name": "Password must include at least one {#name}.",
    }),
});

// ─── Constants ─────────────────────────────────────────────────────────────
const SALT_ROUNDS = 12; // ~250 ms on modern hardware; increase for higher security

// ─── POST /api/auth/register ───────────────────────────────────────────────
/**
 * Registers a new user.
 *
 * Request body:
 *   { username: string, email: string, password: string }
 *
 * Success  → 201 { success: true,  message, user: { id, username, email, createdAt } }
 * Failure  → 400 { success: false, error, details? }
 *            409 { success: false, error }  (duplicate username / email)
 *            500 { success: false, error }
 */
router.post("/register", async (req, res) => {
  // 1. Validate input --------------------------------------------------------
  const { error, value } = registerSchema.validate(req.body, {
    abortEarly: false,   // collect ALL errors at once
    stripUnknown: true,  // silently drop extra fields
  });

  if (error) {
    const details = error.details.map((d) => d.message);
    return res.status(400).json({
      success: false,
      error:   "Validation failed.",
      details,
    });
  }

  const { username, email, password } = value;

  try {
    // 2. Check for existing username / email ---------------------------------
    const duplicate = await db.query(
      `SELECT id
       FROM   users
       WHERE  username = $1
          OR  email    = $2
       LIMIT  1`,
      [username.toLowerCase(), email.toLowerCase()]
    );

    if (duplicate.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error:   "An account with that username or email already exists.",
      });
    }

    // 3. Hash password -------------------------------------------------------
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // 4. Persist user --------------------------------------------------------
    const { rows } = await db.query(
      `INSERT INTO users (username, email, password_hash, created_at)
       VALUES ($1, $2, $3, NOW())
       RETURNING id, username, email, created_at`,
      [username.toLowerCase(), email.toLowerCase(), passwordHash]
    );

    const newUser = rows[0];

    // 5. Return sanitised response (never return the hash!) ------------------
    return res.status(201).json({
      success: true,
      message: "Account created successfully.",
      user: {
        id:        newUser.id,
        username:  newUser.username,
        email:     newUser.email,
        createdAt: newUser.created_at,
      },
    });
  } catch (err) {
    console.error("[register] Unexpected error:", err);
    return res.status(500).json({
      success: false,
      error:   "An unexpected error occurred. Please try again later.",
    });
  }
});

module.exports = router;

// ─── Optional: mount in your main app.js ──────────────────────────────────
// const authRoutes = require("./register");
// app.use("/api/auth", express.json(), authRoutes);