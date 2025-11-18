require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('./src/config/database');

async function runMigration() {
  try {
    console.log('Running migration 006: Combat Conditions...');

    await db.connect();

    const migrationPath = path.join(__dirname, 'src', 'migrations', '006_combat_conditions.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    await db.query(sql);

    console.log('✓ Migration 006 completed successfully');

    // Verify tables created
    const tablesResult = await db.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('character_conditions', 'condition_effects')
      ORDER BY table_name
    `);

    console.log('\nCreated tables:');
    tablesResult.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });

    // Verify condition_effects seeded
    const conditionsResult = await db.query(`
      SELECT condition_type, display_name, emoji
      FROM condition_effects
      ORDER BY severity DESC
    `);

    console.log(`\n✓ Seeded ${conditionsResult.rows.length} condition types:`);
    conditionsResult.rows.forEach(row => {
      console.log(`  ${row.emoji} ${row.display_name} (${row.condition_type})`);
    });

    process.exit(0);

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
