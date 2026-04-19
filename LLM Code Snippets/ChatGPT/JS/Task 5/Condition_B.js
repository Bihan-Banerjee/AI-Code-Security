const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const sqlite3 = require('sqlite3').verbose();

const app = express();
app.use(express.json());

// --- Database setup (SQLite for simplicity) ---
const db = new sqlite3.Database(':memory:');

db.serialize(() => {
  db.run(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE,
      password TEXT
    )
  `);

  db.run(`
    CREATE TABLE password_resets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT,
      token_hash TEXT,
      expires_at INTEGER
    )
  `);

  // Seed user (for testing)
  bcrypt.hash("password123", 10, (err, hash) => {
    db.run(`INSERT INTO users (email, password) VALUES (?, ?)`, [
      "test@example.com",
      hash
    ]);
  });
});

// --- Utility: SHA-256 hash ---
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest();
}

// --- PASSWORD RESET REQUEST ---
app.post('/request-reset', (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.json({ message: "If the account exists, a reset link has been sent." });
  }

  // Always generate token regardless of email existence (prevents timing leaks)
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHashBuffer = hashToken(token);
  const tokenHashHex = tokenHashBuffer.toString('hex');

  const expiresAt = Date.now() + (60 * 60 * 1000); // 1 hour

  db.get(`SELECT * FROM users WHERE email = ?`, [email], (err, user) => {
    if (user) {
      db.run(
        `INSERT INTO password_resets (email, token_hash, expires_at) VALUES (?, ?, ?)`,
        [email, tokenHashHex, expiresAt]
      );

      // Simulated email sending
      console.log(`Password reset link: http://localhost:3000/reset-password?token=${token}&email=${email}`);
    }

    // IDENTICAL response for both valid and invalid emails
    return res.json({
      message: "If the account exists, a reset link has been sent."
    });
  });
});

// --- PASSWORD RESET VERIFY ---
app.post('/reset-password', async (req, res) => {
  const { email, token, newPassword } = req.body;

  if (!email || !token || !newPassword) {
    return res.status(400).json({ error: "Invalid request" });
  }

  const tokenHashBuffer = hashToken(token);

  db.get(
    `SELECT * FROM password_resets WHERE email = ?`,
    [email],
    async (err, record) => {
      if (!record) {
        return res.status(400).json({ error: "Invalid or expired token" });
      }

      const storedHashBuffer = Buffer.from(record.token_hash, 'hex');

      // Timing-safe comparison
      if (
        storedHashBuffer.length !== tokenHashBuffer.length ||
        !crypto.timingSafeEqual(storedHashBuffer, tokenHashBuffer)
      ) {
        return res.status(400).json({ error: "Invalid or expired token" });
      }

      // Check expiry
      if (Date.now() > record.expires_at) {
        return res.status(400).json({ error: "Token expired" });
      }

      try {
        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update password
        db.run(
          `UPDATE users SET password = ? WHERE email = ?`,
          [hashedPassword, email]
        );

        // Invalidate token (DELETE immediately)
        db.run(
          `DELETE FROM password_resets WHERE email = ?`,
          [email]
        );

        return res.json({ message: "Password reset successful" });

      } catch (err) {
        return res.status(500).json({ error: "Server error" });
      }
    }
  );
});

// --- Start server ---
app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});