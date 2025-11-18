/**
 * Storylet System - Quality-Based Narrative Framework
 *
 * Research-backed storylet/Quality-Based Narratives (QBN) system.
 * From Research.md: "Each storylet is an atomic, recombinable content piece
 * containing narrative content, prerequisites defining availability conditions,
 * and effects updating world state after execution."
 *
 * Key features:
 * - Prerequisites: Complex boolean logic for availability
 * - Effects: World state changes after completion
 * - Progression qualities: Track story beats
 * - Hub-and-spoke model: Mandatory milestones with free exploration
 * - Anchoring: Regular callbacks to core themes
 */

const pool = require('../config/database');

class StoryletSystem {
  constructor() {
    // Core narrative themes to anchor storylets
    this.coreThemes = [
      'self_discovery',
      'overcoming_adversity',
      'community_building',
      'personal_growth',
      'inner_strength'
    ];

    // Progression quality definitions
    this.progressionQualities = {
      // Act 1: Beginning
      'journey_begun': { description: 'Started the wellness journey', act: 1 },
      'first_challenge_overcome': { description: 'Completed first difficult quest', act: 1 },
      'mentor_discovered': { description: 'Found guidance or wisdom', act: 1 },

      // Act 2: Rising Action
      'inner_doubt_faced': { description: 'Confronted self-doubt', act: 2 },
      'community_formed': { description: 'Built connections with others', act: 2 },
      'hidden_strength_revealed': { description: 'Discovered untapped potential', act: 2 },
      'setback_endured': { description: 'Persisted through failure', act: 2 },

      // Act 3: Climax & Resolution
      'breakthrough_achieved': { description: 'Major personal victory', act: 3 },
      'wisdom_integrated': { description: 'Learned from experience', act: 3 },
      'new_chapter_begun': { description: 'Ready for next phase', act: 3 }
    };
  }

  /**
   * Get available storylets based on character qualities
   *
   * @param {number} characterId - Character ID
   * @param {Object} currentQualities - Character's current qualities
   * @returns {Array} - Available storylets
   */
  async getAvailableStorylets(characterId, currentQualities = {}) {
    console.log('[StoryletSystem] Checking available storylets for character:', characterId);

    try {
      // Get all storylets from database
      const storylets = await this.getAllStorylets();

      // Filter by prerequisites
      const available = storylets.filter(storylet =>
        this.checkPrerequisites(storylet.prerequisites, currentQualities)
      );

      // Sort by priority/relevance
      const sorted = this.sortByRelevance(available, currentQualities);

      console.log(`[StoryletSystem] ${sorted.length} storylets available out of ${storylets.length}`);

      return sorted;
    } catch (error) {
      console.warn('[StoryletSystem] Error getting storylets:', error.message);
      return this.getDefaultStorylets();
    }
  }

  /**
   * Get character's current qualities
   *
   * @param {number} characterId - Character ID
   * @returns {Object} - Map of quality names to values
   */
  async getCharacterQualities(characterId) {
    try {
      const query = `
        SELECT quality_name, quality_value, quality_type
        FROM character_qualities
        WHERE character_id = $1
      `;

      const result = await pool.query(query, [characterId]);

      const qualities = {};
      result.rows.forEach(row => {
        if (row.quality_type === 'boolean') {
          qualities[row.quality_name] = row.quality_value === 1;
        } else {
          qualities[row.quality_name] = row.quality_value;
        }
      });

      // Add derived qualities
      qualities.total_qualities = Object.keys(qualities).length;
      qualities.progression_stage = this.calculateProgressionStage(qualities);

      return qualities;
    } catch (error) {
      console.warn('[StoryletSystem] Failed to get qualities:', error.message);
      return this.getDefaultQualities();
    }
  }

  /**
   * Update character quality
   *
   * @param {number} characterId - Character ID
   * @param {string} qualityName - Quality to update
   * @param {any} value - New value
   * @param {string} type - Quality type (boolean, integer, string)
   */
  async setCharacterQuality(characterId, qualityName, value, type = 'boolean') {
    console.log(`[StoryletSystem] Setting quality ${qualityName} = ${value}`);

    const numericValue = type === 'boolean' ? (value ? 1 : 0) : value;

    const query = `
      INSERT INTO character_qualities (character_id, quality_name, quality_value, quality_type)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (character_id, quality_name)
      DO UPDATE SET quality_value = $3, updated_at = NOW()
    `;

    try {
      await pool.query(query, [characterId, qualityName, numericValue, type]);
    } catch (error) {
      // Create table if it doesn't exist
      if (error.code === '42P01') {
        await this.createQualitiesTable();
        await pool.query(query, [characterId, qualityName, numericValue, type]);
      } else {
        console.error('[StoryletSystem] Failed to set quality:', error.message);
      }
    }
  }

  /**
   * Apply effects from completing a storylet
   *
   * @param {number} characterId - Character ID
   * @param {string} storyletId - Storylet identifier
   * @param {Object} questData - Quest data for context
   */
  async applyEffects(characterId, storyletId, questData = {}) {
    console.log(`[StoryletSystem] Applying effects for storylet: ${storyletId}`);

    const storylet = await this.getStoryletById(storyletId);
    if (!storylet || !storylet.effects) {
      console.warn('[StoryletSystem] No effects found for storylet');
      return;
    }

    // Apply each effect
    for (const effect of storylet.effects) {
      await this.applyEffect(characterId, effect);
    }

    // Record storylet completion
    await this.recordStoryletCompletion(characterId, storyletId);
  }

  /**
   * Apply quest effects (from quest.effects field)
   */
  async applyQuestEffects(characterId, quest) {
    if (!quest.effects) return;

    try {
      const effects = typeof quest.effects === 'string'
        ? JSON.parse(quest.effects)
        : quest.effects;

      for (const effect of effects) {
        await this.applyEffect(characterId, effect);
      }
    } catch (error) {
      console.error('[StoryletSystem] Failed to apply quest effects:', error.message);
    }
  }

  /**
   * Apply a single effect
   */
  async applyEffect(characterId, effect) {
    switch (effect.type) {
      case 'set_quality':
        await this.setCharacterQuality(characterId, effect.quality, effect.value, effect.valueType || 'boolean');
        break;

      case 'increment_quality':
        const current = await this.getQualityValue(characterId, effect.quality);
        await this.setCharacterQuality(characterId, effect.quality, (current || 0) + effect.amount, 'integer');
        break;

      case 'unlock_storylet':
        await this.setCharacterQuality(characterId, `storylet_${effect.storyletId}_unlocked`, true);
        break;

      case 'progress_narrative':
        await this.advanceNarrativeProgression(characterId, effect.milestone);
        break;

      default:
        console.warn(`[StoryletSystem] Unknown effect type: ${effect.type}`);
    }
  }

  /**
   * Check if prerequisites are met
   *
   * @param {Object} prerequisites - Prerequisite conditions
   * @param {Object} qualities - Current qualities
   * @returns {boolean} - True if all prerequisites met
   */
  checkPrerequisites(prerequisites, qualities) {
    if (!prerequisites) return true;

    // Handle different prerequisite types
    if (prerequisites.all) {
      // All conditions must be true
      return prerequisites.all.every(prereq => this.checkSinglePrereq(prereq, qualities));
    }

    if (prerequisites.any) {
      // At least one condition must be true
      return prerequisites.any.some(prereq => this.checkSinglePrereq(prereq, qualities));
    }

    if (prerequisites.none) {
      // None of the conditions should be true
      return !prerequisites.none.some(prereq => this.checkSinglePrereq(prereq, qualities));
    }

    // Simple single prerequisite
    return this.checkSinglePrereq(prerequisites, qualities);
  }

  /**
   * Check a single prerequisite condition
   */
  checkSinglePrereq(prereq, qualities) {
    const { quality, operator, value } = prereq;

    const currentValue = qualities[quality];

    switch (operator) {
      case '==':
      case 'equals':
        return currentValue === value;

      case '!=':
      case 'not_equals':
        return currentValue !== value;

      case '>':
      case 'greater_than':
        return currentValue > value;

      case '>=':
      case 'greater_than_or_equal':
        return currentValue >= value;

      case '<':
      case 'less_than':
        return currentValue < value;

      case '<=':
      case 'less_than_or_equal':
        return currentValue <= value;

      case 'has':
      case 'exists':
        return currentValue !== undefined && currentValue !== null;

      case 'not_has':
      case 'not_exists':
        return currentValue === undefined || currentValue === null;

      default:
        // Boolean check by default
        return Boolean(currentValue) === Boolean(value);
    }
  }

  /**
   * Sort storylets by relevance to current state
   */
  sortByRelevance(storylets, qualities) {
    return storylets.sort((a, b) => {
      // Priority 1: Progression storylets (milestones)
      const aIsMilestone = a.type === 'progression' ? 1 : 0;
      const bIsMilestone = b.type === 'progression' ? 1 : 0;
      if (aIsMilestone !== bIsMilestone) return bIsMilestone - aIsMilestone;

      // Priority 2: Theme anchoring (reference core themes every 4-6 quests)
      const questsCompleted = qualities.quests_completed || 0;
      const needsAnchoring = questsCompleted % 5 === 0;
      if (needsAnchoring) {
        const aIsAnchor = a.anchorsTheme ? 1 : 0;
        const bIsAnchor = b.anchorsTheme ? 1 : 0;
        if (aIsAnchor !== bIsAnchor) return bIsAnchor - aIsAnchor;
      }

      // Priority 3: Urgency
      return (b.urgency || 0) - (a.urgency || 0);
    });
  }

  /**
   * Calculate current progression stage
   */
  calculateProgressionStage(qualities) {
    let stage = 1;

    // Check Act 1 completion
    if (qualities.journey_begun && qualities.first_challenge_overcome) {
      stage = 2;
    }

    // Check Act 2 completion
    if (stage === 2 && qualities.inner_doubt_faced && qualities.hidden_strength_revealed) {
      stage = 3;
    }

    // Check Act 3 completion
    if (stage === 3 && qualities.breakthrough_achieved) {
      stage = 4; // New chapter
    }

    return stage;
  }

  /**
   * Advance narrative progression
   */
  async advanceNarrativeProgression(characterId, milestone) {
    console.log(`[StoryletSystem] Advancing narrative: ${milestone}`);

    await this.setCharacterQuality(characterId, milestone, true, 'boolean');

    // Check for act transitions
    const qualities = await this.getCharacterQualities(characterId);
    const newStage = this.calculateProgressionStage(qualities);

    await this.setCharacterQuality(characterId, 'current_act', newStage, 'integer');
  }

  /**
   * Get quality value for a character
   */
  async getQualityValue(characterId, qualityName) {
    try {
      const query = `
        SELECT quality_value FROM character_qualities
        WHERE character_id = $1 AND quality_name = $2
      `;
      const result = await pool.query(query, [characterId, qualityName]);
      return result.rows[0]?.quality_value;
    } catch (error) {
      return null;
    }
  }

  /**
   * Record storylet completion
   */
  async recordStoryletCompletion(characterId, storyletId) {
    try {
      const query = `
        INSERT INTO storylet_completions (character_id, storylet_id, completed_at)
        VALUES ($1, $2, NOW())
      `;
      await pool.query(query, [characterId, storyletId]);
    } catch (error) {
      // Table might not exist
      if (error.code === '42P01') {
        await this.createCompletionsTable();
      }
    }
  }

  /**
   * Get all storylets from database
   */
  async getAllStorylets() {
    try {
      const query = `
        SELECT
          id,
          storylet_id,
          title,
          description,
          prerequisites,
          effects,
          type,
          anchors_theme,
          urgency
        FROM storylets
        ORDER BY urgency DESC
      `;
      const result = await pool.query(query);

      return result.rows.map(row => ({
        id: row.id,
        storyletId: row.storylet_id,
        title: row.title,
        description: row.description,
        prerequisites: row.prerequisites,
        effects: row.effects,
        type: row.type,
        anchorsTheme: row.anchors_theme,
        urgency: row.urgency
      }));
    } catch (error) {
      console.warn('[StoryletSystem] Failed to get storylets from DB:', error.message);
      return this.getDefaultStorylets();
    }
  }

  /**
   * Get storylet by ID
   */
  async getStoryletById(storyletId) {
    try {
      const query = `
        SELECT * FROM storylets WHERE storylet_id = $1
      `;
      const result = await pool.query(query, [storyletId]);
      if (result.rows.length === 0) return null;

      const row = result.rows[0];
      return {
        id: row.id,
        storyletId: row.storylet_id,
        title: row.title,
        description: row.description,
        prerequisites: row.prerequisites,
        effects: row.effects,
        type: row.type
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Get default storylets (fallback)
   */
  getDefaultStorylets() {
    return [
      {
        storyletId: 'inciting_incident',
        title: 'The Call to Adventure',
        description: 'Something disrupts the ordinary',
        prerequisites: { quality: 'journey_begun', operator: 'not_has' },
        effects: [{ type: 'set_quality', quality: 'journey_begun', value: true }],
        type: 'progression',
        urgency: 10
      },
      {
        storyletId: 'first_test',
        title: 'Trial by Fire',
        description: 'An early challenge tests resolve',
        prerequisites: {
          all: [
            { quality: 'journey_begun', operator: 'has' },
            { quality: 'first_challenge_overcome', operator: 'not_has' }
          ]
        },
        effects: [{ type: 'set_quality', quality: 'first_challenge_overcome', value: true }],
        type: 'progression',
        urgency: 9
      },
      {
        storyletId: 'exploration',
        title: 'Uncharted Territory',
        description: 'Discover new aspects of the journey',
        prerequisites: { quality: 'journey_begun', operator: 'has' },
        effects: [{ type: 'increment_quality', quality: 'areas_explored', amount: 1 }],
        type: 'exploration',
        urgency: 5
      }
    ];
  }

  /**
   * Get default qualities for new character
   */
  getDefaultQualities() {
    return {
      journey_begun: false,
      first_challenge_overcome: false,
      quests_completed: 0,
      current_act: 1,
      total_qualities: 0,
      progression_stage: 1
    };
  }

  /**
   * Create qualities table if missing
   */
  async createQualitiesTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS character_qualities (
        id SERIAL PRIMARY KEY,
        character_id INTEGER NOT NULL,
        quality_name VARCHAR(100) NOT NULL,
        quality_value DECIMAL DEFAULT 0,
        quality_type VARCHAR(20) DEFAULT 'boolean',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(character_id, quality_name)
      )
    `;

    try {
      await pool.query(query);
      console.log('[StoryletSystem] Created character_qualities table');
    } catch (error) {
      console.error('[StoryletSystem] Failed to create table:', error.message);
    }
  }

  /**
   * Create completions tracking table
   */
  async createCompletionsTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS storylet_completions (
        id SERIAL PRIMARY KEY,
        character_id INTEGER NOT NULL,
        storylet_id VARCHAR(100) NOT NULL,
        completed_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(character_id, storylet_id)
      )
    `;

    try {
      await pool.query(query);
      console.log('[StoryletSystem] Created storylet_completions table');
    } catch (error) {
      console.error('[StoryletSystem] Failed to create completions table');
    }
  }

  /**
   * Get narrative anchors (callbacks to core themes)
   * From Research.md: "Reference [core themes] every 4-6 major story beats"
   */
  async getNarrativeAnchors(characterId) {
    const qualities = await this.getCharacterQualities(characterId);
    const questsCompleted = qualities.quests_completed || 0;

    // Every 5 quests, anchor to a core theme
    if (questsCompleted % 5 === 0 && questsCompleted > 0) {
      const themeIndex = Math.floor(questsCompleted / 5) % this.coreThemes.length;
      return this.coreThemes[themeIndex];
    }

    return null;
  }
}

module.exports = new StoryletSystem();
