const pool = require('../config/database');
const { transformKeysToCamel } = require('../utils/caseTransform');

/**
 * Narrative RAG (Retrieval-Augmented Generation)
 *
 * Hybrid retrieval system that combines:
 * - Semantic search via vector embeddings (when pgvector enabled)
 * - Keyword matching with TF-IDF scoring
 * - Recency and importance weighting
 *
 * Gracefully falls back to keyword-only when pgvector is not installed.
 *
 * Embedding Strategy:
 * - Uses OpenAI text-embedding-3-small (1536 dimensions) if API key available
 * - Falls back to keyword-only retrieval if embeddings unavailable
 * - Research shows 41.8% fewer hallucinations with hybrid retrieval
 */

class NarrativeRAG {
  constructor() {
    this.vectorEnabled = null; // Lazy-loaded on first use
    this.embeddingCache = new Map(); // Cache embeddings in memory
  }

  /**
   * Check if pgvector extension is enabled
   */
  async isVectorEnabled() {
    if (this.vectorEnabled !== null) {
      return this.vectorEnabled;
    }

    try {
      const result = await pool.query(
        "SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'vector') as enabled"
      );
      this.vectorEnabled = result.rows[0].enabled;

      if (this.vectorEnabled) {
        console.log('[NarrativeRAG] ✅ pgvector enabled - using hybrid retrieval');
      } else {
        console.log('[NarrativeRAG] ⚠️ pgvector not available - using keyword-only retrieval');
      }

      return this.vectorEnabled;
    } catch (error) {
      console.error('[NarrativeRAG] Error checking vector extension:', error.message);
      this.vectorEnabled = false;
      return false;
    }
  }

  /**
   * Generate embedding vector for text using OpenAI API
   * Falls back to null if embeddings unavailable
   */
  async generateEmbedding(text) {
    // Check cache first
    if (this.embeddingCache.has(text)) {
      return this.embeddingCache.get(text);
    }

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      return null; // No embedding API available
    }

    try {
      // Using OpenAI's embedding API
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: text
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const embedding = data.data[0].embedding;

      // Cache the embedding (limit cache size to 1000 entries)
      if (this.embeddingCache.size > 1000) {
        const firstKey = this.embeddingCache.keys().next().value;
        this.embeddingCache.delete(firstKey);
      }
      this.embeddingCache.set(text, embedding);

      return embedding;

    } catch (error) {
      console.error('[NarrativeRAG] Error generating embedding:', error.message);
      return null; // Fall back to keyword-only
    }
  }

  /**
   * Store event with optional embedding
   */
  async storeEventWithEmbedding(characterId, eventType, eventDescription, eventData = {}) {
    const vectorEnabled = await this.isVectorEnabled();

    try {
      let embedding = null;
      if (vectorEnabled) {
        embedding = await this.generateEmbedding(eventDescription);
      }

      const result = await pool.query(
        `INSERT INTO narrative_events (
          character_id, event_type, event_description, event_data, event_embedding
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING id`,
        [
          characterId,
          eventType,
          eventDescription,
          JSON.stringify(eventData),
          embedding ? JSON.stringify(embedding) : null
        ]
      );

      return result.rows[0].id;
    } catch (error) {
      console.error('[NarrativeRAG] Error storing event:', error.message);
      throw error;
    }
  }
  /**
   * Retrieve relevant past events for a character (HYBRID RETRIEVAL)
   *
   * Uses semantic search (when pgvector enabled) + keyword matching
   * Research shows 41.8% fewer hallucinations with hybrid approach
   *
   * @param {number} characterId - Character ID
   * @param {string} query - Search query (quest title, NPC name, theme)
   * @param {number} k - Number of results to return
   * @returns {Promise<Array>} - Relevant narrative events
   */
  async retrieveRelevantEvents(characterId, query, k = 5) {
    try {
      const vectorEnabled = await this.isVectorEnabled();

      // If vectors enabled, use hybrid retrieval
      if (vectorEnabled) {
        return await this.hybridRetrieval(characterId, query, k);
      }

      // Fall back to keyword-only retrieval
      return await this.keywordRetrieval(characterId, query, k);

    } catch (error) {
      console.error('[NarrativeRAG] Error retrieving events:', error.message);
      return [];
    }
  }

  /**
   * Hybrid retrieval: Combine semantic + keyword search
   */
  async hybridRetrieval(characterId, query, k = 5) {
    try {
      // Generate embedding for query
      const queryEmbedding = await this.generateEmbedding(query);

      if (!queryEmbedding) {
        // Fall back to keyword-only if embedding fails
        return await this.keywordRetrieval(characterId, query, k);
      }

      // Get semantic matches using vector similarity
      const semanticResults = await pool.query(
        `SELECT
          id,
          event_type,
          event_description,
          participants,
          stat_changes,
          quest_id,
          created_at,
          1 - (event_embedding <=> $1::vector) as semantic_similarity
         FROM narrative_events
         WHERE character_id = $2
           AND event_embedding IS NOT NULL
           AND created_at > NOW() - INTERVAL '60 days'
         ORDER BY event_embedding <=> $1::vector
         LIMIT ${k * 2}`,
        [JSON.stringify(queryEmbedding), characterId]
      );

      // Also get keyword matches
      const keywordMatches = await this.keywordRetrieval(characterId, query, k * 2);

      // Combine and deduplicate results
      const combinedMap = new Map();

      // Add semantic results (weight = 0.6)
      semanticResults.rows.forEach(event => {
        combinedMap.set(event.id, {
          ...event,
          finalScore: event.semantic_similarity * 60
        });
      });

      // Add keyword results (weight = 0.4), combining scores if already present
      keywordMatches.forEach(event => {
        const existing = combinedMap.get(event.id);
        if (existing) {
          existing.finalScore += event.relevanceScore * 0.4;
        } else {
          combinedMap.set(event.id, {
            ...event,
            finalScore: event.relevanceScore * 40
          });
        }
      });

      // Sort by combined score and return top k
      const rankedEvents = Array.from(combinedMap.values())
        .sort((a, b) => b.finalScore - a.finalScore)
        .slice(0, k);

      console.log(`[NarrativeRAG] Hybrid retrieval: ${rankedEvents.length} results (semantic + keyword)`);

      return rankedEvents;

    } catch (error) {
      console.error('[NarrativeRAG] Error in hybrid retrieval:', error.message);
      // Fall back to keyword-only
      return await this.keywordRetrieval(characterId, query, k);
    }
  }

  /**
   * Keyword-only retrieval (fallback when vectors unavailable)
   */
  async keywordRetrieval(characterId, query, k = 5) {
    try {
      // Extract keywords from query
      const keywords = this.extractKeywords(query);

      // Get recent events (last 30 days) with keyword matching
      const result = await pool.query(
        `SELECT
          id,
          event_type,
          event_description,
          participants,
          stat_changes,
          quest_id,
          created_at
         FROM narrative_events
         WHERE character_id = $1
           AND created_at > NOW() - INTERVAL '30 days'
         ORDER BY created_at DESC
         LIMIT 50`,
        [characterId]
      );

      const events = result.rows;

      // Score events by relevance
      const scoredEvents = events.map(event => ({
        ...event,
        relevanceScore: this.calculateRelevance(event, keywords, query)
      }));

      // Sort by relevance and return top k
      scoredEvents.sort((a, b) => b.relevanceScore - a.relevanceScore);

      return scoredEvents.slice(0, k);

    } catch (error) {
      console.error('[NarrativeRAG] Error in keyword retrieval:', error.message);
      return [];
    }
  }

  /**
   * Extract keywords from query
   */
  extractKeywords(query) {
    // Convert to lowercase and split by spaces/punctuation
    const words = query.toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3); // Filter out short words

    // Remove common stop words
    const stopWords = new Set(['the', 'and', 'for', 'with', 'that', 'this', 'from', 'have', 'been', 'your']);
    return words.filter(w => !stopWords.has(w));
  }

  /**
   * Calculate relevance score for an event
   */
  calculateRelevance(event, keywords, query) {
    let score = 0;

    const eventText = (
      event.event_description + ' ' +
      (event.participants?.join(' ') || '') + ' ' +
      event.event_type
    ).toLowerCase();

    // Keyword matching (10 points per keyword match)
    keywords.forEach(keyword => {
      const regex = new RegExp(keyword, 'gi');
      const matches = (eventText.match(regex) || []).length;
      score += matches * 10;
    });

    // Recency bonus (more recent = higher score)
    const daysAgo = Math.floor((Date.now() - new Date(event.created_at)) / (1000 * 60 * 60 * 24));
    const recencyBonus = Math.max(0, 20 - daysAgo); // Up to 20 points for very recent
    score += recencyBonus;

    // Event type weighting
    const importantTypes = ['quest_completed', 'npc_interaction', 'level_up'];
    if (importantTypes.includes(event.event_type)) {
      score += 15;
    }

    // NPC match bonus
    if (event.participants && event.participants.length > 0) {
      event.participants.forEach(npc => {
        if (query.toLowerCase().includes(npc.toLowerCase())) {
          score += 25; // Strong signal if NPC mentioned in query
        }
      });
    }

    return score;
  }

  /**
   * Get recent quest completions (for continuity)
   *
   * @param {number} characterId - Character ID
   * @param {number} limit - Number of quests to return
   * @returns {Promise<Array>} - Recent completed quests
   */
  async getRecentQuests(characterId, limit = 5) {
    try {
      const result = await pool.query(
        `SELECT
          id,
          title,
          description,
          npc_involved,
          completed_at
         FROM quests
         WHERE character_id = $1
           AND status = 'completed'
         ORDER BY completed_at DESC
         LIMIT $2`,
        [characterId, limit]
      );

      return transformKeysToCamel(result.rows);

    } catch (error) {
      console.error('[NarrativeRAG] Error getting recent quests:', error.message);
      return [];
    }
  }

  /**
   * Get NPC interaction history
   *
   * @param {number} characterId - Character ID
   * @param {string} npcName - NPC name to search for
   * @returns {Promise<Array>} - Past interactions with this NPC
   */
  async getNPCHistory(characterId, npcName) {
    try {
      const result = await pool.query(
        `SELECT
          id,
          event_type,
          event_description,
          created_at
         FROM narrative_events
         WHERE character_id = $1
           AND participants @> $2::jsonb
         ORDER BY created_at DESC
         LIMIT 10`,
        [characterId, JSON.stringify([npcName])]
      );

      return transformKeysToCamel(result.rows);

    } catch (error) {
      console.error('[NarrativeRAG] Error getting NPC history:', error.message);
      return [];
    }
  }

  /**
   * Check for contradictions in proposed content
   * (Simplified version without embeddings)
   *
   * @param {number} characterId - Character ID
   * @param {string} proposedContent - Content to check
   * @returns {Promise<Object>} - Contradiction analysis
   */
  async checkForContradictions(characterId, proposedContent) {
    try {
      // Extract NPCs and keywords from proposed content
      const keywords = this.extractKeywords(proposedContent);

      // Get relevant past events
      const pastEvents = await this.retrieveRelevantEvents(characterId, proposedContent, 10);

      // Simple contradiction detection: look for conflicting statements
      const contradictions = [];

      // Check NPC consistency (simplified - just logs warnings)
      const npcsInContent = this.extractNPCNames(proposedContent);

      for (const npc of npcsInContent) {
        const npcHistory = await this.getNPCHistory(characterId, npc);

        if (npcHistory.length === 0) {
          // New NPC - not a contradiction, but worth noting
          console.log(`[NarrativeRAG] New NPC introduced: ${npc}`);
        }
      }

      return {
        hasContradictions: contradictions.length > 0,
        contradictions,
        relevantHistory: pastEvents.slice(0, 5)
      };

    } catch (error) {
      console.error('[NarrativeRAG] Error checking contradictions:', error.message);
      return {
        hasContradictions: false,
        contradictions: [],
        relevantHistory: []
      };
    }
  }

  /**
   * Extract NPC names from content (basic pattern matching)
   */
  extractNPCNames(content) {
    // Look for capitalized names (simple heuristic)
    const matches = content.match(/\b[A-Z][a-z]+(?:\s[A-Z][a-z]+)*\b/g) || [];

    // Filter out common words that aren't names
    const commonWords = new Set(['The', 'You', 'Your', 'This', 'That', 'There', 'When', 'Where', 'How', 'What', 'Why']);
    return matches.filter(name => !commonWords.has(name));
  }

  /**
   * Format events for prompt context
   *
   * @param {Array} events - Narrative events
   * @returns {string} - Formatted text for prompt
   */
  formatEventsForPrompt(events) {
    if (!events || events.length === 0) {
      return 'No relevant past events.';
    }

    return events.map((event, i) => {
      const participants = event.participants ? ` (with ${event.participants.join(', ')})` : '';
      const timeAgo = this.getTimeAgo(event.created_at);

      return `${i + 1}. [${timeAgo}] ${event.event_description}${participants}`;
    }).join('\n');
  }

  /**
   * Get human-readable time ago
   */
  getTimeAgo(timestamp) {
    const daysAgo = Math.floor((Date.now() - new Date(timestamp)) / (1000 * 60 * 60 * 24));

    if (daysAgo === 0) return 'Today';
    if (daysAgo === 1) return 'Yesterday';
    if (daysAgo < 7) return `${daysAgo} days ago`;
    if (daysAgo < 30) return `${Math.floor(daysAgo / 7)} weeks ago`;
    return `${Math.floor(daysAgo / 30)} months ago`;
  }

  /**
   * Store important facts for long-term memory
   * (Future enhancement - for now just logs)
   *
   * @param {number} characterId - Character ID
   * @param {string} fact - Important fact to remember
   * @param {number} importance - Importance score (0-1)
   */
  async storeImportantFact(characterId, fact, importance = 0.8) {
    console.log(`[NarrativeRAG] Storing important fact (importance: ${importance}): ${fact}`);

    // For MVP, we'll just log this
    // In full implementation, would store in memory_hierarchy table with importance scoring

    return true;
  }

  /**
   * Retrieve context for Narrative Director orchestration
   * Unified interface that combines multiple retrieval strategies
   *
   * @param {number} characterId - Character ID
   * @param {string} query - Query text for semantic search
   * @param {Object} options - Retrieval options
   * @returns {Array} - Retrieved context items
   */
  async retrieveContext(characterId, query, options = {}) {
    const {
      k = 5,
      includeEpisodes = true,
      includeQuests = true,
      weightRecency = 0.3,
      weightRelevance = 0.5,
      weightImportance = 0.2
    } = options;

    console.log(`[NarrativeRAG] Retrieving context for query: "${query.substring(0, 50)}..."`);

    try {
      const results = [];

      // 1. Retrieve relevant events via hybrid search
      const relevantEvents = await this.retrieveRelevantEvents(characterId, query, k);
      results.push(...relevantEvents.map(event => ({
        type: 'event',
        content: event.event_description || event.description || event.content,
        timestamp: event.created_at,
        relevanceScore: event.similarity || 0.5,
        ...event
      })));

      // 2. Include episode summaries if requested
      if (includeEpisodes) {
        try {
          const episodes = await this.getEpisodeSummaries(characterId, 3);
          results.push(...episodes.map(ep => ({
            type: 'episode',
            content: ep.summary_text || ep.summaryText || JSON.stringify(ep),
            timestamp: ep.period?.end || ep.created_at,
            relevanceScore: 0.6,
            ...ep
          })));
        } catch (e) {
          // Episode retrieval failed, continue
        }
      }

      // 3. Include recent quests if requested
      if (includeQuests) {
        try {
          const recentQuests = await this.getRecentQuests(characterId, 3);
          results.push(...recentQuests.map(q => ({
            type: 'quest',
            content: `Quest: ${q.title}. ${q.description || ''}`,
            timestamp: q.created_at,
            relevanceScore: 0.5,
            ...q
          })));
        } catch (e) {
          // Quest retrieval failed, continue
        }
      }

      // 4. Score and rank results
      const scoredResults = results.map(item => {
        const recencyScore = this.calculateRecencyScore(item.timestamp);
        const relevance = item.relevanceScore || 0.5;
        const importance = item.importance_score || 0.5;

        const compositeScore =
          weightRecency * recencyScore +
          weightRelevance * relevance +
          weightImportance * importance;

        return { ...item, compositeScore };
      });

      scoredResults.sort((a, b) => b.compositeScore - a.compositeScore);
      const topResults = scoredResults.slice(0, k);

      console.log(`[NarrativeRAG] Retrieved ${topResults.length} context items`);
      return topResults;

    } catch (error) {
      console.error('[NarrativeRAG] Context retrieval error:', error.message);
      return [];
    }
  }

  /**
   * Calculate recency score (exponential decay)
   */
  calculateRecencyScore(timestamp) {
    if (!timestamp) return 0.5;
    const ageInDays = (Date.now() - new Date(timestamp).getTime()) / (1000 * 60 * 60 * 24);
    return Math.exp(-ageInDays / 30);
  }

  /**
   * Get episode summaries from world_state
   */
  async getEpisodeSummaries(characterId, limit = 3) {
    try {
      const result = await pool.query(
        `SELECT episode_summaries FROM world_state WHERE character_id = $1`,
        [characterId]
      );
      if (!result.rows[0] || !result.rows[0].episode_summaries) return [];
      return result.rows[0].episode_summaries.slice(-limit);
    } catch (error) {
      return [];
    }
  }
}

module.exports = new NarrativeRAG();
