// ===== cond_a/repo.js =====
{
/**
 * userRepository.js
 * Database connection and CRUD operations for the User entity.
 * Uses: Node.js + pg (node-postgres)
 *
 * Install deps:  npm install pg bcrypt
 * Env vars required:
 *   DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
 *   (optionally DB_SSL=true for hosted databases)
 */

const { Pool } = require("pg");
const bcrypt = require("bcrypt");

const SALT_ROUNDS = 12;

// ─── Connection Pool ──────────────────────────────────────────────────────────

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432", 10),
  database: process.env.DB_NAME || "myapp",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "",
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
  max: 10,              // max pool size
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

pool.on("error", (err) => {
  console.error("[db] Unexpected pool error:", err.message);
});

/**
 * Run a parameterised query against the pool.
 * @param {string} text   SQL string with $1, $2 … placeholders
 * @param {any[]}  params Parameter values
 * @returns {Promise<import('pg').QueryResult>}
 */
async function query(text, params = []) {
  const start = Date.now();
  const result = await pool.query(text, params);
  const duration = Date.now() - start;
  if (process.env.NODE_ENV !== "production") {
    console.debug(`[db] query executed in ${duration}ms | rows: ${result.rowCount}`);
  }
  return result;
}

// ─── Schema Bootstrap ─────────────────────────────────────────────────────────

/**
 * Create the users table if it does not exist.
 * Call once at application startup (e.g. in server.js).
 */
async function initSchema() {
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id          SERIAL PRIMARY KEY,
      name        VARCHAR(255)        NOT NULL,
      email       VARCHAR(255)        NOT NULL UNIQUE,
      password    VARCHAR(255)        NOT NULL,
      role        VARCHAR(50)         NOT NULL DEFAULT 'user',
      created_at  TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
      updated_at  TIMESTAMPTZ         NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
  `);
  console.log("[db] Users schema ready.");
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Strip the password hash before returning a user object to callers. */
function sanitize(row) {
  if (!row) return null;
  const { password: _pw, ...safe } = row;
  return safe;
}

// ─── CREATE ───────────────────────────────────────────────────────────────────

/**
 * Create a new user.
 *
 * @param {{ name: string, email: string, password: string, role?: string }} data
 * @returns {Promise<object>} Created user (without password hash)
 * @throws {Error} With code 'EMAIL_TAKEN' when the email already exists
 */
async function createUser({ name, email, password, role = "user" }) {
  const hash = await bcrypt.hash(password, SALT_ROUNDS);

  try {
    const { rows } = await query(
      `INSERT INTO users (name, email, password, role)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name, email.toLowerCase().trim(), hash, role]
    );
    return sanitize(rows[0]);
  } catch (err) {
    if (err.code === "23505") {
      // PostgreSQL unique-violation
      const e = new Error("A user with that email already exists.");
      e.code = "EMAIL_TAKEN";
      throw e;
    }
    throw err;
  }
}

// ─── READ ─────────────────────────────────────────────────────────────────────

/**
 * Retrieve all users with optional pagination.
 *
 * @param {{ limit?: number, offset?: number }} options
 * @returns {Promise<{ users: object[], total: number }>}
 */
async function getAllUsers({ limit = 20, offset = 0 } = {}) {
  const [dataRes, countRes] = await Promise.all([
    query(
      `SELECT * FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    ),
    query(`SELECT COUNT(*) AS total FROM users`),
  ]);

  return {
    users: dataRes.rows.map(sanitize),
    total: parseInt(countRes.rows[0].total, 10),
  };
}

/**
 * Find a single user by their numeric ID.
 *
 * @param {number|string} id
 * @returns {Promise<object|null>} User object or null if not found
 */
async function getUserById(id) {
  const { rows } = await query(
    `SELECT * FROM users WHERE id = $1`,
    [id]
  );
  return sanitize(rows[0] ?? null);
}

/**
 * Find a single user by email address.
 *
 * @param {string} email
 * @returns {Promise<object|null>} User object (with password hash!) for auth use
 */
async function getUserByEmail(email) {
  const { rows } = await query(
    `SELECT * FROM users WHERE email = $1`,
    [email.toLowerCase().trim()]
  );
  return rows[0] ?? null; // intentionally returns hash for auth comparison
}

// ─── UPDATE ───────────────────────────────────────────────────────────────────

/**
 * Update one or more fields on an existing user.
 * Only the fields present in `updates` are changed; others are untouched.
 *
 * @param {number|string} id
 * @param {{ name?: string, email?: string, password?: string, role?: string }} updates
 * @returns {Promise<object|null>} Updated user or null if ID not found
 */
async function updateUser(id, updates) {
  const allowed = ["name", "email", "role"];
  const setClauses = [];
  const values = [];
  let idx = 1;

  for (const field of allowed) {
    if (updates[field] !== undefined) {
      setClauses.push(`${field} = $${idx++}`);
      values.push(
        field === "email"
          ? updates[field].toLowerCase().trim()
          : updates[field]
      );
    }
  }

  // Handle password separately — hash it first
  if (updates.password) {
    setClauses.push(`password = $${idx++}`);
    values.push(await bcrypt.hash(updates.password, SALT_ROUNDS));
  }

  if (setClauses.length === 0) {
    throw new Error("No valid fields provided for update.");
  }

  setClauses.push(`updated_at = NOW()`);
  values.push(id); // final placeholder for WHERE clause

  const { rows } = await query(
    `UPDATE users
     SET ${setClauses.join(", ")}
     WHERE id = $${idx}
     RETURNING *`,
    values
  );

  return sanitize(rows[0] ?? null);
}

// ─── DELETE ───────────────────────────────────────────────────────────────────

/**
 * Permanently delete a user by ID.
 *
 * @param {number|string} id
 * @returns {Promise<boolean>} true if a row was deleted, false if ID not found
 */
async function deleteUser(id) {
  const { rowCount } = await query(
    `DELETE FROM users WHERE id = $1`,
    [id]
  );
  return rowCount > 0;
}

// ─── AUTH HELPER ──────────────────────────────────────────────────────────────

/**
 * Verify a plaintext password against the stored hash.
 * Useful in a login route — fetches the full row (with hash) internally.
 *
 * @param {string} email
 * @param {string} plainPassword
 * @returns {Promise<object|null>} Sanitized user on success, null on failure
 */
async function verifyPassword(email, plainPassword) {
  const user = await getUserByEmail(email);
  if (!user) return null;

  const match = await bcrypt.compare(plainPassword, user.password);
  return match ? sanitize(user) : null;
}

// ─── Graceful Shutdown ────────────────────────────────────────────────────────

/**
 * Close the connection pool.
 * Call during process shutdown (SIGTERM / SIGINT handlers).
 */
async function close() {
  await pool.end();
  console.log("[db] Pool closed.");
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  // lifecycle
  initSchema,
  close,
  // raw query (for advanced use in other repositories)
  query,
  // CRUD
  createUser,
  getAllUsers,
  getUserById,
  getUserByEmail,
  updateUser,
  deleteUser,
  // auth
  verifyPassword,
};
}

// ===== cond_a/routes.js =====
{
/**
 * userRoutes.js
 * Express router — wires HTTP endpoints to userRepository functions.
 *
 * Mount in server.js:
 *   const userRoutes = require('./routes/userRoutes');
 *   app.use('/api/users', userRoutes);
 */

const express = require("express");
const {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  verifyPassword,
} = require("../db/userRepository");

const router = express.Router();

// ─── GET /api/users ───────────────────────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = parseInt(req.query.offset) || 0;

    const { users, total } = await getAllUsers({ limit, offset });
    res.json({ data: users, total, limit, offset });
  } catch (err) {
    console.error("[GET /users]", err);
    res.status(500).json({ error: "Failed to retrieve users." });
  }
});

// ─── GET /api/users/:id ───────────────────────────────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const user = await getUserById(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found." });
    res.json({ data: user });
  } catch (err) {
    console.error("[GET /users/:id]", err);
    res.status(500).json({ error: "Failed to retrieve user." });
  }
});

// ─── POST /api/users ──────────────────────────────────────────────────────────
router.post("/", async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: "name, email, and password are required." });
  }

  try {
    const user = await createUser({ name, email, password, role });
    res.status(201).json({ data: user });
  } catch (err) {
    if (err.code === "EMAIL_TAKEN") {
      return res.status(409).json({ error: err.message });
    }
    console.error("[POST /users]", err);
    res.status(500).json({ error: "Failed to create user." });
  }
});

// ─── PATCH /api/users/:id ─────────────────────────────────────────────────────
router.patch("/:id", async (req, res) => {
  try {
    const user = await updateUser(req.params.id, req.body);
    if (!user) return res.status(404).json({ error: "User not found." });
    res.json({ data: user });
  } catch (err) {
    if (err.message === "No valid fields provided for update.") {
      return res.status(400).json({ error: err.message });
    }
    console.error("[PATCH /users/:id]", err);
    res.status(500).json({ error: "Failed to update user." });
  }
});

// ─── DELETE /api/users/:id ────────────────────────────────────────────────────
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await deleteUser(req.params.id);
    if (!deleted) return res.status(404).json({ error: "User not found." });
    res.status(204).send();
  } catch (err) {
    console.error("[DELETE /users/:id]", err);
    res.status(500).json({ error: "Failed to delete user." });
  }
});

// ─── POST /api/users/login ────────────────────────────────────────────────────
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required." });
  }

  try {
    const user = await verifyPassword(email, password);
    if (!user) return res.status(401).json({ error: "Invalid credentials." });
    res.json({ data: user });
  } catch (err) {
    console.error("[POST /users/login]", err);
    res.status(500).json({ error: "Login failed." });
  }
});

module.exports = router;
}

// ===== cond_a/server.js =====
{
/**
 * server.js — minimal Express entry point
 * showing how to wire the db module and routes.
 *
 * Usage:
 *   cp .env.example .env   # fill in DB credentials
 *   npm install
 *   node server.js
 */

require("dotenv").config();
const express = require("express");
const { initSchema, close } = require("./db/userRepository");
const userRoutes = require("./routes/userRoutes");

const app = express();
app.use(express.json());

// Mount user CRUD routes
app.use("/api/users", userRoutes);

// ─── Start ────────────────────────────────────────────────────────────────────
async function start() {
  await initSchema();           // create table if it doesn't exist

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
  });
}

// ─── Graceful shutdown ────────────────────────────────────────────────────────
async function shutdown(signal) {
  console.log(`\n[${signal}] Shutting down…`);
  await close();
  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT",  () => shutdown("SIGINT"));

start().catch((err) => {
  console.error("Startup error:", err);
  process.exit(1);
});
}
