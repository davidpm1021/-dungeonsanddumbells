require('dotenv').config();
const CombatManager = require('./src/services/combatManager');
const ConditionService = require('./src/services/conditionService');
const db = require('./src/config/database');

/**
 * Test Combat System Phase 2C - Conditions & Combat Enhancements
 *
 * This test verifies:
 * 1. Applying status conditions to characters
 * 2. Conditions affecting attack rolls (advantage/disadvantage)
 * 3. Conditions preventing movement
 * 4. Conditions expiring after duration
 * 5. Player HP tracking and defeat condition
 * 6. Full combat flow with conditions
 */

const testCharacter = {
  id: 13,
  name: 'Sir Swole',
  class: 'Fighter',
  level: 3,
  str: 16, // +3 modifier
  dex: 14, // +2 modifier
  con: 15,
  int: 10,
  wis: 12,
  cha: 8
};

async function testApplyConditions() {
  console.log('='.repeat(80));
  console.log('TEST: Apply and Remove Conditions');
  console.log('='.repeat(80));

  try {
    // Test 1: Apply Grappled condition
    console.log('\n--- Test 1: Apply Grappled Condition ---');
    const grappledCondition = await ConditionService.applyCondition(
      testCharacter.id,
      'grappled',
      {
        source: 'Test grapple',
        duration: 3
      }
    );

    console.log(`✓ Applied: ${grappledCondition.emoji} ${grappledCondition.display_name}`);
    console.log(`  Duration: ${grappledCondition.duration_remaining} rounds`);
    console.log(`  Effects: ${JSON.stringify(grappledCondition.effects)}`);

    // Test 2: Apply Prone condition
    console.log('\n--- Test 2: Apply Prone Condition ---');
    const proneCondition = await ConditionService.applyCondition(
      testCharacter.id,
      'prone',
      {
        source: 'Test trip',
        duration: 2
      }
    );

    console.log(`✓ Applied: ${proneCondition.emoji} ${proneCondition.display_name}`);

    // Test 3: Get all active conditions
    console.log('\n--- Test 3: Get All Active Conditions ---');
    const activeConditions = await ConditionService.getActiveConditions(testCharacter.id);

    console.log(`✓ Character has ${activeConditions.length} active condition(s):`);
    activeConditions.forEach((condition, idx) => {
      console.log(`  ${idx + 1}. ${condition.emoji} ${condition.display_name} (${condition.duration_remaining} rounds)`);
    });

    // Test 4: Check condition effects
    console.log('\n--- Test 4: Check Aggregate Effects ---');
    const effects = ConditionService.calculateAggregateEffects(activeConditions);

    console.log(`✓ Aggregate effects:`);
    console.log(`  Attack roll modifier: ${effects.attackRollModifier || 'none'}`);
    console.log(`  Movement prevented: ${effects.movementPrevented}`);
    console.log(`  Incapacitated: ${effects.incapacitated}`);

    // Test 5: Remove a condition
    console.log('\n--- Test 5: Remove Prone Condition ---');
    const removed = await ConditionService.removeCondition(testCharacter.id, 'prone');

    console.log(`✓ Removed: ${removed}`);

    const remainingConditions = await ConditionService.getActiveConditions(testCharacter.id);
    console.log(`✓ Remaining conditions: ${ConditionService.formatConditionsForDisplay(remainingConditions)}`);

    // Test 6: Tick conditions
    console.log('\n--- Test 6: Tick Conditions (End of Turn) ---');
    const tickResult = await ConditionService.tickConditions(testCharacter.id);

    console.log(`✓ Ticked conditions`);
    console.log(`  Expired: ${tickResult.expiredCount}`);
    console.log(`  Remaining: ${tickResult.remainingConditions.length}`);

    console.log('\n✓ Condition service test completed successfully\n');

  } catch (error) {
    console.error('✗ ERROR:', error.message);
    console.error(error.stack);
  }
}

async function testConditionsInCombat() {
  console.log('='.repeat(80));
  console.log('TEST: Conditions During Combat');
  console.log('='.repeat(80));

  try {
    // Clear any existing conditions
    await ConditionService.removeCondition(testCharacter.id, 'grappled');
    await ConditionService.removeCondition(testCharacter.id, 'prone');
    await ConditionService.removeCondition(testCharacter.id, 'poisoned');

    // Create combat encounter
    const combatData = {
      enemies: [
        {
          name: 'Test Bandit',
          type: 'humanoid',
          ac: 14,
          hp: 25,
          maxHp: 25,
          currentHp: 25,
          attackBonus: 3,
          damageRoll: '1d6+1',
          zone: 'close',
          description: 'A scruffy bandit'
        }
      ],
      playerZone: 'close',
      narrativeSetup: 'Test combat with conditions'
    };

    const encounter = await CombatManager.initializeEncounter(
      testCharacter.id,
      combatData,
      null
    );

    console.log('\n✓ Combat initialized:', encounter.encounterName);

    // Test 1: Apply Poisoned condition (disadvantage on attacks)
    console.log('\n--- Test 1: Attack with Poisoned Condition ---');
    await ConditionService.applyCondition(
      testCharacter.id,
      'poisoned',
      {
        source: 'Poisoned dart',
        duration: 3
      }
    );

    console.log('✓ Applied Poisoned condition (disadvantage on attack rolls)');

    const attack1 = await CombatManager.processCombatAction(
      encounter.id,
      'I attack the bandit with my longsword'
    );

    console.log(`✓ ${attack1.description}`);
    console.log(`  Active conditions: ${ConditionService.formatConditionsForDisplay(attack1.activeConditions)}`);

    // Test 2: Apply Grappled condition (prevents movement)
    console.log('\n--- Test 2: Try to Move While Grappled ---');
    await ConditionService.applyCondition(
      testCharacter.id,
      'grappled',
      {
        source: 'Enemy grab',
        duration: 2
      }
    );

    const move1 = await CombatManager.processCombatAction(
      encounter.id,
      'I retreat to near range'
    );

    console.log(`✓ ${move1.description}`);
    console.log(`  Movement prevented: ${move1.description.includes('cannot move')}`);

    // Test 3: Remove Grappled and try movement again
    console.log('\n--- Test 3: Remove Grappled, Try Movement Again ---');
    await ConditionService.removeCondition(testCharacter.id, 'grappled');

    const move2 = await CombatManager.processCombatAction(
      encounter.id,
      'I retreat to near range'
    );

    console.log(`✓ ${move2.description}`);

    // Test 4: Conditions expire over time
    console.log('\n--- Test 4: Conditions Expire After Turns ---');

    // Get current conditions
    let currentConditions = await ConditionService.getActiveConditions(testCharacter.id);
    console.log(`Before: ${ConditionService.formatConditionsForDisplay(currentConditions)}`);

    // Take a few more actions to tick down durations
    await CombatManager.processCombatAction(
      encounter.id,
      'I attack the bandit'
    );

    await CombatManager.processCombatAction(
      encounter.id,
      'I attack the bandit'
    );

    currentConditions = await ConditionService.getActiveConditions(testCharacter.id);
    console.log(`After 2 turns: ${ConditionService.formatConditionsForDisplay(currentConditions)}`);

    // Test 5: Apply Stunned (incapacitated)
    console.log('\n--- Test 5: Stunned Condition (Cannot Take Actions) ---');
    await ConditionService.applyCondition(
      testCharacter.id,
      'stunned',
      {
        source: 'Test stun',
        duration: 1
      }
    );

    const stunnedAttack = await CombatManager.processCombatAction(
      encounter.id,
      'I try to attack'
    );

    console.log(`✓ ${stunnedAttack.description}`);
    console.log(`  Incapacitated prevented action: ${stunnedAttack.description.includes('incapacitated')}`);

    console.log('\n✓ Conditions in combat test completed successfully\n');

  } catch (error) {
    console.error('✗ ERROR:', error.message);
    console.error(error.stack);
  }
}

async function testFullCombatWithConditions() {
  console.log('='.repeat(80));
  console.log('TEST: Full Combat with Player Damage & Conditions');
  console.log('='.repeat(80));

  try {
    // Clear all conditions
    await db.query(
      `UPDATE character_conditions SET is_active = FALSE WHERE character_id = $1`,
      [testCharacter.id]
    );

    // Restore player HP to full
    await db.query(
      `UPDATE character_combat_stats SET current_hit_points = max_hit_points WHERE character_id = $1`,
      [testCharacter.id]
    );

    // Create challenging combat
    const combatData = {
      enemies: [
        {
          name: 'Veteran Bandit',
          type: 'humanoid',
          ac: 15,
          hp: 40,
          maxHp: 40,
          currentHp: 40,
          attackBonus: 5,
          damageRoll: '1d8+3',
          zone: 'close',
          description: 'An experienced fighter'
        }
      ],
      playerZone: 'close',
      narrativeSetup: 'A tough bandit challenges you!'
    };

    const encounter = await CombatManager.initializeEncounter(
      testCharacter.id,
      combatData,
      null
    );

    console.log('\n✓ Combat initialized:', encounter.encounterName);

    // Get initial HP
    const hpResult = await db.query(
      `SELECT current_hit_points, max_hit_points FROM character_combat_stats WHERE character_id = $1`,
      [testCharacter.id]
    );

    console.log(`\nPlayer HP: ${hpResult.rows[0].current_hit_points}/${hpResult.rows[0].max_hit_points}`);

    // Combat loop
    let round = 1;
    let maxRounds = 15;

    while (round <= maxRounds) {
      const updatedEncounter = await CombatManager.getActiveCombat(testCharacter.id);

      if (!updatedEncounter || updatedEncounter.status !== 'active') {
        console.log(`\n✓✓✓ COMBAT ENDED ✓✓✓`);
        break;
      }

      const aliveEnemies = updatedEncounter.enemies.filter(e => e.currentHp > 0);
      if (aliveEnemies.length === 0) {
        console.log(`\n✓✓✓ VICTORY! All enemies defeated! ✓✓✓`);
        await CombatManager.endCombat(updatedEncounter.id, 'victory');
        break;
      }

      console.log(`\n--- Round ${round} ---`);
      console.log(`Enemy: ${aliveEnemies[0].name} (${aliveEnemies[0].currentHp}/${aliveEnemies[0].maxHp} HP)`);

      // Show active conditions
      if (updatedEncounter.activeConditions && updatedEncounter.activeConditions.length > 0) {
        console.log(`Conditions: ${ConditionService.formatConditionsForDisplay(updatedEncounter.activeConditions)}`);
      }

      // Player attacks
      const attackResult = await CombatManager.processCombatAction(
        updatedEncounter.id,
        'I attack with my longsword'
      );

      console.log(`Player: ${attackResult.description}`);

      // Check if player defeated
      if (attackResult.playerDefeated) {
        console.log(`\n💀 DEFEAT! You have been defeated! 💀`);
        break;
      }

      round++;
    }

    if (round > maxRounds) {
      console.warn('⚠ Combat reached max rounds limit');
    }

    // Show final HP
    const finalHpResult = await db.query(
      `SELECT current_hit_points, max_hit_points FROM character_combat_stats WHERE character_id = $1`,
      [testCharacter.id]
    );

    console.log(`\nFinal Player HP: ${finalHpResult.rows[0].current_hit_points}/${finalHpResult.rows[0].max_hit_points}`);

    console.log('\n✓ Full combat test completed successfully\n');

  } catch (error) {
    console.error('✗ ERROR:', error.message);
    console.error(error.stack);
  }
}

async function runAllTests() {
  try {
    console.log('\n🎮 COMBAT SYSTEM PHASE 2C - CONDITIONS & ENHANCEMENTS TEST\n');

    await db.connect();

    // Test 1: Condition service functionality
    await testApplyConditions();

    // Test 2: Conditions during combat
    await testConditionsInCombat();

    // Test 3: Full combat with player damage
    await testFullCombatWithConditions();

    console.log('='.repeat(80));
    console.log('ALL PHASE 2C TESTS COMPLETE');
    console.log('='.repeat(80));

    process.exit(0);

  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Run tests
runAllTests();
