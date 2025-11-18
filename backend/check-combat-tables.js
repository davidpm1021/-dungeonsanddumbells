const db = require('./src/config/database');

async function checkTables() {
  try {
    // Check all combat-related tables
    const result = await db.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name LIKE '%combat%'
      ORDER BY table_name
    `);

    console.log('Combat-related tables:');
    result.rows.forEach(t => console.log(`- ${t.table_name}`));

    // Check character_combat_stats schema if it exists
    const statsTableCheck = await db.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'character_combat_stats'
      ORDER BY ordinal_position
    `);

    if (statsTableCheck.rows.length > 0) {
      console.log('\ncharacter_combat_stats columns:');
      statsTableCheck.rows.forEach(c => console.log(`- ${c.column_name}: ${c.data_type}`));
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkTables();
