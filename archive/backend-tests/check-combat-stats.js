const db = require('./src/config/database');

async function checkCombatStats() {
  try {
    console.log('🔍 Checking character_combat_stats table...\n');

    // Check if table exists
    const tableCheck = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'character_combat_stats'
      )
    `);
    console.log(`character_combat_stats table exists: ${tableCheck.rows[0].exists}`);

    if (!tableCheck.rows[0].exists) {
      console.log('\n❌ Table does not exist! Combat system cannot function.\n');
      process.exit(1);
    }

    // Check all character IDs that have combat stats
    const statsCheck = await db.query(`
      SELECT character_id, armor_class, max_hit_points, current_hit_points
      FROM character_combat_stats
    `);
    console.log(`\n✅ ${statsCheck.rows.length} characters have combat stats:`);
    statsCheck.rows.forEach(row => {
      console.log(`   Character ${row.character_id}: AC ${row.armor_class}, HP ${row.current_hit_points}/${row.max_hit_points}`);
    });

    // Check all characters that DON'T have combat stats
    const missingStats = await db.query(`
      SELECT c.id, c.name, c.class
      FROM characters c
      LEFT JOIN character_combat_stats ccs ON c.id = ccs.character_id
      WHERE ccs.character_id IS NULL
    `);
    console.log(`\n⚠️  ${missingStats.rows.length} characters MISSING combat stats:`);
    if (missingStats.rows.length > 0) {
      missingStats.rows.forEach(row => {
        console.log(`   Character ${row.id}: ${row.name} (${row.class})`);
      });
    }

    console.log('\n' + '='.repeat(60));
    console.log('🎯 ROOT CAUSE IDENTIFIED:');
    console.log('Combat initialization requires character_combat_stats,');
    console.log('but characters are not auto-initialized with combat stats.');
    console.log('\nSOLUTION: Change INNER JOIN to LEFT JOIN and handle null stats.');
    console.log('='.repeat(60) + '\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Check failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

checkCombatStats();
