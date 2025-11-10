const claudeAPI = require('../claudeAPI');
const modelRouter = require('../modelRouter');
const promptBuilder = require('../promptBuilder');

/**
 * Story Coordinator Agent
 *
 * Makes high-level narrative decisions:
 * - Does the player need a new quest?
 * - What type of quest (main, side, corrective)?
 * - What theme and difficulty?
 * - Which stat to target (for corrective quests)?
 *
 * This is the "brain" that orchestrates the narrative flow.
 */

class StoryCoordinator {
  /**
   * Evaluate if character needs a new quest
   *
   * @param {number} characterId
   * @param {Object} character - Character data with stats
   * @param {number} activeQuestCount - Number of currently active quests
   * @returns {Promise<Object>} - Decision object
   */
  async evaluateQuestNeed(characterId, character, activeQuestCount) {
    try {
      // Build prompt with full context
      const { system, messages } = await promptBuilder.build({
        agentType: 'story_coordinator',
        characterId,
        character,
        context: {
          activeQuestCount
        },
        includeWorldBible: true,
        includeMemory: true
      });

      // Select model (Story Coordinator uses Sonnet 4.5 for strategic decisions)
      const model = modelRouter.getModelForAgent('story_coordinator');

      // Call Claude API
      const response = await claudeAPI.call({
        model,
        system,
        messages,
        maxTokens: 512,
        temperature: 0.5, // Balanced creativity/consistency
        agentType: 'story_coordinator',
        characterId,
        useCache: true
      });

      // Parse JSON response
      const decision = JSON.parse(response.content);

      // Validate response structure
      this.validateDecision(decision);

      console.log('[StoryCoordinator] Decision:', {
        needsQuest: decision.needsQuest,
        type: decision.questType,
        theme: decision.suggestedTheme
      });

      return {
        ...decision,
        metadata: {
          model: response.model,
          latency: response.latency,
          cost: response.cost,
          cached: response.cached
        }
      };

    } catch (error) {
      console.error('[StoryCoordinator] Error:', error.message);

      // Fallback decision if AI fails
      return this.getFallbackDecision(character, activeQuestCount);
    }
  }

  /**
   * Decide what type of content the player needs
   *
   * @param {number} characterId
   * @param {Object} character
   * @returns {Promise<Object>} - Content decision
   */
  async decideContentType(characterId, character) {
    // For now, delegate to evaluateQuestNeed
    // In future, this could also decide between quests, events, NPC interactions, etc.
    const decision = await this.evaluateQuestNeed(characterId, character, 0);
    return decision;
  }

  /**
   * Validate decision structure
   */
  validateDecision(decision) {
    if (typeof decision.needsQuest !== 'boolean') {
      throw new Error('Invalid decision: needsQuest must be boolean');
    }

    if (decision.needsQuest) {
      const validTypes = ['main', 'side', 'corrective'];
      if (!validTypes.includes(decision.questType)) {
        throw new Error(`Invalid decision: questType must be one of ${validTypes.join(', ')}`);
      }

      const validDifficulties = ['easy', 'medium', 'hard'];
      if (!validDifficulties.includes(decision.suggestedDifficulty)) {
        throw new Error(`Invalid decision: suggestedDifficulty must be one of ${validDifficulties.join(', ')}`);
      }

      if (!decision.suggestedTheme || typeof decision.suggestedTheme !== 'string') {
        throw new Error('Invalid decision: suggestedTheme is required and must be a string');
      }

      if (!decision.reasoning || typeof decision.reasoning !== 'string') {
        throw new Error('Invalid decision: reasoning is required and must be a string');
      }

      if (decision.questType === 'corrective') {
        const validStats = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];
        if (!decision.targetStat || !validStats.includes(decision.targetStat)) {
          throw new Error(`Invalid decision: corrective quests must have targetStat (${validStats.join(', ')})`);
        }
      }
    }
  }

  /**
   * Get fallback decision if AI fails
   */
  getFallbackDecision(character, activeQuestCount) {
    // Simple rule-based fallback
    const needsQuest = activeQuestCount < 3;

    if (!needsQuest) {
      return {
        needsQuest: false,
        reasoning: 'Player has enough active quests',
        metadata: { fallback: true }
      };
    }

    // Check for stat imbalance
    const stats = {
      STR: character.str || 10,
      DEX: character.dex || 10,
      CON: character.con || 10,
      INT: character.int || 10,
      WIS: character.wis || 10,
      CHA: character.cha || 10
    };

    const avg = Object.values(stats).reduce((a, b) => a + b, 0) / 6;
    const lowestStat = Object.entries(stats).reduce((a, b) => b[1] < a[1] ? b : a);

    // Corrective quest if stat is 5+ points below average
    if (avg - lowestStat[1] >= 5) {
      return {
        needsQuest: true,
        questType: 'corrective',
        suggestedTheme: `Strengthen your ${lowestStat[0]} through focused training`,
        suggestedDifficulty: 'medium',
        targetStat: lowestStat[0],
        reasoning: `${lowestStat[0]} is significantly below other stats`,
        metadata: { fallback: true }
      };
    }

    // Default side quest
    return {
      needsQuest: true,
      questType: 'side',
      suggestedTheme: 'Personal growth and adventure',
      suggestedDifficulty: 'medium',
      reasoning: 'Generate general side quest',
      metadata: { fallback: true }
    };
  }

  /**
   * Analyze character progression for insights
   *
   * @param {number} characterId
   * @param {Object} character
   * @returns {Promise<Object>} - Analysis insights
   */
  async analyzeProgression(characterId, character) {
    const stats = {
      STR: character.str || 10,
      DEX: character.dex || 10,
      CON: character.con || 10,
      INT: character.int || 10,
      WIS: character.wis || 10,
      CHA: character.cha || 10
    };

    const totalStats = Object.values(stats).reduce((a, b) => a + b, 0);
    const level = Math.floor((totalStats - 60) / 6);
    const avg = totalStats / 6;

    const highest = Object.entries(stats).reduce((a, b) => b[1] > a[1] ? b : a);
    const lowest = Object.entries(stats).reduce((a, b) => b[1] < a[1] ? b : a);

    const variance = Object.values(stats).reduce((sum, stat) =>
      sum + Math.pow(stat - avg, 2), 0) / 6;
    const stdDev = Math.sqrt(variance);

    return {
      level,
      totalStats,
      averageStat: avg,
      balance: {
        standardDeviation: stdDev,
        assessment: stdDev < 2 ? 'balanced' : stdDev < 4 ? 'mostly_balanced' : 'imbalanced'
      },
      highest: {
        stat: highest[0],
        value: highest[1]
      },
      lowest: {
        stat: lowest[0],
        value: lowest[1]
      },
      gap: highest[1] - lowest[1]
    };
  }
}

module.exports = new StoryCoordinator();
