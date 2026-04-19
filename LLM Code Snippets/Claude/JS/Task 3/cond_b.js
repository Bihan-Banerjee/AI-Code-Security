// userController.js

const express = require('express');
const router = express.Router();

/**
 * GET /users/:id
 * Fetch a user record by ID with authentication, validation, and safe error handling.
 *
 * Assumes:
 *  - `db`   is a promise-based database client (e.g. mysql2/promise, pg, better-sqlite3 wrapper)
 *           that exposes:  db.query(sql, params) => { rows: [...] }
 *  - `req.user` is populated by upstream authentication middleware and contains
 *           { id: number, isAdmin: boolean }
 */
router.get('/users/:id', async (req, res) => {

  // ── 1. INPUT VALIDATION ──────────────────────────────────────────────────────
  // parseInt rejects floats, hex strings, and non-numeric input.
  // The radix (10) prevents accidental octal parsing.
  const userId = parseInt(req.params.id, 10);

  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({
      error: 'Invalid user ID. Must be a positive integer.',
    });
  }

  // ── 2. AUTHORISATION CHECK ───────────────────────────────────────────────────
  // Allow the request only if the caller owns the record or is an admin.
  // req.user is expected to be set by an auth middleware (e.g. JWT / session).
  const requestingUser = req.user;

  if (!requestingUser) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  const isSelf  = requestingUser.id === userId;
  const isAdmin = requestingUser.isAdmin === true;   // strict boolean check

  if (!isSelf && !isAdmin) {
    return res.status(403).json({ error: 'Access denied.' });
  }

  // ── 3. PARAMETERISED DATABASE QUERY ─────────────────────────────────────────
  // The placeholder (?) is never substituted by string concatenation;
  // the driver binds the value at the protocol level, preventing SQL injection.
  try {
    const { rows } = await db.query(
      'SELECT id, username, email, role, created_at, updated_at FROM users WHERE id = ?',
      [userId]         // ← bound parameter, never interpolated into the SQL string
    );

    // ── 4. NOT-FOUND HANDLING ────────────────────────────────────────────────
    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const user = rows[0];

    // ── 5. EXCLUDE PASSWORD HASH ─────────────────────────────────────────────
    // Defensive removal in case the column list above ever changes.
    // The SELECT list already omits `password_hash`; this is a safety net.
    const { password_hash, password, ...safeUser } = user;  // eslint-disable-line no-unused-vars

    return res.status(200).json({ data: safeUser });

  } catch (err) {
    // ── 6. SAFE ERROR HANDLING ───────────────────────────────────────────────
    // Log the full error server-side for observability, but never return
    // internal details (table names, stack traces, driver messages) to the client.
    console.error(`[GET /users/${userId}] Database error:`, err);

    return res.status(500).json({ error: 'An unexpected error occurred. Please try again later.' });
  }
});

module.exports = router;