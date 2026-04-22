const express = require('express');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const bcrypt = require('bcrypt');
const { body, validationResult } = require('express-validator');

const app = express();
app.use(express.json());

// Database models (using Sequelize as example)
const { Sequelize, DataTypes } = require('sequelize');
const sequelize = new Sequelize('database', 'username', 'password', {
  host: 'localhost',
  dialect: 'mysql'
});

// User Model
const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  }
});

// Password Reset Token Model
const PasswordResetToken = sequelize.define('PasswordResetToken', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  token: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false
  },
  used: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
});

// Email transporter configuration
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

/**
 * Function 1: Request password reset
 * Accepts user's email, generates token, stores it, sends reset link
 */
const requestPasswordReset = async (req, res) => {
  try {
    // Validate email
    await body('email').isEmail().run(req);
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email } = req.body;

    // Check if user exists
    const user = await User.findOne({ where: { email } });
    if (!user) {
      // For security, don't reveal if email exists or not
      return res.status(200).json({ 
        message: 'If your email is registered, you will receive a password reset link.' 
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // Set token expiry (1 hour from now)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    // Store token in database (invalidate any existing tokens for this email)
    await PasswordResetToken.destroy({ where: { email, used: false } });
    
    await PasswordResetToken.create({
      token: hashedToken,
      email,
      expiresAt,
      used: false
    });

    // Create reset link
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;

    // Send email with reset link
    const mailOptions = {
      from: '"Support" <noreply@yourapp.com>',
      to: email,
      subject: 'Password Reset Request',
      html: `
        <h2>Password Reset Request</h2>
        <p>You requested to reset your password. Click the link below to proceed:</p>
        <a href="${resetLink}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">Reset Password</a>
        <p>Or copy and paste this link: ${resetLink}</p>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
        <hr>
        <p style="font-size: 12px; color: #666;">This is an automated message, please do not reply.</p>
      `
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ 
      message: 'If your email is registered, you will receive a password reset link.' 
    });

  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Function 2: Verify token and update password
 * Accepts token, email, and new password, validates token, updates password
 */
const resetPassword = async (req, res) => {
  try {
    // Validate input
    await Promise.all([
      body('email').isEmail().run(req),
      body('token').notEmpty().isString().run(req),
      body('newPassword').isLength({ min: 8 }).run(req),
      body('confirmPassword').custom((value, { req }) => {
        if (value !== req.body.newPassword) {
          throw new Error('Passwords do not match');
        }
        return true;
      }).run(req)
    ]);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, token, newPassword } = req.body;

    // Hash the provided token to compare with stored hash
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Find valid token
    const resetTokenRecord = await PasswordResetToken.findOne({
      where: {
        token: hashedToken,
        email,
        used: false,
        expiresAt: {
          [Sequelize.Op.gt]: new Date() // Token not expired
        }
      }
    });

    if (!resetTokenRecord) {
      return res.status(400).json({ 
        error: 'Invalid or expired reset token. Please request a new password reset.' 
      });
    }

    // Find user
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update user's password
    await user.update({ password: hashedPassword });

    // Mark token as used
    await resetTokenRecord.update({ used: true });

    // Optional: Invalidate all other reset tokens for this user
    await PasswordResetToken.update(
      { used: true },
      { where: { email, used: false } }
    );

    // Send confirmation email
    const confirmationMail = {
      from: '"Support" <noreply@yourapp.com>',
      to: email,
      subject: 'Password Successfully Reset',
      html: `
        <h2>Password Reset Successful</h2>
        <p>Your password has been successfully reset.</p>
        <p>If you did not perform this action, please contact support immediately.</p>
      `
    };
    
    await transporter.sendMail(confirmationMail).catch(console.error); // Don't fail if email fails

    res.status(200).json({ message: 'Password has been successfully reset.' });

  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Express routes
app.post('/api/auth/forgot-password', requestPasswordReset);
app.post('/api/auth/reset-password', resetPassword);

// Clean up expired tokens periodically (run every hour)
const cleanupExpiredTokens = async () => {
  try {
    const result = await PasswordResetToken.destroy({
      where: {
        expiresAt: {
          [Sequelize.Op.lt]: new Date()
        }
      }
    });
    console.log(`Cleaned up ${result} expired tokens`);
  } catch (error) {
    console.error('Token cleanup error:', error);
  }
};

// Run cleanup every hour
setInterval(cleanupExpiredTokens, 60 * 60 * 1000);

module.exports = { requestPasswordReset, resetPassword, app };