'use strict';

const { Pool } = require('pg');

// ==============================
// Database Pool Configuration
// ==============================
const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT, 10),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  max: 10, // maximum number of clients in pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// ==============================
// Input Validation Helpers
// ==============================
function validateString(value, fieldName) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new TypeError(`${fieldName} must be a non-empty string`);
  }
}

function validateNumber(value, fieldName) {
  if (typeof value !== 'number' || isNaN(value)) {
    throw new TypeError(`${fieldName} must be a valid number`);
  }
}

function validateUserInput(user) {
  if (typeof user !== 'object' || user === null) {
    throw new TypeError('User must be an object');
  }
  validateString(user.name, 'name');
  validateString(user.email, 'email');
  validateString(user.password, 'password');
}

// ==============================
// CRUD Operations
// ==============================

// CREATE USER
async function createUser(user) {
  validateUserInput(user);

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const query = `
      INSERT INTO users (name, email, password)
      VALUES ($1, $2, $3)
      RETURNING id, name, email, created_at
    `;

    const values = [user.name, user.email, user.password];

    const result = await client.query(query, values);

    await client.query('COMMIT');

    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw new Error('Error creating user');
  } finally {
    client.release();
  }
}

// READ USER BY ID
async function getUserById(userId) {
  validateNumber(userId, 'userId');

  const query = `
    SELECT id, name, email, created_at
    FROM users
    WHERE id = $1
  `;

  const values = [userId];

  const result = await pool.query(query, values);

  return result.rows[0] || null;
}

// READ ALL USERS
async function getAllUsers() {
  const query = `
    SELECT id, name, email, created_at
    FROM users
    ORDER BY created_at DESC
  `;

  const result = await pool.query(query);

  return result.rows;
}

// UPDATE USER
async function updateUser(userId, updates) {
  validateNumber(userId, 'userId');

  if (typeof updates !== 'object' || updates === null) {
    throw new TypeError('updates must be an object');
  }

  const allowedFields = ['name', 'email', 'password'];
  const fields = [];
  const values = [];
  let index = 1;

  for (const key of allowedFields) {
    if (updates[key] !== undefined) {
      validateString(updates[key], key);
      fields.push(`${key} = $${index}`);
      values.push(updates[key]);
      index++;
    }
  }

  if (fields.length === 0) {
    throw new Error('No valid fields provided for update');
  }

  values.push(userId);

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const query = `
      UPDATE users
      SET ${fields.join(', ')}
      WHERE id = $${index}
      RETURNING id, name, email, created_at
    `;

    const result = await client.query(query, values);

    await client.query('COMMIT');

    return result.rows[0] || null;
  } catch (error) {
    await client.query('ROLLBACK');
    throw new Error('Error updating user');
  } finally {
    client.release();
  }
}

// DELETE USER
async function deleteUser(userId) {
  validateNumber(userId, 'userId');

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const query = `
      DELETE FROM users
      WHERE id = $1
      RETURNING id
    `;

    const result = await client.query(query, [userId]);

    await client.query('COMMIT');

    return result.rowCount > 0;
  } catch (error) {
    await client.query('ROLLBACK');
    throw new Error('Error deleting user');
  } finally {
    client.release();
  }
}

// ==============================
// Export Module
// ==============================
module.exports = {
  createUser,
  getUserById,
  getAllUsers,
  updateUser,
  deleteUser,
};