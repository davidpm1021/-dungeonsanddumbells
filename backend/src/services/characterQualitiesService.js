const pool = require('../config/database');

/**
 * Character Qualities Service
 *
 * Manages storylet-style narrative progression tracking.
 * Qualities are boolean/numeric flags that represent story milestones.
 *
 * Examples:
 * - tutorial_complete: true/false
 * - first_quest_done: true/false
 * - elder_thorne_trust: 1-10
 * - sage_unlocked: true/false
 */

class CharacterQualitiesService {
  /**
   * Set or update a character quality
   *
   * @param {number} characterId
   * @param {string} qualityName
   * @param {number} qualityValue - Default 1 for boolean flags, higher for numeric
   * @returns {Promise<Object>}
   */
  async setQuality(characterId, qualityName, qualityValue = 1) {
    try {
      const result = await pool.query(
        `INSERT INTO character_qualities (character_id, quality_name, quality_value, updated_at)
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
         ON CONFLICT (character_id, quality_name)
         DO UPDATE SET quality_value = $3, updated_at = CURRENT_TIMESTAMP
         RETURNING *`,
        [characterId, qualityName, qualityValue]
      );

      console.log(`[CharacterQualities] Set ${qualityName} = ${qualityValue} for character ${characterId}`);
      return result.rows[0];
    } catch (error) {
      console.error('[CharacterQualities] Error setting quality:', error.message);
      throw error;
    }
  }

  /**
   * Get a specific quality value
   *
   * @param {number} characterId
   * @param {string} qualityName
   * @returns {Promise<number|null>}
   */
  async getQuality(characterId, qualityName) {
    try {
      const result = await pool.query(
        `SELECT quality_value
         FROM character_qualities
         WHERE character_id = $1 AND quality_name = $2`,
        [characterId, qualityName]
      );

      return result.rows.length > 0 ? result.rows[0].quality_value : null;
    } catch (error) {
      console.error('[CharacterQualities] Error getting quality:', error.message);
      return null;
    }
  }

  /**
   * Get all qualities for a character
   *
   * @param {number} characterId
   * @returns {Promise<Object>}
   */
  async getAllQualities(characterId) {
    try {
      const result = await pool.query(
        `SELECT quality_name, quality_value
         FROM character_qualities
         WHERE character_id = $1`,
        [characterId]
      );

      const qualities = {};
      result.rows.forEach(row => {
        qualities[row.quality_name] = row.quality_value;
      });

      return qualities;
    } catch (error) {
      console.error('[CharacterQualities] Error getting all qualities:', error.message);
      return {};
    }
  }

  /**
   * Increment a numeric quality
   *
   * @param {number} characterId
   * @param {string} qualityName
   * @param {number} increment
   * @returns {Promise<number>} - New value
   */
  async incrementQuality(characterId, qualityName, increment = 1) {
    try {
      const currentValue = await this.getQuality(characterId, qualityName) || 0;
      const newValue = currentValue + increment;
      await this.setQuality(characterId, qualityName, newValue);
      return newValue;
    } catch (error) {
      console.error('[CharacterQualities] Error incrementing quality:', error.message);
      throw error;
    }
  }

  /**
   * Track quest completion milestones
   *
   * @param {number} characterId
   * @param {Object} quest - Completed quest data
   * @returns {Promise<Object>} - Qualities set
   */
  async trackQuestCompletion(characterId, quest) {
    const qualitiesSet = {};

    try {
      // Get current quest count
      const countResult = await pool.query(
        `SELECT COUNT(*) as count
         FROM quests
         WHERE character_id = $1 AND status = 'completed'`,
        [characterId]
      );

      const completedCount = parseInt(countResult.rows[0].count);

      // First quest milestone
      if (completedCount === 1) {
        await this.setQuality(characterId, 'first_quest_done', 1);
        qualitiesSet.first_quest_done = 1;
        console.log('[CharacterQualities] 🎉 First quest completed!');
      }

      // Tutorial completion (if quest theme suggests it)
      if (quest.theme && (quest.theme.includes('introduction') || quest.theme.includes('tutorial') || quest.theme.includes('first_steps'))) {
        await this.setQuality(characterId, 'tutorial_complete', 1);
        qualitiesSet.tutorial_complete = 1;
      }

      // NPC relationship tracking
      if (quest.npc_involved) {
        const npcKey = `npc_${quest.npc_involved.toLowerCase().replace(/\s+/g, '_')}_met`;
        await this.setQuality(characterId, npcKey, 1);
        qualitiesSet[npcKey] = 1;

        // Increment relationship level
        const trustKey = `${quest.npc_involved.toLowerCase().replace(/\s+/g, '_')}_trust`;
        const newTrust = await this.incrementQuality(characterId, trustKey, 1);
        qualitiesSet[trustKey] = newTrust;
      }

      // Quest type milestones
      if (quest.quest_type === 'main') {
        const mainQuestKey = 'main_quests_completed';
        const mainQuestCount = await this.incrementQuality(characterId, mainQuestKey, 1);
        qualitiesSet[mainQuestKey] = mainQuestCount;

        // Major story milestones
        if (mainQuestCount === 5) {
          await this.setQuality(characterId, 'story_act_1_complete', 1);
          qualitiesSet.story_act_1_complete = 1;
        }
      }

      // Foundation-specific progress
      if (quest.theme && quest.theme.includes('foundation')) {
        await this.incrementQuality(characterId, 'foundation_knowledge', 1);
        qualitiesSet.foundation_knowledge = await this.getQuality(characterId, 'foundation_knowledge');
      }

      return qualitiesSet;
    } catch (error) {
      console.error('[CharacterQualities] Error tracking quest completion:', error.message);
      return qualitiesSet;
    }
  }

  /**
   * Initialize qualities for new character
   *
   * @param {number} characterId
   * @returns {Promise<void>}
   */
  async initializeNewCharacter(characterId) {
    try {
      // Set initial qualities
      await this.setQuality(characterId, 'tutorial_complete', 0);
      await this.setQuality(characterId, 'first_quest_done', 0);
      await this.setQuality(characterId, 'main_quests_completed', 0);
      await this.setQuality(characterId, 'foundation_knowledge', 0);

      console.log(`[CharacterQualities] Initialized qualities for character ${characterId}`);
    } catch (error) {
      console.error('[CharacterQualities] Error initializing character:', error.message);
      // Non-fatal error
    }
  }
}

module.exports = new CharacterQualitiesService();
