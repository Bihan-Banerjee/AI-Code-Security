import pkg from 'pg';
const { Pool } = pkg;

// (2) Credentials loaded exclusively from process.env
// (4) Connection pool with explicit limits
const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 5432,
  max: 20, // Maximum connections in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export default pool;