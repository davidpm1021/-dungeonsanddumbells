const db = require('../config/database');

/**
 * Condition Service
 *
 * Manages D&D 5e status conditions on characters
 * Provides methods to apply, remove, query, and tick conditions
 */
class ConditionService {
  /**
   * Apply a condition to a character
   *
   * @param {number} characterId - Character ID
   * @param {string} conditionType - Condition type (e.g., 'grappled', 'prone')
   * @param {Object} options - Optional parameters
   * @param {number} options.encounterId - Combat encounter ID
   * @param {string} options.source - What caused the condition
   * @param {number} options.duration - Duration in rounds (default: 1)
   * @param {number} options.saveDC - Save DC to end condition
   * @param {string} options.saveAbility - Ability for save ('STR', 'DEX', etc.)
   * @returns {Promise<Object>} Condition data with effects
   */
  async applyCondition(characterId, conditionType, options = {}) {
    try {
      const {
        encounterId = null,
        source = null,
        duration = 1,
        saveDC = null,
        saveAbility = null
      } = options;

      // Apply condition using database function
      const result = await db.query(
        `SELECT apply_condition($1, $2, $3, $4, $5, $6, $7) as condition_id`,
        [characterId, encounterId, conditionType, source, duration, saveDC, saveAbility]
      );

      const conditionId = result.rows[0].condition_id;

      // Get full condition data with effects
      const conditionData = await db.query(
        `SELECT
          cc.id,
          cc.condition_type,
          ce.display_name,
          ce.description,
          ce.effects,
          ce.emoji,
          cc.duration_remaining,
          cc.source,
          cc.save_dc,
          cc.save_ability
        FROM character_conditions cc
        JOIN condition_effects ce ON cc.condition_type = ce.condition_type
        WHERE cc.id = $1`,
        [conditionId]
      );

      console.log(`[ConditionService] Applied ${conditionType} to character ${characterId} (duration: ${duration})`);

      return conditionData.rows[0];

    } catch (error) {
      console.error('[ConditionService] Error applying condition:', error.message);
      throw error;
    }
  }

  /**
   * Remove a specific condition from a character
   *
   * @param {number} characterId - Character ID
   * @param {string} conditionType - Condition type to remove
   * @returns {Promise<boolean>} True if condition was removed
   */
  async removeCondition(characterId, conditionType) {
    try {
      const result = await db.query(
        `SELECT remove_condition($1, $2) as removed`,
        [characterId, conditionType]
      );

      const removed = result.rows[0].removed;

      if (removed) {
        console.log(`[ConditionService] Removed ${conditionType} from character ${characterId}`);
      }

      return removed;

    } catch (error) {
      console.error('[ConditionService] Error removing condition:', error.message);
      throw error;
    }
  }

  /**
   * Get all active conditions for a character
   *
   * @param {number} characterId - Character ID
   * @returns {Promise<Array>} Array of active conditions with effects
   */
  async getActiveConditions(characterId) {
    try {
      const result = await db.query(
        `SELECT * FROM get_active_conditions($1)`,
        [characterId]
      );

      return result.rows;

    } catch (error) {
      console.error('[ConditionService] Error getting active conditions:', error.message);
      throw error;
    }
  }

  /**
   * Check if character has a specific condition
   *
   * @param {number} characterId - Character ID
   * @param {string} conditionType - Condition type to check
   * @returns {Promise<boolean>} True if character has the condition
   */
  async hasCondition(characterId, conditionType) {
    try {
      const result = await db.query(
        `SELECT EXISTS(
          SELECT 1 FROM character_conditions
          WHERE character_id = $1
            AND condition_type = $2
            AND is_active = TRUE
        ) as has_condition`,
        [characterId, conditionType]
      );

      return result.rows[0].has_condition;

    } catch (error) {
      console.error('[ConditionService] Error checking condition:', error.message);
      throw error;
    }
  }

  /**
   * Tick conditions at end of turn (decrement durations, remove expired)
   *
   * @param {number} characterId - Character ID
   * @returns {Promise<Object>} Object with expired conditions count and list
   */
  async tickConditions(characterId) {
    try {
      // Get conditions before ticking (to report what expired)
      const beforeConditions = await this.getActiveConditions(characterId);

      // Tick conditions
      const result = await db.query(
        `SELECT tick_conditions($1) as expired_count`,
        [characterId]
      );

      const expiredCount = result.rows[0].expired_count;

      // Get remaining active conditions
      const afterConditions = await this.getActiveConditions(characterId);

      // Determine which conditions expired
      const expiredConditions = beforeConditions.filter(before =>
        !afterConditions.some(after => after.condition_type === before.condition_type)
      );

      if (expiredCount > 0) {
        console.log(`[ConditionService] ${expiredCount} condition(s) expired for character ${characterId}`);
      }

      return {
        expiredCount,
        expiredConditions,
        remainingConditions: afterConditions
      };

    } catch (error) {
      console.error('[ConditionService] Error ticking conditions:', error.message);
      throw error;
    }
  }

  /**
   * Check if a condition affects attack rolls
   *
   * @param {Object} condition - Condition object with effects
   * @returns {string|null} 'advantage', 'disadvantage', or null
   */
  getAttackRollModifier(condition) {
    if (!condition || !condition.effects) return null;

    const effects = typeof condition.effects === 'string'
      ? JSON.parse(condition.effects)
      : condition.effects;

    return effects.attackRolls || null;
  }

  /**
   * Check if a condition affects ability checks
   *
   * @param {Object} condition - Condition object with effects
   * @param {string} ability - Ability to check ('STR', 'DEX', etc.)
   * @returns {string|null} 'advantage', 'disadvantage', or null
   */
  getAbilityCheckModifier(condition, ability) {
    if (!condition || !condition.effects) return null;

    const effects = typeof condition.effects === 'string'
      ? JSON.parse(condition.effects)
      : condition.effects;

    // Check for universal ability check modifier
    if (effects.abilityChecks === 'advantage' || effects.abilityChecks === 'disadvantage') {
      return effects.abilityChecks;
    }

    // Check for specific ability modifier
    if (effects.abilityChecks && typeof effects.abilityChecks === 'object') {
      return effects.abilityChecks[ability] || null;
    }

    return null;
  }

  /**
   * Check if a condition prevents movement
   *
   * @param {Object} condition - Condition object with effects
   * @returns {boolean} True if movement is prevented
   */
  preventsMovement(condition) {
    if (!condition || !condition.effects) return false;

    const effects = typeof condition.effects === 'string'
      ? JSON.parse(condition.effects)
      : condition.effects;

    return effects.preventMovement === true || effects.movement === 0;
  }

  /**
   * Check if a condition grants advantage to attackers
   *
   * @param {Object} condition - Condition object with effects
   * @returns {boolean} True if attackers have advantage
   */
  grantsAdvantageToAttackers(condition) {
    if (!condition || !condition.effects) return false;

    const effects = typeof condition.effects === 'string'
      ? JSON.parse(condition.effects)
      : condition.effects;

    return effects.grantAdvantage?.attacks_against === true ||
           effects.grantAdvantage?.melee_attacks_against === true;
  }

  /**
   * Check if a condition makes the character incapacitated
   *
   * @param {Object} condition - Condition object with effects
   * @returns {boolean} True if incapacitated
   */
  isIncapacitated(condition) {
    if (!condition || !condition.effects) return false;

    const effects = typeof condition.effects === 'string'
      ? JSON.parse(condition.effects)
      : condition.effects;

    return effects.incapacitated === true || effects.cannotTakeActions === true;
  }

  /**
   * Calculate aggregate effects from multiple conditions
   *
   * @param {Array} conditions - Array of condition objects
   * @returns {Object} Aggregate effects
   */
  calculateAggregateEffects(conditions) {
    const aggregate = {
      attackRollModifier: null, // 'advantage', 'disadvantage', or null
      movementPrevented: false,
      incapacitated: false,
      advantageToAttackers: false,
      abilityCheckModifiers: {} // { STR: 'disadvantage', DEX: 'advantage', etc. }
    };

    for (const condition of conditions) {
      // Attack roll modifiers (disadvantage takes precedence)
      const attackMod = this.getAttackRollModifier(condition);
      if (attackMod === 'disadvantage') {
        aggregate.attackRollModifier = 'disadvantage';
      } else if (attackMod === 'advantage' && !aggregate.attackRollModifier) {
        aggregate.attackRollModifier = 'advantage';
      }

      // Movement
      if (this.preventsMovement(condition)) {
        aggregate.movementPrevented = true;
      }

      // Incapacitation
      if (this.isIncapacitated(condition)) {
        aggregate.incapacitated = true;
      }

      // Advantage to attackers
      if (this.grantsAdvantageToAttackers(condition)) {
        aggregate.advantageToAttackers = true;
      }
    }

    return aggregate;
  }

  /**
   * Format conditions for display
   *
   * @param {Array} conditions - Array of condition objects
   * @returns {string} Formatted condition list
   */
  formatConditionsForDisplay(conditions) {
    if (!conditions || conditions.length === 0) {
      return 'No conditions';
    }

    return conditions.map(c =>
      `${c.emoji} ${c.display_name} (${c.duration_remaining} rounds)`
    ).join(', ');
  }
}

module.exports = new ConditionService();
