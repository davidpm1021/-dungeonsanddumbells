require('dotenv').config();
const DMOrchestrator = require('./src/services/dmOrchestrator');

/**
 * Test Skill Check System End-to-End
 *
 * This test verifies:
 * 1. Skill Check Detector identifies when checks are needed
 * 2. Skill Check Service performs rolls correctly
 * 3. DM Orchestrator integrates skill checks into narrative
 */

// Test character (from existing data - adjust ID as needed)
const testCharacter = {
  id: 13, // Adjust this to a valid character ID in your database
  name: 'Test Hero',
  class: 'Fighter',
  level: 3,
  str: 16, // STR 16 = +3 modifier
  dex: 14, // DEX 14 = +2 modifier
  con: 15,
  int: 10,
  wis: 12,
  cha: 8
};

// Test actions that should trigger different skill checks
const testActions = [
  {
    action: 'I climb the steep cliff to reach the hermitage',
    expectedSkill: 'Athletics',
    description: 'Should detect Athletics check for climbing'
  },
  {
    action: 'I sneak past the sleeping guards',
    expectedSkill: 'Stealth',
    description: 'Should detect Stealth check for sneaking'
  },
  {
    action: 'I try to convince the merchant to lower their prices',
    expectedSkill: 'Persuasion',
    description: 'Should detect Persuasion check for convincing'
  },
  {
    action: 'I search the room for hidden clues',
    expectedSkill: 'Perception',
    description: 'Should detect Perception check for searching'
  },
  {
    action: 'I walk down the street',
    expectedSkill: null,
    description: 'Should NOT require a skill check (trivial action)'
  }
];

const worldContext = `You are in a bustling fantasy town. The streets are lined with merchants and travelers.`;

async function runTests() {
  console.log('='.repeat(80));
  console.log('SKILL CHECK SYSTEM - END-TO-END TEST');
  console.log('='.repeat(80));
  console.log('');

  for (let i = 0; i < testActions.length; i++) {
    const test = testActions[i];

    console.log(`\nTest ${i + 1}/${testActions.length}: ${test.description}`);
    console.log('-'.repeat(80));
    console.log(`Action: "${test.action}"`);

    try {
      const startTime = Date.now();

      // Call DM Orchestrator (full pipeline with skill checks)
      const result = await DMOrchestrator.processAction({
        character: testCharacter,
        action: test.action,
        worldContext,
        recentMessages: [],
        sessionId: `test_session_${Date.now()}`
      });

      const duration = Date.now() - startTime;

      // Check if skill check was performed
      const skillCheckPerformed = result.skillCheckResult !== null;
      const skillCheckSuccess = result.skillCheckResult?.success;

      console.log(`\n✓ Response received in ${duration}ms`);

      if (test.expectedSkill) {
        // Expecting a skill check
        if (skillCheckPerformed) {
          console.log(`✓ Skill check detected: ${result.skillCheckResult.skillType} (DC ${result.skillCheckResult.dc})`);
          console.log(`  Roll: ${result.skillCheckResult.roll} + modifiers = ${result.skillCheckResult.total}`);
          console.log(`  Result: ${skillCheckSuccess ? '✓ SUCCESS' : '✗ FAILURE'}`);
          console.log(`  Breakdown: ${result.skillCheckResult.modifiersBreakdown}`);

          if (result.skillCheckResult.skillType === test.expectedSkill) {
            console.log(`✓ Correct skill type detected`);
          } else {
            console.warn(`⚠ Expected ${test.expectedSkill}, got ${result.skillCheckResult.skillType}`);
          }
        } else {
          console.error(`✗ FAIL: Expected ${test.expectedSkill} check but none was performed`);
        }
      } else {
        // NOT expecting a skill check
        if (!skillCheckPerformed) {
          console.log(`✓ No skill check performed (as expected for trivial action)`);
        } else {
          console.warn(`⚠ Unexpected skill check: ${result.skillCheckResult.skillType}`);
        }
      }

      // Show narrative excerpt
      console.log(`\nNarrative excerpt: "${result.narrative.substring(0, 200)}..."`);

      // Show metadata
      console.log(`\nMetadata:`);
      console.log(`  - Pipeline duration: ${result.metadata.totalDuration}ms`);
      console.log(`  - Lorekeeper score: ${result.metadata.validation.score}`);
      console.log(`  - Memories used: ${result.metadata.memoriesUsed}`);
      console.log(`  - Skill check performed: ${result.metadata.skillCheckPerformed}`);

    } catch (error) {
      console.error(`✗ ERROR:`, error.message);
      console.error(error.stack);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('TESTS COMPLETE');
  console.log('='.repeat(80));

  process.exit(0);
}

// Run tests
runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
