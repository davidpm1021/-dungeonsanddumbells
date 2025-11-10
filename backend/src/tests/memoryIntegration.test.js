/**
 * Memory Integration Test
 *
 * Tests memory system integration with goal completion and narrative endpoints
 *
 * Run with: node src/tests/memoryIntegration.test.js
 */

const pool = require('../config/database');
const goalService = require('../services/goalService');
const characterService = require('../services/characterService');
const memoryManager = require('../services/memoryManager');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function success(message) {
  log(`✅ ${message}`, 'green');
}

function error(message) {
  log(`❌ ${message}`, 'red');
}

function info(message) {
  log(`ℹ️  ${message}`, 'cyan');
}

function section(message) {
  log(`\n${'='.repeat(60)}`, 'blue');
  log(`  ${message}`, 'blue');
  log(`${'='.repeat(60)}`, 'blue');
}

let testUser = null;
let testCharacter = null;
let testGoal = null;

/**
 * Setup: Create test user and character
 */
async function setup() {
  section('Setup');

  try {
    // Create test user
    const userResult = await pool.query(
      `INSERT INTO users (username, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING *`,
      ['test_memory_user', 'test_memory@example.com', 'hashed_password']
    );
    testUser = userResult.rows[0];
    success(`Created test user: ${testUser.username}`);

    // Create test character
    testCharacter = await characterService.createCharacter(
      testUser.id,
      'Memory Test Hero',
      'Fighter'
    );
    success(`Created test character: ${testCharacter.name} (ID: ${testCharacter.id})`);

    // Create test goal
    testGoal = await goalService.createGoal(testCharacter.id, {
      name: '30-minute workout',
      description: 'Complete a full strength training session',
      statMapping: 'STR',
      goalType: 'binary',
      frequency: 'daily'
    });
    success(`Created test goal: ${testGoal.name} (ID: ${testGoal.id})`);

  } catch (err) {
    error(`Setup failed: ${err.message}`);
    throw err;
  }
}

/**
 * Test 1: Goal completion creates narrative event
 */
async function testGoalCompletionCreatesEvent() {
  section('Test 1: Goal Completion Creates Narrative Event');

  try {
    info('Completing goal...');

    const result = await goalService.completeGoal(
      testGoal.id,
      null,
      'Felt great! New PR on bench press.'
    );

    success(`Goal completed, awarded ${result.xpAwarded} XP to ${result.statMapping}`);

    // Check working memory
    info('Checking working memory...');
    const workingMemory = await memoryManager.getWorkingMemory(testCharacter.id);

    if (workingMemory.length === 0) {
      error('No events found in working memory');
      return false;
    }

    const latestEvent = workingMemory[workingMemory.length - 1];

    if (latestEvent.event_type !== 'goal_completion') {
      error(`Expected event_type 'goal_completion', got '${latestEvent.event_type}'`);
      return false;
    }

    if (!latestEvent.event_description.includes('30-minute workout')) {
      error('Event description does not mention goal name');
      return false;
    }

    if (!latestEvent.event_description.includes('Felt great! New PR on bench press.')) {
      error('Event description does not include notes');
      return false;
    }

    success('Narrative event created correctly');
    info(`Event: ${latestEvent.event_description}`);

    // Check stat changes were recorded
    if (latestEvent.stat_changes && latestEvent.stat_changes.STR === result.xpAwarded) {
      success(`Stat changes recorded: STR +${latestEvent.stat_changes.STR}`);
    } else {
      error('Stat changes not recorded correctly');
    }

    return true;
  } catch (err) {
    error(`Test failed: ${err.message}`);
    return false;
  }
}

/**
 * Test 2: Narrative summary is updated
 */
async function testNarrativeSummaryUpdated() {
  section('Test 2: Narrative Summary Updated');

  try {
    const worldState = await memoryManager.getWorldState(testCharacter.id);

    if (!worldState.narrative_summary) {
      error('No narrative summary found');
      return false;
    }

    if (!worldState.narrative_summary.includes('30-minute workout')) {
      error('Narrative summary does not mention completed goal');
      return false;
    }

    success('Narrative summary updated');
    info(`Summary: ${worldState.narrative_summary}`);

    return true;
  } catch (err) {
    error(`Test failed: ${err.message}`);
    return false;
  }
}

/**
 * Test 3: Multiple completions create multiple events
 */
async function testMultipleCompletions() {
  section('Test 3: Multiple Completions Create Multiple Events');

  try {
    // Create another goal
    const goal2 = await goalService.createGoal(testCharacter.id, {
      name: '10-minute meditation',
      description: 'Practice mindfulness',
      statMapping: 'WIS',
      goalType: 'binary',
      frequency: 'daily'
    });

    info('Completing second goal...');

    await goalService.completeGoal(goal2.id, null, 'Deep relaxation achieved');

    success('Second goal completed');

    // Check working memory has 2 events
    const workingMemory = await memoryManager.getWorkingMemory(testCharacter.id);

    if (workingMemory.length < 2) {
      error(`Expected at least 2 events, got ${workingMemory.length}`);
      return false;
    }

    const events = workingMemory.filter(e => e.event_type === 'goal_completion');

    if (events.length !== 2) {
      error(`Expected 2 goal_completion events, got ${events.length}`);
      return false;
    }

    success(`${events.length} goal completions recorded in memory`);

    // Verify different stat mappings
    const strEvent = events.find(e => e.stat_changes && e.stat_changes.STR);
    const wisEvent = events.find(e => e.stat_changes && e.stat_changes.WIS);

    if (!strEvent || !wisEvent) {
      error('Events do not have correct stat mappings');
      return false;
    }

    success('Different stat mappings recorded correctly');
    info(`  - STR event: ${strEvent.event_description.substring(0, 50)}...`);
    info(`  - WIS event: ${wisEvent.event_description.substring(0, 50)}...`);

    return true;
  } catch (err) {
    error(`Test failed: ${err.message}`);
    return false;
  }
}

/**
 * Test 4: Complete context includes goal events
 */
async function testCompleteContextInclusion() {
  section('Test 4: Complete Context Includes Goal Events');

  try {
    const context = await memoryManager.getCompleteContext(testCharacter.id);

    if (!context.working_memory || context.working_memory.length === 0) {
      error('Complete context missing working memory');
      return false;
    }

    const goalEvents = context.working_memory.filter(
      e => e.event_type === 'goal_completion'
    );

    if (goalEvents.length < 2) {
      error(`Expected at least 2 goal events in context, got ${goalEvents.length}`);
      return false;
    }

    success(`Complete context includes ${goalEvents.length} goal completion events`);

    // Check narrative summary is present
    if (!context.narrative_summary) {
      error('Complete context missing narrative summary');
      return false;
    }

    success('Complete context includes narrative summary');

    // Check world state is present
    if (!context.world_state) {
      error('Complete context missing world state');
      return false;
    }

    success('Complete context structure is complete');

    return true;
  } catch (err) {
    error(`Test failed: ${err.message}`);
    return false;
  }
}

/**
 * Test 5: Streak bonus creates enhanced event
 */
async function testStreakBonusEvent() {
  section('Test 5: Streak Bonus Creates Enhanced Event');

  try {
    // Create a goal and complete it 7 times to trigger streak bonus
    const streakGoal = await goalService.createGoal(testCharacter.id, {
      name: 'Daily push-ups',
      description: '50 push-ups',
      statMapping: 'STR',
      goalType: 'quantitative',
      targetValue: 50,
      frequency: 'daily'
    });

    info('Simulating 7-day streak...');

    // Manually insert 6 past completions
    for (let i = 0; i < 6; i++) {
      await pool.query(
        `INSERT INTO goal_completions (goal_id, value, xp_awarded, completed_at)
         VALUES ($1, $2, $3, NOW() - INTERVAL '${7 - i} days')`,
        [streakGoal.id, 50, 10]
      );
    }

    // Complete the 7th time (should trigger streak bonus)
    const result = await goalService.completeGoal(streakGoal.id, 50);

    if (!result.streakBonus) {
      error('Streak bonus not triggered');
      return false;
    }

    success('Streak bonus triggered!');
    info(`XP awarded: ${result.xpAwarded} (includes 100 bonus)`);

    // Check event description mentions streak
    const workingMemory = await memoryManager.getWorkingMemory(testCharacter.id, 20);
    const streakEvent = workingMemory.find(
      e => e.goal_id === streakGoal.id
    );

    if (!streakEvent) {
      error('Streak event not found in memory');
      return false;
    }

    if (!streakEvent.event_description.includes('days of consistent effort')) {
      error('Event description does not mention streak');
      return false;
    }

    success('Streak bonus recorded in narrative event');
    info(`Event: ${streakEvent.event_description}`);

    return true;
  } catch (err) {
    error(`Test failed: ${err.message}`);
    return false;
  }
}

/**
 * Cleanup
 */
async function cleanup() {
  section('Cleanup');

  try {
    if (testUser) {
      await pool.query('DELETE FROM users WHERE id = $1', [testUser.id]);
      success(`Deleted test user (ID: ${testUser.id})`);
    }

    success('Cleanup complete');
  } catch (err) {
    error(`Cleanup failed: ${err.message}`);
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  log('\n╔════════════════════════════════════════════════════════════╗', 'blue');
  log('║      MEMORY INTEGRATION TEST SUITE                         ║', 'blue');
  log('╚════════════════════════════════════════════════════════════╝', 'blue');

  const results = {
    passed: 0,
    failed: 0,
    total: 5
  };

  try {
    await setup();

    // Run tests
    if (await testGoalCompletionCreatesEvent()) results.passed++;
    else results.failed++;

    if (await testNarrativeSummaryUpdated()) results.passed++;
    else results.failed++;

    if (await testMultipleCompletions()) results.passed++;
    else results.failed++;

    if (await testCompleteContextInclusion()) results.passed++;
    else results.failed++;

    if (await testStreakBonusEvent()) results.passed++;
    else results.failed++;

    section('Test Results');

    if (results.failed === 0) {
      success(`ALL ${results.total} TESTS PASSED! ✨`);
      log('\nMemory system is fully integrated with goal completion.', 'green');
    } else {
      error(`${results.failed} of ${results.total} tests failed`);
      success(`${results.passed} tests passed`);
    }

  } catch (err) {
    section('Test Results');
    error('TESTS FAILED');
    console.error(err);
    process.exit(1);
  } finally {
    await cleanup();
    await pool.end();
  }
}

runAllTests();
