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

      // Fetch recent quest titles to avoid repetition (last 5 quests)
      const recentTitles = await this.getRecentQuestTitles(characterId, 5);

      // Retrieve relevant past events via RAG (Research: 41.8% fewer hallucinations)
      const narrativeRAG = require('../narrativeRAG');
      let relevantEvents = [];
      try {
        const rawEvents = await narrativeRAG.retrieveRelevantEvents(
          characterId,
          decision.suggestedTheme, // Use quest theme as query
          5 // Top 5 most relevant events
        );
        relevantEvents = rawEvents;
        console.log('[QuestCreator] Retrieved', relevantEvents.length, 'relevant past events via RAG');
      } catch (ragError) {
        console.error('[QuestCreator] RAG retrieval failed (non-fatal):', ragError.message);
      }

      // Build context for quest generation (INCLUDE USER GOALS!)
      const context = {
        questType: decision.questType,
        difficulty: decision.suggestedDifficulty,
        theme: decision.suggestedTheme,
        targetStat: decision.targetStat,
        userGoals: decision.userGoals || [], // User's actual wellness goals
        recentQuestTitles: recentTitles, // Enforce variety
        relevantPastEvents: relevantEvents, // RAG-retrieved context
        varietyConstraints: [
          'DO NOT use generic titles like "The Awakening", "Awakening Trial", or "The Beginning"',
          'Create unique, specific titles that reflect the quest content',
          'Avoid repeating patterns from recent quests'
        ]
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

      console.log('[QuestCreator] About to call Claude API with', context.userGoals?.length || 0, 'user goals');

      // Call Claude API
      const response = await claudeAPI.call({
        model,
        system,
        messages,
        maxTokens: 1024,
        temperature: 0.5, // Research-informed: 0.3-0.5 for consistency-critical tasks
        agentType: 'quest_creator',
        characterId,
        useCache: false // Don't cache quests (each should be unique)
      });

      console.log('[QuestCreator] Claude response received, length:', response.content?.length);
      console.log('[QuestCreator] First 500 chars:', response.content?.substring(0, 500));

      // Parse JSON response - strip markdown code blocks if present
      let jsonContent = response.content.trim();

      // More robust markdown fence removal - handle various formats
      if (jsonContent.startsWith('```')) {
        // Use multiline regex to remove markdown fences
        // Matches: ```json\n{...}\n``` or ```\n{...}\n``` or ``` json{...}```
        jsonContent = jsonContent.replace(/^```[a-z]*\n?/i, '').replace(/\n?```\s*$/i, '');
        jsonContent = jsonContent.trim();

        console.log('[QuestCreator] Stripped markdown fences, first 200 chars:', jsonContent.substring(0, 200));
      }

      // Final validation - check if it starts with { or [
      if (!jsonContent.startsWith('{') && !jsonContent.startsWith('[')) {
        console.error('[QuestCreator] Content does not start with JSON:', jsonContent.substring(0, 100));
        throw new Error('Response does not appear to be valid JSON');
      }

      const questData = JSON.parse(jsonContent);

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
      console.error('[QuestCreator] Full error:', error);
      console.error('[QuestCreator] Stack:', error.stack);

      // Fallback to template-based quest
      return this.getFallbackQuest(decision, character);
    }
  }

  /**
   * Validate quest structure (narrative-first)
   */
  validateQuest(quest) {
    // Title validation
    if (!quest.title || typeof quest.title !== 'string') {
      throw new Error('Invalid quest: title is required');
    }

    if (quest.title.length > 100) {
      throw new Error('Invalid quest: title exceeds 100 characters');
    }

    // Opening scene validation (narrative-first!)
    if (!quest.openingScene || typeof quest.openingScene !== 'string') {
      throw new Error('Invalid quest: openingScene is required (narrative-first approach)');
    }

    const sceneWords = quest.openingScene.split(' ').length;
    if (sceneWords < 50) {
      console.warn('[QuestCreator] Opening scene is too short, needs more narrative depth');
    }

    // Description validation (quest log summary)
    if (!quest.description || typeof quest.description !== 'string') {
      throw new Error('Invalid quest: description is required');
    }

    // NPC dialogue validation
    if (!quest.npcDialogue || !quest.npcDialogue.npcName || !quest.npcDialogue.opening) {
      console.warn('[QuestCreator] Missing or incomplete NPC dialogue - quest may lack personality');
    }

    // Objectives validation
    if (!Array.isArray(quest.objectives) || quest.objectives.length === 0) {
      throw new Error('Invalid quest: objectives must be a non-empty array');
    }

    quest.objectives.forEach((obj, i) => {
      // Narrative description (story framing)
      if (!obj.narrativeDescription || typeof obj.narrativeDescription !== 'string') {
        console.warn(`[QuestCreator] Objective ${i} missing narrativeDescription`);
      }

      // Mechanical description (what they actually do)
      if (!obj.mechanicalDescription || typeof obj.mechanicalDescription !== 'string') {
        console.warn(`[QuestCreator] Objective ${i} missing mechanicalDescription`);
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

  /**
   * Get recent quest titles to enforce variety
   *
   * @param {number} characterId - Character ID
   * @param {number} limit - Number of recent quests to fetch
   * @returns {Promise<string[]>} - Array of recent quest titles
   */
  async getRecentQuestTitles(characterId, limit = 5) {
    const pool = require('../../config/database');

    try {
      const result = await pool.query(
        `SELECT title
         FROM quests
         WHERE character_id = $1
         ORDER BY created_at DESC
         LIMIT $2`,
        [characterId, limit]
      );

      return result.rows.map(row => row.title);
    } catch (error) {
      console.error('[QuestCreator] Error fetching recent quest titles:', error.message);
      return []; // Return empty array on error
    }
  }
}

module.exports = new QuestCreator();
