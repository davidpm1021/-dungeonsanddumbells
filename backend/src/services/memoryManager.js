const pool = require('../config/database');
const { transformKeysToCamel } = require('../utils/caseTransform');

/**
 * MemoryManager Service
 *
 * Implements a three-tier memory hierarchy to prevent the "11 kids problem"
 * where AI forgets established facts over time.
 *
 * Memory Tiers:
 * 1. Working Memory: Last 10 interactions, full detail
 * 2. Episode Memory: Compressed summaries of recent sessions (last 30 days)
 * 3. Long-term Memory: Core facts reinforced over time
 *
 * Based on research showing context windows alone cannot maintain consistency.
 */
class MemoryManager {
  /**
   * Store a new event in working memory
   */
  async storeInWorkingMemory(characterId, event) {
    const {
      eventType,
      description,
      participants = [],
      statChanges = {},
      questId = null,
      goalId = null,
      context = {}
    } = event;

    // Store in narrative_events (source of truth)
    const eventResult = await pool.query(
      `INSERT INTO narrative_events (
        character_id, event_type, event_description,
        participants, stat_changes, quest_id, goal_id, event_context
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        characterId,
        eventType,
        description,
        participants,
        JSON.stringify(statChanges),
        questId,
        goalId,
        JSON.stringify(context)
      ]
    );

    // Also store in memory_hierarchy as working memory
    // Expires after 30 days
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await pool.query(
      `INSERT INTO memory_hierarchy (
        character_id, memory_type, content_text,
        importance_score, metadata, expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        characterId,
        'working',
        description,
        0.5, // Default importance
        JSON.stringify({
          event_id: eventResult.rows[0].id,
          event_type: eventType,
          participants,
          quest_id: questId,
          goal_id: goalId
        }),
        expiresAt
      ]
    );

    // Cleanup: Keep only last 10 working memories
    await this.pruneWorkingMemory(characterId);

    return transformKeysToCamel(eventResult.rows[0]);
  }

  /**
   * Get working memory (last 10 interactions, full detail)
   */
  async getWorkingMemory(characterId, limit = 10) {
    const result = await pool.query(
      `SELECT * FROM narrative_events
       WHERE character_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [characterId, limit]
    );

    return transformKeysToCamel(result.rows.reverse()); // Return chronologically
  }

  /**
   * Prune working memory to keep only last 10 events
   * Older events get archived or compressed into episodes
   */
  async pruneWorkingMemory(characterId) {
    // Delete working memories beyond the 10 most recent
    await pool.query(
      `DELETE FROM memory_hierarchy
       WHERE id IN (
         SELECT id FROM memory_hierarchy
         WHERE character_id = $1 AND memory_type = 'working'
         ORDER BY created_at DESC
         OFFSET 10
       )`,
      [characterId]
    );
  }

  /**
   * Get episode memory (compressed summaries of recent sessions)
   */
  async getEpisodeMemory(characterId, count = 5) {
    const worldState = await pool.query(
      `SELECT episode_summaries FROM world_state WHERE character_id = $1`,
      [characterId]
    );

    if (!worldState.rows[0] || !worldState.rows[0].episode_summaries) {
      return [];
    }

    const episodes = worldState.rows[0].episode_summaries;
    return episodes.slice(-count); // Last N episodes
  }

  /**
   * Compress old events into episode summary
   * This is called periodically to prevent memory table from growing unbounded
   */
  async compressIntoEpisode(characterId, daysOld = 7) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    // Get events older than cutoff
    const oldEvents = await pool.query(
      `SELECT * FROM narrative_events
       WHERE character_id = $1
         AND created_at < $2
       ORDER BY created_at
       LIMIT 50`, // Compress in batches
      [characterId, cutoffDate]
    );

    if (oldEvents.rows.length < 10) {
      return null; // Not enough events to compress yet
    }

    // Create episode summary (in a real system, this would call Claude API)
    // For now, create a simple structured summary
    const episodeSummary = {
      period: {
        start: oldEvents.rows[0].created_at,
        end: oldEvents.rows[oldEvents.rows.length - 1].created_at
      },
      event_count: oldEvents.rows.length,
      key_events: oldEvents.rows.slice(0, 5).map(e => ({
        type: e.event_type,
        description: e.event_description,
        date: e.created_at
      })),
      participants_involved: [...new Set(
        oldEvents.rows.flatMap(e => e.participants || [])
      )],
      total_stat_changes: this.aggregateStatChanges(oldEvents.rows),
      summary_text: `During this period, the character completed ${oldEvents.rows.length} activities, involving ${[...new Set(oldEvents.rows.flatMap(e => e.participants || []))].join(', ')}.`
    };

    // Store episode in world_state
    await pool.query(
      `UPDATE world_state
       SET episode_summaries = episode_summaries || $1::jsonb
       WHERE character_id = $2`,
      [JSON.stringify([episodeSummary]), characterId]
    );

    // Store compressed episode in memory_hierarchy
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 90); // Episodes last 90 days

    await pool.query(
      `INSERT INTO memory_hierarchy (
        character_id, memory_type, content_text,
        importance_score, metadata, expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        characterId,
        'episode',
        episodeSummary.summary_text,
        0.7, // Episodes more important than working memory
        JSON.stringify(episodeSummary),
        expiresAt
      ]
    );

    return episodeSummary;
  }

  /**
   * Get long-term memory (core facts reinforced over time)
   */
  async getLongTermMemory(characterId) {
    const result = await pool.query(
      `SELECT content_text, importance_score, metadata
       FROM memory_hierarchy
       WHERE character_id = $1
         AND memory_type = 'long_term'
         AND importance_score > 0.7
       ORDER BY importance_score DESC
       LIMIT 20`,
      [characterId]
    );

    return transformKeysToCamel(result.rows);
  }

  /**
   * Store a fact in long-term memory
   * Used for critical information that should never be forgotten
   */
  async storeInLongTermMemory(characterId, fact, importanceScore = 0.8) {
    await pool.query(
      `INSERT INTO memory_hierarchy (
        character_id, memory_type, content_text, importance_score
      ) VALUES ($1, $2, $3, $4)
      ON CONFLICT DO NOTHING`,
      [characterId, 'long_term', fact, importanceScore]
    );
  }

  /**
   * Reinforce important memories
   * Memories that are accessed frequently get importance boost
   */
  async reinforceMemory(characterId, fact, importanceBoost = 0.1) {
    await pool.query(
      `UPDATE memory_hierarchy
       SET importance_score = LEAST(importance_score + $1, 1.0),
           last_accessed_at = CURRENT_TIMESTAMP
       WHERE character_id = $2
         AND content_text = $3`,
      [importanceBoost, characterId, fact]
    );
  }

  /**
   * Retrieve relevant memories based on query
   * In future: Use vector embeddings for semantic search
   * For now: Simple keyword matching
   */
  async retrieveRelevantMemories(characterId, query, limit = 5) {
    // Simple text search (in production, use vector similarity)
    const keywords = query.toLowerCase().split(' ').filter(w => w.length > 3);

    if (keywords.length === 0) {
      // Return most recent if no keywords
      return await this.getWorkingMemory(characterId, limit);
    }

    // Search across all memory types
    const searchPattern = keywords.map(k => `%${k}%`).join('|');

    const result = await pool.query(
      `SELECT DISTINCT ON (content_text)
         memory_type, content_text, importance_score, metadata, created_at
       FROM memory_hierarchy
       WHERE character_id = $1
         AND (
           content_text ILIKE ANY(ARRAY[${keywords.map((_, i) => `$${i + 2}`).join(',')}])
         )
       ORDER BY content_text, importance_score DESC, created_at DESC
       LIMIT $${keywords.length + 2}`,
      [characterId, ...keywords.map(k => `%${k}%`), limit]
    );

    // Also search narrative events
    const eventResults = await pool.query(
      `SELECT event_description as content_text, event_type, participants, created_at
       FROM narrative_events
       WHERE character_id = $1
         AND (
           event_description ILIKE ANY(ARRAY[${keywords.map((_, i) => `$${i + 2}`).join(',')}])
         )
       ORDER BY created_at DESC
       LIMIT $${keywords.length + 2}`,
      [characterId, ...keywords.map(k => `%${k}%`), limit]
    );

    // Combine and sort by relevance
    const combined = [...result.rows, ...eventResults.rows];
    return transformKeysToCamel(
      combined.sort((a, b) => (b.importance_score || 0.5) - (a.importance_score || 0.5))
        .slice(0, limit)
    );
  }

  /**
   * Update narrative summary (rolling 500-word summary)
   */
  async updateNarrativeSummary(characterId, newContent) {
    // In production, this would use Claude API to intelligently update
    // For now, append and truncate
    const currentState = await pool.query(
      `SELECT narrative_summary FROM world_state WHERE character_id = $1`,
      [characterId]
    );

    let updatedSummary = currentState.rows[0]?.narrative_summary || '';
    updatedSummary += `\n\n${newContent}`;

    // Simple truncation (in production, use AI summarization)
    const words = updatedSummary.split(' ');
    if (words.length > 500) {
      updatedSummary = words.slice(-500).join(' ');
    }

    await pool.query(
      `UPDATE world_state
       SET narrative_summary = $1, updated_at = CURRENT_TIMESTAMP
       WHERE character_id = $2`,
      [updatedSummary, characterId]
    );

    return updatedSummary;
  }

  /**
   * Get complete narrative context for AI agents
   * Combines all memory tiers for maximum context
   */
  async getCompleteContext(characterId) {
    const [workingMemory, episodeMemory, longTermMemory, worldState] = await Promise.all([
      this.getWorkingMemory(characterId, 10),
      this.getEpisodeMemory(characterId, 3),
      this.getLongTermMemory(characterId),
      this.getWorldState(characterId)
    ]);

    return {
      narrative_summary: worldState.narrative_summary,
      working_memory: workingMemory,
      episode_memory: episodeMemory,
      long_term_memory: longTermMemory,
      world_state: {
        npc_relationships: worldState.npc_relationships,
        unlocked_locations: worldState.unlocked_locations,
        story_flags: worldState.story_flags
      }
    };
  }

  /**
   * Get world state for character
   */
  async getWorldState(characterId) {
    const result = await pool.query(
      `SELECT * FROM world_state WHERE character_id = $1`,
      [characterId]
    );

    if (result.rows.length === 0) {
      // Initialize world state if it doesn't exist
      await pool.query(
        `INSERT INTO world_state (character_id, narrative_summary)
         VALUES ($1, $2)`,
        [characterId, 'Your adventure in Vitalia is just beginning. The Six Pillars await discovery.']
      );

      return await this.getWorldState(characterId);
    }

    return transformKeysToCamel(result.rows[0]);
  }

  /**
   * Update world state
   */
  async updateWorldState(characterId, updates) {
    const {
      npc_relationships,
      unlocked_locations,
      story_flags
    } = updates;

    const setClauses = [];
    const values = [characterId];
    let paramIndex = 2;

    if (npc_relationships) {
      setClauses.push(`npc_relationships = npc_relationships || $${paramIndex}::jsonb`);
      values.push(JSON.stringify(npc_relationships));
      paramIndex++;
    }

    if (unlocked_locations) {
      setClauses.push(`unlocked_locations = array_cat(unlocked_locations, $${paramIndex}::text[])`);
      values.push(unlocked_locations);
      paramIndex++;
    }

    if (story_flags) {
      setClauses.push(`story_flags = story_flags || $${paramIndex}::jsonb`);
      values.push(JSON.stringify(story_flags));
      paramIndex++;
    }

    if (setClauses.length === 0) {
      return;
    }

    await pool.query(
      `UPDATE world_state
       SET ${setClauses.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE character_id = $1`,
      values
    );
  }

  /**
   * Helper: Aggregate stat changes from multiple events
   */
  aggregateStatChanges(events) {
    const totals = { STR: 0, DEX: 0, CON: 0, INT: 0, WIS: 0, CHA: 0 };

    events.forEach(event => {
      const changes = event.stat_changes || {};
      Object.keys(changes).forEach(stat => {
        totals[stat] = (totals[stat] || 0) + (changes[stat] || 0);
      });
    });

    return totals;
  }

  /**
   * Cleanup expired memories
   * Should be run periodically (daily cron job)
   */
  async cleanupExpiredMemories() {
    const result = await pool.query(
      `DELETE FROM memory_hierarchy
       WHERE expires_at < CURRENT_TIMESTAMP
       RETURNING character_id, memory_type, COUNT(*) as deleted_count`,
      []
    );

    return transformKeysToCamel(result.rows);
  }
}

module.exports = new MemoryManager();
