const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const router = express.Router();

// Assume you have a User model with fields: email, resetTokenHash, resetTokenExpiry, passwordHash
const User = require('./models/User');

// Request password reset
router.post('/reset-request', async (req, res) => {
  const { email } = req.body;

  // Generate secure token
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest();

  // Find user
  const user = await User.findOne({ email });

  if (user) {
    user.resetTokenHash = tokenHash.toString('hex');
    user.resetTokenExpiry = Date.now() + 60 * 60 * 1000; // 1 hour
    await user.save();

    // Send email with token (actual sending omitted)
    // e.g., sendEmail(user.email, `Your reset link: https://example.com/reset/${token}`);
  }

  // Identical response regardless of email validity
  res.json({ message: 'If the email exists, a reset link has been sent.' });
});

// Verify token and reset password
router.post('/reset/:token', async (req, res) => {
  const { token } = req.params;
  const { newPassword } = req.body;

  const tokenHash = crypto.createHash('sha256').update(token).digest();

  // Find user with matching hash
  const user = await User.findOne({ resetTokenHash: tokenHash.toString('hex') });

  if (!user) {
    return res.status(400).json({ error: 'Invalid or expired token.' });
  }

  // Verify expiry
  if (Date.now() > user.resetTokenExpiry) {
    return res.status(400).json({ error: 'Token expired.' });
  }

  // Timing-safe comparison
  const storedHashBuffer = Buffer.from(user.resetTokenHash, 'hex');
  if (!crypto.timingSafeEqual(tokenHash, storedHashBuffer)) {
    return res.status(400).json({ error: 'Invalid token.' });
  }

  // Hash new password
  const hashedPassword = await bcrypt.hash(newPassword, 12);
  user.passwordHash = hashedPassword;

  // Invalidate token immediately
  user.resetTokenHash = undefined;
  user.resetTokenExpiry = undefined;

  await user.save();

  res.json({ message: 'Password reset successful.' });
});

module.exports = router;
