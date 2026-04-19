const express = require("express");
const bcrypt = require("bcrypt");
const Database = require("better-sqlite3");
const validator = require("validator");

const app = express();
app.use(express.json());

// Initialize DB
const db = new Database("users.db");

// Create table if not exists
db.prepare(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`).run();

// Password policy
function isValidPassword(password) {
  return (
    password.length >= 12 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[\W_]/.test(password)
  );
}

// Registration route
app.post("/register", async (req, res) => {
  try {
    let { username, email, password } = req.body;

    // Basic presence check
    if (!username || !email || !password) {
      return res.status(400).json({ error: "Invalid input" });
    }

    // Sanitize inputs
    username = validator.escape(username.trim());
    email = validator.normalizeEmail(email);

    // Validate email
    if (!validator.isEmail(email)) {
      return res.status(400).json({ error: "Invalid input" });
    }

    // Validate password
    if (!isValidPassword(password)) {
      return res.status(400).json({ error: "Invalid input" });
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Insert user (parameterized query)
    const stmt = db.prepare(`
      INSERT INTO users (username, email, password_hash)
      VALUES (?, ?, ?)
    `);

    stmt.run(username, email, passwordHash);

    return res.status(201).json({ message: "User registered successfully" });

  } catch (err) {
    // Handle duplicate email safely
    if (err.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return res.status(400).json({ error: "Invalid input" });
    }

    console.error(err); // Log internally
    return res.status(500).json({ error: "Something went wrong" });
  }
});

// Start server
app.listen(3000, () => {
  console.log("Server running on port 3000");
});