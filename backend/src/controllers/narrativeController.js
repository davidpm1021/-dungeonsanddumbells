const memoryManager = require('../services/memoryManager');

/**
 * Narrative Event Controller
 * Handles endpoints for retrieving and managing narrative events and memory
 */

/**
 * Get complete narrative context for a character
 * Combines working memory, episodes, long-term memory, and world state
 */
exports.getCompleteContext = async (req, res) => {
  try {
    const characterId = req.character.id;

    const context = await memoryManager.getCompleteContext(characterId);

    res.json({
      success: true,
      data: context
    });
  } catch (error) {
    console.error('Error fetching complete context:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch narrative context'
    });
  }
};

/**
 * Get working memory (last 10 interactions)
 */
exports.getWorkingMemory = async (req, res) => {
  try {
    const characterId = req.character.id;
    const limit = parseInt(req.query.limit) || 10;

    const workingMemory = await memoryManager.getWorkingMemory(characterId, limit);

    res.json({
      success: true,
      data: workingMemory
    });
  } catch (error) {
    console.error('Error fetching working memory:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch working memory'
    });
  }
};

/**
 * Get episode memory (compressed summaries)
 */
exports.getEpisodeMemory = async (req, res) => {
  try {
    const characterId = req.character.id;
    const count = parseInt(req.query.count) || 5;

    const episodes = await memoryManager.getEpisodeMemory(characterId, count);

    res.json({
      success: true,
      data: episodes
    });
  } catch (error) {
    console.error('Error fetching episode memory:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch episode memory'
    });
  }
};

/**
 * Get long-term memory (important facts)
 */
exports.getLongTermMemory = async (req, res) => {
  try {
    const characterId = req.character.id;

    const longTermMemory = await memoryManager.getLongTermMemory(characterId);

    res.json({
      success: true,
      data: longTermMemory
    });
  } catch (error) {
    console.error('Error fetching long-term memory:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch long-term memory'
    });
  }
};

/**
 * Store a fact in long-term memory
 * Used for critical information that should never be forgotten
 */
exports.storeLongTermMemory = async (req, res) => {
  try {
    const characterId = req.character.id;
    const { fact, importanceScore } = req.body;

    if (!fact) {
      return res.status(400).json({
        success: false,
        error: 'Fact is required'
      });
    }

    const score = importanceScore || 0.8;

    if (score < 0 || score > 1) {
      return res.status(400).json({
        success: false,
        error: 'Importance score must be between 0 and 1'
      });
    }

    await memoryManager.storeInLongTermMemory(characterId, fact, score);

    res.json({
      success: true,
      message: 'Fact stored in long-term memory'
    });
  } catch (error) {
    console.error('Error storing long-term memory:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to store long-term memory'
    });
  }
};

/**
 * Search for relevant memories
 */
exports.searchMemories = async (req, res) => {
  try {
    const characterId = req.character.id;
    const { query, limit } = req.query;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required'
      });
    }

    const searchLimit = parseInt(limit) || 5;
    const memories = await memoryManager.retrieveRelevantMemories(
      characterId,
      query,
      searchLimit
    );

    res.json({
      success: true,
      data: memories
    });
  } catch (error) {
    console.error('Error searching memories:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search memories'
    });
  }
};

/**
 * Get world state for character
 */
exports.getWorldState = async (req, res) => {
  try {
    const characterId = req.character.id;

    const worldState = await memoryManager.getWorldState(characterId);

    res.json({
      success: true,
      data: worldState
    });
  } catch (error) {
    console.error('Error fetching world state:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch world state'
    });
  }
};

/**
 * Update world state
 */
exports.updateWorldState = async (req, res) => {
  try {
    const characterId = req.character.id;
    const updates = req.body;

    await memoryManager.updateWorldState(characterId, updates);

    res.json({
      success: true,
      message: 'World state updated successfully'
    });
  } catch (error) {
    console.error('Error updating world state:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update world state'
    });
  }
};

/**
 * Get narrative summary
 */
exports.getNarrativeSummary = async (req, res) => {
  try {
    const characterId = req.character.id;

    const worldState = await memoryManager.getWorldState(characterId);

    res.json({
      success: true,
      data: {
        summary: worldState.narrative_summary
      }
    });
  } catch (error) {
    console.error('Error fetching narrative summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch narrative summary'
    });
  }
};

/**
 * Manually store a narrative event
 * Useful for custom events not triggered by goal completion
 */
exports.storeNarrativeEvent = async (req, res) => {
  try {
    const characterId = req.character.id;
    const {
      eventType,
      description,
      participants,
      statChanges,
      questId,
      context
    } = req.body;

    if (!eventType || !description) {
      return res.status(400).json({
        success: false,
        error: 'Event type and description are required'
      });
    }

    const event = await memoryManager.storeInWorkingMemory(characterId, {
      eventType,
      description,
      participants: participants || [],
      statChanges: statChanges || {},
      questId: questId || null,
      context: context || {}
    });

    res.json({
      success: true,
      data: event,
      message: 'Narrative event stored successfully'
    });
  } catch (error) {
    console.error('Error storing narrative event:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to store narrative event'
    });
  }
};

/**
 * Compress old events into an episode
 */
exports.compressEpisode = async (req, res) => {
  try {
    const characterId = req.character.id;
    const daysOld = parseInt(req.query.daysOld) || 7;

    const episode = await memoryManager.compressIntoEpisode(characterId, daysOld);

    if (!episode) {
      return res.json({
        success: true,
        message: 'No events old enough to compress',
        data: null
      });
    }

    res.json({
      success: true,
      data: episode,
      message: 'Episode created successfully'
    });
  } catch (error) {
    console.error('Error compressing episode:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to compress episode'
    });
  }
};

/**
 * Get World Bible (immutable ground truth)
 */
exports.getWorldBible = async (req, res) => {
  try {
    const { WORLD_BIBLE } = require('../data/worldBible');

    res.json({
      success: true,
      data: WORLD_BIBLE
    });
  } catch (error) {
    console.error('Error fetching World Bible:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch World Bible'
    });
  }
};

/**
 * Get narrative summary with stats
 */
exports.getNarrativeSummaryWithStats = async (req, res) => {
  try {
    const characterId = parseInt(req.params.characterId);
    const narrativeSummary = require('../services/narrativeSummary');

    const summary = await narrativeSummary.getSummary(characterId);
    const stats = await narrativeSummary.getSummaryStats(characterId);

    res.json({
      success: true,
      summary,
      stats
    });
  } catch (error) {
    console.error('Error fetching narrative summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch narrative summary'
    });
  }
};

/**
 * Get narrative events for character
 */
exports.getNarrativeEvents = async (req, res) => {
  try {
    const characterId = parseInt(req.params.characterId);
    const limit = parseInt(req.query.limit) || 10;
    const pool = require('../config/database');

    const result = await pool.query(
      `SELECT * FROM narrative_events
       WHERE character_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [characterId, limit]
    );

    res.json({
      success: true,
      events: result.rows
    });
  } catch (error) {
    console.error('Error fetching narrative events:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch narrative events'
    });
  }
};

/**
 * RAG retrieval endpoint
 */
exports.retrieveRelevantEvents = async (req, res) => {
  try {
    const { characterId, query, k } = req.body;
    const narrativeRAG = require('../services/narrativeRAG');

    if (!characterId || !query) {
      return res.status(400).json({
        success: false,
        error: 'characterId and query are required'
      });
    }

    const events = await narrativeRAG.retrieveRelevantEvents(
      characterId,
      query,
      k || 5
    );

    res.json({
      success: true,
      events
    });
  } catch (error) {
    console.error('Error retrieving relevant events:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve relevant events'
    });
  }
};
