// ===== cond_a/db.js =====
// config/db.js
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '5432'),
  max: 20,                    // maximum number of clients in the pool
  idleTimeoutMillis: 30000,   // close idle clients after 30 seconds
  connectionTimeoutMillis: 2000,
});

// Test database connection
pool.on('connect', () => {
  console.log('✅ New client connected to PostgreSQL');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

export default pool;

// ===== cond_a/userModel.js =====
// models/userModel.js
import pool from '../config/db.js';

/**
 * User Model with basic CRUD operations
 */

const User = {
  // CREATE
  async create(userData) {
    const { name, email, age, role = 'user' } = userData;

    const query = `
      INSERT INTO users (name, email, age, role)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;

    const values = [name, email, age, role];

    try {
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      if (error.code === '23505') { // unique_violation
        throw new Error('Email already exists');
      }
      throw error;
    }
  },

  // READ ALL with optional pagination
  async findAll({ limit = 10, offset = 0 } = {}) {
    const query = `
      SELECT id, name, email, age, role, created_at, updated_at
      FROM users
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2;
    `;

    const result = await pool.query(query, [limit, offset]);
    return result.rows;
  },

  // READ ONE by ID
  async findById(id) {
    const query = `
      SELECT id, name, email, age, role, created_at, updated_at
      FROM users
      WHERE id = $1;
    `;

    const result = await pool.query(query, [id]);
    return result.rows[0];
  },

  // READ ONE by Email
  async findByEmail(email) {
    const query = `
      SELECT * FROM users WHERE email = $1;
    `;

    const result = await pool.query(query, [email]);
    return result.rows[0];
  },

  // UPDATE
  async update(id, userData) {
    const { name, email, age, role } = userData;

    const query = `
      UPDATE users
      SET 
        name = COALESCE($1, name),
        email = COALESCE($2, email),
        age = COALESCE($3, age),
        role = COALESCE($4, role),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING *;
    `;

    const values = [name, email, age, role, id];

    const result = await pool.query(query, values);
    return result.rows[0];
  },

  // DELETE
  async delete(id) {
    const query = `
      DELETE FROM users
      WHERE id = $1
      RETURNING *;
    `;

    const result = await pool.query(query, [id]);
    return result.rows[0];
  },

  // Optional: Count total users
  async count() {
    const result = await pool.query('SELECT COUNT(*) FROM users');
    return parseInt(result.rows[0].count);
  }
};

export default User;

// ===== cond_a/userRoutes.js =====
// routes/userRoutes.js
import express from 'express';
import User from '../models/userModel.js';

const router = express.Router();

// Create User
router.post('/', async (req, res) => {
  try {
    const user = await User.create(req.body);
    res.status(201).json({ success: true, data: user });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Get All Users
router.get('/', async (req, res) => {
  try {
    const { limit, page = 1 } = req.query;
    const offset = (page - 1) * (limit || 10);
    const users = await User.findAll({ limit, offset });
    const total = await User.count();

    res.json({
      success: true,
      data: users,
      pagination: { page: Number(page), limit, total }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get User by ID
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update User
router.put('/:id', async (req, res) => {
  try {
    const user = await User.update(req.params.id, req.body);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Delete User
router.delete('/:id', async (req, res) => {
  try {
    const user = await User.delete(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, message: 'User deleted successfully', data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
