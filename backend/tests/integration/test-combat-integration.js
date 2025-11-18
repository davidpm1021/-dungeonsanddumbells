/**
 * Test Combat Integration with DM Orchestrator
 * Tests that combat is properly detected and initialized through /dm/interact endpoint
 */

const axios = require('axios');
const db = require('../../src/config/database');

const API_BASE = 'http://localhost:3000/api';

let testCharacter = null;
let testUserId = null;
let authToken = null;

async function setupTestCharacter() {
  console.log('Setting up test character...');

  try {
    // Create test user
    const userResult = await db.query(
      `INSERT INTO users (email, username, password_hash)
       VALUES ($1, $2, $3)
       ON CONFLICT (email) DO UPDATE SET username = EXCLUDED.username
       RETURNING id`,
      ['test-combat@test.com', 'test-combat-user', 'dummy-hash']
    );
    testUserId = userResult.rows[0].id;
    console.log(`  ✓ Test user created/found (ID: ${testUserId})`);

    // Create test character with some stat XP for testing
    const charResult = await db.query(
      `INSERT INTO characters (user_id, name, class, level, str_xp, dex_xp, con_xp)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [testUserId, 'Thorin', 'Fighter', 3, 600, 240, 360] // STR=16, DEX=12, CON=14
    );
    const characterId = charResult.rows[0].id;
    console.log(`  ✓ Test character created (ID: ${characterId})`);

    // Create combat stats for character (required for combat system)
    await db.query(
      `INSERT INTO character_combat_stats (character_id, armor_class, max_hit_points, current_hit_points)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (character_id) DO NOTHING`,
      [characterId, 15, 30, 30] // AC 15, 30 HP for testing
    );
    console.log(`  ✓ Combat stats created (AC 15, HP 30/30)`);

    // Get character with stats
    const statsResult = await db.query(
      `SELECT cs.*, ccs.armor_class, ccs.max_hit_points, ccs.current_hit_points
       FROM character_stats cs
       LEFT JOIN character_combat_stats ccs ON cs.id = ccs.character_id
       WHERE cs.id = $1`,
      [characterId]
    );

    if (statsResult.rows.length === 0) {
      throw new Error('Failed to retrieve character stats');
    }

    testCharacter = statsResult.rows[0];
    console.log(`  ✓ Character stats loaded (STR: ${testCharacter.str}, DEX: ${testCharacter.dex})`);
    console.log(`  ✓ Combat stats: AC ${testCharacter.armor_class}, HP ${testCharacter.current_hit_points}/${testCharacter.max_hit_points}`);

    return testCharacter;
  } catch (error) {
    console.error('  ✗ Setup failed:', error.message);
    throw error;
  }
}

async function cleanupTestCharacter() {
  if (testUserId) {
    console.log('Cleaning up test data...');
    try {
      await db.query('DELETE FROM characters WHERE user_id = $1', [testUserId]);
      await db.query('DELETE FROM users WHERE id = $1', [testUserId]);
      console.log('  ✓ Test data cleaned up');
    } catch (error) {
      console.error('  ✗ Cleanup failed:', error.message);
    }
  }
}

async function testCombatIntegration() {
  console.log('='.repeat(60));
  console.log('COMBAT INTEGRATION TEST');
  console.log('='.repeat(60));

  try {
    // Setup test character
    await setupTestCharacter();
    console.log('');

    // Test 1: Non-combat action
    console.log('\n[TEST 1] Non-combat action: "I look around the tavern"');
    const nonCombatResponse = await axios.post(`${API_BASE}/dm/interact`, {
      character: testCharacter,
      action: 'I look around the tavern',
      worldContext: 'You are in a busy tavern in the city of Waterdeep.',
      recentMessages: []
    });

    console.log('✓ Response received');
    console.log('  - Combat State:', nonCombatResponse.data.combatState ? 'PRESENT' : 'null');
    console.log('  - Narrative:', nonCombatResponse.data.narrative?.substring(0, 100) + '...');

    if (nonCombatResponse.data.combatState) {
      console.log('  ⚠️ WARNING: Combat initiated on non-combat action!');
    } else {
      console.log('  ✅ PASS: No combat on non-combat action');
    }

    // Test 2: Combat trigger action
    console.log('\n[TEST 2] Combat action: "I draw my sword and attack the bandit!"');
    const combatResponse = await axios.post(`${API_BASE}/dm/interact`, {
      character: testCharacter,
      action: 'I draw my sword and attack the bandit!',
      worldContext: 'A bandit steps out of the shadows, brandishing a rusty blade.',
      recentMessages: []
    });

    console.log('✓ Response received');
    console.log('  - Combat State:', combatResponse.data.combatState ? 'PRESENT ✓' : 'null ✗');
    console.log('  - Skill Check:', combatResponse.data.skillCheckResult ? 'PRESENT ✓' : 'null');
    console.log('  - Metadata - Combat Active:', combatResponse.data.metadata?.combatActive);
    console.log('  - Metadata - Combat Triggered:', combatResponse.data.metadata?.combatTriggered);

    if (combatResponse.data.combatState) {
      console.log('\n  📊 COMBAT STATE DETAILS:');
      const cs = combatResponse.data.combatState;
      console.log(`  - Encounter: ${cs.encounterName || cs.encounter?.encounterName || 'Unknown'}`);
      console.log(`  - Enemies: ${cs.enemies?.length || cs.encounter?.enemies?.length || 0}`);
      console.log(`  - Round: ${cs.currentRound || cs.encounter?.currentRound || 0}`);
      console.log('  ✅ PASS: Combat successfully initiated!');
    } else {
      console.log('  ❌ FAIL: Combat not initiated on combat action!');
      console.log('\n  Full response:', JSON.stringify(combatResponse.data, null, 2));
    }

    // Test 3: Skill check action
    console.log('\n[TEST 3] Skill check action: "I try to climb the wall"');
    const skillCheckResponse = await axios.post(`${API_BASE}/dm/interact`, {
      character: testCharacter,
      action: 'I try to climb the wall',
      worldContext: 'You stand before a 15-foot stone wall.',
      recentMessages: []
    });

    console.log('✓ Response received');
    console.log('  - Skill Check:', skillCheckResponse.data.skillCheckResult ? 'PRESENT ✓' : 'null');

    if (skillCheckResponse.data.skillCheckResult) {
      const scr = skillCheckResponse.data.skillCheckResult;
      console.log(`  - Type: ${scr.skillType}`);
      console.log(`  - Roll: ${scr.roll} + mods = ${scr.total} vs DC ${scr.dc}`);
      console.log(`  - Result: ${scr.success ? 'SUCCESS ✅' : 'FAILURE ❌'}`);
      console.log(`  - Breakdown: ${scr.modifiersBreakdown}`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('INTEGRATION TEST COMPLETE');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
    await cleanupTestCharacter();
    process.exit(1);
  } finally {
    // Always cleanup
    await cleanupTestCharacter();
    await db.end(); // Close database connection
  }
}

// Run test
testCombatIntegration().then(() => {
  console.log('\n✅ All done!');
  process.exit(0);
}).catch((error) => {
  console.error('\n❌ Fatal error:', error.message);
  process.exit(1);
});
