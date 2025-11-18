require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function checkTable() {
  try {
    const res = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'character_stats'
      ORDER BY ordinal_position
    `);

    console.log('character_stats view columns:');
    res.rows.forEach(r => console.log(`  - ${r.column_name} (${r.data_type})`));

    await pool.end();
  } catch (err) {
    console.error('Error:', err.message);
    await pool.end();
    process.exit(1);
  }
}

checkTable();
