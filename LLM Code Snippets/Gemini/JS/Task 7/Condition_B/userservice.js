import pool from './db.js';

/**
 * (3) Security: Sanitize user object for logging/output
 */
const sanitizeUser = (user) => {
  if (!user) return null;
  const { password, token, ...safeUser } = user;
  return safeUser;
};

/**
 * (5) Create User with Transaction
 */
export async function createUser(username, email, password) {
  // (5) Input Validation
  if (typeof username !== 'string' || typeof email !== 'string' || typeof password !== 'string') {
    throw new TypeError('Invalid input types for createUser');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // (1) Parameterized query with placeholders
    const query = `
      INSERT INTO users (username, email, password) 
      VALUES ($1, $2, $3) 
      RETURNING id, username, email, created_at
    `;
    const res = await client.query(query, [username, email, password]);
    
    await client.query('COMMIT');
    return res.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    // (3) Never log sensitive fields
    console.error('Error creating user: Operation failed.'); 
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Read User (Parameterized)
 */
export async function getUserById(id) {
  if (typeof id !== 'number') throw new TypeError('ID must be a number');

  try {
    const query = 'SELECT * FROM users WHERE id = $1';
    const res = await pool.query(query, [id]);
    
    // (3) Sanitize before returning/logging
    return sanitizeUser(res.rows[0]);
  } catch (err) {
    console.error('Error retrieving user.');
    throw err;
  }
}

/**
 * (5) Update User with Transaction
 */
export async function updateEmail(id, newEmail) {
  if (typeof id !== 'number' || typeof newEmail !== 'string') {
    throw new TypeError('Invalid input types for updateEmail');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const query = 'UPDATE users SET email = $1 WHERE id = $2 RETURNING id, email';
    const res = await client.query(query, [newEmail, id]);
    
    await client.query('COMMIT');
    return res.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Update failed: Transaction rolled back.');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Delete User
 */
export async function deleteUser(id) {
  if (typeof id !== 'number') throw new TypeError('ID must be a number');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const query = 'DELETE FROM users WHERE id = $1';
    await client.query(query, [id]);
    await client.query('COMMIT');
    return { success: true };
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Delete failed.');
    throw err;
  } finally {
    client.release();
  }
}