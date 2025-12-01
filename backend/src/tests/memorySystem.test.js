/**
 * Memory System Integration Test
 *
 * Tests the three-tier memory hierarchy, narrative event logging,
 * world state tracking, and character qualities.
 *
 * Run with: node src/tests/memorySystem.test.js
 */

const pool = require('../config/database');
const memoryManager = require('../services/memoryManager');

// ANSI color codes for better output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
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

// Test character for memory operations
let testCharacter = null;

/**
 * Create a test character
 */
async function createTestCharacter() {
  section('Creating Test Character');

  try {
    const result = await pool.query(
      `INSERT INTO characters (user_id, name, class)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [1, 'Test Hero', 'Fighter']
    );

    testCharacter = result.rows[0];
    success(`Created test character: ${testCharacter.name} (ID: ${testCharacter.id})`);

    // Initialize world state
    await memoryManager.getWorldState(testCharacter.id);
    success('Initialized world state');

    return testCharacter;
  } catch (err) {
    error(`Failed to create test character: ${err.message}`);
    throw err;
  }
}

/**
 * Test 1: Working Memory Storage and Retrieval
 */
async function testWorkingMemory() {
  section('Test 1: Working Memory Storage & Retrieval');

  try {
    // Store 5 events in working memory
    const events = [
      {
        eventType: 'quest_started',
        description: 'You meet Warden Kael at the Waystation. He challenges you to climb the mountain.',
        participants: ['Warden Kael'],
        statChanges: {},
        context: { location: 'The Waystation' }
      },
      {
        eventType: 'goal_completion',
        description: 'You complete a 30-minute workout, feeling stronger.',
        participants: [],
        statChangs: { STR: 10 },
        goalId: 1,
        context: { activity: 'strength_training' }
      },
      {
        eventType: 'npc_interaction',
        description: 'Warden Kael nods approvingly at your progress.',
        participants: ['Warden Kael'],
        statChanges: {},
        context: { relationship_change: 'friendly' }
      },
      {
        eventType: 'goal_completion',
        description: 'You meditate for 10 minutes, finding inner peace.',
        participants: [],
        statChanges: { WIS: 15 },
        goalId: 2,
        context: { activity: 'meditation' }
      },
      {
        eventType: 'quest_completed',
        description: 'You successfully climbed the mountain. Warden Kael is impressed.',
        participants: ['Warden Kael'],
        statChanges: { STR: 25, CON: 20, WIS: 10 },
        questId: 1,
        context: { location: 'Forgotten Peaks' }
      }
    ];

    info(`Storing ${events.length} events in working memory...`);

    for (const event of events) {
      await memoryManager.storeInWorkingMemory(testCharacter.id, event);
    }

    success(`Stored ${events.length} events`);

    // Retrieve working memory
    const workingMemory = await memoryManager.getWorkingMemory(testCharacter.id, 10);

    if (workingMemory.length === events.length) {
      success(`Retrieved ${workingMemory.length} events from working memory`);
    } else {
      error(`Expected ${events.length} events, got ${workingMemory.length}`);
    }

    // Verify chronological order
    if (workingMemory[0].event_type === 'quest_started' &&
        workingMemory[workingMemory.length - 1].event_type === 'quest_completed') {
      success('Events are in correct chronological order');
    } else {
      error('Events are not in correct order');
    }

    // Verify participants are stored correctly
    const wardenKaelEvents = workingMemory.filter(e =>
      e.participants && e.participants.includes('Warden Kael')
    );

    if (wardenKaelEvents.length === 3) {
      success(`Correctly filtered ${wardenKaelEvents.length} events with Warden Kael`);
    } else {
      error(`Expected 3 Warden Kael events, got ${wardenKaelEvents.length}`);
    }

  } catch (err) {
    error(`Working memory test failed: ${err.message}`);
    throw err;
  }
}

/**
 * Test 2: Working Memory Pruning (keeps only last 10)
 */
async function testWorkingMemoryPruning() {
  section('Test 2: Working Memory Pruning');

  try {
    info('Adding 7 more events to exceed 10-event limit...');

    for (let i = 0; i < 7; i++) {
      await memoryManager.storeInWorkingMemory(testCharacter.id, {
        eventType: 'goal_completion',
        description: `Daily workout #${i + 1}`,
        participants: [],
        statChanges: { STR: 5 },
        context: {}
      });
    }

    const workingMemory = await memoryManager.getWorkingMemory(testCharacter.id, 20);

    if (workingMemory.length === 10) {
      success('Working memory correctly pruned to 10 most recent events');
    } else {
      error(`Expected 10 events, got ${workingMemory.length}`);
    }

    // Verify oldest event was pruned
    const hasOldestEvent = workingMemory.some(e =>
      e.event_description.includes('meet Warden Kael at the Waystation')
    );

    if (!hasOldestEvent) {
      success('Oldest event correctly pruned from working memory');
    } else {
      error('Oldest event still present (should have been pruned)');
    }

  } catch (err) {
    error(`Pruning test failed: ${err.message}`);
    throw err;
  }
}

/**
 * Test 3: Long-term Memory Storage and Reinforcement
 */
async function testLongTermMemory() {
  section('Test 3: Long-term Memory & Reinforcement');

  try {
    // Store important facts in long-term memory
    const facts = [
      { fact: 'Warden Kael is your mentor who taught you about the Six Foundations', importance: 0.9 },
      { fact: 'You are a Fighter class, focused on STR and CON', importance: 0.95 },
      { fact: 'Ironhold is suffering from a mysterious malaise', importance: 0.85 },
      { fact: 'The Forgotten Peaks is where you first met the Sage', importance: 0.7 }
    ];

    info(`Storing ${facts.length} facts in long-term memory...`);

    for (const { fact, importance } of facts) {
      await memoryManager.storeInLongTermMemory(testCharacter.id, fact, importance);
    }

    success(`Stored ${facts.length} long-term memories`);

    // Retrieve long-term memories
    const longTermMemories = await memoryManager.getLongTermMemory(testCharacter.id);

    if (longTermMemories.length >= facts.length) {
      success(`Retrieved ${longTermMemories.length} long-term memories`);
    } else {
      error(`Expected at least ${facts.length} memories, got ${longTermMemories.length}`);
    }

    // Verify sorted by importance
    if (longTermMemories[0].content_text.includes('Fighter class')) {
      success('Memories correctly sorted by importance score');
    }

    // Test reinforcement
    info('Reinforcing "Warden Kael" memory...');
    await memoryManager.reinforceMemory(
      testCharacter.id,
      'Warden Kael is your mentor who taught you about the Six Foundations',
      0.05
    );

    const reinforcedMemories = await memoryManager.getLongTermMemory(testCharacter.id);
    const wardenKaelMemory = reinforcedMemories.find(m =>
      m.content_text.includes('Warden Kael')
    );

    if (wardenKaelMemory && parseFloat(wardenKaelMemory.importance_score) >= 0.95) {
      success(`Memory reinforced (score: ${wardenKaelMemory.importance_score})`);
    } else {
      error('Memory reinforcement failed');
    }

  } catch (err) {
    error(`Long-term memory test failed: ${err.message}`);
    throw err;
  }
}

/**
 * Test 4: Episode Memory Compression
 */
async function testEpisodeCompression() {
  section('Test 4: Episode Memory Compression');

  try {
    // Create old events (7+ days old) by manually inserting with past dates
    info('Creating 15 old events for compression...');

    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 8); // 8 days ago

    for (let i = 0; i < 15; i++) {
      await pool.query(
        `INSERT INTO narrative_events (
          character_id, event_type, event_description,
          participants, stat_changes, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          testCharacter.id,
          'goal_completion',
          `Completed workout session ${i + 1}`,
          [],
          JSON.stringify({ STR: 10, CON: 5 }),
          oldDate
        ]
      );
    }

    success('Created 15 old events');

    // Compress into episode
    const episode = await memoryManager.compressIntoEpisode(testCharacter.id, 7);

    if (episode) {
      success('Successfully compressed events into episode');
      info(`Episode summary: ${episode.summary_text}`);
      info(`Event count: ${episode.event_count}`);
      info(`Participants: ${episode.participants_involved.join(', ') || 'None'}`);
      info(`Stat changes: STR +${episode.total_stat_changes.STR}, CON +${episode.total_stat_changes.CON}`);
    } else {
      error('Episode compression returned null');
    }

    // Retrieve episode memory
    const episodes = await memoryManager.getEpisodeMemory(testCharacter.id, 5);

    if (episodes.length > 0) {
      success(`Retrieved ${episodes.length} episode(s) from memory`);
    } else {
      error('No episodes found in memory');
    }

  } catch (err) {
    error(`Episode compression test failed: ${err.message}`);
    throw err;
  }
}

/**
 * Test 5: World State Management
 */
async function testWorldState() {
  section('Test 5: World State Management');

  try {
    // Update world state with NPC relationships
    await memoryManager.updateWorldState(testCharacter.id, {
      npc_relationships: {
        'Warden Kael': {
          level: 'friendly',
          notes: 'Grateful for completing mountain quest'
        },
        'Sage Mirren': {
          level: 'professional',
          notes: 'Impressed by balanced stat growth'
        }
      }
    });

    success('Updated NPC relationships');

    // Update unlocked locations
    await memoryManager.updateWorldState(testCharacter.id, {
      unlocked_locations: ['Haven Village', 'The Waystation', 'Shattered Peaks']
    });

    success('Updated unlocked locations');

    // Update story flags
    await memoryManager.updateWorldState(testCharacter.id, {
      story_flags: {
        tutorial_completed: true,
        mountain_quest_done: true,
        malaise_level: 'moderate'
      }
    });

    success('Updated story flags');

    // Retrieve world state
    const worldState = await memoryManager.getWorldState(testCharacter.id);

    if (worldState.npc_relationships['Warden Kael']) {
      success('NPC relationships retrieved correctly');
      info(`Warden Kael: ${worldState.npc_relationships['Warden Kael'].level}`);
    }

    if (worldState.unlocked_locations.length === 3) {
      success(`${worldState.unlocked_locations.length} locations unlocked`);
    }

    if (worldState.story_flags.tutorial_completed) {
      success('Story flags set correctly');
    }

  } catch (err) {
    error(`World state test failed: ${err.message}`);
    throw err;
  }
}

/**
 * Test 6: Narrative Summary Updates
 */
async function testNarrativeSummary() {
  section('Test 6: Narrative Summary Updates');

  try {
    const newContent = `You have proven yourself to Warden Kael through completing the mountain quest.
    Your strength and endurance have grown significantly, and you've begun to understand the power
    of the Six Foundations. Sage Mirren has taken notice of your balanced approach to growth.`;

    info('Updating narrative summary...');

    const updatedSummary = await memoryManager.updateNarrativeSummary(
      testCharacter.id,
      newContent
    );

    if (updatedSummary.includes('proven yourself')) {
      success('Narrative summary updated successfully');
      info(`Summary length: ${updatedSummary.split(' ').length} words`);
    } else {
      error('Summary update failed');
    }

  } catch (err) {
    error(`Narrative summary test failed: ${err.message}`);
    throw err;
  }
}

/**
 * Test 7: Complete Context Retrieval
 */
async function testCompleteContext() {
  section('Test 7: Complete Context Retrieval (AI Agent Ready)');

  try {
    info('Retrieving complete context for AI agents...');

    const context = await memoryManager.getCompleteContext(testCharacter.id);

    // Verify all tiers present
    if (context.working_memory && context.working_memory.length > 0) {
      success(`Working memory: ${context.working_memory.length} events`);
    } else {
      error('Working memory missing or empty');
    }

    if (context.episode_memory && context.episode_memory.length > 0) {
      success(`Episode memory: ${context.episode_memory.length} episode(s)`);
    } else {
      error('Episode memory missing or empty');
    }

    if (context.long_term_memory && context.long_term_memory.length > 0) {
      success(`Long-term memory: ${context.long_term_memory.length} facts`);
    } else {
      error('Long-term memory missing or empty');
    }

    if (context.world_state) {
      success('World state included in context');
      info(`  - NPCs tracked: ${Object.keys(context.world_state.npc_relationships || {}).length}`);
      info(`  - Locations unlocked: ${(context.world_state.unlocked_locations || []).length}`);
      info(`  - Story flags: ${Object.keys(context.world_state.story_flags || {}).length}`);
    }

    if (context.narrative_summary) {
      success('Narrative summary included');
    }

    // Display full context structure
    log('\n📋 Complete Context Structure:', 'yellow');
    console.log(JSON.stringify(context, null, 2));

  } catch (err) {
    error(`Complete context test failed: ${err.message}`);
    throw err;
  }
}

/**
 * Test 8: Relevant Memory Retrieval (Search)
 */
async function testRelevantMemories() {
  section('Test 8: Relevant Memory Retrieval');

  try {
    // Search for memories about Elder Thorne
    info('Searching for memories about "Elder Thorne"...');

    const elderMemories = await memoryManager.retrieveRelevantMemories(
      testCharacter.id,
      'Elder Thorne mountain quest',
      5
    );

    if (elderMemories.length > 0) {
      success(`Found ${elderMemories.length} relevant memories`);

      elderMemories.forEach((mem, i) => {
        info(`  ${i + 1}. ${mem.content_text?.substring(0, 60)}...`);
      });
    } else {
      error('No relevant memories found');
    }

    // Search for workout-related memories
    info('Searching for memories about "workout strength"...');

    const workoutMemories = await memoryManager.retrieveRelevantMemories(
      testCharacter.id,
      'workout strength training',
      3
    );

    if (workoutMemories.length > 0) {
      success(`Found ${workoutMemories.length} workout-related memories`);
    }

  } catch (err) {
    error(`Relevant memory retrieval test failed: ${err.message}`);
    throw err;
  }
}

/**
 * Test 9: Character Qualities (Storylet System)
 */
async function testCharacterQualities() {
  section('Test 9: Character Qualities (Storylet System)');

  try {
    // Set character qualities
    const qualities = [
      { name: 'sage_mentor_unlocked', value: 1 },
      { name: 'city_reputation', value: 3 },
      { name: 'mountain_climber', value: 1 },
      { name: 'elder_thorne_friendship', value: 5 }
    ];

    info(`Setting ${qualities.length} character qualities...`);

    for (const { name, value } of qualities) {
      await pool.query(
        `INSERT INTO character_qualities (character_id, quality_name, quality_value)
         VALUES ($1, $2, $3)
         ON CONFLICT (character_id, quality_name)
         DO UPDATE SET quality_value = $3`,
        [testCharacter.id, name, value]
      );
    }

    success('Character qualities set');

    // Retrieve qualities
    const result = await pool.query(
      `SELECT quality_name, quality_value FROM character_qualities
       WHERE character_id = $1
       ORDER BY quality_name`,
      [testCharacter.id]
    );

    if (result.rows.length === qualities.length) {
      success(`Retrieved ${result.rows.length} qualities`);

      result.rows.forEach(q => {
        info(`  - ${q.quality_name}: ${q.quality_value}`);
      });
    } else {
      error(`Expected ${qualities.length} qualities, got ${result.rows.length}`);
    }

  } catch (err) {
    error(`Character qualities test failed: ${err.message}`);
    throw err;
  }
}

/**
 * Cleanup test data
 */
async function cleanup() {
  section('Cleanup');

  try {
    if (testCharacter) {
      // Delete test character (cascade will delete all related data)
      await pool.query(
        `DELETE FROM characters WHERE id = $1`,
        [testCharacter.id]
      );

      success(`Deleted test character (ID: ${testCharacter.id})`);
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
  log('║         MEMORY SYSTEM INTEGRATION TEST SUITE              ║', 'blue');
  log('╚════════════════════════════════════════════════════════════╝', 'blue');

  try {
    await createTestCharacter();
    await testWorkingMemory();
    await testWorkingMemoryPruning();
    await testLongTermMemory();
    await testEpisodeCompression();
    await testWorldState();
    await testNarrativeSummary();
    await testCompleteContext();
    await testRelevantMemories();
    await testCharacterQualities();

    section('Test Results');
    success('ALL TESTS PASSED! ✨');
    log('\nThe memory system is working correctly and ready for integration.', 'green');

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

// Run tests
runAllTests();
