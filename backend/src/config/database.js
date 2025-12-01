const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'dumbbells_dragons_dev',
  user: 'postgres',
  // Database password should be provided via environment variable in backend/.env
  // Example: DB_PASSWORD=your_strong_password_here
  password: process.env.DB_PASSWORD,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Test connection on initialization
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Database connection error:', err.message);
    console.error('Make sure PostgreSQL is running and DATABASE_URL is correct');
  } else {
    console.log('✅ Database connected successfully');
    console.log('📅 Database time:', res.rows[0].now);
  }
});

// Handle pool errors
pool.on('error', (err) => {
  console.error('Unexpected database error:', err);
  process.exit(-1);
});

module.exports = pool;
