const db = require('./src/config/database');

async function checkCharacter23() {
  try {
    console.log('🔍 Checking character 23...\n');

    // Check if character 23 exists in characters table
    const charCheck = await db.query(`
      SELECT id, name, class, user_id, created_at
      FROM characters
      WHERE id = 23
    `);

    if (charCheck.rows.length === 0) {
      console.log('❌ Character 23 does NOT exist in characters table\n');
    } else {
      const char = charCheck.rows[0];
      console.log(`✅ Character 23 exists:`);
      console.log(`   Name: ${char.name}`);
      console.log(`   Class: ${char.class}`);
      console.log(`   User ID: ${char.user_id}`);
      console.log(`   Created: ${char.created_at}\n`);
    }

    // Check if character 23 has combat stats
    const combatCheck = await db.query(`
      SELECT character_id, armor_class, max_hit_points, current_hit_points
      FROM character_combat_stats
      WHERE character_id = 23
    `);

    if (combatCheck.rows.length === 0) {
      console.log('❌ Character 23 has NO combat stats\n');
    } else {
      const stats = combatCheck.rows[0];
      console.log(`✅ Character 23 combat stats:`);
      console.log(`   AC: ${stats.armor_class}`);
      console.log(`   HP: ${stats.current_hit_points}/${stats.max_hit_points}\n`);
    }

    // Check character_stats view (what combatManager queries)
    const viewCheck = await db.query(`
      SELECT cs.id, cs.name, cs.class, cs.dex
      FROM character_stats cs
      WHERE cs.id = 23
    `);

    if (viewCheck.rows.length === 0) {
      console.log('❌ Character 23 NOT in character_stats view\n');
    } else {
      console.log(`✅ Character 23 in character_stats view\n`);
    }

    console.log('='.repeat(60));
    console.log('🎯 DIAGNOSIS:');
    if (charCheck.rows.length === 0) {
      console.log('Character 23 was deleted after test cleanup');
      console.log('This is expected test behavior');
    } else if (combatCheck.rows.length === 0) {
      console.log('Character 23 exists but has NO combat stats');
      console.log('This means combat stats INSERT failed during creation');
      console.log('\nSOLUTION: Check why combat stats INSERT is failing');
    } else {
      console.log('Character 23 has complete data - combat should work');
    }
    console.log('='.repeat(60) + '\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Check failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

checkCharacter23();
