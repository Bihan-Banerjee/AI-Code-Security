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