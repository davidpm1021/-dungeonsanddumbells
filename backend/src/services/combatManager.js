const db = require('../config/database');
const ConditionService = require('./conditionService');
const CombatNarrative = require('./combatNarrative');
const HealthConditionService = require('./healthConditionService');

/**
 * Combat Manager Service
 *
 * Handles D&D 5e combat encounter mechanics:
 * - Initialize combat encounters with zone system
 * - Roll initiative for all combatants
 * - Manage turn order and combat rounds
 * - Track enemy/player positioning (Close/Near/Far zones)
 * - Store combat state in database
 *
 * Zone System (Hybrid Combat):
 * - Close: Melee range (5-10 ft) - can melee attack, no ranged disadvantage
 * - Near: Short range (30-60 ft) - ranged attacks, can move to Close
 * - Far: Long range (100+ ft) - ranged disadvantage, takes multiple turns to reach Close
 *
 * Turn-Based System:
 * - Pause between turns for async web play
 * - Player acts on their turn, then all enemies act
 * - Combat log stored for narrative memory
 */
class CombatManager {
  /**
   * Initialize a new combat encounter
   *
   * @param {number} characterId - Character ID
   * @param {Object} combatData - Combat detection result from CombatDetector
   * @param {number} questId - Optional quest ID this combat relates to
   * @returns {Promise<Object>} - Created combat encounter
   */
  async initializeEncounter(characterId, combatData, questId = null, playerInitiativeRoll = null) {
    try {
      console.log('[CombatManager] Initializing combat:', combatData.enemies.length, 'enemies');
      if (playerInitiativeRoll !== null) {
        console.log('[CombatManager] Using player initiative roll:', playerInitiativeRoll);
      } else {
        console.log('[CombatManager] No player roll - using placeholder (player will roll)');
      }

      // Get character stats for initiative
      const charResult = await db.query(
        `SELECT
          cs.id, cs.name, cs.class, cs.level, cs.dex,
          ccs.armor_class, ccs.max_hit_points, ccs.current_hit_points
        FROM character_stats cs
        LEFT JOIN character_combat_stats ccs ON cs.id = ccs.character_id
        WHERE cs.id = $1`,
        [characterId]
      );

      if (charResult.rows.length === 0) {
        throw new Error(`Character ${characterId} not found`);
      }

      const character = charResult.rows[0];

      // Auto-initialize combat stats if missing
      if (!character.armor_class || !character.max_hit_points) {
        console.log(`[CombatManager] Character ${characterId} missing combat stats - auto-initializing`);
        const baseHP = 30;
        const baseAC = 12 + (character.class === 'Fighter' ? 3 : character.class === 'Rogue' ? 2 : 0);

        await db.query(
          `INSERT INTO character_combat_stats (character_id, armor_class, max_hit_points, current_hit_points)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (character_id) DO UPDATE
           SET armor_class = EXCLUDED.armor_class,
               max_hit_points = EXCLUDED.max_hit_points,
               current_hit_points = EXCLUDED.current_hit_points`,
          [characterId, baseAC, baseHP, baseHP]
        );

        // Update character object with initialized values
        character.armor_class = baseAC;
        character.max_hit_points = baseHP;
        character.current_hit_points = baseHP;
      }

      // Roll initiative for all combatants (pass player roll if provided)
      const initiativeOrder = this.rollInitiative(character, combatData.enemies, playerInitiativeRoll);

      // Prepare enemies JSON
      const enemiesJson = combatData.enemies.map(enemy => ({
        ...enemy,
        currentHp: enemy.hp // Initialize current HP to max HP
      }));

      // Prepare zone system JSON
      const zoneSystem = {
        player_zone: combatData.playerZone || 'close',
        enemy_zones: {}
      };

      combatData.enemies.forEach((enemy, idx) => {
        zoneSystem.enemy_zones[`enemy_${idx}`] = enemy.zone || 'near';
      });

      // Create combat encounter in database
      const result = await db.query(
        `INSERT INTO combat_encounters (
          character_id, quest_id, encounter_name, encounter_description,
          enemies, initiative_order, current_turn_index, zone_system,
          current_round, status, combat_log
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *`,
        [
          characterId,
          questId,
          this.generateEncounterName(combatData.enemies),
          combatData.narrativeSetup || 'Combat begins!',
          JSON.stringify(enemiesJson),
          JSON.stringify(initiativeOrder),
          0, // Start at first combatant in initiative order
          JSON.stringify(zoneSystem),
          1, // Round 1
          'active',
          JSON.stringify([{
            round: 1,
            turn: 0,
            event: combatData.narrativeSetup || 'Combat begins!',
            timestamp: new Date().toISOString()
          }])
        ]
      );

      const encounter = result.rows[0];

      console.log('[CombatManager] Combat initialized:', encounter.id, '-', encounter.encounter_name);
      console.log('[CombatManager] Initiative order:', initiativeOrder.map(c => `${c.name} (${c.initiative})`).join(', '));

      return this.formatEncounter(encounter);

    } catch (error) {
      console.error('[CombatManager] Error initializing encounter:', error.message);
      throw error;
    }
  }

  /**
   * Roll initiative for all combatants
   *
   * @param {Object} character - Player character data
   * @param {Array} enemies - Enemy data from CombatDetector
   * @param {number} playerRoll - Optional player's d20 roll (if null, uses neutral placeholder)
   * @returns {Array} - Initiative order sorted highest to lowest
   */
  rollInitiative(character, enemies, playerRoll = null) {
    const combatants = [];

    // Player initiative
    const playerDexMod = Math.floor((character.dex - 10) / 2);
    const playerInitiative = playerRoll !== null
      ? playerRoll + playerDexMod  // Use player's roll
      : 10 + playerDexMod;          // Neutral placeholder (10 is average)

    combatants.push({
      name: character.name,
      type: 'player',
      initiative: playerInitiative,
      dexMod: playerDexMod,
      needsRoll: playerRoll === null // Flag indicates player hasn't rolled yet
    });

    // Enemy initiatives
    enemies.forEach((enemy, idx) => {
      // Estimate enemy DEX modifier from AC (rough approximation)
      const enemyDexMod = Math.max(0, enemy.ac - 12); // AC 12 = +0, AC 14 = +2, etc.
      const enemyInitiative = this.rollD20(false, false) + enemyDexMod;

      combatants.push({
        name: enemy.name,
        type: 'enemy',
        enemyIndex: idx,
        initiative: enemyInitiative,
        dexMod: enemyDexMod
      });
    });

    // Sort by initiative (highest first)
    combatants.sort((a, b) => b.initiative - a.initiative);

    return combatants;
  }

  /**
   * Get active combat encounter for a character
   *
   * @param {number} characterId - Character ID
   * @returns {Promise<Object|null>} - Active combat encounter or null
   */
  async getActiveCombat(characterId) {
    try {
      const result = await db.query(
        `SELECT * FROM combat_encounters
        WHERE character_id = $1 AND status = 'active'
        ORDER BY started_at DESC
        LIMIT 1`,
        [characterId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const encounter = this.formatEncounter(result.rows[0]);

      // Include D&D 5e conditions (Grappled, Prone, etc.)
      const activeConditions = await ConditionService.getActiveConditions(characterId);
      encounter.activeConditions = activeConditions;

      // Include health conditions (Well-Rested, Battle-Ready, etc.)
      try {
        const healthConditions = await HealthConditionService.getActiveConditions(characterId);
        const healthModifiers = await HealthConditionService.calculateTotalStatModifiers(characterId);
        encounter.healthConditions = healthConditions;
        encounter.healthModifiers = healthModifiers;
      } catch (err) {
        console.log('[CombatManager] Could not fetch health conditions:', err.message);
        encounter.healthConditions = [];
        encounter.healthModifiers = { STR: 0, DEX: 0, CON: 0, INT: 0, WIS: 0, CHA: 0 };
      }

      return encounter;

    } catch (error) {
      console.error('[CombatManager] Error getting active combat:', error.message);
      return null;
    }
  }

  /**
   * Update player's initiative with their actual roll
   *
   * @param {number} encounterId - Combat encounter ID
   * @param {number} characterId - Player character ID
   * @param {number} playerRoll - Player's d20 roll (1-20)
   * @returns {Promise<Object>} - Updated combat encounter
   */
  async updatePlayerInitiative(encounterId, characterId, playerRoll) {
    try {
      console.log('[CombatManager] Updating player initiative - roll:', playerRoll);

      // Get current combat state
      const result = await db.query(
        'SELECT * FROM combat_encounters WHERE id = $1 AND character_id = $2 AND status = $3',
        [encounterId, characterId, 'active']
      );

      if (result.rows.length === 0) {
        throw new Error('Combat encounter not found or already ended');
      }

      const encounter = result.rows[0];
      const initiativeOrder = encounter.initiative_order;

      // Find player in initiative order
      const playerIndex = initiativeOrder.findIndex(c => c.type === 'player');
      if (playerIndex === -1) {
        throw new Error('Player not found in initiative order');
      }

      const player = initiativeOrder[playerIndex];
      const totalInitiative = playerRoll + player.dexMod;

      // Update player's initiative
      initiativeOrder[playerIndex] = {
        ...player,
        initiative: totalInitiative,
        needsRoll: false,
        playerRoll: playerRoll // Store raw roll for reference
      };

      // Re-sort by initiative (highest first)
      initiativeOrder.sort((a, b) => b.initiative - a.initiative);

      // Find new current turn index (whoever is first in new order)
      const newTurnIndex = 0;

      // Update database
      await db.query(
        `UPDATE combat_encounters
        SET initiative_order = $1, current_turn_index = $2
        WHERE id = $3`,
        [JSON.stringify(initiativeOrder), newTurnIndex, encounterId]
      );

      console.log('[CombatManager] Initiative updated! Player rolled', playerRoll, '+ DEX', player.dexMod, '=', totalInitiative);
      console.log('[CombatManager] New turn order:', initiativeOrder.map(c => `${c.name} (${c.initiative})`).join(', '));

      // Return updated combat state
      return this.getActiveCombat(characterId);

    } catch (error) {
      console.error('[CombatManager] Error updating player initiative:', error.message);
      throw error;
    }
  }

  /**
   * Process a combat action (attack, move, etc.)
   *
   * @param {number} encounterId - Combat encounter ID
   * @param {string} action - Player action description
   * @returns {Promise<Object>} - Combat action result
   */
  async processCombatAction(encounterId, action) {
    try {
      console.log('[CombatManager] Processing combat action:', action.substring(0, 50));

      const encounter = await this.getEncounterById(encounterId);
      if (!encounter) {
        throw new Error(`Combat encounter ${encounterId} not found`);
      }

      if (encounter.status !== 'active') {
        throw new Error('Combat encounter is not active');
      }

      // Get character stats for attack/damage modifiers
      const charResult = await db.query(
        `SELECT
          cs.id, cs.name, cs.class, cs.str, cs.dex, cs.con,
          ccs.proficiency_bonus
        FROM character_stats cs
        LEFT JOIN character_combat_stats ccs ON cs.id = ccs.character_id
        WHERE cs.id = $1`,
        [encounter.characterId]
      );

      const character = charResult.rows.length > 0 ? charResult.rows[0] : null;

      if (!character) {
        throw new Error(`Character ${encounter.characterId} not found`);
      }

      // Parse action (attack, move zone, use item, etc.)
      const actionResult = await this.parseAction(action, encounter, character);

      // Tick conditions at end of player turn
      const conditionTick = await ConditionService.tickConditions(character.id);
      if (conditionTick.expiredCount > 0) {
        console.log(`[CombatManager] ${conditionTick.expiredCount} condition(s) expired`);
      }

      // Add to combat log
      const combatLog = encounter.combat_log || [];
      const currentCombatant = encounter.initiativeOrder?.[encounter.currentTurnIndex];
      combatLog.push({
        round: encounter.currentRound,
        turn: encounter.currentTurnIndex,
        actor: currentCombatant?.name || 'Unknown',
        action: action,
        result: actionResult.description,
        timestamp: new Date().toISOString()
      });

      // Advance to next turn
      let nextTurnIndex = encounter.currentTurnIndex + 1;
      let nextRound = encounter.currentRound;

      if (!encounter.initiativeOrder ||  !Array.isArray(encounter.initiativeOrder)) {
        console.error('[CombatManager] ERROR: initiativeOrder is not an array:', encounter.initiativeOrder);
        throw new Error('Encounter initiativeOrder is missing or invalid');
      }

      if (nextTurnIndex >= encounter.initiativeOrder.length) {
        nextTurnIndex = 0;
        nextRound += 1;
      }

      // Update encounter in database
      await db.query(
        `UPDATE combat_encounters
        SET current_turn_index = $1,
            current_round = $2,
            combat_log = $3,
            enemies = $4,
            zone_system = $5
        WHERE id = $6`,
        [
          nextTurnIndex,
          nextRound,
          JSON.stringify(combatLog),
          JSON.stringify(actionResult.updatedEnemies || encounter.enemies),
          JSON.stringify(actionResult.updatedZones || encounter.zone_system),
          encounterId
        ]
      );

      // Check if combat should end
      const combatOver = await this.checkCombatEnd(
        actionResult.updatedEnemies || encounter.enemies,
        encounter.characterId
      );

      if (combatOver) {
        await this.endCombat(encounterId, combatOver.status);
      }

      // Get updated active conditions
      const activeConditions = await ConditionService.getActiveConditions(character.id);

      const nextCombatant = encounter.initiativeOrder?.[nextTurnIndex];

      return {
        ...actionResult,
        nextTurn: nextCombatant?.name || 'Unknown',
        round: nextRound,
        combatEnded: combatOver !== null,
        combatResult: combatOver?.status || null,
        activeConditions,
        expiredConditions: conditionTick.expiredConditions
      };

    } catch (error) {
      console.error('[CombatManager] Error processing combat action:', error.message);
      throw error;
    }
  }

  /**
   * Parse player combat action
   */
  async parseAction(action, encounter, character) {
    const actionLower = action.toLowerCase();

    // Attack action
    if (actionLower.match(/\b(attack|strike|hit|slash|stab|shoot|fire)\b/)) {
      return await this.resolveAttack(action, encounter, character);
    }

    // Move to different zone
    if (actionLower.match(/\b(move to|advance to|retreat to|back away)\b/)) {
      return await this.resolveMovement(action, encounter, character);
    }

    // Default: treat as narrative action
    return {
      description: 'Action taken',
      updatedEnemies: encounter.enemies,
      updatedZones: encounter.zone_system
    };
  }

  /**
   * Resolve attack action with proper D&D 5e mechanics
   */
  async resolveAttack(action, encounter, character) {
    const enemies = [...encounter.enemies];
    const actionLower = action.toLowerCase();

    // Find alive enemy to target
    let targetIndex = enemies.findIndex(e => e.currentHp > 0);
    if (targetIndex === -1) {
      return {
        description: 'All enemies are already defeated!',
        updatedEnemies: enemies
      };
    }

    const target = enemies[targetIndex];

    // Ensure zone_system exists with defaults
    if (!encounter.zone_system) {
      encounter.zone_system = {
        player_zone: 'close',
        enemy_zones: {}
      };
    }

    const playerZone = encounter.zone_system.player_zone || 'close';
    const enemyZone = encounter.zone_system.enemy_zones[`enemy_${targetIndex}`] || 'near';

    // Determine attack type (melee or ranged)
    const isRangedAttack = actionLower.match(/\b(shoot|fire|throw|bow|crossbow)\b/);
    const isMeleeAttack = !isRangedAttack;

    // Get health condition modifiers (fitness affects combat!)
    let healthModifiers = { STR: 0, DEX: 0, CON: 0, INT: 0, WIS: 0, CHA: 0 };
    let healthConditions = [];
    try {
      healthModifiers = await HealthConditionService.calculateTotalStatModifiers(character.id);
      healthConditions = await HealthConditionService.getActiveConditions(character.id);
      if (Object.values(healthModifiers).some(v => v !== 0)) {
        console.log('[CombatManager] Applying health modifiers:', healthModifiers);
      }
    } catch (err) {
      console.log('[CombatManager] Could not fetch health modifiers:', err.message);
    }

    // Calculate ability modifiers (now including health buffs/debuffs!)
    const baseStrMod = character ? Math.floor((character.str - 10) / 2) : 2;
    const baseDexMod = character ? Math.floor((character.dex - 10) / 2) : 2;
    const strMod = baseStrMod + (healthModifiers.STR || 0);
    const dexMod = baseDexMod + (healthModifiers.DEX || 0);
    const profBonus = character ? character.proficiency_bonus : 2;

    // Determine attack modifier
    let attackMod = strMod + profBonus; // Default melee
    let damageMod = strMod;
    let weaponDice = 8; // d8 for longsword
    let weaponName = 'longsword';

    if (isRangedAttack) {
      attackMod = dexMod + profBonus;
      damageMod = dexMod;
      weaponDice = 6; // d6 for shortbow
      weaponName = 'shortbow';
    }

    // Check for conditions affecting attack rolls
    const activeConditions = await ConditionService.getActiveConditions(character.id);
    const conditionEffects = ConditionService.calculateAggregateEffects(activeConditions);

    // Check if incapacitated (cannot take actions)
    if (conditionEffects.incapacitated) {
      return {
        description: `You are incapacitated and cannot attack! Active conditions: ${ConditionService.formatConditionsForDisplay(activeConditions)}`,
        updatedEnemies: enemies
      };
    }

    // Check for advantage/disadvantage based on zones and conditions
    let advantage = false;
    let disadvantage = false;

    // Apply condition modifiers
    if (conditionEffects.attackRollModifier === 'advantage') {
      advantage = true;
    } else if (conditionEffects.attackRollModifier === 'disadvantage') {
      disadvantage = true;
    }

    if (isMeleeAttack && playerZone !== 'close') {
      return {
        description: `Cannot make melee attack from ${playerZone} range! Move to close range first.`,
        updatedEnemies: enemies
      };
    }

    if (isRangedAttack && playerZone === 'close' && enemyZone === 'close') {
      disadvantage = true; // Disadvantage on ranged attacks at close range
    }

    if (isRangedAttack && enemyZone === 'far') {
      disadvantage = true; // Disadvantage on ranged attacks at far range
    }

    // Roll attack (d20 + attack modifier)
    const d20Roll = this.rollD20(advantage, disadvantage);
    const attackRoll = d20Roll + attackMod;
    const targetAC = target.ac;

    // Check for critical hit/miss
    const isCriticalHit = d20Roll === 20;
    const isCriticalMiss = d20Roll === 1;

    if (isCriticalMiss) {
      const missDescription = CombatNarrative.generateMissDescription({
        attackerName: character.name,
        targetName: target.name,
        weaponName,
        isCriticalMiss: true,
        attackRoll,
        targetAC
      });

      return {
        description: missDescription,
        hit: false,
        criticalMiss: true,
        attackRoll: d20Roll,
        updatedEnemies: enemies
      };
    }

    if (attackRoll >= targetAC || isCriticalHit) {
      // Hit! Roll damage
      let damageRoll = Math.floor(Math.random() * weaponDice) + 1;

      // Critical hit: double damage dice
      if (isCriticalHit) {
        damageRoll += Math.floor(Math.random() * weaponDice) + 1;
      }

      const totalDamage = damageRoll + damageMod;
      enemies[targetIndex].currentHp = Math.max(0, enemies[targetIndex].currentHp - totalDamage);

      // Calculate damage percentage for narrative
      const damagePercent = (totalDamage / target.maxHp) * 100;

      // Generate rich hit description
      let hitDescription = CombatNarrative.generateHitDescription({
        attackerName: character.name,
        targetName: target.name,
        weaponName,
        damage: totalDamage,
        isCritical: isCriticalHit,
        damagePercent,
        totalDamage
      });

      // Add HP status
      if (enemies[targetIndex].currentHp === 0) {
        hitDescription += ` ${CombatNarrative.generateDefeatDescription(target.name, hitDescription)}`;
      } else {
        hitDescription += ` (${enemies[targetIndex].currentHp}/${target.maxHp} HP remaining)`;
      }

      return {
        description: hitDescription,
        hit: true,
        damage: totalDamage,
        weaponDice: weaponDice,
        damageMod: damageMod,
        attackRoll: attackRoll,
        d20Roll: d20Roll,
        criticalHit: isCriticalHit,
        targetDefeated: enemies[targetIndex].currentHp === 0,
        updatedEnemies: enemies
      };
    } else {
      // Miss
      const missDescription = CombatNarrative.generateMissDescription({
        attackerName: character.name,
        targetName: target.name,
        weaponName,
        isCriticalMiss: false,
        attackRoll,
        targetAC
      });

      return {
        description: missDescription,
        hit: false,
        attackRoll: attackRoll,
        d20Roll: d20Roll,
        updatedEnemies: enemies
      };
    }
  }

  /**
   * Roll d20 with advantage/disadvantage
   */
  rollD20(advantage = false, disadvantage = false) {
    const roll1 = Math.floor(Math.random() * 20) + 1;

    // Normal roll if no advantage/disadvantage or both cancel out
    if ((!advantage && !disadvantage) || (advantage && disadvantage)) {
      return roll1;
    }

    // Roll second die
    const roll2 = Math.floor(Math.random() * 20) + 1;

    // Advantage: take higher
    if (advantage) {
      console.log(`[CombatManager] Advantage roll: ${roll1}, ${roll2} -> ${Math.max(roll1, roll2)}`);
      return Math.max(roll1, roll2);
    }

    // Disadvantage: take lower
    console.log(`[CombatManager] Disadvantage roll: ${roll1}, ${roll2} -> ${Math.min(roll1, roll2)}`);
    return Math.min(roll1, roll2);
  }

  /**
   * Resolve movement between zones with D&D 5e movement rules
   */
  async resolveMovement(action, encounter, character) {
    const actionLower = action.toLowerCase();
    const zoneSystem = { ...encounter.zone_system };
    const currentZone = zoneSystem.player_zone;

    // Check for conditions that prevent movement
    const activeConditions = await ConditionService.getActiveConditions(character.id);
    const conditionEffects = ConditionService.calculateAggregateEffects(activeConditions);

    if (conditionEffects.movementPrevented) {
      return {
        description: `You cannot move! Active conditions: ${ConditionService.formatConditionsForDisplay(activeConditions)}`,
        updatedZones: zoneSystem,
        updatedEnemies: encounter.enemies
      };
    }

    // Define zone order: close -> near -> far
    const zoneOrder = ['close', 'near', 'far'];
    const currentIndex = zoneOrder.indexOf(currentZone);

    // Determine new zone from action
    let newZone = currentZone;
    let direction = null;

    // Advancing (moving closer to enemies)
    if (actionLower.match(/\b(advance|move.*(to\s+)?close|charge|rush)\b/)) {
      direction = 'advance';
      if (currentIndex > 0) {
        newZone = zoneOrder[currentIndex - 1];
      } else {
        return {
          description: `Already at ${currentZone} range - cannot advance further!`,
          updatedZones: zoneSystem,
          updatedEnemies: encounter.enemies
        };
      }
    }
    // Retreating (moving away from enemies)
    else if (actionLower.match(/\b(retreat|back|move.*(to\s+)?far|withdraw|flee)\b/)) {
      direction = 'retreat';
      if (currentIndex < zoneOrder.length - 1) {
        newZone = zoneOrder[currentIndex + 1];
      } else {
        return {
          description: `Already at ${currentZone} range - cannot retreat further!`,
          updatedZones: zoneSystem,
          updatedEnemies: encounter.enemies
        };
      }
    }
    // Move to near (mid-range)
    else if (actionLower.match(/\b(move.*(to\s+)?near|middle|mid.?range)\b/)) {
      newZone = 'near';
    }

    // Check if actually moved
    if (newZone === currentZone) {
      return {
        description: `Already at ${currentZone} range.`,
        updatedZones: zoneSystem,
        updatedEnemies: encounter.enemies
      };
    }

    // Apply movement
    zoneSystem.player_zone = newZone;

    // Calculate movement distance for narrative
    const zoneDistance = Math.abs(zoneOrder.indexOf(newZone) - currentIndex);
    const isAdvancing = direction === 'advance';

    // Generate rich movement description
    const description = CombatNarrative.generateMovementDescription({
      characterName: character.name,
      fromZone: currentZone,
      toZone: newZone,
      isAdvancing,
      enemyPresent: encounter.enemies.length > 0
    });

    return {
      description,
      updatedZones: zoneSystem,
      updatedEnemies: encounter.enemies,
      movedFrom: currentZone,
      movedTo: newZone,
      distance: zoneDistance
    };
  }

  /**
   * Enemy AI - make combat decision for an enemy
   */
  async enemyTakeTurn(enemyIndex, encounter, character) {
    const enemy = encounter.enemies[enemyIndex];

    // Ensure zone_system exists with defaults
    if (!encounter.zone_system) {
      encounter.zone_system = {
        player_zone: 'close',
        enemy_zones: {}
      };
    }

    const playerZone = encounter.zone_system.player_zone || 'close';
    const enemyZone = encounter.zone_system.enemy_zones[`enemy_${enemyIndex}`] || 'near';

    // Skip if enemy is defeated
    if (enemy.currentHp <= 0) {
      return {
        description: `${enemy.name} is defeated and cannot act.`,
        updatedEnemies: encounter.enemies,
        updatedZones: encounter.zone_system
      };
    }

    // Simple AI logic:
    // 1. If enemy is melee type and not at close range, move closer
    // 2. If at appropriate range, attack
    // 3. If badly wounded (< 25% HP), retreat

    const hpPercent = (enemy.currentHp / enemy.maxHp) * 100;
    const isRangedEnemy = enemy.name.toLowerCase().includes('archer') || enemy.name.toLowerCase().includes('mage');

    // Retreat if badly wounded
    if (hpPercent < 25 && enemyZone !== 'far') {
      const newZone = enemyZone === 'close' ? 'near' : 'far';
      const updatedZones = { ...encounter.zone_system };
      updatedZones.enemy_zones[`enemy_${enemyIndex}`] = newZone;

      return {
        description: `${enemy.name} retreats from ${enemyZone} to ${newZone} range! (${enemy.currentHp}/${enemy.maxHp} HP)`,
        updatedEnemies: encounter.enemies,
        updatedZones
      };
    }

    // Melee enemies advance if not close
    if (!isRangedEnemy && playerZone !== 'close' && enemyZone !== 'close') {
      const newZone = enemyZone === 'far' ? 'near' : 'close';
      const updatedZones = { ...encounter.zone_system };
      updatedZones.enemy_zones[`enemy_${enemyIndex}`] = newZone;

      return {
        description: `${enemy.name} advances from ${enemyZone} to ${newZone} range!`,
        updatedEnemies: encounter.enemies,
        updatedZones
      };
    }

    // Ranged enemies stay at near/far range
    if (isRangedEnemy && enemyZone === 'close') {
      const updatedZones = { ...encounter.zone_system };
      updatedZones.enemy_zones[`enemy_${enemyIndex}`] = 'near';

      return {
        description: `${enemy.name} backs away to near range!`,
        updatedEnemies: encounter.enemies,
        updatedZones
      };
    }

    // Attack the player
    return this.enemyAttack(enemyIndex, encounter, character);
  }

  /**
   * Enemy attacks the player
   */
  async enemyAttack(enemyIndex, encounter, character) {
    const enemy = encounter.enemies[enemyIndex];
    const attackBonus = enemy.attackBonus || 3;

    // Roll attack (d20 + enemy attack bonus)
    const d20Roll = this.rollD20(false, false);
    const attackRoll = d20Roll + attackBonus;

    // Get player AC from database
    const playerAC = await this.getPlayerAC(character.id);

    if (attackRoll >= playerAC || d20Roll === 20) {
      // Hit! Roll damage
      const damageRoll = enemy.damageRoll || '1d6+1';
      const damage = this.rollDamage(damageRoll);

      // Apply damage to player HP
      const playerHP = await this.applyDamageToPlayer(character.id, damage);

      const statusEmoji = playerHP.currentHp === 0 ? ' 💀' : playerHP.currentHp < playerHP.maxHp * 0.25 ? ' ⚠️' : '';

      return {
        description: `${enemy.name} hits ${character?.name || 'you'} for ${damage} damage!${statusEmoji} (${playerHP.currentHp}/${playerHP.maxHp} HP) [d20: ${d20Roll} + ${attackBonus} = ${attackRoll} vs AC ${playerAC}]`,
        hit: true,
        damage,
        attackRoll,
        playerDefeated: playerHP.currentHp === 0,
        playerHP: playerHP,
        updatedEnemies: encounter.enemies
      };
    } else {
      return {
        description: `${enemy.name} misses ${character?.name || 'you'}! [d20: ${d20Roll} + ${attackBonus} = ${attackRoll} vs AC ${playerAC}]`,
        hit: false,
        attackRoll,
        updatedEnemies: encounter.enemies
      };
    }
  }

  /**
   * Get player AC from database
   */
  async getPlayerAC(characterId) {
    try {
      const result = await db.query(
        `SELECT armor_class FROM character_combat_stats WHERE character_id = $1`,
        [characterId]
      );

      return result.rows.length > 0 ? result.rows[0].armor_class : 10;
    } catch (error) {
      console.error('[CombatManager] Error getting player AC:', error.message);
      return 10; // Default AC
    }
  }

  /**
   * Apply damage to player and return current HP
   */
  async applyDamageToPlayer(characterId, damage) {
    try {
      const result = await db.query(
        `UPDATE character_combat_stats
         SET current_hit_points = GREATEST(0, current_hit_points - $1)
         WHERE character_id = $2
         RETURNING current_hit_points, max_hit_points`,
        [damage, characterId]
      );

      if (result.rows.length > 0) {
        return {
          currentHp: result.rows[0].current_hit_points,
          maxHp: result.rows[0].max_hit_points
        };
      }

      // Fallback if no combat stats exist
      return { currentHp: 10, maxHp: 10 };
    } catch (error) {
      console.error('[CombatManager] Error applying damage:', error.message);
      return { currentHp: 10, maxHp: 10 };
    }
  }

  /**
   * Roll damage from dice notation (e.g., "1d6+2")
   */
  rollDamage(diceNotation) {
    const match = diceNotation.match(/(\d+)d(\d+)(?:\+(\d+))?/);
    if (!match) return 1;

    const numDice = parseInt(match[1]);
    const diceSize = parseInt(match[2]);
    const bonus = parseInt(match[3] || 0);

    let total = bonus;
    for (let i = 0; i < numDice; i++) {
      total += Math.floor(Math.random() * diceSize) + 1;
    }

    return total;
  }

  /**
   * Check if combat should end
   */
  async checkCombatEnd(enemies, characterId) {
    const aliveEnemies = enemies.filter(e => e.currentHp > 0);

    if (aliveEnemies.length === 0) {
      return { status: 'victory' };
    }

    // Check player HP for defeat condition
    if (characterId) {
      try {
        const result = await db.query(
          `SELECT current_hit_points FROM character_combat_stats WHERE character_id = $1`,
          [characterId]
        );

        if (result.rows.length > 0 && result.rows[0].current_hit_points <= 0) {
          return { status: 'defeat' };
        }
      } catch (error) {
        console.error('[CombatManager] Error checking player HP:', error.message);
      }
    }

    return null;
  }

  /**
   * End combat encounter
   */
  async endCombat(encounterId, status = 'victory') {
    await db.query(
      `UPDATE combat_encounters
      SET status = $1, ended_at = CURRENT_TIMESTAMP
      WHERE id = $2`,
      [status, encounterId]
    );

    console.log('[CombatManager] Combat ended:', encounterId, '-', status);
  }

  /**
   * Get encounter by ID
   */
  async getEncounterById(encounterId) {
    const result = await db.query(
      `SELECT * FROM combat_encounters WHERE id = $1`,
      [encounterId]
    );

    return result.rows.length > 0 ? this.formatEncounter(result.rows[0]) : null;
  }

  /**
   * Format encounter from database row
   */
  formatEncounter(row) {
    // Parse JSON fields if they're strings
    const parseJson = (field) => {
      if (!field) return field;
      return typeof field === 'string' ? JSON.parse(field) : field;
    };

    return {
      id: row.id,
      characterId: row.character_id,
      questId: row.quest_id,
      encounterName: row.encounter_name,
      encounterDescription: row.encounter_description,
      enemies: parseJson(row.enemies),
      initiativeOrder: parseJson(row.initiative_order),
      currentTurnIndex: row.current_turn_index,
      currentRound: row.current_round,
      zoneSystem: parseJson(row.zone_system),
      status: row.status,
      startedAt: row.started_at,
      endedAt: row.ended_at,
      combat_log: parseJson(row.combat_log) || []
    };
  }

  /**
   * Generate encounter name from enemies
   */
  generateEncounterName(enemies) {
    if (enemies.length === 1) {
      return `Duel with ${enemies[0].name}`;
    }

    const uniqueTypes = [...new Set(enemies.map(e => e.type || 'enemy'))];
    if (uniqueTypes.length === 1) {
      return `${enemies.length} ${uniqueTypes[0]}s`;
    }

    return `${enemies.length} enemies`;
  }

  /**
   * Get combat history for a character
   */
  async getCombatHistory(characterId, limit = 10) {
    try {
      const result = await db.query(
        `SELECT
          id, encounter_name, encounter_description, status,
          started_at, ended_at,
          (enemies::jsonb) as enemies_json
        FROM combat_encounters
        WHERE character_id = $1
        ORDER BY started_at DESC
        LIMIT $2`,
        [characterId, limit]
      );

      return result.rows.map(row => ({
        id: row.id,
        encounterName: row.encounter_name,
        encounterDescription: row.encounter_description,
        status: row.status,
        enemyCount: row.enemies_json.length,
        startedAt: row.started_at,
        endedAt: row.ended_at
      }));

    } catch (error) {
      console.error('[CombatManager] Error getting combat history:', error.message);
      return [];
    }
  }
}

module.exports = new CombatManager();
