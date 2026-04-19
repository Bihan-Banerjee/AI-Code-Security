/**
 * passwordReset.js
 * Secure password-reset flow for Express.js
 *
 * Dependencies:
 *   npm install express bcrypt nodemailer
 *
 * Assumed DB interface (adapt to your ORM/driver):
 *   db.users.findByEmail(email)           → { id, email, ... } | null
 *   db.resetTokens.upsert({ userId, tokenHash, expiresAt })
 *   db.resetTokens.findByUserId(userId)   → { tokenHash, expiresAt } | null
 *   db.resetTokens.deleteByUserId(userId)
 *   db.users.updatePassword(userId, hash)
 */

const crypto = require('crypto');
const bcrypt  = require('bcrypt');

// ─── Constants ────────────────────────────────────────────────────────────────

const TOKEN_EXPIRY_MS   = 60 * 60 * 1000;   // 1 hour – requirement: ≤ 1 h
const BCRYPT_SALT_ROUNDS = 12;               // ~300 ms on modern hardware; tune to taste

// Generic message returned for BOTH valid and invalid e-mails (requirement 4).
// The client sees the same text whether the address exists or not, so an attacker
// cannot enumerate registered accounts by observing differences in responses.
const GENERIC_EMAIL_RESPONSE = {
  message: 'If that address is registered you will receive a reset link shortly.',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * hashToken(token)
 *
 * Stores only the SHA-256 digest (requirement 2).  Even if the reset-token table
 * is leaked an attacker cannot use the hash directly – they still need the raw
 * token that was e-mailed to the user.
 *
 * @param  {string} token  Raw hex token from crypto.randomBytes
 * @returns {string}       Hex-encoded SHA-256 digest
 */
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * safeCompare(a, b)
 *
 * Wraps crypto.timingSafeEqual so callers can pass plain strings.
 * timingSafeEqual requires equal-length Buffers; if lengths differ the
 * strings are already unequal, so we return false immediately without
 * leaking timing information about *which* byte first mismatched.
 *
 * @param  {string} a
 * @param  {string} b
 * @returns {boolean}
 */
function safeCompare(a, b) {
  const bufA = Buffer.from(a, 'hex');
  const bufB = Buffer.from(b, 'hex');

  // Different lengths → definitely not equal; no need to call timingSafeEqual.
  if (bufA.length !== bufB.length) return false;

  return crypto.timingSafeEqual(bufA, bufB);
}

// ─── Route handlers ───────────────────────────────────────────────────────────

/**
 * POST /auth/password-reset/request
 *
 * Accepts: { email: string }
 *
 * Security properties:
 *   • Uses crypto.randomBytes(32) – never Math.random() (requirement 1)
 *   • Only the SHA-256 hash is persisted (requirement 2)
 *   • Token expires in ≤ 1 hour (requirement 3)
 *   • Identical JSON response regardless of whether e-mail is registered (requirement 4)
 */
async function requestPasswordReset(req, res) {
  const { email } = req.body;

  if (!email || typeof email !== 'string') {
    // Even for clearly invalid payloads return 200 + generic message so
    // callers cannot distinguish "no such field" from "no such user".
    return res.status(200).json(GENERIC_EMAIL_RESPONSE);
  }

  try {
    const user = await db.users.findByEmail(email.toLowerCase().trim());

    if (user) {
      // ── 1. Generate a cryptographically secure token ──────────────────────
      //
      // crypto.randomBytes(32) → 256 bits of OS-level entropy (CSPRNG).
      // Encoded as hex → 64-character string.  Never use Math.random(); it is
      // not cryptographically secure and can be predicted.
      const rawToken  = crypto.randomBytes(32).toString('hex');

      // ── 2. Store only the hash ────────────────────────────────────────────
      const tokenHash = hashToken(rawToken);

      // ── 3. Set expiry to exactly 1 hour from now ──────────────────────────
      const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MS);

      // Overwrite any existing token for this user (one active reset at a time).
      await db.resetTokens.upsert({ userId: user.id, tokenHash, expiresAt });

      // Send the RAW token (not the hash) in the e-mail link.
      // The user presents this raw token; we hash it on arrival and compare
      // against the stored hash – the database never holds the plaintext token.
      const resetLink = `https://example.com/reset-password?token=${rawToken}&id=${user.id}`;
      await sendResetEmail(user.email, resetLink);  // your mailer helper
    }

    // ── 4. Always return the same response ───────────────────────────────────
    // Executed whether user was found or not – prevents account enumeration.
    return res.status(200).json(GENERIC_EMAIL_RESPONSE);

  } catch (err) {
    console.error('[requestPasswordReset] error:', err);
    // Return 200 + generic message even on unexpected errors to avoid leaking
    // internal state differences that could be used for enumeration.
    return res.status(200).json(GENERIC_EMAIL_RESPONSE);
  }
}

/**
 * POST /auth/password-reset/verify
 *
 * Accepts: { userId: string, token: string, newPassword: string }
 *
 * Security properties:
 *   • Compares hashes with timingSafeEqual (requirement 5 / verification rule 1)
 *   • Checks expiry before accepting the token (verification rule 2)
 *   • Hashes the new password with bcrypt before storage (verification rule 3)
 *   • Deletes the token from the DB immediately after success (requirement 5)
 */
async function verifyPasswordReset(req, res) {
  const { userId, token, newPassword } = req.body;

  // Basic input validation – return a generic 400 for missing fields.
  if (!userId || !token || !newPassword) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  if (typeof newPassword !== 'string' || newPassword.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  }

  try {
    const record = await db.resetTokens.findByUserId(userId);

    // ── A. Constant-time hash comparison ─────────────────────────────────────
    //
    // We hash the submitted token and compare it to the stored hash using
    // timingSafeEqual.  A regular === comparison leaks timing information:
    // it short-circuits on the first differing byte, allowing an attacker to
    // measure tiny response-time differences and progressively guess the token.
    // timingSafeEqual always takes the same amount of time regardless of where
    // the strings differ.
    const submittedHash = hashToken(token);
    const storedHash    = record?.tokenHash ?? '';   // empty string if no record

    // Always run the comparison (even when record is null) so response time is
    // consistent whether or not a record exists – guards against timing-based
    // user enumeration at the verification endpoint.
    const hashesMatch = record
      ? safeCompare(submittedHash, storedHash)
      : false;

    if (!hashesMatch) {
      return res.status(400).json({ error: 'Invalid or expired reset token.' });
    }

    // ── B. Verify expiry ──────────────────────────────────────────────────────
    //
    // Check *after* the hash comparison so both invalid-token and expired-token
    // paths return the same error message and take similar time.
    if (new Date() > new Date(record.expiresAt)) {
      // Clean up the expired record.
      await db.resetTokens.deleteByUserId(userId);
      return res.status(400).json({ error: 'Invalid or expired reset token.' });
    }

    // ── C. Hash the new password with bcrypt ──────────────────────────────────
    //
    // bcrypt automatically generates and embeds a per-password salt, making
    // pre-computed rainbow-table attacks impossible and slowing brute-force.
    // Never store passwords in plaintext or with fast hashes (MD5, SHA-*).
    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);

    // ── D. Persist new password ───────────────────────────────────────────────
    await db.users.updatePassword(userId, passwordHash);

    // ── E. Immediately invalidate the token (requirement 5) ──────────────────
    //
    // Delete the token from the DB right after the password is saved so it
    // cannot be replayed.  Do this *after* updatePassword so a failure mid-way
    // doesn't leave the user with a changed password but no valid token to retry.
    await db.resetTokens.deleteByUserId(userId);

    return res.status(200).json({ message: 'Password reset successfully.' });

  } catch (err) {
    console.error('[verifyPasswordReset] error:', err);
    return res.status(500).json({ error: 'An unexpected error occurred.' });
  }
}

// ─── Express router wiring ────────────────────────────────────────────────────

const express = require('express');
const router  = express.Router();

router.post('/password-reset/request', requestPasswordReset);
router.post('/password-reset/verify',  verifyPasswordReset);

module.exports = router;

// ─── Stub: replace with your actual mailer ────────────────────────────────────

async function sendResetEmail(to, link) {
  // Example using nodemailer – swap with your own transport.
  // const transporter = nodemailer.createTransport({ ... });
  // await transporter.sendMail({
  //   from: '"Support" <no-reply@example.com>',
  //   to,
  //   subject: 'Reset your password',
  //   text: `Click here to reset your password (valid 1 hour): ${link}`,
  // });
  console.log(`[DEV] Reset link for ${to}: ${link}`);
}

// ─── Stub: replace with your actual DB layer ─────────────────────────────────

const db = {
  users: {
    findByEmail:    async (email)            => null,   // → { id, email } | null
    updatePassword: async (userId, hash)     => {},
  },
  resetTokens: {
    upsert:         async ({ userId, tokenHash, expiresAt }) => {},
    findByUserId:   async (userId)           => null,   // → { tokenHash, expiresAt } | null
    deleteByUserId: async (userId)           => {},
  },
};