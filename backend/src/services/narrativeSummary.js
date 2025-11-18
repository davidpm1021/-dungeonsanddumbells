const pool = require('../config/database');
const claudeAPI = require('./claudeAPI');
const modelRouter = require('./modelRouter');

/**
 * Narrative Summary System
 *
 * Maintains a rolling 500-word summary of the character's story.
 * Updated after each quest completion to prevent narrative drift.
 *
 * This summary is injected into all agent prompts to provide context.
 */

class NarrativeSummary {
  /**
   * Get current narrative summary for a character
   *
   * @param {number} characterId - Character ID
   * @returns {Promise<string>} - Current narrative summary
   */
  async getSummary(characterId) {
    try {
      const result = await pool.query(
        `SELECT narrative_summary
         FROM world_state
         WHERE character_id = $1`,
        [characterId]
      );

      if (result.rows.length === 0) {
        // No world state yet - return default starting summary
        return this.getDefaultSummary(characterId);
      }

      return result.rows[0].narrative_summary || this.getDefaultSummary(characterId);

    } catch (error) {
      console.error('[NarrativeSummary] Error getting summary:', error.message);
      return this.getDefaultSummary(characterId);
    }
  }

  /**
   * Update narrative summary after quest completion
   *
   * @param {number} characterId - Character ID
   * @param {Object} questOutcome - Quest and outcome data
   * @returns {Promise<string>} - Updated summary
   */
  async updateSummary(characterId, questOutcome) {
    try {
      console.log('[NarrativeSummary] Updating summary for character:', characterId);

      // Get current summary
      const currentSummary = await this.getSummary(characterId);

      // Get character data
      const charResult = await pool.query(
        'SELECT * FROM character_stats WHERE id = $1',
        [characterId]
      );
      const character = charResult.rows[0];

      // Get recent quests (last 3)
      const questsResult = await pool.query(
        `SELECT title, description, completed_at
         FROM quests
         WHERE character_id = $1
           AND status = 'completed'
         ORDER BY completed_at DESC
         LIMIT 3`,
        [characterId]
      );

      // Generate updated summary using AI
      const updatedSummary = await this.generateUpdatedSummary({
        characterId,
        character,
        currentSummary,
        newOutcome: questOutcome,
        recentQuests: questsResult.rows
      });

      // Store updated summary
      await this.storeSummary(characterId, updatedSummary);

      console.log('[NarrativeSummary] Summary updated successfully');

      return updatedSummary;

    } catch (error) {
      console.error('[NarrativeSummary] Error updating summary:', error.message);
      return currentSummary; // Return unchanged on error
    }
  }

  /**
   * Generate updated summary using AI
   */
  async generateUpdatedSummary(context) {
    try {
      const { character, currentSummary, newOutcome, recentQuests } = context;

      const prompt = `You are maintaining a rolling narrative summary for ${character.name}, a ${character.class} on their journey.

<current_summary>
${currentSummary}
</current_summary>

<new_development>
Quest Completed: ${newOutcome.quest?.title || 'Unknown Quest'}
Outcome: ${newOutcome.outcome?.narrativeText || 'Quest completed'}
</new_development>

<recent_activity>
${recentQuests.map(q => `- ${q.title}`).join('\n')}
</recent_activity>

Update the narrative summary to:
1. Incorporate the new quest completion
2. Maintain key story beats and character progression
3. Keep NPC relationships current
4. Highlight stat development (current: STR ${character.str}, DEX ${character.dex}, CON ${character.con}, INT ${character.int}, WIS ${character.wis}, CHA ${character.cha})
5. Stay under 500 words
6. Write in past tense, third person

Focus on the "story so far" - what would a new reader need to know to understand where this character is in their journey?

Respond with ONLY the updated summary text (no JSON, no preamble).`;

      const model = modelRouter.getModelForAgent('memory_manager');

      const response = await claudeAPI.call({
        model,
        system: 'You are a narrative summarization expert. Generate concise, engaging story summaries.',
        messages: [{ role: 'user', content: prompt }],
        maxTokens: 800,
        temperature: 0.4, // Balanced - some creativity but consistent
        agentType: 'narrative_summary',
        characterId: context.characterId,
        useCache: false
      });

      // Extract summary (strip any markdown if present)
      let summary = response.content.trim();

      // Remove markdown formatting if present
      summary = summary.replace(/```.*\n?/g, '').trim();

      // Validate length
      const wordCount = summary.split(/\s+/).length;
      if (wordCount > 600) {
        console.warn(`[NarrativeSummary] Summary too long (${wordCount} words), truncating`);
        summary = summary.split(/\s+/).slice(0, 500).join(' ') + '...';
      }

      return summary;

    } catch (error) {
      console.error('[NarrativeSummary] Error generating summary:', error.message);

      // Fallback: append new quest to current summary
      return this.getFallbackSummary(context);
    }
  }

  /**
   * Get fallback summary if AI fails
   */
  getFallbackSummary(context) {
    const { character, currentSummary, newOutcome } = context;

    const addition = `\n\n${character.name} recently completed "${newOutcome.quest?.title || 'a quest'}", ` +
      `growing stronger in their journey. Current level: ${character.level || 1}.`;

    // Append and truncate if needed
    let updated = currentSummary + addition;
    const words = updated.split(/\s+/);

    if (words.length > 500) {
      // Keep first 100 words (intro) and last 400 words (recent events)
      const intro = words.slice(0, 100).join(' ');
      const recent = words.slice(-400).join(' ');
      updated = intro + '\n\n...\n\n' + recent;
    }

    return updated;
  }

  /**
   * Store updated summary in database
   */
  async storeSummary(characterId, summary) {
    try {
      // Check if world_state exists
      const checkResult = await pool.query(
        'SELECT id FROM world_state WHERE character_id = $1',
        [characterId]
      );

      if (checkResult.rows.length === 0) {
        // Insert new world_state
        await pool.query(
          `INSERT INTO world_state (character_id, narrative_summary, updated_at)
           VALUES ($1, $2, NOW())`,
          [characterId, summary]
        );
      } else {
        // Update existing
        await pool.query(
          `UPDATE world_state
           SET narrative_summary = $1,
               updated_at = NOW()
           WHERE character_id = $2`,
          [summary, characterId]
        );
      }

    } catch (error) {
      console.error('[NarrativeSummary] Error storing summary:', error.message);
      throw error;
    }
  }

  /**
   * Get default starting summary for new characters
   */
  async getDefaultSummary(characterId) {
    try {
      const result = await pool.query(
        'SELECT name, class FROM characters WHERE id = $1',
        [characterId]
      );

      if (result.rows.length === 0) {
        return 'A new adventurer begins their journey.';
      }

      const { name, class: charClass } = result.rows[0];

      return `${name}, a ${charClass}, has recently begun their journey. ` +
        `Through discipline and dedication, they seek to unlock their true potential. ` +
        `Each step toward wellness brings a glimmer of magical power, as personal growth ` +
        `manifests as strength in this world. The path ahead is unclear, but ${name} ` +
        `is determined to see where their dedication will lead.`;

    } catch (error) {
      console.error('[NarrativeSummary] Error getting default summary:', error.message);
      return 'A new adventurer begins their journey.';
    }
  }

  /**
   * Reset summary (for testing or "new chapter")
   */
  async resetSummary(characterId) {
    const defaultSummary = await this.getDefaultSummary(characterId);
    await this.storeSummary(characterId, defaultSummary);
    console.log('[NarrativeSummary] Summary reset to default');
    return defaultSummary;
  }

  /**
   * Get summary word count
   */
  async getSummaryStats(characterId) {
    const summary = await this.getSummary(characterId);
    const wordCount = summary.split(/\s+/).length;

    return {
      wordCount,
      characterCount: summary.length,
      isWithinLimit: wordCount <= 500
    };
  }
}

module.exports = new NarrativeSummary();
