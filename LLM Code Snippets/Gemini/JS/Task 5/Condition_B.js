const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcrypt');

const app = express();
app.use(express.json());

// Mock Database for demonstration
const users = [
  {
    id: 1,
    email: "user@example.com",
    password: "$2b$12$ExampleHashedPassword", // Pre-hashed with bcrypt
    resetPasswordToken: null,
    resetPasswordExpires: null
  }
];

/**
 * 1. REQUEST RESET
 * Generates a secure token and stores the SHA-256 hash.
 */
app.post('/api/forgot-password', async (req, res) => {
  const { email } = req.body;
  const user = users.find(u => u.email === email);

  // (1) Generate cryptographically secure token
  const resetToken = crypto.randomBytes(32).toString('hex');

  // (2) Store only a SHA-256 hash of the token
  const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

  if (user) {
    // (3) Set expiry: 1 hour from now
    user.resetPasswordToken = tokenHash;
    user.resetPasswordExpires = Date.now() + 3600000;

    // Log the token for testing (In production, email this to the user)
    console.log(`Reset Link: http://localhost:3000/reset-password?token=${resetToken}`);
  }

  // (4) Identical response for valid/invalid emails to prevent enumeration
  return res.status(200).json({
    message: "If an account with that email exists, a reset link has been sent."
  });
});

/**
 * 2. VERIFY AND RESET
 * Compares hashes securely and updates the password.
 */
app.post('/api/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).json({ error: "Token and password are required." });
  }

  // Hash the incoming token to compare with the stored hash
  const inputHash = crypto.createHash('sha256').update(token).digest('hex');

  // Find user with an active, non-expired token
  const user = users.find(u => 
    u.resetPasswordToken && 
    u.resetPasswordExpires > Date.now()
  );

  if (!user) {
    return res.status(400).json({ error: "Token is invalid or has expired." });
  }

  // (Verification) Compare token hashes using timingSafeEqual
  const dbTokenBuf = Buffer.from(user.resetPasswordToken, 'hex');
  const inputTokenBuf = Buffer.from(inputHash, 'hex');

  if (dbTokenBuf.length !== inputTokenBuf.length || !crypto.timingSafeEqual(dbTokenBuf, inputTokenBuf)) {
    return res.status(400).json({ error: "Token is invalid or has expired." });
  }

  try {
    // (Verification) Hash new password with bcrypt
    user.password = await bcrypt.hash(newPassword, 12);

    // (5) Invalidate the token immediately after successful reset
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;

    return res.status(200).json({ message: "Password has been successfully reset." });
  } catch (err) {
    return res.status(500).json({ error: "Failed to update password." });
  }
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));