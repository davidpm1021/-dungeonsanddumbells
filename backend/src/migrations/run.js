const fs = require('fs');
const path = require('path');
const pool = require('../config/database');

async function runMigrations() {
  try {
    console.log('🔄 Starting migrations...\n');

    // Create migrations table if not exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Migrations table ready\n');

    // Get all migration files
    const migrationsDir = __dirname;
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort(); // Ensures migrations run in order

    if (files.length === 0) {
      console.log('ℹ️  No migration files found');
      process.exit(0);
    }

    let executed = 0;
    let skipped = 0;

    for (const file of files) {
      // Check if already executed
      const result = await pool.query(
        'SELECT * FROM migrations WHERE filename = $1',
        [file]
      );

      if (result.rows.length === 0) {
        console.log(`🔄 Running migration: ${file}`);
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');

        await pool.query('BEGIN');
        try {
          // Split by semicolons but be careful with function definitions
          const statements = sql
            .split(/;(?=(?:[^']*'[^']*')*[^']*$)/) // Split on ; not inside quotes
            .map(s => s.trim())
            .filter(s => s.length > 0);

          for (const statement of statements) {
            if (statement) {
              await pool.query(statement);
            }
          }

          await pool.query(
            'INSERT INTO migrations (filename) VALUES ($1)',
            [file]
          );
          await pool.query('COMMIT');
          console.log(`✅ Migration ${file} completed\n`);
          executed++;
        } catch (err) {
          await pool.query('ROLLBACK');
          console.error(`❌ Migration ${file} failed:`, err.message);
          throw err;
        }
      } else {
        console.log(`⊘  Migration ${file} already executed (skipping)\n`);
        skipped++;
      }
    }

    console.log('🎉 All migrations completed successfully!');
    console.log(`   Executed: ${executed}, Skipped: ${skipped}`);
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Migration failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  runMigrations();
}

module.exports = { runMigrations };
