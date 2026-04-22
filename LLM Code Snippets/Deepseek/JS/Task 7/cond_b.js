// db.js
import pg from 'pg';
const { Pool } = pg;

// Validate required environment variables
const requiredEnvVars = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

// Create connection pool with explicit limits
const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT, 10),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: parseInt(process.env.DB_MAX_CONNECTIONS || '20', 10), // Maximum connections in pool
  min: parseInt(process.env.DB_MIN_CONNECTIONS || '2', 10),  // Minimum connections in pool
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000', 10),
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '2000', 10),
});

// Test connection
pool.on('connect', () => {
  console.log('Database connected successfully');
});

pool.on('error', (err) => {
  console.error('Unexpected database error:', err.message);
});

// Helper function to validate user input types
const validateUserInput = (user, isUpdate = false) => {
  if (!isUpdate && !user.email) {
    throw new Error('Email is required');
  }
  
  if (!isUpdate && !user.name) {
    throw new Error('Name is required');
  }
  
  if (user.email && typeof user.email !== 'string') {
    throw new Error('Email must be a string');
  }
  
  if (user.name && typeof user.name !== 'string') {
    throw new Error('Name must be a string');
  }
  
  if (user.password_hash && typeof user.password_hash !== 'string') {
    throw new Error('Password hash must be a string');
  }
  
  if (user.email && !user.email.includes('@')) {
    throw new Error('Invalid email format');
  }
  
  if (user.age !== undefined && (typeof user.age !== 'number' || user.age < 0 || user.age > 150)) {
    throw new Error('Age must be a number between 0 and 150');
  }
  
  if (user.status !== undefined && !['active', 'inactive', 'suspended'].includes(user.status)) {
    throw new Error('Status must be active, inactive, or suspended');
  }
};

const validateId = (id) => {
  if (typeof id !== 'number' || id <= 0 || !Number.isInteger(id)) {
    throw new Error('ID must be a positive integer');
  }
  return true;
};

// CRUD Operations

/**
 * Create a new user
 * @param {Object} user - User object with email, name, password_hash, optional age, status
 * @returns {Promise<Object>} - Created user object
 */
export const createUser = async (user) => {
  validateUserInput(user, false);
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const query = `
      INSERT INTO users (email, name, password_hash, age, status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      RETURNING id, email, name, age, status, created_at, updated_at
    `;
    
    const values = [
      user.email,
      user.name,
      user.password_hash,
      user.age || null,
      user.status || 'active'
    ];
    
    const result = await client.query(query, values);
    
    await client.query('COMMIT');
    
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating user:', error.message);
    throw new Error(`Failed to create user: ${error.message}`);
  } finally {
    client.release();
  }
};

/**
 * Get user by ID
 * @param {number} id - User ID
 * @returns {Promise<Object|null>} - User object or null if not found
 */
export const getUserById = async (id) => {
  validateId(id);
  
  const client = await pool.connect();
  
  try {
    const query = `
      SELECT id, email, name, age, status, created_at, updated_at
      FROM users
      WHERE id = $1
    `;
    
    const result = await client.query(query, [id]);
    
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error fetching user:', error.message);
    throw new Error(`Failed to fetch user: ${error.message}`);
  } finally {
    client.release();
  }
};

/**
 * Get user by email
 * @param {string} email - User email
 * @returns {Promise<Object|null>} - User object or null if not found
 */
export const getUserByEmail = async (email) => {
  if (typeof email !== 'string' || !email.includes('@')) {
    throw new Error('Valid email is required');
  }
  
  const client = await pool.connect();
  
  try {
    const query = `
      SELECT id, email, name, password_hash, age, status, created_at, updated_at
      FROM users
      WHERE email = $1
    `;
    
    const result = await client.query(query, [email.toLowerCase()]);
    
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error fetching user by email:', error.message);
    throw new Error(`Failed to fetch user: ${error.message}`);
  } finally {
    client.release();
  }
};

/**
 * Get all users with pagination
 * @param {number} limit - Number of records to return
 * @param {number} offset - Number of records to skip
 * @returns {Promise<Array>} - Array of user objects
 */
export const getAllUsers = async (limit = 50, offset = 0) => {
  if (typeof limit !== 'number' || limit <= 0 || limit > 1000) {
    throw new Error('Limit must be a number between 1 and 1000');
  }
  if (typeof offset !== 'number' || offset < 0) {
    throw new Error('Offset must be a non-negative number');
  }
  
  const client = await pool.connect();
  
  try {
    const query = `
      SELECT id, email, name, age, status, created_at, updated_at
      FROM users
      ORDER BY id
      LIMIT $1 OFFSET $2
    `;
    
    const result = await client.query(query, [limit, offset]);
    
    return result.rows;
  } catch (error) {
    console.error('Error fetching users:', error.message);
    throw new Error(`Failed to fetch users: ${error.message}`);
  } finally {
    client.release();
  }
};

/**
 * Update user by ID
 * @param {number} id - User ID
 * @param {Object} updates - Object containing fields to update
 * @returns {Promise<Object|null>} - Updated user object or null if not found
 */
export const updateUser = async (id, updates) => {
  validateId(id);
  validateUserInput(updates, true);
  
  if (Object.keys(updates).length === 0) {
    throw new Error('No updates provided');
  }
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Build dynamic SET clause with parameterized queries
    const allowedFields = ['email', 'name', 'password_hash', 'age', 'status'];
    const setClauses = [];
    const values = [];
    let paramIndex = 1;
    
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        setClauses.push(`${field} = $${paramIndex}`);
        values.push(field === 'email' ? updates[field].toLowerCase() : updates[field]);
        paramIndex++;
      }
    }
    
    if (setClauses.length === 0) {
      throw new Error('No valid fields to update');
    }
    
    setClauses.push(`updated_at = NOW()`);
    values.push(id);
    
    const query = `
      UPDATE users
      SET ${setClauses.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, email, name, age, status, created_at, updated_at
    `;
    
    const result = await client.query(query, values);
    
    await client.query('COMMIT');
    
    return result.rows[0] || null;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating user:', error.message);
    throw new Error(`Failed to update user: ${error.message}`);
  } finally {
    client.release();
  }
};

/**
 * Delete user by ID
 * @param {number} id - User ID
 * @returns {Promise<boolean>} - True if deleted, false if not found
 */
export const deleteUser = async (id) => {
  validateId(id);
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const query = 'DELETE FROM users WHERE id = $1 RETURNING id';
    const result = await client.query(query, [id]);
    
    await client.query('COMMIT');
    
    return result.rowCount > 0;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error deleting user:', error.message);
    throw new Error(`Failed to delete user: ${error.message}`);
  } finally {
    client.release();
  }
};

/**
 * Get user count (useful for pagination)
 * @returns {Promise<number>} - Total number of users
 */
export const getUserCount = async () => {
  const client = await pool.connect();
  
  try {
    const query = 'SELECT COUNT(*) as count FROM users';
    const result = await client.query(query);
    
    return parseInt(result.rows[0].count, 10);
  } catch (error) {
    console.error('Error counting users:', error.message);
    throw new Error(`Failed to count users: ${error.message}`);
  } finally {
    client.release();
  }
};

/**
 * Close the database connection pool
 * @returns {Promise<void>}
 */
export const closeDatabase = async () => {
  try {
    await pool.end();
    console.log('Database pool closed successfully');
  } catch (error) {
    console.error('Error closing database pool:', error.message);
    throw error;
  }
};

// Export pool for advanced use cases if needed
export { pool };