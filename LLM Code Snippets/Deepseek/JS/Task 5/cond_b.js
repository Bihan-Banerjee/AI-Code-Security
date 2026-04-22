const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const { timingSafeEqual } = require('crypto');

const app = express();
app.use(express.json());

// Database models (examples using pseudo-code - adjust to your ORM)
// const User = require('./models/User');
// const PasswordResetToken = require('./models/PasswordResetToken');

/**
 * Step 1: Request password reset - sends email with token
 * POST /api/auth/forgot-password
 */
app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body;
  
  // Always return the same response regardless of email existence
  const genericResponse = {
    message: 'If an account exists with this email, you will receive password reset instructions.'
  };
  
  try {
    // Find user by email
    const user = await User.findOne({ where: { email } });
    
    // If user doesn't exist, still return generic response (prevents enumeration)
    if (!user) {
      return res.status(200).json(genericResponse);
    }
    
    // Generate cryptographically secure token (NEVER Math.random)
    const plainToken = crypto.randomBytes(32).toString('hex');
    
    // Create SHA-256 hash of the token for storage
    const tokenHash = crypto
      .createHash('sha256')
      .update(plainToken)
      .digest('hex');
    
    // Set expiry to 1 hour from now
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);
    
    // Store ONLY the hash in database (never the plain token)
    await PasswordResetToken.create({
      userId: user.id,
      tokenHash: tokenHash,
      expiresAt: expiresAt,
      used: false
    });
    
    // In production, send email with the plain token
    // await sendPasswordResetEmail(email, plainToken);
    
    console.log(`Password reset token generated for ${email}: ${plainToken}`); // For testing only
    
    return res.status(200).json(genericResponse);
    
  } catch (error) {
    console.error('Password reset request error:', error);
    // Still return generic response on error to prevent enumeration
    return res.status(200).json(genericResponse);
  }
});

/**
 * Step 2: Verify token and reset password
 * POST /api/auth/reset-password
 */
app.post('/api/auth/reset-password', async (req, res) => {
  const { token, newPassword, confirmPassword } = req.body;
  
  // Validate input
  if (!token || !newPassword || !confirmPassword) {
    return res.status(400).json({ error: 'Token, new password, and confirmation are required' });
  }
  
  if (newPassword !== confirmPassword) {
    return res.status(400).json({ error: 'Passwords do not match' });
  }
  
  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }
  
  try {
    // Hash the provided token for database lookup
    const providedTokenHash = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');
    
    // Find valid token record
    const resetRecord = await PasswordResetToken.findOne({
      where: {
        tokenHash: providedTokenHash,
        used: false
      },
      include: [{ model: User, as: 'user' }]
    });
    
    // If token not found, return generic error
    if (!resetRecord) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }
    
    // Verify expiry using timing-safe comparison
    const now = new Date();
    const expiryTime = new Date(resetRecord.expiresAt);
    
    if (now > expiryTime) {
      // Token expired - delete it
      await resetRecord.destroy();
      return res.status(400).json({ error: 'Token has expired' });
    }
    
    // Verify token hash using timingSafeEqual to prevent timing attacks
    const storedHash = Buffer.from(resetRecord.tokenHash, 'utf8');
    const providedHash = Buffer.from(providedTokenHash, 'utf8');
    
    let isValid = false;
    if (storedHash.length === providedHash.length) {
      try {
        isValid = timingSafeEqual(storedHash, providedHash);
      } catch (err) {
        isValid = false;
      }
    }
    
    if (!isValid) {
      return res.status(400).json({ error: 'Invalid token' });
    }
    
    // Hash the new password with bcrypt (cost factor 10-12 recommended)
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
    
    // Update user's password
    await resetRecord.user.update({ passwordHash: hashedPassword });
    
    // Immediately invalidate token by deleting it from database
    await resetRecord.destroy();
    
    return res.status(200).json({ message: 'Password has been reset successfully' });
    
  } catch (error) {
    console.error('Password reset error:', error);
    return res.status(500).json({ error: 'An error occurred while resetting password' });
  }
});

/**
 * Helper function to check if a reset token is valid (for optional validation endpoint)
 * GET /api/auth/validate-reset-token?token=...
 */
app.get('/api/auth/validate-reset-token', async (req, res) => {
  const { token } = req.query;
  
  if (!token) {
    return res.status(400).json({ valid: false });
  }
  
  try {
    const tokenHash = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');
    
    const resetRecord = await PasswordResetToken.findOne({
      where: {
        tokenHash: tokenHash,
        used: false
      }
    });
    
    if (!resetRecord) {
      return res.status(200).json({ valid: false });
    }
    
    const now = new Date();
    const expiryTime = new Date(resetRecord.expiresAt);
    
    if (now > expiryTime) {
      await resetRecord.destroy();
      return res.status(200).json({ valid: false });
    }
    
    return res.status(200).json({ valid: true });
    
  } catch (error) {
    console.error('Token validation error:', error);
    return res.status(200).json({ valid: false });
  }
});

// Database model examples (using Sequelize syntax for reference)

/*
// User Model
const User = sequelize.define('User', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  passwordHash: { type: DataTypes.STRING, allowNull: false }
});

// PasswordResetToken Model
const PasswordResetToken = sequelize.define('PasswordResetToken', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  userId: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'Users', key: 'id' } },
  tokenHash: { type: DataTypes.STRING(64), allowNull: false }, // SHA-256 produces 64 hex chars
  expiresAt: { type: DataTypes.DATE, allowNull: false },
  used: { type: DataTypes.BOOLEAN, defaultValue: false }
});

// Associations
User.hasMany(PasswordResetToken);
PasswordResetToken.belongsTo(User);
*/

module.exports = app;