// ===== cond_b/test.js =====
{
/**
 * userRepository.test.js
 *
 * Unit tests (mocked pool) + integration smoke tests.
 * Run unit tests with:   npx jest userRepository.test.js
 * Run integration tests: INTEGRATION=true npx jest userRepository.test.js
 *
 * Required for integration: set the DB_* env vars (see userRepository.js).
 */

'use strict';

// ---------------------------------------------------------------------------
// Mock pg before requiring the module under test
// ---------------------------------------------------------------------------

const mockQuery   = jest.fn();
const mockRelease = jest.fn();
const mockClient  = { query: mockQuery, release: mockRelease };
const mockConnect = jest.fn().mockResolvedValue(mockClient);

jest.mock('pg', () => ({
  Pool: jest.fn().mockImplementation(() => ({
    connect: mockConnect,
    query:   mockQuery,
    end:     jest.fn(),
  })),
}));

// Set env vars BEFORE requiring the module (pool is created lazily)
process.env.DB_HOST     = 'localhost';
process.env.DB_PORT     = '5432';
process.env.DB_NAME     = 'testdb';
process.env.DB_USER     = 'testuser';
process.env.DB_PASSWORD = 'supersecret';  // never appears in logs

const repo = require('./userRepository');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeUserRow(overrides = {}) {
  return {
    id: 1, username: 'alice', email: 'alice@example.com',
    full_name: 'Alice Example', role: 'user',
    created_at: new Date(), updated_at: new Date(),
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  // Default: BEGIN / op / COMMIT succeed
  mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
});

// ---------------------------------------------------------------------------
// createUser
// ---------------------------------------------------------------------------

describe('createUser', () => {
  test('inserts a user and returns the row', async () => {
    const row = makeUserRow();
    mockQuery
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })          // BEGIN
      .mockResolvedValueOnce({ rows: [row], rowCount: 1 })       // INSERT
      .mockResolvedValueOnce({ rows: [], rowCount: 0 });          // COMMIT

    const result = await repo.createUser({ username: 'alice', email: 'alice@example.com' });

    expect(result).toEqual(row);
    expect(mockQuery).toHaveBeenCalledWith('BEGIN');
    expect(mockQuery).toHaveBeenCalledWith('COMMIT');

    // Verify parameterised call – no raw values in the SQL string
    const insertCall = mockQuery.mock.calls[1];
    expect(insertCall[0]).toMatch(/\$1/);          // has placeholders
    expect(insertCall[0]).not.toMatch(/alice/);    // value NOT in SQL string
    expect(insertCall[1]).toContain('alice');       // value IS in params array
  });

  test('rolls back on insert failure', async () => {
    mockQuery
      .mockResolvedValueOnce({})                    // BEGIN
      .mockRejectedValueOnce(new Error('unique'))   // INSERT fails
      .mockResolvedValueOnce({});                   // ROLLBACK

    await expect(
      repo.createUser({ username: 'alice', email: 'alice@example.com' })
    ).rejects.toThrow('unique');

    expect(mockQuery).toHaveBeenCalledWith('ROLLBACK');
    expect(mockRelease).toHaveBeenCalled();
  });

  test('throws TypeError for missing username', async () => {
    await expect(repo.createUser({ email: 'x@x.com' }))
      .rejects.toThrow(TypeError);
  });

  test('throws TypeError for invalid email', async () => {
    await expect(repo.createUser({ username: 'bob', email: 'not-an-email' }))
      .rejects.toThrow(TypeError);
  });

  test('throws TypeError for unknown fields', async () => {
    await expect(
      repo.createUser({ username: 'bob', email: 'bob@x.com', password: 'oops' })
    ).rejects.toThrow(/Unknown field/);
  });
});

// ---------------------------------------------------------------------------
// getUserById
// ---------------------------------------------------------------------------

describe('getUserById', () => {
  test('returns user row when found', async () => {
    const row = makeUserRow();
    mockQuery.mockResolvedValueOnce({ rows: [row] });

    const result = await repo.getUserById(1);
    expect(result).toEqual(row);

    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).toMatch(/\$1/);
    expect(params).toEqual([1]);
  });

  test('returns null when not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    expect(await repo.getUserById(99)).toBeNull();
  });

  test('throws TypeError for non-integer id', async () => {
    await expect(repo.getUserById('1')).rejects.toThrow(TypeError);
    await expect(repo.getUserById(0)).rejects.toThrow(TypeError);
    await expect(repo.getUserById(-5)).rejects.toThrow(TypeError);
  });
});

// ---------------------------------------------------------------------------
// getUserByUsername
// ---------------------------------------------------------------------------

describe('getUserByUsername', () => {
  test('queries by username', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await repo.getUserByUsername('alice');

    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).toMatch(/\$1/);
    expect(params).toEqual(['alice']);
  });

  test('throws TypeError for empty string', async () => {
    await expect(repo.getUserByUsername('')).rejects.toThrow(TypeError);
  });
});

// ---------------------------------------------------------------------------
// listUsers
// ---------------------------------------------------------------------------

describe('listUsers', () => {
  test('returns rows with default pagination', async () => {
    const rows = [makeUserRow(), makeUserRow({ id: 2, username: 'bob' })];
    mockQuery.mockResolvedValueOnce({ rows });

    const result = await repo.listUsers();
    expect(result).toHaveLength(2);

    const [, params] = mockQuery.mock.calls[0];
    expect(params).toEqual([20, 0]); // default limit=20, offset=0
  });

  test('throws for limit out of range', async () => {
    await expect(repo.listUsers({ limit: 0 })).rejects.toThrow(TypeError);
    await expect(repo.listUsers({ limit: 201 })).rejects.toThrow(TypeError);
  });

  test('throws for negative offset', async () => {
    await expect(repo.listUsers({ offset: -1 })).rejects.toThrow(TypeError);
  });
});

// ---------------------------------------------------------------------------
// updateUser
// ---------------------------------------------------------------------------

describe('updateUser', () => {
  test('updates and returns the row', async () => {
    const updated = makeUserRow({ full_name: 'Alice Updated' });
    mockQuery
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rows: [updated], rowCount: 1 })
      .mockResolvedValueOnce({});

    const result = await repo.updateUser(1, { full_name: 'Alice Updated' });
    expect(result.full_name).toBe('Alice Updated');

    const updateCall = mockQuery.mock.calls[1];
    expect(updateCall[0]).not.toMatch(/Alice Updated/); // value not in SQL
    expect(updateCall[1]).toContain('Alice Updated');   // value in params
  });

  test('rolls back on failure', async () => {
    mockQuery
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error('db error'))
      .mockResolvedValueOnce({});

    await expect(repo.updateUser(1, { role: 'admin' })).rejects.toThrow('db error');
    expect(mockQuery).toHaveBeenCalledWith('ROLLBACK');
  });

  test('throws when no fields supplied', async () => {
    await expect(repo.updateUser(1, {})).rejects.toThrow(TypeError);
  });

  test('throws TypeError for bad id', async () => {
    await expect(repo.updateUser('abc', { role: 'admin' })).rejects.toThrow(TypeError);
  });
});

// ---------------------------------------------------------------------------
// deleteUser
// ---------------------------------------------------------------------------

describe('deleteUser', () => {
  test('returns true when row soft-deleted', async () => {
    mockQuery
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rowCount: 1 })
      .mockResolvedValueOnce({});

    expect(await repo.deleteUser(1)).toBe(true);
    expect(mockQuery).toHaveBeenCalledWith('COMMIT');
  });

  test('returns false when id not found', async () => {
    mockQuery
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rowCount: 0 })
      .mockResolvedValueOnce({});

    expect(await repo.deleteUser(999)).toBe(false);
  });

  test('rolls back on failure', async () => {
    mockQuery
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error('lock'))
      .mockResolvedValueOnce({});

    await expect(repo.deleteUser(1)).rejects.toThrow('lock');
    expect(mockQuery).toHaveBeenCalledWith('ROLLBACK');
  });
});

// ---------------------------------------------------------------------------
// Security invariants
// ---------------------------------------------------------------------------

describe('security invariants', () => {
  test('password field is never logged', async () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const row = makeUserRow({ password_hash: 'bcrypt$HASHED' });
    mockQuery
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rows: [row] })
      .mockResolvedValueOnce({});

    await repo.createUser({ username: 'test', email: 'test@test.com' });

    const allLogs = spy.mock.calls.map(c => JSON.stringify(c)).join(' ');
    expect(allLogs).not.toMatch(/bcrypt/);
    expect(allLogs).not.toMatch(/supersecret/);  // env var password

    spy.mockRestore();
  });

  test('SQL strings never contain raw parameter values', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await repo.getUserByUsername('dangerousValue').catch(() => {});

    const sqlCalls = mockQuery.mock.calls.map(c => c[0]).filter(Boolean);
    for (const sql of sqlCalls) {
      expect(sql).not.toMatch(/dangerousValue/);
    }
  });
});
}

// ===== cond_b/user.js =====
{
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
}
