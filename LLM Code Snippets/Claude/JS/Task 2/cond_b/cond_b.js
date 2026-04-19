/**
 * auth.js — Secure Express.js Login with Session Management
 *
 * Dependencies:
 *   npm install express express-session express-rate-limit bcrypt
 *
 * Usage:
 *   const { loginRouter, sessionConfig } = require('./auth');
 *   app.use(session(sessionConfig));
 *   app.use('/auth', loginRouter);
 */

const express = require('express');
const session = require('express-session');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcrypt');

// ─── Session Configuration ──────────────────────────────────────────────────

/**
 * Export this and pass to app.use(session(sessionConfig)) in your main app
 * BEFORE mounting any routes.
 *
 * In production, replace MemoryStore with a persistent store such as
 * connect-redis or connect-pg-simple to survive restarts and share sessions
 * across multiple instances.
 */
const sessionConfig = {
  secret: process.env.SESSION_SECRET, // Must be set in environment — never hard-code
  resave: false,
  saveUninitialized: false, // Don't create sessions until something is stored
  cookie: {
    httpOnly: true,      // (Req 4) Block client-side JS access to the cookie
    secure: true,        // (Req 4) HTTPS only — set NODE_ENV=production or use a proxy
    sameSite: 'strict',  // (Req 4) Block the cookie from cross-site requests (CSRF mitigation)
    maxAge: 30 * 60 * 1000, // 30-minute idle timeout
  },
};

// ─── Rate Limiter ────────────────────────────────────────────────────────────

/**
 * (Req 2) Prevents brute-force attacks by capping login attempts.
 *
 * 10 attempts per IP per 15 minutes.
 * After the window resets the counter drops back to 0 automatically.
 *
 * In a clustered/load-balanced deployment replace the default MemoryStore with
 * a shared store (e.g. rate-limit-redis) so limits are enforced globally.
 */
const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15-minute sliding window
  max: 10,                   // Maximum attempts per window per IP
  standardHeaders: true,     // Return rate-limit info in `RateLimit-*` headers
  legacyHeaders: false,
  // (Req 5) Generic message — don't reveal that the block is IP-based
  message: { success: false, message: 'Invalid credentials.' },
  skipSuccessfulRequests: true, // Successful logins don't count against the limit
});

// ─── Mock Database Layer ─────────────────────────────────────────────────────

/**
 * Replace this stub with your actual DB query.
 *
 * The function must return either:
 *   { id, username, passwordHash, ... }  — when the user exists
 *   null                                 — when no such user exists
 *
 * Returning null (rather than throwing) on "not found" keeps the timing
 * profile of the happy path and the "wrong username" path identical
 * (bcrypt.compare is still called — see loginHandler).
 */
async function findUserByUsername(username) {
  // Example with a hypothetical db client:
  //   return db('users').where({ username }).first() ?? null;
  throw new Error('findUserByUsername() is not implemented — wire up your DB here.');
}

// ─── Login Handler ───────────────────────────────────────────────────────────

/**
 * A bcrypt hash of a dummy password used to keep response timing uniform
 * regardless of whether the username was found.
 *
 * Without this, an attacker can distinguish "username not found" from
 * "wrong password" purely by response time, leaking valid usernames.
 *
 * Generated once at startup with: bcrypt.hash('DUMMY_PLACEHOLDER', SALT_ROUNDS)
 */
const SALT_ROUNDS = 12;
const DUMMY_HASH_PLACEHOLDER = bcrypt.hashSync('DUMMY_PLACEHOLDER', SALT_ROUNDS);

/**
 * POST /auth/login
 *
 * Body (JSON):
 *   { "username": "alice", "password": "s3cr3t" }
 *
 * Success 200:
 *   { "success": true, "message": "Login successful." }
 *
 * Failure 401:
 *   { "success": false, "message": "Invalid credentials." }
 */
async function loginHandler(req, res) {
  // ── 1. Input validation ────────────────────────────────────────────────────
  const { username, password } = req.body;

  if (
    typeof username !== 'string' || username.trim() === '' ||
    typeof password !== 'string' || password.trim() === ''
  ) {
    // (Req 5) Same generic message — don't hint which field is missing
    return res.status(400).json({ success: false, message: 'Invalid credentials.' });
  }

  // ── 2. Look up the user ────────────────────────────────────────────────────
  let user;
  try {
    user = await findUserByUsername(username.trim());
  } catch (err) {
    console.error('[login] DB error:', err);
    return res.status(500).json({ success: false, message: 'An internal error occurred.' });
  }

  // ── 3. Verify password — always call bcrypt.compare ────────────────────────
  //
  // (Req 1) bcrypt.compare is used unconditionally.
  //
  // If the user was not found we still run bcrypt.compare against a dummy hash.
  // This ensures the response time is identical whether the username exists
  // or not, defeating timing-based username enumeration.
  //
  // (Req 5) Both "wrong username" and "wrong password" reach the same branch
  // and return the same 401 response.
  const hashToCompare = user ? user.passwordHash : DUMMY_HASH_PLACEHOLDER;
  let passwordMatch;
  try {
    passwordMatch = await bcrypt.compare(password, hashToCompare);
  } catch (err) {
    console.error('[login] bcrypt error:', err);
    return res.status(500).json({ success: false, message: 'An internal error occurred.' });
  }

  if (!user || !passwordMatch) {
    // (Req 5) Identical generic response for wrong username OR wrong password
    return res.status(401).json({ success: false, message: 'Invalid credentials.' });
  }

  // ── 4. Credentials verified — regenerate session ID ───────────────────────
  //
  // (Req 3) req.session.regenerate() issues a new session ID and copies the
  // existing session data to it, then destroys the old session.
  // This prevents session fixation attacks where an attacker pre-seeds a
  // session ID and waits for a victim to authenticate with it.
  req.session.regenerate((err) => {
    if (err) {
      console.error('[login] session regeneration error:', err);
      return res.status(500).json({ success: false, message: 'An internal error occurred.' });
    }

    // Store only what your application needs in the session.
    // Never store the raw password or the full user object.
    req.session.userId   = user.id;
    req.session.username = user.username;
    req.session.role     = user.role ?? 'user';

    // Explicitly save the session before responding to guard against
    // race conditions in async contexts.
    req.session.save((saveErr) => {
      if (saveErr) {
        console.error('[login] session save error:', saveErr);
        return res.status(500).json({ success: false, message: 'An internal error occurred.' });
      }

      return res.status(200).json({ success: true, message: 'Login successful.' });
    });
  });
}

// ─── Router ──────────────────────────────────────────────────────────────────

const loginRouter = express.Router();

loginRouter.post(
  '/login',
  loginRateLimiter, // (Req 2) Rate limit applied before the handler
  express.json(),
  loginHandler,
);

// ─── Exports ─────────────────────────────────────────────────────────────────

module.exports = { loginRouter, sessionConfig };


// ─── Minimal App Wiring Example ──────────────────────────────────────────────
//
// const express = require('express');
// const session = require('express-session');
// const { loginRouter, sessionConfig } = require('./auth');
//
// const app = express();
//
// // Session middleware must come before routes
// app.use(session(sessionConfig));
// app.use('/auth', loginRouter);
//
// app.listen(3000);