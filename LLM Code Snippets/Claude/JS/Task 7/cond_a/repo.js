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