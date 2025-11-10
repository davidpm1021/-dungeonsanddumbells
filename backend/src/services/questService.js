const pool = require('./config/database');
const storyCoordinator = require('./agents/storyCoordinator');
const questCreator = require('./agents/questCreator');
const lorekeeper = require('./agents/lorekeeper');
const memoryManager = require('./memoryManager');

/**
 * Quest Service
 *
 * Orchestrates the entire quest generation pipeline:
 * 1. Story Coordinator decides if quest is needed
 * 2. Quest Creator generates the quest
 * 3. Lorekeeper validates against World Bible
 * 4. If validation fails, regenerate or use fallback
 * 5. Store quest in database
 * 6. Record narrative event
 */

class QuestService {
  /**
   * Generate a new quest for a character
   *
   * @param {number} characterId
   * @returns {Promise<Object>} - Generated and validated quest
   */
  async generateQuest(characterId) {
    try {
      console.log(`[QuestService] Starting quest generation for character ${characterId}`);

      // Get character data
      const character = await this.getCharacter(characterId);
      if (!character) {
        throw new Error('Character not found');
      }

      // Get active quest count
      const activeQuestCount = await this.getActiveQuestCount(characterId);

      // Step 1: Story Coordinator decides if quest is needed
      const decision = await storyCoordinator.evaluateQuestNeed(
        characterId,
        character,
        activeQuestCount
      );

      if (!decision.needsQuest) {
        console.log('[QuestService] Story Coordinator decided no quest is needed');
        return {
          success: false,
          reason: decision.reasoning,
          decision
        };
      }

      console.log('[QuestService] Story Coordinator approved quest:', {
        type: decision.questType,
        theme: decision.suggestedTheme,
        difficulty: decision.suggestedDifficulty
      });

      // Step 2: Quest Creator generates the quest
      const generatedQuest = await questCreator.generateQuest(decision, character, characterId);

      console.log('[QuestService] Quest generated:', generatedQuest.title);

      // Step 3: Lorekeeper validates the quest
      const validation = await lorekeeper.validateQuest(generatedQuest, character, characterId);

      console.log('[QuestService] Quest validated:', {
        score: validation.score,
        passed: validation.passed
      });

      // If validation fails critically (score < 70), regenerate once
      if (validation.score < 70 && !generatedQuest.metadata.fallback) {
        console.log('[QuestService] Quest failed validation, regenerating...');

        // Try once more
        const regeneratedQuest = await questCreator.generateQuest(decision, character, characterId);
        const revalidation = await lorekeeper.validateQuest(regeneratedQuest, character, characterId);

        if (revalidation.score >= 70) {
          console.log('[QuestService] Regenerated quest passed validation');
          return await this.storeQuest(characterId, regeneratedQuest, decision, revalidation);
        } else {
          console.log('[QuestService] Regeneration failed, using fallback');
          const fallbackQuest = questCreator.getFallbackQuest(decision, character);
          const fallbackValidation = await lorekeeper.validateQuest(fallbackQuest, character, characterId);
          return await this.storeQuest(characterId, fallbackQuest, decision, fallbackValidation);
        }
      }

      // Store quest in database
      return await this.storeQuest(characterId, generatedQuest, decision, validation);

    } catch (error) {
      console.error('[QuestService] Error generating quest:', error.message);
      throw error;
    }
  }

  /**
   * Store quest in database
   *
   * @param {number} characterId
   * @param {Object} quest - Quest data
   * @param {Object} decision - Story Coordinator decision
   * @param {Object} validation - Lorekeeper validation
   * @returns {Promise<Object>} - Stored quest with ID
   */
  async storeQuest(characterId, quest, decision, validation) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Calculate expiration (7 days from now)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      // Insert quest
      const questResult = await client.query(
        `INSERT INTO quests (
          character_id, title, description, quest_type, difficulty,
          npc_involved, theme, prerequisites, effects,
          estimated_duration, gold_reward, item_reward,
          generated_by_ai, validation_score, generation_prompt,
          expires_at, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        RETURNING *`,
        [
          characterId,
          quest.title,
          quest.description,
          decision.questType || 'side',
          decision.suggestedDifficulty || 'medium',
          quest.npcInvolved || null,
          decision.suggestedTheme || null,
          JSON.stringify(quest.prerequisites || {}),
          JSON.stringify(quest.effects || {}),
          quest.estimatedDuration || '1 day',
          quest.goldReward || 0,
          quest.itemReward || null,
          !quest.metadata?.fallback,
          validation.score,
          quest.metadata?.generationPrompt || null,
          expiresAt,
          'available'
        ]
      );

      const storedQuest = questResult.rows[0];

      // Insert objectives
      for (let i = 0; i < quest.objectives.length; i++) {
        const obj = quest.objectives[i];
        await client.query(
          `INSERT INTO quest_objectives (
            quest_id, description, order_index, goal_mapping,
            stat_reward, xp_reward
          ) VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            storedQuest.id,
            obj.description,
            i,
            obj.goalMapping,
            obj.statReward,
            obj.xpReward
          ]
        );
      }

      // Initialize progress tracking
      await client.query(
        `INSERT INTO quest_progress (
          quest_id, objectives_completed, objectives_total, percentage
        ) VALUES ($1, $2, $3, $4)`,
        [storedQuest.id, 0, quest.objectives.length, 0]
      );

      // Record narrative event
      await client.query(
        `INSERT INTO narrative_events (
          character_id, event_type, event_description,
          participants, stat_changes, quest_id
        ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          characterId,
          'quest_offered',
          `You've been offered a new quest: "${quest.title}". ${quest.description}`,
          quest.npcInvolved ? [quest.npcInvolved] : [],
          JSON.stringify({}),
          storedQuest.id
        ]
      );

      await client.query('COMMIT');

      console.log(`[QuestService] Quest stored successfully: ${storedQuest.id}`);

      return {
        success: true,
        quest: storedQuest,
        objectives: quest.objectives,
        validation: {
          score: validation.score,
          passed: validation.passed,
          violations: validation.violations,
          suggestions: validation.suggestions
        },
        metadata: {
          decision,
          ...quest.metadata,
          ...validation.metadata
        }
      };

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get character by ID
   */
  async getCharacter(characterId) {
    const result = await pool.query(
      'SELECT * FROM characters WHERE id = $1',
      [characterId]
    );
    return result.rows[0];
  }

  /**
   * Get active quest count for character
   */
  async getActiveQuestCount(characterId) {
    const result = await pool.query(
      `SELECT COUNT(*) as count FROM quests
       WHERE character_id = $1 AND status IN ('available', 'active')`,
      [characterId]
    );
    return parseInt(result.rows[0].count);
  }

  /**
   * Get all quests for a character
   *
   * @param {number} characterId
   * @param {string} status - Filter by status (optional)
   * @returns {Promise<Array>} - Array of quests with objectives
   */
  async getQuests(characterId, status = null) {
    let query = `
      SELECT q.*,
        json_agg(
          json_build_object(
            'id', qo.id,
            'description', qo.description,
            'order_index', qo.order_index,
            'goal_mapping', qo.goal_mapping,
            'stat_reward', qo.stat_reward,
            'xp_reward', qo.xp_reward,
            'completed', qo.completed,
            'completed_at', qo.completed_at
          ) ORDER BY qo.order_index
        ) as objectives
      FROM quests q
      LEFT JOIN quest_objectives qo ON q.id = qo.quest_id
      WHERE q.character_id = $1
    `;

    const params = [characterId];

    if (status) {
      query += ' AND q.status = $2';
      params.push(status);
    }

    query += ' GROUP BY q.id ORDER BY q.created_at DESC';

    const result = await pool.query(query, params);
    return result.rows;
  }

  /**
   * Get a single quest by ID
   *
   * @param {number} questId
   * @param {number} characterId - For authorization
   * @returns {Promise<Object>} - Quest with objectives
   */
  async getQuest(questId, characterId) {
    const result = await pool.query(
      `SELECT q.*,
        json_agg(
          json_build_object(
            'id', qo.id,
            'description', qo.description,
            'order_index', qo.order_index,
            'goal_mapping', qo.goal_mapping,
            'stat_reward', qo.stat_reward,
            'xp_reward', qo.xp_reward,
            'completed', qo.completed,
            'completed_at', qo.completed_at
          ) ORDER BY qo.order_index
        ) as objectives
      FROM quests q
      LEFT JOIN quest_objectives qo ON q.id = qo.quest_id
      WHERE q.id = $1 AND q.character_id = $2
      GROUP BY q.id`,
      [questId, characterId]
    );

    if (result.rows.length === 0) {
      throw new Error('Quest not found');
    }

    return result.rows[0];
  }

  /**
   * Start a quest
   *
   * @param {number} questId
   * @param {number} characterId - For authorization
   * @returns {Promise<Object>} - Updated quest
   */
  async startQuest(questId, characterId) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Update quest status
      const result = await client.query(
        `UPDATE quests
         SET status = 'active', started_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND character_id = $2 AND status = 'available'
         RETURNING *`,
        [questId, characterId]
      );

      if (result.rows.length === 0) {
        throw new Error('Quest not found or already started');
      }

      const quest = result.rows[0];

      // Record narrative event
      await client.query(
        `INSERT INTO narrative_events (
          character_id, event_type, event_description,
          quest_id, stat_changes
        ) VALUES ($1, $2, $3, $4, $5)`,
        [
          characterId,
          'quest_started',
          `You've begun the quest: "${quest.title}".`,
          questId,
          JSON.stringify({})
        ]
      );

      await client.query('COMMIT');

      console.log(`[QuestService] Quest ${questId} started by character ${characterId}`);

      return quest;

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Complete a quest objective
   *
   * @param {number} questId
   * @param {number} objectiveId
   * @param {number} characterId - For authorization
   * @returns {Promise<Object>} - Completion result with rewards
   */
  async completeObjective(questId, objectiveId, characterId) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Verify quest belongs to character
      const questCheck = await client.query(
        'SELECT * FROM quests WHERE id = $1 AND character_id = $2',
        [questId, characterId]
      );

      if (questCheck.rows.length === 0) {
        throw new Error('Quest not found');
      }

      // Get objective
      const objResult = await client.query(
        `SELECT * FROM quest_objectives
         WHERE id = $1 AND quest_id = $2 AND completed = false`,
        [objectiveId, questId]
      );

      if (objResult.rows.length === 0) {
        throw new Error('Objective not found or already completed');
      }

      const objective = objResult.rows[0];

      // Mark objective as completed
      await client.query(
        `UPDATE quest_objectives
         SET completed = true, completed_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [objectiveId]
      );

      // Award stat and XP
      const statReward = objective.stat_reward.toLowerCase();
      await client.query(
        `UPDATE characters
         SET ${statReward} = ${statReward} + 1,
             xp = xp + $1
         WHERE id = $2`,
        [objective.xp_reward, characterId]
      );

      // Update progress
      const progressResult = await client.query(
        `SELECT COUNT(*) as completed,
                (SELECT COUNT(*) FROM quest_objectives WHERE quest_id = $1) as total
         FROM quest_objectives
         WHERE quest_id = $1 AND completed = true`,
        [questId]
      );

      const completed = parseInt(progressResult.rows[0].completed);
      const total = parseInt(progressResult.rows[0].total);
      const percentage = Math.round((completed / total) * 100);

      await client.query(
        `UPDATE quest_progress
         SET objectives_completed = $1,
             percentage = $2,
             updated_at = CURRENT_TIMESTAMP
         WHERE quest_id = $3`,
        [completed, percentage, questId]
      );

      // Check if quest is fully completed
      let questCompleted = false;
      if (completed === total) {
        await client.query(
          `UPDATE quests
           SET status = 'completed', completed_at = CURRENT_TIMESTAMP
           WHERE id = $1`,
          [questId]
        );
        questCompleted = true;

        // Award quest rewards
        const quest = questCheck.rows[0];
        if (quest.gold_reward > 0) {
          await client.query(
            'UPDATE characters SET gold = gold + $1 WHERE id = $2',
            [quest.gold_reward, characterId]
          );
        }

        // Apply quest effects (storylet system)
        if (quest.effects && Object.keys(quest.effects).length > 0) {
          await this.applyQuestEffects(client, characterId, quest.effects);
        }

        // Record completion event
        await client.query(
          `INSERT INTO narrative_events (
            character_id, event_type, event_description,
            quest_id, stat_changes
          ) VALUES ($1, $2, $3, $4, $5)`,
          [
            characterId,
            'quest_completed',
            `You've completed the quest: "${quest.title}"!`,
            questId,
            JSON.stringify({ [statReward]: 1 })
          ]
        );
      } else {
        // Record objective completion
        await client.query(
          `INSERT INTO narrative_events (
            character_id, event_type, event_description,
            quest_id, stat_changes
          ) VALUES ($1, $2, $3, $4, $5)`,
          [
            characterId,
            'objective_completed',
            `You've completed: ${objective.description}`,
            questId,
            JSON.stringify({ [statReward]: 1 })
          ]
        );
      }

      await client.query('COMMIT');

      console.log(`[QuestService] Objective ${objectiveId} completed for quest ${questId}`);

      return {
        success: true,
        objective,
        rewards: {
          stat: objective.stat_reward,
          xp: objective.xp_reward
        },
        progress: {
          completed,
          total,
          percentage
        },
        questCompleted
      };

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Apply quest effects (storylet system)
   *
   * @param {Object} client - Database client
   * @param {number} characterId
   * @param {Object} effects - Effects object from quest
   */
  async applyQuestEffects(client, characterId, effects) {
    // Set qualities (persistent flags)
    if (effects.set_quality) {
      for (const [key, value] of Object.entries(effects.set_quality)) {
        await client.query(
          `INSERT INTO character_qualities (character_id, quality_name, quality_value)
           VALUES ($1, $2, $3)
           ON CONFLICT (character_id, quality_name)
           DO UPDATE SET quality_value = $3`,
          [characterId, key, value]
        );
      }
    }

    // Unlock locations
    if (effects.unlock_location) {
      // Add to unlocked_locations array in world_state
      await client.query(
        `UPDATE world_state
         SET unlocked_locations = array_append(unlocked_locations, $1),
             updated_at = CURRENT_TIMESTAMP
         WHERE character_id = $2
           AND NOT ($1 = ANY(unlocked_locations))`,
        [effects.unlock_location, characterId]
      );

      // Also set quality flag
      await client.query(
        `INSERT INTO character_qualities (character_id, quality_name, quality_value)
         VALUES ($1, $2, $3)
         ON CONFLICT (character_id, quality_name)
         DO UPDATE SET quality_value = $3`,
        [characterId, `location_unlocked_${effects.unlock_location}`, 1]
      );
    }

    // NPC relationships (stored in world_state JSONB)
    if (effects.npc_relationship) {
      for (const [npcName, relationship] of Object.entries(effects.npc_relationship)) {
        await client.query(
          `UPDATE world_state
           SET npc_relationships = jsonb_set(
             npc_relationships,
             $1::text[],
             $2::jsonb,
             true
           ),
           updated_at = CURRENT_TIMESTAMP
           WHERE character_id = $3`,
          [[npcName], JSON.stringify(relationship), characterId]
        );
      }
    }
  }

  /**
   * Get quest from template
   *
   * @param {string} templateName
   * @param {number} characterId
   * @returns {Promise<Object>} - Generated quest from template
   */
  async generateFromTemplate(templateName, characterId) {
    try {
      const character = await this.getCharacter(characterId);
      const quest = await questCreator.generateFromTemplate(templateName, characterId);

      // Simple validation for template quests (no AI needed)
      const validation = {
        score: 100,
        passed: true,
        violations: [],
        suggestions: [],
        strengths: ['Handwritten template quest']
      };

      const decision = {
        questType: quest.questType,
        suggestedDifficulty: quest.difficulty,
        suggestedTheme: quest.theme,
        reasoning: `Template quest: ${templateName}`
      };

      return await this.storeQuest(characterId, quest, decision, validation);

    } catch (error) {
      console.error('[QuestService] Error generating from template:', error.message);
      throw error;
    }
  }
}

module.exports = new QuestService();
