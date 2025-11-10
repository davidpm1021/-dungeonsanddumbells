const claudeAPI = require('../claudeAPI');
const modelRouter = require('../modelRouter');
const promptBuilder = require('../promptBuilder');
const memoryManager = require('../memoryManager');

/**
 * Memory Manager Agent
 *
 * Compresses old narrative events into concise summaries using AI.
 * This prevents the memory system from growing unbounded while
 * preserving key story beats and character progression.
 *
 * Runs as a scheduled job or can be triggered manually.
 */

class MemoryManagerAgent {
  /**
   * Summarize old events for a character
   *
   * @param {number} characterId
   * @param {number} daysOld - Events older than this will be compressed
   * @returns {Promise<Object>} - Episode summary
   */
  async summarizeOldEvents(characterId, daysOld = 7) {
    try {
      // Get events older than threshold
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const pool = require('../../config/database');
      const result = await pool.query(
        `SELECT * FROM narrative_events
         WHERE character_id = $1
           AND created_at < $2
         ORDER BY created_at
         LIMIT 50`,
        [characterId, cutoffDate]
      );

      const events = result.rows;

      if (events.length < 10) {
        console.log(`[MemoryManagerAgent] Not enough old events to compress (found ${events.length})`);
        return null;
      }

      console.log(`[MemoryManagerAgent] Compressing ${events.length} events for character ${characterId}`);

      // Generate AI summary
      const summary = await this.generateEpisodeSummary(characterId, events);

      // Store episode in memory system
      await memoryManager.compressIntoEpisode(characterId, daysOld);

      console.log('[MemoryManagerAgent] Episode summary created successfully');

      return summary;

    } catch (error) {
      console.error('[MemoryManagerAgent] Error summarizing events:', error.message);
      throw error;
    }
  }

  /**
   * Generate episode summary using AI
   *
   * @param {number} characterId
   * @param {Array} events - Array of narrative event objects
   * @returns {Promise<Object>} - Summary object
   */
  async generateEpisodeSummary(characterId, events) {
    try {
      // Get character data
      const pool = require('../../config/database');
      const charResult = await pool.query(
        'SELECT * FROM characters WHERE id = $1',
        [characterId]
      );
      const character = charResult.rows[0];

      // Build prompt
      const { system, messages } = await promptBuilder.build({
        agentType: 'memory_manager',
        characterId,
        character,
        context: {
          events: events.map(e => ({
            event_description: e.event_description,
            event_type: e.event_type,
            participants: e.participants,
            stat_changes: e.stat_changes,
            created_at: e.created_at
          }))
        },
        includeWorldBible: false, // Don't need full world bible for summarization
        includeMemory: false // Don't need existing memory for this task
      });

      // Select model (Memory Manager uses Sonnet 3.5 for routine summarization)
      const model = modelRouter.getModelForAgent('memory_manager');

      // Call Claude API
      const response = await claudeAPI.call({
        model,
        system,
        messages,
        maxTokens: 512,
        temperature: 0.3, // Low temperature for consistent summarization
        agentType: 'memory_manager',
        characterId,
        useCache: false // Don't cache summaries (each is unique)
      });

      // Parse JSON response
      const summaryData = JSON.parse(response.content);

      // Validate response structure
      this.validateSummary(summaryData);

      console.log('[MemoryManagerAgent] Summary generated:', {
        keyEvents: summaryData.keyEvents?.length || 0,
        participants: summaryData.participantsInvolved?.length || 0
      });

      return {
        ...summaryData,
        period: {
          start: events[0].created_at,
          end: events[events.length - 1].created_at
        },
        eventCount: events.length,
        metadata: {
          model: response.model,
          latency: response.latency,
          cost: response.cost
        }
      };

    } catch (error) {
      console.error('[MemoryManagerAgent] Error generating summary:', error.message);

      // Fallback to simple summary
      return this.getFallbackSummary(events);
    }
  }

  /**
   * Validate summary structure
   */
  validateSummary(summary) {
    if (!summary.summary || typeof summary.summary !== 'string') {
      throw new Error('Invalid summary: summary text is required');
    }

    if (summary.summary.split(' ').length > 250) {
      throw new Error('Invalid summary: summary exceeds 250 words');
    }

    if (!Array.isArray(summary.keyEvents)) {
      throw new Error('Invalid summary: keyEvents must be an array');
    }

    if (!Array.isArray(summary.participantsInvolved)) {
      throw new Error('Invalid summary: participantsInvolved must be an array');
    }

    if (!summary.statChanges || typeof summary.statChanges !== 'object') {
      throw new Error('Invalid summary: statChanges must be an object');
    }
  }

  /**
   * Get fallback summary if AI fails
   */
  getFallbackSummary(events) {
    // Simple rule-based summary
    const keyEvents = events
      .filter(e => e.event_type === 'quest_completed' || e.event_type === 'npc_interaction')
      .slice(0, 5)
      .map(e => e.event_description);

    const participants = [...new Set(
      events.flatMap(e => e.participants || [])
    )];

    const statChanges = events.reduce((totals, event) => {
      const changes = event.stat_changes || {};
      Object.keys(changes).forEach(stat => {
        totals[stat] = (totals[stat] || 0) + (changes[stat] || 0);
      });
      return totals;
    }, {});

    const summary = `During this period, the character completed ${events.length} activities. ` +
      `Key milestones included ${keyEvents.length} significant events. ` +
      `Interactions with ${participants.length} NPCs were recorded.`;

    return {
      summary,
      keyEvents,
      participantsInvolved: participants,
      statChanges,
      period: {
        start: events[0].created_at,
        end: events[events.length - 1].created_at
      },
      eventCount: events.length,
      metadata: { fallback: true }
    };
  }

  /**
   * Batch process multiple characters (for scheduled jobs)
   *
   * @param {number} daysOld - Events older than this will be compressed
   * @returns {Promise<Array>} - Array of results
   */
  async batchSummarize(daysOld = 7) {
    try {
      // Get all characters with old events
      const pool = require('../../config/database');
      const result = await pool.query(
        `SELECT DISTINCT character_id
         FROM narrative_events
         WHERE created_at < NOW() - INTERVAL '${daysOld} days'
         ORDER BY character_id`
      );

      const characterIds = result.rows.map(r => r.character_id);

      console.log(`[MemoryManagerAgent] Batch processing ${characterIds.length} characters`);

      const results = [];

      for (const characterId of characterIds) {
        try {
          const summary = await this.summarizeOldEvents(characterId, daysOld);
          if (summary) {
            results.push({
              characterId,
              success: true,
              summary
            });
          }
        } catch (error) {
          console.error(`[MemoryManagerAgent] Failed for character ${characterId}:`, error.message);
          results.push({
            characterId,
            success: false,
            error: error.message
          });
        }

        // Rate limit between characters (avoid hitting API limits)
        await this.sleep(1000);
      }

      console.log(`[MemoryManagerAgent] Batch complete: ${results.filter(r => r.success).length}/${results.length} succeeded`);

      return results;

    } catch (error) {
      console.error('[MemoryManagerAgent] Batch processing error:', error.message);
      throw error;
    }
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = new MemoryManagerAgent();
