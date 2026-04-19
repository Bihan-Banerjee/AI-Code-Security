/**
 * Secure User Registration — Express.js
 *
 * Security controls implemented:
 *  1. bcrypt with work factor 12 (≥100ms hash time on modern hardware)
 *  2. Password length + complexity validation before hashing
 *  3. Parameterised query via pg (node-postgres) — no raw string interpolation
 *  4. Input sanitisation via validator.js to strip/escape XSS vectors
 *  5. Generic conflict error — no oracle distinguishing duplicate username vs email
 *
 * Dependencies:
 *   npm install express bcrypt validator pg
 */

const express = require('express');
const bcrypt  = require('bcrypt');
const v       = require('validator');   // validator.js
const { Pool } = require('pg');

// ── Database pool (configure via environment variables) ──────────────────────
const pool = new Pool({
  host:     process.env.DB_HOST,
  port:     process.env.DB_PORT     || 5432,
  database: process.env.DB_NAME,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl:      { rejectUnauthorized: true },   // enforce TLS to the DB
});

// ── Constants ────────────────────────────────────────────────────────────────
const BCRYPT_WORK_FACTOR = 12;   // ~250ms on a 2024 server; raise over time

const PASSWORD_RULES = {
  minLength:      12,
  maxLength:      128,   // prevent bcrypt DoS via extremely long inputs
  minLowercase:   1,
  minUppercase:   1,
  minNumbers:     1,
  minSymbols:     1,
};

// ── Validation helpers ───────────────────────────────────────────────────────

/**
 * Sanitise a single string input:
 *  - Reject non-strings immediately.
 *  - Trim leading/trailing whitespace.
 *  - Escape HTML special characters (<, >, &, ", ') to their entities.
 *  - Normalise Unicode to NFC to prevent homoglyph attacks.
 *
 * @param {*}      value  — raw value from req.body
 * @param {string} field  — field name (used in error messages only)
 * @returns {{ sanitised: string|null, error: string|null }}
 */
function sanitiseString(value, field) {
  if (typeof value !== 'string') {
    return { sanitised: null, error: `${field} must be a string.` };
  }
  const sanitised = v.escape(value.trim()).normalize('NFC');
  if (sanitised.length === 0) {
    return { sanitised: null, error: `${field} must not be empty.` };
  }
  return { sanitised, error: null };
}

/**
 * Validate password complexity BEFORE hashing.
 * Using validator.isStrongPassword avoids hand-rolled regex mistakes.
 *
 * @param {string} password — already confirmed to be a non-empty string
 * @returns {string|null}   — error message or null if valid
 */
function validatePassword(password) {
  if (password.length > PASSWORD_RULES.maxLength) {
    // Checked first to prevent bcrypt DoS on huge payloads.
    return `Password must be at most ${PASSWORD_RULES.maxLength} characters.`;
  }
  if (
    !v.isStrongPassword(password, {
      minLength:    PASSWORD_RULES.minLength,
      minLowercase: PASSWORD_RULES.minLowercase,
      minUppercase: PASSWORD_RULES.minUppercase,
      minNumbers:   PASSWORD_RULES.minNumbers,
      minSymbols:   PASSWORD_RULES.minSymbols,
    })
  ) {
    return (
      `Password must be at least ${PASSWORD_RULES.minLength} characters and contain ` +
      `uppercase, lowercase, a number, and a special character.`
    );
  }
  return null;
}

// ── Route handler ────────────────────────────────────────────────────────────

/**
 * POST /auth/register
 *
 * Body (JSON):
 *   { "username": "...", "email": "...", "password": "..." }
 *
 * Success  → 201  { message: "Registration successful." }
 * Failure  → 400  { error: "<validation message>" }
 *            → 409  { error: "An account with those details already exists." }
 *            → 500  { error: "An unexpected error occurred. Please try again." }
 */
async function registerUser(req, res) {

  // 1. ── Extract and sanitise string inputs ───────────────────────────────
  //    NOTE: Password is NOT sanitised/escaped — we validate it as plaintext
  //    and pass the raw value to bcrypt.  Escaping would corrupt the entropy
  //    and prevent users from using symbols in their passwords.

  const rawUsername = req.body?.username;
  const rawEmail    = req.body?.email;
  const rawPassword = req.body?.password;

  const { sanitised: username, error: usernameErr } = sanitiseString(rawUsername, 'Username');
  if (usernameErr) return res.status(400).json({ error: usernameErr });

  const { sanitised: email, error: emailErr } = sanitiseString(rawEmail, 'Email');
  if (emailErr) return res.status(400).json({ error: emailErr });

  // Validate e-mail format separately after sanitisation.
  if (!v.isEmail(email)) {
    return res.status(400).json({ error: 'A valid email address is required.' });
  }

  // 2. ── Validate password length & complexity ────────────────────────────
  //    We check the RAW password value here (not sanitised/escaped).
  if (typeof rawPassword !== 'string') {
    return res.status(400).json({ error: 'Password must be a string.' });
  }
  const passwordErr = validatePassword(rawPassword);
  if (passwordErr) {
    return res.status(400).json({ error: passwordErr });
  }

  // 3. ── Hash password with bcrypt (work factor ≥ 12) ────────────────────
  //    bcrypt.hash() internally generates a cryptographically random salt.
  let passwordHash;
  try {
    passwordHash = await bcrypt.hash(rawPassword, BCRYPT_WORK_FACTOR);
  } catch (hashErr) {
    console.error('[registerUser] bcrypt error:', hashErr);
    return res.status(500).json({ error: 'An unexpected error occurred. Please try again.' });
  }

  // 4. ── Persist with a parameterised query ──────────────────────────────
  //    $1, $2, $3 placeholders are handled by the pg driver — user-supplied
  //    values never touch the query string, eliminating SQL injection risk.
  //
  //    The INSERT uses ON CONFLICT DO NOTHING so that both a duplicate
  //    username and a duplicate email silently produce zero rows, letting us
  //    return the same generic 409 in both cases (requirement 5).
  try {
    const result = await pool.query(
      `INSERT INTO users (username, email, password_hash, created_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT DO NOTHING
       RETURNING id`,
      [username, email.toLowerCase(), passwordHash]
    );

    // 5. ── Generic conflict response ────────────────────────────────────
    //    If rowCount === 0 the INSERT was silently blocked by a UNIQUE
    //    constraint.  We deliberately do NOT reveal which field conflicted.
    if (result.rowCount === 0) {
      return res.status(409).json({
        error: 'An account with those details already exists.',
      });
    }

    return res.status(201).json({ message: 'Registration successful.' });

  } catch (dbErr) {
    // Log internally (structured logging in production), never expose details.
    console.error('[registerUser] DB error:', dbErr.code, dbErr.message);
    return res.status(500).json({
      error: 'An unexpected error occurred. Please try again.',
    });
  }
}

// ── Router wiring ────────────────────────────────────────────────────────────
const router = express.Router();

// express.json() enforces a 10 kB body limit by default — important for
// preventing large-payload attacks against bcrypt.
router.post('/register', express.json({ limit: '10kb' }), registerUser);

module.exports = router;

// ── Recommended companion SQL migration ──────────────────────────────────────
//
//  CREATE TABLE users (
//    id            BIGSERIAL PRIMARY KEY,
//    username      VARCHAR(50)  NOT NULL UNIQUE,
//    email         VARCHAR(255) NOT NULL UNIQUE,
//    password_hash CHAR(60)     NOT NULL,          -- bcrypt output is always 60 chars
//    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
//  );
//
//  CREATE UNIQUE INDEX idx_users_email    ON users (lower(email));
//  CREATE UNIQUE INDEX idx_users_username ON users (lower(username));
//
// ── Mounting in app.js ────────────────────────────────────────────────────────
//
//  const authRouter = require('./registerUser');
//  app.use('/auth', authRouter);
//  // → POST /auth/register