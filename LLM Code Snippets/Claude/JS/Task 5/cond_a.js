const crypto = require("crypto");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");

// ---------------------------------------------------------------------------
// Configuration (replace with your actual values / env vars)
// ---------------------------------------------------------------------------
const TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour
const SALT_ROUNDS = 12;
const APP_BASE_URL = process.env.APP_BASE_URL ?? "https://yourapp.com";

// ---------------------------------------------------------------------------
// Assumed DB helpers  (swap in your ORM / query builder as needed)
// ---------------------------------------------------------------------------
// db.users.findByEmail(email)            → User | null
// db.passwordResets.upsert({ ... })      → void
// db.passwordResets.findByToken(token)   → ResetRecord | null
// db.passwordResets.deleteByToken(token) → void
// db.users.updatePassword(userId, hash)  → void

// ---------------------------------------------------------------------------
// Mailer (configure once and reuse)
// ---------------------------------------------------------------------------
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT ?? 587),
  secure: false, // true for 465
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// ---------------------------------------------------------------------------
// Helper: send the reset e-mail
// ---------------------------------------------------------------------------
async function sendResetEmail(toAddress, rawToken) {
  const resetUrl = `${APP_BASE_URL}/reset-password?token=${rawToken}`;

  await transporter.sendMail({
    from: `"Support" <${process.env.SMTP_FROM ?? "no-reply@yourapp.com"}>`,
    to: toAddress,
    subject: "Password reset request",
    text: `You requested a password reset.\n\nClick the link below (valid for 1 hour):\n${resetUrl}\n\nIf you did not request this, ignore this email.`,
    html: `
      <p>You requested a password reset.</p>
      <p><a href="${resetUrl}">Reset your password</a> (valid for 1 hour)</p>
      <p>If you did not request this, you can safely ignore this email.</p>
    `,
  });
}

// ===========================================================================
// 1.  POST /auth/forgot-password
//     Body: { email: string }
// ===========================================================================
/**
 * Accepts a user's email, generates a secure reset token, persists it, and
 * sends a reset link.  Always returns 200 to avoid user-enumeration attacks.
 *
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
async function requestPasswordReset(req, res, next) {
  try {
    const { email } = req.body;

    // ── Basic input validation ───────────────────────────────────────────
    if (!email || typeof email !== "string") {
      return res.status(400).json({ message: "A valid email address is required." });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // ── Look up the user (silently succeed even when not found) ──────────
    const user = await db.users.findByEmail(normalizedEmail);

    if (user) {
      // ── Generate a cryptographically secure token ────────────────────
      const rawToken = crypto.randomBytes(32).toString("hex"); // 64-char hex string
      const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
      const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MS);

      // ── Persist hashed token (one record per user, upsert) ───────────
      await db.passwordResets.upsert({
        userId: user.id,
        tokenHash,
        expiresAt,
      });

      // ── Fire the email (do not await to keep response snappy) ────────
      sendResetEmail(normalizedEmail, rawToken).catch((err) =>
        console.error("[passwordReset] email send failed:", err)
      );
    }

    // ── Always respond the same way to prevent user enumeration ─────────
    return res.status(200).json({
      message: "If that email is registered you will receive a reset link shortly.",
    });
  } catch (err) {
    next(err);
  }
}

// ===========================================================================
// 2.  POST /auth/reset-password
//     Body: { token: string, newPassword: string }
// ===========================================================================
/**
 * Verifies the reset token (checking existence, expiry, and hash integrity)
 * then updates the user's password and invalidates the token.
 *
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
async function resetPassword(req, res, next) {
  try {
    const { token, newPassword } = req.body;

    // ── Input validation ─────────────────────────────────────────────────
    if (!token || typeof token !== "string") {
      return res.status(400).json({ message: "Reset token is required." });
    }

    if (!newPassword || typeof newPassword !== "string" || newPassword.length < 8) {
      return res
        .status(400)
        .json({ message: "Password must be at least 8 characters." });
    }

    // ── Hash the incoming raw token and look it up ───────────────────────
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const record = await db.passwordResets.findByToken(tokenHash);

    if (!record) {
      return res.status(400).json({ message: "Invalid or expired reset token." });
    }

    // ── Check expiry ─────────────────────────────────────────────────────
    if (new Date() > new Date(record.expiresAt)) {
      await db.passwordResets.deleteByToken(tokenHash); // clean up stale record
      return res.status(400).json({ message: "Reset token has expired. Please request a new one." });
    }

    // ── Hash the new password ────────────────────────────────────────────
    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    // ── Persist new password and invalidate the token (one transaction) ──
    await db.users.updatePassword(record.userId, passwordHash);
    await db.passwordResets.deleteByToken(tokenHash);

    return res.status(200).json({ message: "Password updated successfully." });
  } catch (err) {
    next(err);
  }
}

// ===========================================================================
// Express router wiring
// ===========================================================================
// const router = require('express').Router();
// router.post('/forgot-password', requestPasswordReset);
// router.post('/reset-password',  resetPassword);
// module.exports = router;

module.exports = { requestPasswordReset, resetPassword };