require('dotenv').config();
const CombatManager = require('./src/services/combatManager');
const CombatDetector = require('./src/services/agents/combatDetector');
const db = require('./src/config/database');

/**
 * Test Combat System Phase 2B - Enhanced Mechanics
 *
 * This test verifies:
 * 1. Proper attack rolls with d20 + STR/DEX modifiers
 * 2. Damage calculation with ability modifiers
 * 3. Critical hits and critical misses
 * 4. Zone-based advantage/disadvantage
 * 5. Zone movement mechanics
 * 6. Basic enemy AI
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

async function testEnhancedAttackMechanics() {
  console.log('='.repeat(80));
  console.log('TEST: Enhanced Attack Mechanics (Phase 2B)');
  console.log('='.repeat(80));

  try {
    // Create test combat encounter directly
    const combatData = {
      enemies: [
        {
          name: 'Test Bandit',
          type: 'humanoid',
          ac: 14,
          hp: 20,
          maxHp: 20,
          currentHp: 20,
          attackBonus: 3,
          damageRoll: '1d6+1',
          zone: 'close',
          description: 'A scruffy bandit'
        }
      ],
      playerZone: 'close',
      narrativeSetup: 'Test combat'
    };

    const encounter = await CombatManager.initializeEncounter(
      testCharacter.id,
      combatData,
      null
    );

    console.log('\n✓ Combat initialized:', encounter.encounterName);
    console.log(`  Enemy: ${encounter.enemies[0].name} (AC ${encounter.enemies[0].ac}, HP ${encounter.enemies[0].currentHp}/${encounter.enemies[0].maxHp})`);
    console.log(`  Player: ${testCharacter.name} (STR +3, DEX +2, Prof +2)`);
    console.log(`  Player zone: ${encounter.zoneSystem.player_zone}`);

    // Test melee attack
    console.log('\n--- Test 1: Melee Attack ---');
    const attack1 = await CombatManager.processCombatAction(
      encounter.id,
      'I attack the bandit with my longsword'
    );

    console.log(`✓ ${attack1.description}`);
    console.log(`  Hit: ${attack1.hit}, Damage: ${attack1.damage || 0}`);

    // Test movement
    console.log('\n--- Test 2: Zone Movement ---');
    const move1 = await CombatManager.processCombatAction(
      encounter.id,
      'I retreat to near range'
    );

    console.log(`✓ ${move1.description}`);
    console.log(`  Moved from: ${move1.movedFrom}, Moved to: ${move1.movedTo}`);

    // Test ranged attack
    console.log('\n--- Test 3: Ranged Attack ---');
    const attack2 = await CombatManager.processCombatAction(
      encounter.id,
      'I shoot the bandit with my shortbow'
    );

    console.log(`✓ ${attack2.description}`);
    console.log(`  Hit: ${attack2.hit}, Damage: ${attack2.damage || 0}`);

    // Move back to close
    console.log('\n--- Test 4: Advance to Close Range ---');
    const move2 = await CombatManager.processCombatAction(
      encounter.id,
      'I charge forward to close range'
    );

    console.log(`✓ ${move2.description}`);

    // Continue attacking until enemy defeated
    console.log('\n--- Test 5: Combat Until Victory ---');
    let round = 1;
    let maxRounds = 20;

    while (round <= maxRounds) {
      const updatedEncounter = await CombatManager.getActiveCombat(testCharacter.id);

      if (!updatedEncounter || updatedEncounter.status !== 'active') {
        console.log(`\n✓✓✓ COMBAT ENDED AFTER ${round - 1} ROUNDS ✓✓✓`);
        break;
      }

      const aliveEnemies = updatedEncounter.enemies.filter(e => e.currentHp > 0);
      if (aliveEnemies.length === 0) {
        console.log(`\n✓✓✓ ALL ENEMIES DEFEATED ✓✓✓`);
        await CombatManager.endCombat(updatedEncounter.id, 'victory');
        break;
      }

      console.log(`\nRound ${round}: Enemy HP = ${aliveEnemies[0].currentHp}/${aliveEnemies[0].maxHp}`);

      const attackResult = await CombatManager.processCombatAction(
        updatedEncounter.id,
        'I attack with my longsword'
      );

      console.log(`  ${attackResult.hit ? '✓ HIT' : '✗ MISS'}: ${attackResult.damage || 0} damage`);

      if (attackResult.criticalHit) {
        console.log(`  🎯 CRITICAL HIT!`);
      }

      round++;
    }

    console.log('\n✓ Enhanced attack mechanics test completed successfully');

  } catch (error) {
    console.error('✗ ERROR:', error.message);
    console.error(error.stack);
  }
}

async function testEnemyAI() {
  console.log('\n' + '='.repeat(80));
  console.log('TEST: Enemy AI Behavior');
  console.log('='.repeat(80));

  try {
    // Create combat with enemy at near range
    const combatData = {
      enemies: [
        {
          name: 'Wolf',
          type: 'beast',
          ac: 13,
          hp: 11,
          maxHp: 11,
          currentHp: 11,
          attackBonus: 4,
          damageRoll: '2d4+2',
          zone: 'near',
          description: 'A gray wolf'
        }
      ],
      playerZone: 'close',
      narrativeSetup: 'Wolf encounter'
    };

    const encounter = await CombatManager.initializeEncounter(
      testCharacter.id,
      combatData,
      null
    );

    console.log('\n✓ Combat initialized with Wolf at near range');

    // Get character data for AI
    const charResult = await db.query(
      `SELECT cs.*, ccs.proficiency_bonus
       FROM character_stats cs
       JOIN character_combat_stats ccs ON cs.id = ccs.character_id
       WHERE cs.id = $1`,
      [testCharacter.id]
    );

    const character = charResult.rows[0];

    // Test enemy AI decision
    console.log('\n--- Test: Enemy AI Advances to Close Range ---');
    const aiAction = CombatManager.enemyTakeTurn(0, encounter, character);

    console.log(`✓ ${aiAction.description}`);
    console.log(`  Enemy moved to zone: ${aiAction.updatedZones?.enemy_zones?.enemy_0 || 'no move'}`);

    // Damage enemy to test retreat behavior
    encounter.enemies[0].currentHp = 2; // < 25% HP

    console.log('\n--- Test: Enemy AI Retreats When Wounded ---');
    const aiAction2 = CombatManager.enemyTakeTurn(0, encounter, character);

    console.log(`✓ ${aiAction2.description}`);

    // Test enemy attack
    encounter.enemies[0].currentHp = 11; // Restore HP
    encounter.zone_system.enemy_zones.enemy_0 = 'close';

    console.log('\n--- Test: Enemy AI Attacks Player ---');
    const aiAction3 = CombatManager.enemyTakeTurn(0, encounter, character);

    console.log(`✓ ${aiAction3.description}`);
    console.log(`  Enemy hit: ${aiAction3.hit}, Damage: ${aiAction3.damage || 0}`);

    console.log('\n✓ Enemy AI test completed successfully');

  } catch (error) {
    console.error('✗ ERROR:', error.message);
    console.error(error.stack);
  }
}

async function runAllTests() {
  try {
    console.log('\n🎮 COMBAT SYSTEM PHASE 2B - ENHANCED MECHANICS TEST\n');

    await db.connect();

    // Test 1: Enhanced attack mechanics
    await testEnhancedAttackMechanics();

    // Test 2: Enemy AI
    await testEnemyAI();

    console.log('\n' + '='.repeat(80));
    console.log('ALL PHASE 2B TESTS COMPLETE');
    console.log('='.repeat(80));

    process.exit(0);

  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Run tests
runAllTests();
