const db = require('./src/config/database');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  try {
    console.log('Running Migration 011: Combat System Tables...');

    const migrationSQL = fs.readFileSync(
      path.join(__dirname, 'src/migrations/011_combat_system_tables.sql'),
      'utf8'
    );

    await db.query(migrationSQL);

    console.log('✅ Migration 011 completed successfully!');
    console.log('✅ Created tables: character_combat_stats, combat_encounters, skill_check_history');

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

runMigration();
