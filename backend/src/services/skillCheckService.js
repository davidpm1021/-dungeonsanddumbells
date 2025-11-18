const db = require('../config/database');

/**
 * Skill Check Service
 *
 * Handles D&D 5e skill check mechanics:
 * - Rolls d20 with advantage/disadvantage
 * - Calculates modifiers (ability + proficiency)
 * - Logs results to database
 * - Returns narrative-friendly results
 *
 * This service uses the PostgreSQL functions created in migration 005:
 * - perform_skill_check() - Rolls check and logs to history
 * - roll_d20() - Handles advantage/disadvantage
 * - get_ability_modifier() - Calculates modifier from stat value
 */
class SkillCheckService {
  /**
   * Perform a skill check for a character
   *
   * @param {number} characterId - Character ID
   * @param {string} skillType - Skill name (e.g., "Athletics", "Perception")
   * @param {number} dc - Difficulty Class (10=Easy, 15=Medium, 20=Hard)
   * @param {Object} options - Optional parameters
   * @param {string} options.narrativeContext - Description of what triggered the check
   * @param {boolean} options.advantage - Roll with advantage (take higher of 2d20)
   * @param {boolean} options.disadvantage - Roll with disadvantage (take lower of 2d20)
   * @returns {Promise<Object>} - Skill check result
   */
  async performCheck(characterId, skillType, dc, options = {}) {
    try {
      console.log(`[SkillCheckService] ${skillType} check DC${dc} for character ${characterId}`);

      const {
        narrativeContext = null,
        advantage = false,
        disadvantage = false
      } = options;

      // Call PostgreSQL function to perform check
      const result = await db.query(
        `SELECT * FROM perform_skill_check($1, $2, $3, $4, $5, $6)`,
        [characterId, skillType, dc, narrativeContext, advantage, disadvantage]
      );

      if (result.rows.length === 0) {
        throw new Error('Skill check function returned no results');
      }

      const checkResult = result.rows[0];

      console.log(`[SkillCheckService] Result: ${checkResult.modifiers_breakdown} = ${checkResult.success ? 'SUCCESS' : 'FAILURE'}`);

      return {
        roll: checkResult.roll,
        total: checkResult.total,
        dc: dc,
        success: checkResult.success,
        modifiersBreakdown: checkResult.modifiers_breakdown,
        skillType: skillType,
        advantage: advantage,
        disadvantage: disadvantage,
        narrativeContext: narrativeContext
      };

    } catch (error) {
      console.error('[SkillCheckService] Error performing check:', error.message);

      // If database function fails, fall back to JavaScript implementation
      return this.performCheckFallback(characterId, skillType, dc, options);
    }
  }

  /**
   * Fallback skill check implementation (if database function fails)
   */
  async performCheckFallback(characterId, skillType, dc, options = {}) {
    console.log('[SkillCheckService] Using fallback implementation');

    const { narrativeContext = null, advantage = false, disadvantage = false } = options;

    try {
      // Get character stats and combat stats
      const charResult = await db.query(
        `SELECT
          cs.str, cs.dex, cs.con, cs.int, cs.wis, cs.cha,
          ccs.proficiency_bonus, ccs.skill_proficiencies
        FROM character_stats cs
        JOIN character_combat_stats ccs ON cs.id = ccs.character_id
        WHERE cs.id = $1`,
        [characterId]
      );

      if (charResult.rows.length === 0) {
        throw new Error(`Character ${characterId} not found`);
      }

      const char = charResult.rows[0];

      // Determine which ability score the skill uses
      const skillAbility = this.getSkillAbility(skillType);
      const statValue = char[skillAbility.toLowerCase()];
      const abilityModifier = Math.floor((statValue - 10) / 2);

      // Check if character is proficient in this skill
      const skillProficiencies = char.skill_proficiencies || [];
      const isProficient = skillProficiencies.includes(skillType);
      const proficiencyBonus = isProficient ? char.proficiency_bonus : 0;

      // Roll d20 with advantage/disadvantage
      const roll = this.rollD20(advantage, disadvantage);

      // Calculate total
      const total = roll + abilityModifier + proficiencyBonus;
      const success = total >= dc;

      // Log to database
      await db.query(
        `INSERT INTO skill_check_history
        (character_id, skill_type, dc, roll_result, total_result, success,
         ability_modifier, proficiency_bonus, advantage, disadvantage, narrative_context)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [characterId, skillType, dc, roll, total, success,
         abilityModifier, proficiencyBonus, advantage, disadvantage, narrativeContext]
      );

      const modifiersBreakdown = `d20=${roll} + ${skillAbility}(${abilityModifier})${isProficient ? ` + Prof=${proficiencyBonus}` : ''} = ${total} vs DC ${dc}`;

      return {
        roll,
        total,
        dc,
        success,
        modifiersBreakdown,
        skillType,
        advantage,
        disadvantage,
        narrativeContext,
        fallback: true
      };

    } catch (error) {
      console.error('[SkillCheckService] Fallback also failed:', error.message);
      throw error;
    }
  }

  /**
   * Get ability score for a skill (D&D 5e rules)
   */
  getSkillAbility(skillType) {
    const skillMap = {
      'Athletics': 'STR',
      'Acrobatics': 'DEX',
      'Sleight of Hand': 'DEX',
      'Stealth': 'DEX',
      'Arcana': 'INT',
      'History': 'INT',
      'Investigation': 'INT',
      'Nature': 'INT',
      'Religion': 'INT',
      'Animal Handling': 'WIS',
      'Insight': 'WIS',
      'Medicine': 'WIS',
      'Perception': 'WIS',
      'Survival': 'WIS',
      'Deception': 'CHA',
      'Intimidation': 'CHA',
      'Performance': 'CHA',
      'Persuasion': 'CHA'
    };

    return skillMap[skillType] || 'STR'; // Default to STR if unknown
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
      return Math.max(roll1, roll2);
    }

    // Disadvantage: take lower
    return Math.min(roll1, roll2);
  }

  /**
   * Get skill check history for a character
   *
   * @param {number} characterId - Character ID
   * @param {number} limit - Number of recent checks to retrieve
   * @returns {Promise<Array>} - Array of skill check results
   */
  async getHistory(characterId, limit = 20) {
    try {
      const result = await db.query(
        `SELECT
          id, skill_type, dc, roll_result, total_result, success,
          ability_modifier, proficiency_bonus, advantage, disadvantage,
          narrative_context, checked_at
        FROM skill_check_history
        WHERE character_id = $1
        ORDER BY checked_at DESC
        LIMIT $2`,
        [characterId, limit]
      );

      return result.rows;
    } catch (error) {
      console.error('[SkillCheckService] Error getting history:', error.message);
      return [];
    }
  }

  /**
   * Get success rate for a skill
   *
   * @param {number} characterId - Character ID
   * @param {string} skillType - Skill name
   * @returns {Promise<Object>} - Success rate statistics
   */
  async getSkillStats(characterId, skillType = null) {
    try {
      const whereClause = skillType
        ? 'WHERE character_id = $1 AND skill_type = $2'
        : 'WHERE character_id = $1';

      const params = skillType ? [characterId, skillType] : [characterId];

      const result = await db.query(
        `SELECT
          skill_type,
          COUNT(*) as total_checks,
          SUM(CASE WHEN success THEN 1 ELSE 0 END) as successes,
          ROUND(AVG(CASE WHEN success THEN 1 ELSE 0 END) * 100, 1) as success_rate,
          ROUND(AVG(roll_result), 1) as avg_roll,
          ROUND(AVG(total_result), 1) as avg_total
        FROM skill_check_history
        ${whereClause}
        GROUP BY skill_type
        ORDER BY total_checks DESC`,
        params
      );

      return skillType ? result.rows[0] || null : result.rows;
    } catch (error) {
      console.error('[SkillCheckService] Error getting stats:', error.message);
      return skillType ? null : [];
    }
  }

  /**
   * Format skill check result as narrative text
   *
   * @param {Object} checkResult - Result from performCheck()
   * @returns {string} - Narrative description
   */
  formatNarrative(checkResult) {
    const { roll, total, dc, success, skillType, advantage, disadvantage } = checkResult;

    let narrative = '';

    // Roll description
    if (advantage) {
      narrative += `(Rolling with advantage) `;
    } else if (disadvantage) {
      narrative += `(Rolling with disadvantage) `;
    }

    // Critical success/failure
    if (roll === 20) {
      narrative += `**Natural 20!** Your ${skillType} check succeeds spectacularly! `;
    } else if (roll === 1) {
      narrative += `**Natural 1!** Your ${skillType} check fails dramatically! `;
    } else {
      // Normal result
      narrative += `${skillType} check: **${total}** (d20: ${roll}) vs DC ${dc} - `;
      narrative += success ? '**SUCCESS!**' : '**FAILURE.**';
    }

    return narrative;
  }
}

module.exports = new SkillCheckService();
