const claudeAPI = require('../claudeAPI');
const modelRouter = require('../modelRouter');
const promptBuilder = require('../promptBuilder');
const { WORLD_BIBLE } = require('../../data/worldBible');

/**
 * Quest Creator Agent
 *
 * Generates compelling narrative quests that map to real-world wellness goals.
 * Each quest must:
 * - Feel like an authentic fantasy adventure
 * - Map clearly to wellness activities (STR, DEX, CON, INT, WIS, CHA)
 * - Match player's current level and stat distribution
 * - Reference established world lore and NPCs
 * - Encourage balanced stat growth
 */

class QuestCreator {
  /**
   * Generate a quest based on Story Coordinator's decision
   *
   * @param {Object} decision - Decision from Story Coordinator
   * @param {Object} character - Character data
   * @param {number} characterId - Character ID
   * @returns {Promise<Object>} - Generated quest data
   */
  async generateQuest(decision, character, characterId) {
    try {
      console.log('[QuestCreator] Generating quest:', {
        type: decision.questType,
        theme: decision.suggestedTheme,
        difficulty: decision.suggestedDifficulty,
        targetStat: decision.targetStat
      });

      // Build context for quest generation
      const context = {
        questType: decision.questType,
        difficulty: decision.suggestedDifficulty,
        theme: decision.suggestedTheme,
        targetStat: decision.targetStat
      };

      // Build prompt
      const { system, messages } = await promptBuilder.build({
        agentType: 'quest_creator',
        characterId,
        character,
        context,
        includeWorldBible: true,
        includeMemory: true
      });

      // Select model (Quest Creator uses Sonnet 3.5 for content generation)
      const model = modelRouter.getModelForAgent('quest_creator');

      // Call Claude API
      const response = await claudeAPI.call({
        model,
        system,
        messages,
        maxTokens: 1024,
        temperature: 0.8, // Higher creativity for quest generation
        agentType: 'quest_creator',
        characterId,
        useCache: false // Don't cache quests (each should be unique)
      });

      // Parse JSON response
      const questData = JSON.parse(response.content);

      // Validate quest structure
      this.validateQuest(questData);

      console.log('[QuestCreator] Quest generated successfully:', questData.title);

      return {
        ...questData,
        // Ensure difficulty is set from decision (AI sometimes omits it)
        difficulty: questData.difficulty || decision.suggestedDifficulty || 'medium',
        questType: questData.questType || decision.questType || 'side',
        metadata: {
          model: response.model,
          latency: response.latency,
          cost: response.cost,
          decision: {
            questType: decision.questType,
            targetStat: decision.targetStat,
            reasoning: decision.reasoning
          },
          generationPrompt: JSON.stringify({ system, messages }) // Store for debugging
        }
      };

    } catch (error) {
      console.error('[QuestCreator] Error generating quest:', error.message);

      // Fallback to template-based quest
      return this.getFallbackQuest(decision, character);
    }
  }

  /**
   * Validate quest structure
   */
  validateQuest(quest) {
    // Title validation
    if (!quest.title || typeof quest.title !== 'string') {
      throw new Error('Invalid quest: title is required');
    }

    if (quest.title.length > 100) {
      throw new Error('Invalid quest: title exceeds 100 characters');
    }

    // Description validation
    if (!quest.description || typeof quest.description !== 'string') {
      throw new Error('Invalid quest: description is required');
    }

    const descWords = quest.description.split(' ').length;
    if (descWords < 10 || descWords > 100) {
      throw new Error('Invalid quest: description must be 10-100 words');
    }

    // Check for second person, present tense
    if (!quest.description.toLowerCase().includes('you')) {
      console.warn('[QuestCreator] Description may not be in second person');
    }

    // Objectives validation
    if (!Array.isArray(quest.objectives) || quest.objectives.length === 0) {
      throw new Error('Invalid quest: objectives must be a non-empty array');
    }

    quest.objectives.forEach((obj, i) => {
      if (!obj.description || typeof obj.description !== 'string') {
        throw new Error(`Invalid quest: objective ${i} missing description`);
      }

      if (!obj.goalMapping || typeof obj.goalMapping !== 'string') {
        throw new Error(`Invalid quest: objective ${i} missing goalMapping`);
      }

      const validStats = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];
      if (!obj.statReward || !validStats.includes(obj.statReward)) {
        throw new Error(`Invalid quest: objective ${i} has invalid statReward`);
      }

      if (!obj.xpReward || typeof obj.xpReward !== 'number' || obj.xpReward < 1) {
        throw new Error(`Invalid quest: objective ${i} has invalid xpReward`);
      }
    });

    // Estimated duration
    if (!quest.estimatedDuration || typeof quest.estimatedDuration !== 'string') {
      throw new Error('Invalid quest: estimatedDuration is required');
    }
  }

  /**
   * Get fallback quest if AI fails
   */
  getFallbackQuest(decision, character) {
    const statNames = {
      STR: { name: 'Pillar of Might', activity: 'strength training' },
      DEX: { name: 'Pillar of Grace', activity: 'cardio or flexibility work' },
      CON: { name: 'Pillar of Endurance', activity: 'endurance training' },
      INT: { name: 'Pillar of Clarity', activity: 'reading or learning' },
      WIS: { name: 'Pillar of Serenity', activity: 'meditation or mindfulness' },
      CHA: { name: 'Pillar of Radiance', activity: 'social connection or self-care' }
    };

    const targetStat = decision.targetStat || this.getLowestStat(character);
    const pillar = statNames[targetStat];

    return {
      title: `Rediscover the ${pillar.name}`,
      description: `You sense a weakness in your connection to the ${pillar.name}. The kingdom needs you to be strong in all the ancient ways. Take time to strengthen this pillar through dedicated practice.`,
      objectives: [
        {
          description: `Complete a ${pillar.activity} session`,
          goalMapping: pillar.activity,
          statReward: targetStat,
          xpReward: decision.suggestedDifficulty === 'hard' ? 30 : decision.suggestedDifficulty === 'medium' ? 20 : 15
        }
      ],
      npcInvolved: null,
      estimatedDuration: '1 day',
      prerequisites: [],
      metadata: {
        fallback: true,
        decision: {
          questType: decision.questType,
          targetStat: targetStat,
          reasoning: 'Fallback quest due to AI generation failure'
        }
      }
    };
  }

  /**
   * Get lowest stat from character
   */
  getLowestStat(character) {
    const stats = {
      STR: character.str || 10,
      DEX: character.dex || 10,
      CON: character.con || 10,
      INT: character.int || 10,
      WIS: character.wis || 10,
      CHA: character.cha || 10
    };

    return Object.entries(stats).reduce((a, b) => b[1] < a[1] ? b : a)[0];
  }

  /**
   * Generate quest from template
   *
   * @param {string} templateName - Template identifier
   * @param {number} characterId - Character ID
   * @returns {Promise<Object>} - Quest data from template
   */
  async generateFromTemplate(templateName, characterId) {
    const pool = require('../../config/database');

    const result = await pool.query(
      `SELECT * FROM quest_templates WHERE template_name = $1 AND is_active = true`,
      [templateName]
    );

    if (result.rows.length === 0) {
      throw new Error(`Quest template not found: ${templateName}`);
    }

    const template = result.rows[0];

    return {
      title: template.title,
      description: template.description,
      questType: template.quest_type,
      difficulty: template.difficulty,
      npcInvolved: template.npc_involved,
      theme: template.theme,
      estimatedDuration: template.estimated_duration,
      objectives: template.objectives,
      goldReward: template.gold_reward,
      itemReward: template.item_reward,
      prerequisites: template.prerequisites,
      effects: template.effects,
      metadata: {
        fromTemplate: template.template_name,
        createdBy: template.created_by
      }
    };
  }

  /**
   * Enhance quest with narrative details
   * (Can be called after basic quest generation to add flavor)
   *
   * @param {Object} quest - Basic quest data
   * @param {Object} character - Character data
   * @param {number} characterId - Character ID
   * @returns {Promise<Object>} - Enhanced quest
   */
  async enhanceQuest(quest, character, characterId) {
    // For MVP, return as-is
    // In future, could use AI to add:
    // - Flavor text for each objective
    // - Dynamic dialogue from NPCs
    // - Consequence branches based on choices
    return quest;
  }
}

module.exports = new QuestCreator();
