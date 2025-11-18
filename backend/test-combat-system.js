require('dotenv').config();
const DMOrchestrator = require('./src/services/dmOrchestrator');
const CombatManager = require('./src/services/combatManager');

/**
 * Test Combat System End-to-End
 *
 * This test verifies:
 * 1. Combat Detector identifies when combat is triggered
 * 2. Combat Manager initializes encounters with zones and initiative
 * 3. DM Orchestrator integrates combat into narrative
 * 4. Combat actions are processed correctly
 * 5. Combat ends when all enemies are defeated
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

// Test scenarios for combat detection
const testScenarios = [
  {
    action: 'I draw my sword and attack the bandit',
    worldContext: 'You stand face-to-face with a bandit blocking the road, his hand on his weapon.',
    description: 'Should trigger combat (explicit attack)',
    expectCombat: true
  },
  {
    action: 'I continue walking down the path',
    worldContext: 'Three wolves emerge from the bushes, growling menacingly. They circle around you, teeth bared.',
    description: 'Should trigger combat (enemy ambush)',
    expectCombat: true
  },
  {
    action: 'I try to negotiate with the merchant',
    worldContext: 'A friendly merchant smiles at you from behind his stall.',
    description: 'Should NOT trigger combat (peaceful interaction)',
    expectCombat: false
  }
];

async function runCombatDetectionTests() {
  console.log('='.repeat(80));
  console.log('COMBAT SYSTEM - DETECTION TESTS');
  console.log('='.repeat(80));
  console.log('');

  for (let i = 0; i < testScenarios.length; i++) {
    const test = testScenarios[i];

    console.log(`\nTest ${i + 1}/${testScenarios.length}: ${test.description}`);
    console.log('-'.repeat(80));
    console.log(`Action: "${test.action}"`);
    console.log(`Context: "${test.worldContext.substring(0, 100)}..."`);

    try {
      const startTime = Date.now();

      // Call DM Orchestrator (full pipeline with combat detection)
      const result = await DMOrchestrator.processAction({
        character: testCharacter,
        action: test.action,
        worldContext: test.worldContext,
        recentMessages: [],
        sessionId: `test_combat_${Date.now()}`
      });

      const duration = Date.now() - startTime;

      // Check if combat was triggered
      const combatActive = result.metadata.combatActive;
      const combatTriggered = result.metadata.combatTriggered;

      console.log(`\n✓ Response received in ${duration}ms`);

      if (test.expectCombat) {
        // Expecting combat
        if (combatTriggered) {
          console.log(`✓ Combat triggered as expected`);
          console.log(`  Encounter: ${result.combatState.encounterName}`);
          console.log(`  Enemies: ${result.combatState.enemies.length}`);
          result.combatState.enemies.forEach((enemy, idx) => {
            console.log(`    ${idx + 1}. ${enemy.name} (AC ${enemy.ac}, HP ${enemy.currentHp}/${enemy.maxHp})`);
          });
          console.log(`  Initiative order:`);
          result.combatState.initiativeOrder.forEach((combatant, idx) => {
            console.log(`    ${idx + 1}. ${combatant.name} (Initiative: ${combatant.initiative})`);
          });
          console.log(`  Player zone: ${result.combatState.zoneSystem.player_zone}`);
        } else {
          console.error(`✗ FAIL: Expected combat but none was triggered`);
        }
      } else {
        // NOT expecting combat
        if (!combatTriggered) {
          console.log(`✓ No combat triggered (as expected for peaceful action)`);
        } else {
          console.warn(`⚠ Unexpected combat triggered`);
        }
      }

      // Show narrative excerpt
      console.log(`\nNarrative excerpt: "${result.narrative.substring(0, 200)}..."`);

      // Show metadata
      console.log(`\nMetadata:`);
      console.log(`  - Pipeline duration: ${result.metadata.totalDuration}ms`);
      console.log(`  - Combat active: ${result.metadata.combatActive}`);
      console.log(`  - Combat triggered: ${result.metadata.combatTriggered}`);
      console.log(`  - Lorekeeper score: ${result.metadata.validation.score}`);

    } catch (error) {
      console.error(`✗ ERROR:`, error.message);
      console.error(error.stack);
    }
  }
}

async function runCombatActionTest() {
  console.log('\n' + '='.repeat(80));
  console.log('COMBAT SYSTEM - COMBAT ACTION TEST');
  console.log('='.repeat(80));
  console.log('');

  try {
    console.log('Scenario: Player initiates combat and attacks enemy');
    console.log('-'.repeat(80));

    // Step 1: Trigger combat
    console.log('\nStep 1: Triggering combat...');
    const combatStart = await DMOrchestrator.processAction({
      character: testCharacter,
      action: 'I draw my weapon and attack the bandit scout',
      worldContext: 'A lone bandit scout blocks your path through the forest.',
      recentMessages: [],
      sessionId: `test_combat_actions_${Date.now()}`
    });

    if (!combatStart.metadata.combatTriggered) {
      console.error('✗ FAIL: Combat was not triggered');
      return;
    }

    const encounterId = combatStart.combatState.id;
    console.log(`✓ Combat started: ${combatStart.combatState.encounterName}`);
    console.log(`  Encounter ID: ${encounterId}`);
    console.log(`  Enemies: ${combatStart.combatState.enemies.length}`);

    // Step 2: Perform an attack action
    console.log('\nStep 2: Player attacks enemy...');
    const attackAction = await CombatManager.processCombatAction(
      encounterId,
      'I swing my sword at the bandit'
    );

    console.log(`✓ Attack processed`);
    console.log(`  Result: ${attackAction.description}`);
    console.log(`  Hit: ${attackAction.hit || 'N/A'}`);
    if (attackAction.damage) {
      console.log(`  Damage: ${attackAction.damage}`);
    }
    console.log(`  Next turn: ${attackAction.nextTurn}`);
    console.log(`  Round: ${attackAction.round}`);

    // Step 3: Check combat state
    console.log('\nStep 3: Checking combat state...');
    const updatedCombat = await CombatManager.getActiveCombat(testCharacter.id);

    if (updatedCombat) {
      console.log(`✓ Combat still active`);
      console.log(`  Current round: ${updatedCombat.currentRound}`);
      console.log(`  Current turn: ${updatedCombat.initiativeOrder[updatedCombat.currentTurnIndex].name}`);

      console.log(`\n  Enemy status:`);
      updatedCombat.enemies.forEach((enemy, idx) => {
        const status = enemy.currentHp > 0 ? 'ALIVE' : 'DEFEATED';
        console.log(`    ${idx + 1}. ${enemy.name}: ${enemy.currentHp}/${enemy.maxHp} HP [${status}]`);
      });

      console.log(`\n  Combat log (last 3 entries):`);
      const logEntries = updatedCombat.combat_log.slice(-3);
      logEntries.forEach(entry => {
        console.log(`    Round ${entry.round}, Turn ${entry.turn}: ${entry.event}`);
      });
    } else {
      console.log(`✓ Combat ended`);
      console.log(`  Result: ${attackAction.combatResult || 'Unknown'}`);
    }

    console.log('\n✓ Combat action test completed successfully');

  } catch (error) {
    console.error('✗ ERROR:', error.message);
    console.error(error.stack);
  }
}

async function runFullCombatFlowTest() {
  console.log('\n' + '='.repeat(80));
  console.log('COMBAT SYSTEM - FULL FLOW TEST (Combat Start to Victory)');
  console.log('='.repeat(80));
  console.log('');

  try {
    console.log('Scenario: Player fights and defeats enemies');
    console.log('-'.repeat(80));

    // Start combat
    const sessionId = `test_full_combat_${Date.now()}`;
    console.log('\nInitiating combat...');

    const combatStart = await DMOrchestrator.processAction({
      character: testCharacter,
      action: 'I attack the wolves',
      worldContext: 'Two hungry wolves emerge from the forest, growling menacingly.',
      recentMessages: [],
      sessionId
    });

    if (!combatStart.metadata.combatTriggered) {
      console.error('✗ Combat was not triggered');
      return;
    }

    console.log(`✓ Combat started: ${combatStart.combatState.encounterName}`);
    const encounterId = combatStart.combatState.id;

    // Fight until all enemies defeated
    let round = 1;
    let maxRounds = 10; // Safety limit
    let combatActive = true;

    while (combatActive && round <= maxRounds) {
      console.log(`\n--- Round ${round} ---`);

      const attackResult = await CombatManager.processCombatAction(
        encounterId,
        'I attack the nearest enemy'
      );

      console.log(`Action: ${attackResult.description}`);

      if (attackResult.combatEnded) {
        console.log(`\n✓✓✓ COMBAT ENDED: ${attackResult.combatResult.toUpperCase()} ✓✓✓`);
        combatActive = false;
      }

      round++;
    }

    if (round > maxRounds) {
      console.warn('⚠ Combat did not end within 10 rounds (safety limit reached)');
    }

    // Verify combat is no longer active
    const finalCheck = await CombatManager.getActiveCombat(testCharacter.id);
    if (finalCheck === null) {
      console.log('\n✓ Confirmed: No active combat for character');
    } else {
      console.warn('⚠ Warning: Combat still appears active in database');
    }

    // Get combat history
    const history = await CombatManager.getCombatHistory(testCharacter.id, 5);
    console.log(`\n✓ Combat history retrieved (${history.length} encounters)`);
    history.slice(0, 3).forEach((encounter, idx) => {
      console.log(`  ${idx + 1}. ${encounter.encounterName} - ${encounter.status.toUpperCase()} (${encounter.enemyCount} enemies)`);
    });

  } catch (error) {
    console.error('✗ ERROR:', error.message);
    console.error(error.stack);
  }
}

async function runAllTests() {
  try {
    // Test 1: Combat detection
    await runCombatDetectionTests();

    // Test 2: Combat actions
    await runCombatActionTest();

    // Test 3: Full combat flow
    await runFullCombatFlowTest();

    console.log('\n' + '='.repeat(80));
    console.log('ALL COMBAT TESTS COMPLETE');
    console.log('='.repeat(80));

    process.exit(0);

  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Run all tests
runAllTests();
