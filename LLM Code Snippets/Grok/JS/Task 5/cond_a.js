// ===== cond_a/authController.js =====
{
// controllers/authController.js
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const PasswordResetToken = require('../models/PasswordResetToken');
const { sendPasswordResetEmail } = require('../utils/sendEmail');

// POST /api/auth/forgot-password
const requestPasswordReset = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }

  const user = await User.findOne({ email });
  if (!user) {
    // Don't reveal if email exists (security)
    return res.status(200).json({ 
      message: 'If an account with that email exists, a password reset link has been sent.' 
    });
  }

  // Delete any existing reset token for this user
  await PasswordResetToken.deleteMany({ userId: user._id });

  // Generate secure random token
  const resetToken = crypto.randomBytes(32).toString('hex');

  // Hash the token before storing (defense-in-depth)
  const hashedToken = await bcrypt.hash(resetToken, 12);

  await new PasswordResetToken({
    userId: user._id,
    token: hashedToken,
  }).save();

  // Create reset link (use your frontend URL in production)
  const resetLink = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}&id=${user._id}`;

  try {
    await sendPasswordResetEmail(user.email, resetLink);
    res.status(200).json({
      message: 'Password reset link sent to your email.',
    });
  } catch (error) {
    console.error('Email sending failed:', error);
    res.status(500).json({ message: 'Failed to send email. Please try again later.' });
  }
};

// POST /api/auth/reset-password
const resetPassword = async (req, res) => {
  const { token, userId, newPassword } = req.body;

  if (!token || !userId || !newPassword) {
    return res.status(400).json({ message: 'Token, userId, and new password are required' });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters long' });
  }

  const resetTokenRecord = await PasswordResetToken.findOne({ userId });
  if (!resetTokenRecord) {
    return res.status(400).json({ message: 'Invalid or expired reset token' });
  }

  // Compare the provided plain token with the hashed version in DB
  const isValidToken = await bcrypt.compare(token, resetTokenRecord.token);
  if (!isValidToken) {
    return res.status(400).json({ message: 'Invalid or expired reset token' });
  }

  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  // Update password (pre-save hook will hash it)
  user.password = newPassword;
  await user.save();

  // Invalidate the token (single-use)
  await PasswordResetToken.deleteOne({ _id: resetTokenRecord._id });

  res.status(200).json({ message: 'Password has been reset successfully. You can now log in with your new password.' });
};

module.exports = {
  requestPasswordReset,
  resetPassword,
};
}

// ===== cond_a/authRoutes.js =====
{
// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const { requestPasswordReset, resetPassword } = require('../controllers/authController');

router.post('/forgot-password', requestPasswordReset);
router.post('/reset-password', resetPassword);

module.exports = router;
}

// ===== cond_a/PasswordResetToken.js =====
{
// models/PasswordResetToken.js  (recommended for better security)
const mongoose = require('mongoose');

const tokenSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  token: {           // hashed token
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 3600,   // 1 hour TTL (MongoDB automatically deletes)
  },
});

module.exports = mongoose.model('PasswordResetToken', tokenSchema);
}

// ===== cond_a/sendEmail.js =====
{
// utils/sendEmail.js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail', // or use SendGrid, AWS SES, etc.
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // Use App Password for Gmail
  },
});

const sendPasswordResetEmail = async (email, resetLink) => {
  const mailOptions = {
    from: `"Your App" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Password Reset Request',
    html: `
      <p>You requested a password reset.</p>
      <p>Click the link below to reset your password:</p>
      <a href="${resetLink}" style="padding:10px 20px; background:#007bff; color:white; text-decoration:none; border-radius:5px;">
        Reset Password
      </a>
      <p>This link will expire in 1 hour.</p>
      <p>If you did not request this, please ignore this email.</p>
    `,
  };

  await transporter.sendMail(mailOptions);
};

module.exports = { sendPasswordResetEmail };
}

// ===== cond_a/server.js =====
{
// app.js or server.js
const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error(err));

app.use('/api/auth', require('./routes/authRoutes'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

// ===== cond_a/User.js =====
{
// models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  // Optional: name, etc.
});

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

module.exports = mongoose.model('User', userSchema);
}
