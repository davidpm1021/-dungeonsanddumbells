/**
 * Test Graduated Success Implementation
 * Tests Bronze/Silver/Gold completion levels for goals
 */

const db = require('./src/config/database');
const goalService = require('./src/services/goalService');

async function testGraduatedSuccess() {
  console.log('='.repeat(60));
  console.log('GRADUATED SUCCESS TEST');
  console.log('='.repeat(60) + '\n');

  let testUserId = null;
  let testCharacterId = null;
  let testGoalId = null;

  try {
    // Setup: Create test user and character
    console.log('Setting up test data...');
    const userResult = await db.query(
      `INSERT INTO users (email, username, password_hash)
       VALUES ($1, $2, $3)
       ON CONFLICT (email) DO UPDATE SET username = EXCLUDED.username
       RETURNING id`,
      ['test-graduated@test.com', 'test-graduated-user', 'dummy-hash']
    );
    testUserId = userResult.rows[0].id;

    const charResult = await db.query(
      `INSERT INTO characters (user_id, name, class, level, con_xp)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [testUserId, 'Test Runner', 'Fighter', 1, 100]
    );
    testCharacterId = charResult.rows[0].id;

    console.log(`  ✓ Test user created (ID: ${testUserId})`);
    console.log(`  ✓ Test character created (ID: ${testCharacterId})\n`);

    // Create a quantitative goal: "Run 10 miles this week"
    console.log('Creating quantitative goal: "Run 10 miles this week"');
    const goal = await goalService.createGoal(testCharacterId, {
      name: 'Run 10 miles this week',
      description: 'Cardio endurance training',
      statMapping: 'CON',
      goalType: 'quantitative',
      targetValue: 10,
      frequency: 'weekly'
    });
    testGoalId = goal.id;
    console.log(`  ✓ Goal created (ID: ${goal.id})`);
    console.log(`  ✓ Target: ${goal.targetValue} miles`);
    console.log(`  ✓ Base XP: 50 (weekly frequency)\n`);

    // Test 1: Gold completion (100% - 10 miles)
    console.log('[TEST 1] Gold Completion: 10/10 miles (100%)');
    const goldResult = await goalService.completeGoal(testGoalId, 10, 'Full distance completed!');
    console.log(`  ✓ Level: ${goldResult.graduatedSuccess.level.toUpperCase()} 🥇`);
    console.log(`  ✓ Percentage: ${goldResult.graduatedSuccess.percentage.toFixed(1)}%`);
    console.log(`  ✓ Multiplier: ${goldResult.graduatedSuccess.multiplier}x`);
    console.log(`  ✓ Base XP: 50`);
    console.log(`  ✓ XP Awarded: ${goldResult.xpAwarded} (50 × 2.0)`);
    console.log(`  ✓ Expected: 100 XP\n`);

    if (goldResult.graduatedSuccess.level !== 'gold' || goldResult.xpAwarded !== 100) {
      throw new Error(`❌ Gold test failed! Expected level=gold, xp=100, got level=${goldResult.graduatedSuccess.level}, xp=${goldResult.xpAwarded}`);
    }

    // Test 2: Silver completion (75% - 7.5 miles)
    // Create a new goal for tomorrow
    await db.query(`DELETE FROM goal_completions WHERE goal_id = $1`, [testGoalId]);
    console.log('[TEST 2] Silver Completion: 7.5/10 miles (75%)');
    const silverResult = await goalService.completeGoal(testGoalId, 7.5, 'Good effort despite busy week');
    console.log(`  ✓ Level: ${silverResult.graduatedSuccess.level.toUpperCase()} 🥈`);
    console.log(`  ✓ Percentage: ${silverResult.graduatedSuccess.percentage.toFixed(1)}%`);
    console.log(`  ✓ Multiplier: ${silverResult.graduatedSuccess.multiplier}x`);
    console.log(`  ✓ Base XP: 50`);
    console.log(`  ✓ XP Awarded: ${silverResult.xpAwarded} (50 × 1.5)`);
    console.log(`  ✓ Expected: 75 XP\n`);

    if (silverResult.graduatedSuccess.level !== 'silver' || silverResult.xpAwarded !== 75) {
      throw new Error(`❌ Silver test failed! Expected level=silver, xp=75, got level=${silverResult.graduatedSuccess.level}, xp=${silverResult.xpAwarded}`);
    }

    // Test 3: Bronze completion (50% - 5 miles)
    await db.query(`DELETE FROM goal_completions WHERE goal_id = $1`, [testGoalId]);
    console.log('[TEST 3] Bronze Completion: 5/10 miles (50%)');
    const bronzeResult = await goalService.completeGoal(testGoalId, 5, 'Maintained minimum consistency');
    console.log(`  ✓ Level: ${bronzeResult.graduatedSuccess.level.toUpperCase()} 🥉`);
    console.log(`  ✓ Percentage: ${bronzeResult.graduatedSuccess.percentage.toFixed(1)}%`);
    console.log(`  ✓ Multiplier: ${bronzeResult.graduatedSuccess.multiplier}x`);
    console.log(`  ✓ Base XP: 50`);
    console.log(`  ✓ XP Awarded: ${bronzeResult.xpAwarded} (50 × 1.0)`);
    console.log(`  ✓ Expected: 50 XP\n`);

    if (bronzeResult.graduatedSuccess.level !== 'bronze' || bronzeResult.xpAwarded !== 50) {
      throw new Error(`❌ Bronze test failed! Expected level=bronze, xp=50, got level=${bronzeResult.graduatedSuccess.level}, xp=${bronzeResult.xpAwarded}`);
    }

    // Test 4: Incomplete (40% - 4 miles)
    await db.query(`DELETE FROM goal_completions WHERE goal_id = $1`, [testGoalId]);
    console.log('[TEST 4] Incomplete: 4/10 miles (40%)');
    const incompleteResult = await goalService.completeGoal(testGoalId, 4, 'Partial credit for effort');
    console.log(`  ✓ Level: ${incompleteResult.graduatedSuccess.level.toUpperCase()} ⚠️`);
    console.log(`  ✓ Percentage: ${incompleteResult.graduatedSuccess.percentage.toFixed(1)}%`);
    console.log(`  ✓ Multiplier: ${incompleteResult.graduatedSuccess.multiplier}x`);
    console.log(`  ✓ Base XP: 50`);
    console.log(`  ✓ XP Awarded: ${incompleteResult.xpAwarded} (50 × 0.5)`);
    console.log(`  ✓ Expected: 25 XP\n`);

    if (incompleteResult.graduatedSuccess.level !== 'incomplete' || incompleteResult.xpAwarded !== 25) {
      throw new Error(`❌ Incomplete test failed! Expected level=incomplete, xp=25, got level=${incompleteResult.graduatedSuccess.level}, xp=${incompleteResult.xpAwarded}`);
    }

    // Test 5: Binary goal (always Gold)
    const binaryGoal = await goalService.createGoal(testCharacterId, {
      name: 'Complete workout',
      description: 'Binary goal test',
      statMapping: 'STR',
      goalType: 'binary',
      frequency: 'daily'
    });

    console.log('[TEST 5] Binary Goal (always Gold)');
    const binaryResult = await goalService.completeGoal(binaryGoal.id, null, 'Binary goals always count as 100%');
    console.log(`  ✓ Level: ${binaryResult.graduatedSuccess.level.toUpperCase()} 🥇`);
    console.log(`  ✓ Percentage: ${binaryResult.graduatedSuccess.percentage.toFixed(1)}%`);
    console.log(`  ✓ Multiplier: ${binaryResult.graduatedSuccess.multiplier}x`);
    console.log(`  ✓ Base XP: 10 (daily)`);
    console.log(`  ✓ XP Awarded: ${binaryResult.xpAwarded} (10 × 2.0)`);
    console.log(`  ✓ Expected: 20 XP\n`);

    if (binaryResult.graduatedSuccess.level !== 'gold' || binaryResult.xpAwarded !== 20) {
      throw new Error(`❌ Binary test failed! Expected level=gold, xp=20, got level=${binaryResult.graduatedSuccess.level}, xp=${binaryResult.xpAwarded}`);
    }

    // Check database storage
    console.log('[DATABASE VERIFICATION]');
    const dbCheck = await db.query(`
      SELECT completion_level, completion_percentage, xp_awarded
      FROM goal_completions
      WHERE goal_id = $1
      ORDER BY completed_at DESC
      LIMIT 1
    `, [testGoalId]);

    if (dbCheck.rows.length > 0) {
      const record = dbCheck.rows[0];
      console.log(`  ✓ Last completion stored in database:`);
      console.log(`    - Level: ${record.completion_level}`);
      console.log(`    - Percentage: ${record.completion_percentage}%`);
      console.log(`    - XP: ${record.xp_awarded}`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('🎉 ALL TESTS PASSED!');
    console.log('='.repeat(60));
    console.log('\n📊 Graduated Success Summary:');
    console.log('  🥇 GOLD (100%+): 2.0x XP multiplier');
    console.log('  🥈 SILVER (75-99%): 1.5x XP multiplier');
    console.log('  🥉 BRONZE (50-74%): 1.0x XP multiplier');
    console.log('  ⚠️  INCOMPLETE (<50%): 0.5x XP multiplier');
    console.log('\n✨ Research Principle: Prevents "Perfect Day problem"');
    console.log('   75% completion still rewards substantial XP,');
    console.log('   encouraging consistency over perfection.\n');

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error(error);
  } finally {
    // Cleanup
    if (testUserId) {
      console.log('\nCleaning up test data...');
      await db.query('DELETE FROM characters WHERE user_id = $1', [testUserId]);
      await db.query('DELETE FROM users WHERE id = $1', [testUserId]);
      console.log('  ✓ Test data cleaned up');
    }
    process.exit(0);
  }
}

testGraduatedSuccess();
