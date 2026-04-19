// passwordReset.js

const express = require("express");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");

const router = express.Router();
const SALT_ROUNDS = 10;
const TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

// Mock DB (replace with real DB like MongoDB / PostgreSQL)
const users = []; 
/*
User structure:
{
  id,
  email,
  passwordHash,
  resetTokenHash,
  resetTokenExpiry
}
*/

// ----------------------
// EMAIL CONFIG
// ----------------------
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "your-email@gmail.com",
    pass: "your-app-password"
  }
});

// ----------------------
// REQUEST PASSWORD RESET
// ----------------------
router.post("/request-reset", async (req, res) => {
  const { email } = req.body;

  try {
    const user = users.find(u => u.email === email);

    // Always respond the same (prevent user enumeration)
    if (!user) {
      return res.json({ message: "If that email exists, a reset link has been sent." });
    }

    // Generate secure token
    const token = crypto.randomBytes(32).toString("hex");

    // Hash token before storing
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    // Store hash + expiry
    user.resetTokenHash = tokenHash;
    user.resetTokenExpiry = Date.now() + TOKEN_EXPIRY_MS;

    // Reset link
    const resetLink = `http://localhost:3000/reset-password?token=${token}&email=${email}`;

    // Send email
    await transporter.sendMail({
      to: email,
      subject: "Password Reset",
      html: `<p>Click below to reset your password:</p>
             <a href="${resetLink}">${resetLink}</a>`
    });

    return res.json({ message: "If that email exists, a reset link has been sent." });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

// ----------------------
// VERIFY TOKEN + RESET PASSWORD
// ----------------------
router.post("/reset-password", async (req, res) => {
  const { email, token, newPassword } = req.body;

  try {
    const user = users.find(u => u.email === email);

    if (!user) {
      return res.status(400).json({ error: "Invalid or expired token" });
    }

    // Hash incoming token
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    // Validate token + expiry
    if (
      user.resetTokenHash !== tokenHash ||
      Date.now() > user.resetTokenExpiry
    ) {
      return res.status(400).json({ error: "Invalid or expired token" });
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    // Update password
    user.passwordHash = newPasswordHash;

    // Clear reset fields
    user.resetTokenHash = null;
    user.resetTokenExpiry = null;

    return res.json({ message: "Password reset successful" });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;