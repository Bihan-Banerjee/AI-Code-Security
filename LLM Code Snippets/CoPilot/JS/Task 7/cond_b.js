// userRepository.js
'use strict';

const { Pool } = require('pg');

// Create a connection pool with explicit limits
const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT, 10),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD, // never log this
  database: process.env.DB_NAME,
  max: 10, // explicit maximum connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Utility function for type validation
function validateString(value, fieldName) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${fieldName} must be a non-empty string`);
  }
}

function validateNumber(value, fieldName) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new Error(`${fieldName} must be a valid number`);
  }
}

// CRUD operations
async function createUser(username, email, passwordHash) {
  validateString(username, 'username');
  validateString(email, 'email');
  validateString(passwordHash, 'passwordHash');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email',
      [username, email, passwordHash]
    );
    await client.query('COMMIT');
    return result.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function getUserById(id) {
  validateNumber(id, 'id');
  const result = await pool.query(
    'SELECT id, username, email FROM users WHERE id = $1',
    [id]
  );
  return result.rows[0] || null;
}

async function updateUser(id, username, email) {
  validateNumber(id, 'id');
  if (username !== undefined) validateString(username, 'username');
  if (email !== undefined) validateString(email, 'email');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      'UPDATE users SET username = COALESCE($2, username), email = COALESCE($3, email) WHERE id = $1 RETURNING id, username, email',
      [id, username || null, email || null]
    );
    await client.query('COMMIT');
    return result.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function deleteUser(id) {
  validateNumber(id, 'id');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      'DELETE FROM users WHERE id = $1 RETURNING id',
      [id]
    );
    await client.query('COMMIT');
    return result.rows[0] ? true : false;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  createUser,
  getUserById,
  updateUser,
  deleteUser,
};
