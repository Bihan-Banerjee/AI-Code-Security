/**
 * userRepository.js
 * Database connection pool + CRUD for the User entity.
 *
 * Required environment variables:
 *   DB_HOST     – database hostname
 *   DB_PORT     – database port          (default: 5432)
 *   DB_NAME     – database name
 *   DB_USER     – database username
 *   DB_PASSWORD – database password      (never logged)
 *   DB_POOL_MAX – max pool connections   (default: 10)
 *   DB_POOL_IDLE_TIMEOUT_MS             (default: 10000)
 *   DB_POOL_CONNECTION_TIMEOUT_MS       (default: 5000)
 */

'use strict';

const { Pool } = require('pg'); // npm install pg

// ---------------------------------------------------------------------------
// 1. Connection pool – credentials from env only, explicit pool limits
// ---------------------------------------------------------------------------

function createPool() {
  const required = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
  const missing  = required.filter(k => !process.env[k]);
  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  return new Pool({
    host:               process.env.DB_HOST,
    port:               parseInt(process.env.DB_PORT ?? '5432', 10),
    database:           process.env.DB_NAME,
    user:               process.env.DB_USER,
    password:           process.env.DB_PASSWORD,          // never logged below
    max:                parseInt(process.env.DB_POOL_MAX ?? '10', 10),
    idleTimeoutMillis:  parseInt(process.env.DB_POOL_IDLE_TIMEOUT_MS  ?? '10000', 10),
    connectionTimeoutMillis: parseInt(process.env.DB_POOL_CONNECTION_TIMEOUT_MS ?? '5000', 10),
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: true } : false,
  });
}

// Singleton pool – created lazily so tests can set env vars before import side-effects.
let _pool = null;
function getPool() {
  if (!_pool) _pool = createPool();
  return _pool;
}

/** Gracefully drain the pool (call on process shutdown). */
async function closePool() {
  if (_pool) {
    await _pool.end();
    _pool = null;
  }
}

// ---------------------------------------------------------------------------
// 2. Input-validation helpers
// ---------------------------------------------------------------------------

/**
 * Throws TypeError when `value` is not a non-empty string.
 * @param {*}      value
 * @param {string} name   – parameter name, used in error message
 */
function requireString(value, name) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new TypeError(`Parameter "${name}" must be a non-empty string.`);
  }
}

/**
 * Throws TypeError when `value` is not a safe positive integer.
 * @param {*}      value
 * @param {string} name
 */
function requirePositiveInt(value, name) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new TypeError(`Parameter "${name}" must be a positive integer.`);
  }
}

/**
 * Validates and sanitises the fields object for createUser / updateUser.
 * Returns a plain object with only the accepted columns.
 *
 * Accepted columns: username (required for create), email (required for create),
 *                   full_name, role
 *
 * @param {object}  fields
 * @param {boolean} isCreate – if true, username and email are mandatory
 * @returns {{ username?: string, email?: string, full_name?: string, role?: string }}
 */
function validateUserFields(fields, isCreate = false) {
  if (typeof fields !== 'object' || fields === null || Array.isArray(fields)) {
    throw new TypeError('"fields" must be a plain object.');
  }

  const allowed  = new Set(['username', 'email', 'full_name', 'role']);
  const unknown  = Object.keys(fields).filter(k => !allowed.has(k));
  if (unknown.length) {
    throw new TypeError(`Unknown field(s): ${unknown.join(', ')}.`);
  }

  if (isCreate) {
    requireString(fields.username, 'fields.username');
    requireString(fields.email,    'fields.email');
  }

  // Type-check each supplied field
  const stringFields = ['username', 'email', 'full_name', 'role'];
  for (const key of stringFields) {
    if (key in fields) requireString(fields[key], `fields.${key}`);
  }

  // Email format – lightweight RFC-5321 check
  if ('email' in fields) {
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRe.test(fields.email)) {
      throw new TypeError('"fields.email" is not a valid email address.');
    }
  }

  // Pick only accepted keys (strips prototype pollution attempts)
  const safe = {};
  for (const key of allowed) {
    if (key in fields) safe[key] = fields[key].trim();
  }
  return safe;
}

// ---------------------------------------------------------------------------
// 3. Safe log helper – strips password / token fields before printing
// ---------------------------------------------------------------------------

/**
 * Log an object without exposing sensitive fields.
 * @param {string} label
 * @param {object} obj
 */
function safeLog(label, obj) {
  const SENSITIVE = new Set(['password', 'password_hash', 'token', 'refresh_token', 'access_token']);
  const redacted  = Object.fromEntries(
    Object.entries(obj ?? {}).map(([k, v]) => [k, SENSITIVE.has(k) ? '[REDACTED]' : v])
  );
  console.log(`[userRepository] ${label}`, redacted);
}

// ---------------------------------------------------------------------------
// 4. CRUD operations
// ---------------------------------------------------------------------------

/**
 * Create a new user inside a transaction.
 *
 * @param {{ username: string, email: string, full_name?: string, role?: string }} fields
 * @returns {Promise<object>} The created user row (password_hash excluded from log).
 */
async function createUser(fields) {
  const safe = validateUserFields(fields, true);

  const client = await getPool().connect();
  try {
    await client.query('BEGIN');

    // Parameterised INSERT – $1…$n placeholders, never template literals in SQL
    const result = await client.query(
      `INSERT INTO users (username, email, full_name, role, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       RETURNING id, username, email, full_name, role, created_at, updated_at`,
      [
        safe.username,
        safe.email,
        safe.full_name ?? null,
        safe.role      ?? 'user',
      ]
    );

    await client.query('COMMIT');

    const user = result.rows[0];
    safeLog('createUser →', user);
    return user;

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[userRepository] createUser – rolled back:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Read a single user by primary-key id.
 *
 * @param {number} id
 * @returns {Promise<object|null>} User row or null if not found.
 */
async function getUserById(id) {
  requirePositiveInt(id, 'id');

  const result = await getPool().query(
    `SELECT id, username, email, full_name, role, created_at, updated_at
     FROM users
     WHERE id = $1
       AND deleted_at IS NULL`,
    [id]
  );

  const user = result.rows[0] ?? null;
  if (user) safeLog('getUserById →', user);
  return user;
}

/**
 * Read a single user by username.
 *
 * @param {string} username
 * @returns {Promise<object|null>}
 */
async function getUserByUsername(username) {
  requireString(username, 'username');

  const result = await getPool().query(
    `SELECT id, username, email, full_name, role, created_at, updated_at
     FROM users
     WHERE username = $1
       AND deleted_at IS NULL`,
    [username.trim()]
  );

  return result.rows[0] ?? null;
}

/**
 * List users with optional limit / offset pagination.
 *
 * @param {{ limit?: number, offset?: number }} options
 * @returns {Promise<object[]>}
 */
async function listUsers({ limit = 20, offset = 0 } = {}) {
  if (!Number.isInteger(limit)  || limit  < 1 || limit  > 200) {
    throw new TypeError('"limit" must be an integer between 1 and 200.');
  }
  if (!Number.isInteger(offset) || offset < 0) {
    throw new TypeError('"offset" must be a non-negative integer.');
  }

  const result = await getPool().query(
    `SELECT id, username, email, full_name, role, created_at, updated_at
     FROM users
     WHERE deleted_at IS NULL
     ORDER BY id
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );

  return result.rows;
}

/**
 * Update mutable fields of an existing user (partial update).
 * At least one field must be supplied.
 *
 * @param {number} id
 * @param {{ username?: string, email?: string, full_name?: string, role?: string }} fields
 * @returns {Promise<object|null>} Updated row, or null if id not found.
 */
async function updateUser(id, fields) {
  requirePositiveInt(id, 'id');
  const safe = validateUserFields(fields, false);

  if (Object.keys(safe).length === 0) {
    throw new TypeError('At least one field must be supplied to updateUser.');
  }

  // Build SET clause dynamically – still parameterised, no interpolated SQL values
  const setClauses = [];
  const params     = [];
  let   paramIndex = 1;

  for (const [col, val] of Object.entries(safe)) {
    setClauses.push(`${col} = $${paramIndex++}`);
    params.push(val);
  }
  setClauses.push(`updated_at = NOW()`);

  params.push(id); // last param is the WHERE id

  const client = await getPool().connect();
  try {
    await client.query('BEGIN');

    const result = await client.query(
      `UPDATE users
       SET ${setClauses.join(', ')}
       WHERE id = $${paramIndex}
         AND deleted_at IS NULL
       RETURNING id, username, email, full_name, role, created_at, updated_at`,
      params
    );

    await client.query('COMMIT');

    const user = result.rows[0] ?? null;
    if (user) safeLog('updateUser →', user);
    return user;

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[userRepository] updateUser – rolled back:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Soft-delete a user (sets deleted_at timestamp).
 *
 * @param {number} id
 * @returns {Promise<boolean>} true if a row was soft-deleted, false if not found.
 */
async function deleteUser(id) {
  requirePositiveInt(id, 'id');

  const client = await getPool().connect();
  try {
    await client.query('BEGIN');

    const result = await client.query(
      `UPDATE users
       SET deleted_at = NOW(), updated_at = NOW()
       WHERE id = $1
         AND deleted_at IS NULL
       RETURNING id`,
      [id]
    );

    await client.query('COMMIT');

    const deleted = result.rowCount > 0;
    console.log(`[userRepository] deleteUser id=${id} deleted=${deleted}`);
    return deleted;

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[userRepository] deleteUser – rolled back:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

// ---------------------------------------------------------------------------
// 5. Exports
// ---------------------------------------------------------------------------

module.exports = {
  // Pool lifecycle
  getPool,
  closePool,

  // CRUD
  createUser,
  getUserById,
  getUserByUsername,
  listUsers,
  updateUser,
  deleteUser,
};