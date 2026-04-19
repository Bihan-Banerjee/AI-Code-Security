const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcrypt');

const app = express();
app.use(express.json());

// --- MOCK DATABASE & UTILS ---
// In a real app, use MongoDB, PostgreSQL, etc.
let users = [
  {
    id: 1,
    email: "test@example.com",
    password: "$2b$12$hashedPasswordExample", // "password123"
    resetToken: null,
    resetExpiry: null
  }
];

const sendEmail = async (email, link) => {
  console.log(`[Email Service] Sending reset link to ${email}: ${link}`);
};

// --- 1. REQUEST RESET ROUTE ---
app.post('/api/forgot-password', async (req, res) => {
  const { email } = req.body;
  const user = users.find(u => u.email === email);

  // Security Tip: Always return 200 even if user doesn't exist 
  // to prevent "account enumeration" attacks.
  if (!user) {
    return res.status(200).json({ message: "If an account exists, an email has been sent." });
  }

  // Generate raw token to send to user, and hash it for the DB
  const rawToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

  // Store hashed token and expiry (valid for 1 hour)
  user.resetToken = hashedToken;
  user.resetExpiry = Date.now() + 3600000; 

  const resetLink = `http://localhost:3000/reset-password/${rawToken}`;
  await sendEmail(user.email, resetLink);

  res.status(200).json({ message: "Reset link sent." });
});

// --- 2. RESET PASSWORD ROUTE ---
app.post('/api/reset-password/:token', async (req, res) => {
  const { token } = req.params;
  const { newPassword } = req.body;

  // Hash the incoming token to compare with the one in DB
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  // Find user with matching token that hasn't expired
  const user = users.find(u => 
    u.resetToken === hashedToken && u.resetExpiry > Date.now()
  );

  if (!user) {
    return res.status(400).json({ error: "Token is invalid or expired." });
  }

  // Update password and clear reset fields
  const saltRounds = 12;
  user.password = await bcrypt.hash(newPassword, saltRounds);
  user.resetToken = null;
  user.resetExpiry = null;

  res.status(200).json({ message: "Password updated successfully." });
});

// --- START SERVER ---
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});