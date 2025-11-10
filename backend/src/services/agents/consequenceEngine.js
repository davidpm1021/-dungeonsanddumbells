const claudeAPI = require('../claudeAPI');
const modelRouter = require('../modelRouter');
const promptBuilder = require('../promptBuilder');
const { WORLD_BIBLE } = require('../../data/worldBible');

/**
 * Consequence Engine Agent
 *
 * Generates narrative outcomes for completed or failed quests.
 * Must reference past events and create logical cause-and-effect chains.
 *
 * Key responsibilities:
 * - Generate engaging narrative outcomes
 * - Reference player's past decisions and actions
 * - Maintain consistent NPC relationships
 * - Create logical consequences (positive or negative)
 * - Set up hooks for future quests
 */

class ConsequenceEngine {
  /**
   * Generate outcome for a completed quest
   *
   * @param {Object} quest - Completed quest data
   * @param {Object} character - Character data
   * @param {number} characterId - Character ID
   * @param {Array} recentMemories - Recent narrative events for context
   * @returns {Promise<Object>} - Narrative outcome
   */
  async generateOutcome(quest, character, characterId, recentMemories = []) {
    try {
      console.log('[ConsequenceEngine] Generating outcome for:', quest.title);

      // Build prompt with memory context
      const { system, messages } = await promptBuilder.build({
        agentType: 'consequence_engine',
        characterId,
        character,
        context: {
          quest,
          recentMemories
        },
        includeWorldBible: true,
        includeMemory: true
      });

      // Select model (Consequence Engine uses Sonnet 4 for quality outcomes)
      const model = modelRouter.getModelForAgent('consequence_engine');

      // Call Claude API
      const response = await claudeAPI.call({
        model,
        system,
        messages,
        maxTokens: 768,
        temperature: 0.7, // Balanced creativity for outcomes
        agentType: 'consequence_engine',
        characterId,
        useCache: false // Each outcome is unique
      });

      // Parse JSON response (strip markdown code blocks if present)
      const cleanedContent = this.extractJSON(response.content);
      const outcomeData = JSON.parse(cleanedContent);

      // Validate outcome structure
      this.validateOutcome(outcomeData);

      console.log('[ConsequenceEngine] Outcome generated successfully');

      return {
        ...outcomeData,
        metadata: {
          model: response.model,
          latency: response.latency,
          cost: response.cost,
          questCompleted: quest.id
        }
      };

    } catch (error) {
      console.error('[ConsequenceEngine] Error generating outcome:', error.message);

      // Fallback to simple outcome
      return this.getFallbackOutcome(quest, character);
    }
  }

  /**
   * Extract JSON from response (handles markdown code blocks)
   */
  extractJSON(content) {
    // Remove markdown code blocks if present
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      return jsonMatch[1].trim();
    }

    // Also handle plain ``` blocks
    const codeMatch = content.match(/```\s*([\s\S]*?)\s*```/);
    if (codeMatch) {
      return codeMatch[1].trim();
    }

    // Return as-is if no code blocks found
    return content.trim();
  }

  /**
   * Validate outcome structure
   */
  validateOutcome(outcome) {
    if (!outcome.narrativeText || typeof outcome.narrativeText !== 'string') {
      throw new Error('Invalid outcome: narrativeText is required');
    }

    const wordCount = outcome.narrativeText.split(' ').length;
    if (wordCount < 50 || wordCount > 300) {
      throw new Error('Invalid outcome: narrativeText must be 50-300 words');
    }

    if (!Array.isArray(outcome.npcInteractions)) {
      throw new Error('Invalid outcome: npcInteractions must be an array');
    }

    if (!Array.isArray(outcome.worldStateChanges)) {
      throw new Error('Invalid outcome: worldStateChanges must be an array');
    }

    if (!Array.isArray(outcome.futurePlotHooks)) {
      throw new Error('Invalid outcome: futurePlotHooks must be an array');
    }
  }

  /**
   * Get fallback outcome if AI fails
   */
  getFallbackOutcome(quest, character) {
    const questTitle = quest.title || 'your quest';
    const characterName = character.name || 'Adventurer';

    // Extract primary stat from quest
    const primaryStat = quest.objectives?.[0]?.statReward || 'STR';
    const statName = WORLD_BIBLE.six_pillars[primaryStat]?.name || 'Might';

    const narrativeText = `You've completed ${questTitle}, ${characterName}. ` +
      `Through dedication and effort, you've grown stronger in the Pillar of ${statName}. ` +
      `The citizens of Vitalia take notice of your progress. ` +
      `The path ahead is clearer now, and new opportunities await.`;

    return {
      narrativeText,
      npcInteractions: [],
      worldStateChanges: [],
      futurePlotHooks: [],
      metadata: {
        fallback: true,
        reason: 'AI generation failed'
      }
    };
  }

  /**
   * Generate outcome for a failed quest
   *
   * @param {Object} quest - Failed quest data
   * @param {Object} character - Character data
   * @param {number} characterId - Character ID
   * @returns {Promise<Object>} - Narrative outcome for failure
   */
  async generateFailureOutcome(quest, character, characterId) {
    try {
      console.log('[ConsequenceEngine] Generating failure outcome for:', quest.title);

      // Build prompt
      const { system, messages } = await promptBuilder.build({
        agentType: 'consequence_engine',
        characterId,
        character,
        context: {
          quest,
          questFailed: true
        },
        includeWorldBible: true,
        includeMemory: true
      });

      const model = modelRouter.getModelForAgent('consequence_engine');

      const response = await claudeAPI.call({
        model,
        system,
        messages,
        maxTokens: 512,
        temperature: 0.6, // Slightly lower for failure outcomes
        agentType: 'consequence_engine',
        characterId,
        useCache: false
      });

      const cleanedContent = this.extractJSON(response.content);
      const outcomeData = JSON.parse(cleanedContent);
      this.validateOutcome(outcomeData);

      console.log('[ConsequenceEngine] Failure outcome generated');

      return {
        ...outcomeData,
        metadata: {
          model: response.model,
          latency: response.latency,
          cost: response.cost,
          questFailed: quest.id
        }
      };

    } catch (error) {
      console.error('[ConsequenceEngine] Error generating failure outcome:', error.message);

      // Fallback for failed quest
      return {
        narrativeText: `Though you weren't able to complete ${quest.title || 'this quest'} this time, ` +
          `the attempt itself taught you valuable lessons. In Vitalia, setbacks are simply part ` +
          `of the journey. Tomorrow is a new day, and new opportunities await.`,
        npcInteractions: [],
        worldStateChanges: [],
        futurePlotHooks: [],
        metadata: {
          fallback: true,
          reason: 'AI generation failed'
        }
      };
    }
  }

  /**
   * Generate outcome for quest with custom choices
   * (Future enhancement - not used in MVP)
   *
   * @param {Object} quest - Quest data
   * @param {Object} character - Character data
   * @param {number} characterId - Character ID
   * @param {Array} choices - Player choices made during quest
   * @returns {Promise<Object>} - Branching narrative outcome
   */
  async generateBranchingOutcome(quest, character, characterId, choices) {
    // For MVP, treat as regular outcome
    // In future, this would handle choice-based branching
    return this.generateOutcome(quest, character, characterId);
  }

  /**
   * Extract stat rewards from quest objectives
   *
   * @param {Object} quest - Quest data
   * @returns {Object} - Stat-to-XP mapping
   */
  extractStatRewards(quest) {
    const rewards = {};

    if (quest.objectives && Array.isArray(quest.objectives)) {
      quest.objectives.forEach(obj => {
        const stat = obj.statReward || 'STR';
        const xp = obj.xpReward || 0;
        rewards[stat] = (rewards[stat] || 0) + xp;
      });
    }

    return rewards;
  }

  /**
   * Check if outcome references past events (for validation)
   *
   * @param {string} narrativeText - Outcome narrative
   * @param {Array} recentMemories - Recent events
   * @returns {boolean} - True if references past events
   */
  referencesPastEvents(narrativeText, recentMemories) {
    if (!recentMemories || recentMemories.length === 0) {
      return true; // No past events to reference yet
    }

    // Simple check: does narrative mention any NPCs or locations from past events?
    const keywords = new Set();

    recentMemories.forEach(memory => {
      if (memory.participants) {
        memory.participants.forEach(p => keywords.add(p.toLowerCase()));
      }
    });

    const text = narrativeText.toLowerCase();

    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        return true;
      }
    }

    return false;
  }
}

module.exports = new ConsequenceEngine();
