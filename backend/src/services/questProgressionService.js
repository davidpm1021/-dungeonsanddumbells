/**
 * Quest Progression Service
 * Handles automatic quest progression when goals are completed
 * Reference: PRD Addendum - Phase 4: Goal-Quest Integration
 */

const pool = require('../config/database');
const memoryManager = require('./memoryManager');
const consequenceEngine = require('./agents/consequenceEngine');

/**
 * Called every time a goal is completed
 * Updates all quests that have objectives linked to this goal
 *
 * @param {number} characterId - Character ID
 * @param {number} goalId - Goal ID that was completed
 * @param {object} completionData - Data from goal completion (xp, value, notes)
 * @returns {Promise<object>} Quest updates and rewards
 */
async function onGoalCompleted(characterId, goalId, completionData) {
  try {
    console.log(`[QuestProgression] Goal ${goalId} completed for character ${characterId}`);

    // Get the goal details
    const goalResult = await pool.query(
      `SELECT * FROM goals WHERE id = $1`,
      [goalId]
    );

    if (goalResult.rows.length === 0) {
      throw new Error('Goal not found');
    }

    const goal = goalResult.rows[0];

    // Find all active quests for this character with their objectives
    const activeQuestsResult = await pool.query(
      `SELECT DISTINCT q.*
       FROM quests q
       INNER JOIN quest_objectives qo ON qo.quest_id = q.id
       WHERE q.character_id = $1
       AND q.status = 'active'
       AND qo.completed = false
       AND (qo.goal_mapping = $2 OR $3 = ANY(string_to_array(qo.goal_mapping, ',')))
       ORDER BY q.id`,
      [characterId, goalId.toString(), goal.stat_mapping]
    );

    const affectedQuests = activeQuestsResult.rows;

    if (affectedQuests.length === 0) {
      console.log(`[QuestProgression] No active quests affected by goal ${goalId}`);
      return {
        goal_completion: {
          xp_awarded: completionData.xp_gained || 0,
          stat: goal.stat_mapping
        },
        quest_updates: []
      };
    }

    console.log(`[QuestProgression] Found ${affectedQuests.length} affected quests`);

    const updates = [];

    for (const quest of affectedQuests) {
      // Update quest progress
      const progressUpdate = await updateQuestProgress(quest.id, goalId, goal.stat_mapping, completionData);

      if (progressUpdate.updated) {
        // Check if a stage was completed
        if (progressUpdate.stage_completed) {
          const stageReward = await awardStageReward(characterId, quest, progressUpdate.stage_number);
          updates.push({
            quest_id: quest.id,
            quest_title: quest.title,
            stage_completed: true,
            stage_number: progressUpdate.stage_number,
            reward: stageReward,
            narrative: stageReward.narrative_message
          });
        }

        // Check if full quest completed
        if (progressUpdate.quest_completed) {
          const completion = await completeQuest(characterId, quest);
          updates.push({
            quest_id: quest.id,
            quest_title: quest.title,
            fully_completed: true,
            completion_data: completion
          });
        } else if (!progressUpdate.stage_completed) {
          // Just progress update, no stage complete
          updates.push({
            quest_id: quest.id,
            quest_title: quest.title,
            progress_updated: true,
            current_progress: progressUpdate.current_progress,
            total_required: progressUpdate.total_required
          });
        }
      }
    }

    return {
      goal_completion: {
        xp_awarded: completionData.xp_gained || 0,
        stat: goal.stat_mapping
      },
      quest_updates: updates
    };

  } catch (error) {
    console.error('[QuestProgression] Error in onGoalCompleted:', error);
    throw error;
  }
}

/**
 * Update quest progress based on goal completion
 *
 * @param {number} questId - Quest ID
 * @param {number} goalId - Goal ID that was completed
 * @param {string} statMapping - Stat that was trained (STR, INT, etc.)
 * @param {object} completionData - Completion data
 * @returns {Promise<object>} Progress update result
 */
async function updateQuestProgress(questId, goalId, statMapping, completionData) {
  // Find objectives that match this goal or stat
  const objectivesResult = await pool.query(
    `SELECT * FROM quest_objectives
     WHERE quest_id = $1
     AND completed = false
     AND (goal_mapping = $2 OR goal_mapping = $3)
     ORDER BY order_index`,
    [questId, goalId.toString(), statMapping]
  );

  const matchingObjectives = objectivesResult.rows;

  if (matchingObjectives.length === 0) {
    return { updated: false };
  }

  let progressUpdated = false;
  let stageCompleted = false;
  let stageNumber = null;

  // Mark matching objectives as completed
  for (const objective of matchingObjectives) {
    await pool.query(
      `UPDATE quest_objectives
       SET completed = true, completed_at = NOW()
       WHERE id = $1`,
      [objective.id]
    );

    progressUpdated = true;

    // Check if this completes a stage (if objectives have stage grouping)
    // For now, we'll consider each objective completion as progress
  }

  // Check if all objectives for this quest are completed
  const allObjectivesResult = await pool.query(
    `SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE completed = true) as completed
     FROM quest_objectives
     WHERE quest_id = $1`,
    [questId]
  );

  const { total, completed } = allObjectivesResult.rows[0];
  const questCompleted = parseInt(total) > 0 && parseInt(total) === parseInt(completed);

  return {
    updated: progressUpdated,
    stage_completed: stageCompleted,
    stage_number: stageNumber,
    quest_completed: questCompleted,
    current_progress: parseInt(completed),
    total_required: parseInt(total)
  };
}

/**
 * Award rewards for completing a quest stage
 * Provides incremental feedback and rewards
 *
 * @param {number} characterId - Character ID
 * @param {object} quest - Quest object
 * @param {number} stageNumber - Stage that was completed
 * @returns {Promise<object>} Stage reward
 */
async function awardStageReward(characterId, quest, stageNumber) {
  // Get quest objectives
  const objectivesResult = await pool.query(
    `SELECT * FROM quest_objectives WHERE quest_id = $1 ORDER BY order_index`,
    [quest.id]
  );

  const objectives = objectivesResult.rows;

  if (objectives.length === 0) {
    return {
      xp_awarded: 0,
      narrative_message: 'Quest objective completed!',
      next_stage_unlocked: stageNumber + 1
    };
  }

  // Calculate partial XP (divide quest XP by number of objectives)
  const partialXP = Math.floor(objectives[0].xp_reward || 10);

  // Award XP to character
  await pool.query(
    `UPDATE characters SET ${quest.stat_reward?.toLowerCase() || 'str'}_xp = ${quest.stat_reward?.toLowerCase() || 'str'}_xp + $1
     WHERE id = $2`,
    [partialXP, characterId]
  );

  // Generate narrative feedback
  const narrativeFeedback = `Quest objective completed! ${quest.title} progresses.`;

  // Store narrative event
  await memoryManager.storeNarrativeEvent(characterId, {
    eventType: 'quest_progress',
    eventDescription: `Completed stage ${stageNumber} of quest: ${quest.title}`,
    participants: [],
    questId: quest.id,
    metadata: {
      stage_number: stageNumber,
      xp_awarded: partialXP,
      stat: quest.stat_reward
    }
  });

  console.log(`[QuestProgression] Stage ${stageNumber} completed for quest ${quest.id}, awarded ${partialXP} XP`);

  return {
    xp_awarded: partialXP,
    stat_awarded: quest.stat_reward,
    narrative_message: narrativeFeedback,
    next_stage_unlocked: stageNumber + 1
  };
}

/**
 * Complete a quest fully
 * Awards final rewards and triggers consequence engine
 *
 * @param {number} characterId - Character ID
 * @param {object} quest - Quest object
 * @returns {Promise<object>} Completion result
 */
async function completeQuest(characterId, quest) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Update quest status
    await client.query(
      `UPDATE quests SET status = 'completed', completed_at = NOW()
       WHERE id = $1`,
      [quest.id]
    );

    // Award final XP
    const finalXP = quest.xp_reward || 50;
    const statColumn = (quest.stat_reward?.toLowerCase() || 'str') + '_xp';

    await client.query(
      `UPDATE characters SET ${statColumn} = ${statColumn} + $1, gold = gold + $2
       WHERE id = $3`,
      [finalXP, quest.gold_reward || 10, characterId]
    );

    // Get updated character
    const charResult = await client.query(
      `SELECT * FROM characters WHERE id = $1`,
      [characterId]
    );
    const character = charResult.rows[0];

    // Store narrative event
    await memoryManager.storeNarrativeEvent(characterId, {
      eventType: 'quest_completed',
      eventDescription: `Completed quest: ${quest.title}`,
      participants: [],
      questId: quest.id,
      metadata: {
        xp_awarded: finalXP,
        gold_awarded: quest.gold_reward || 10,
        stat: quest.stat_reward
      }
    });

    // Trigger consequence engine for narrative outcome
    let narrativeOutcome = `You completed ${quest.title}!`;

    try {
      // Get recent memories for context
      const memoriesResult = await client.query(
        `SELECT * FROM narrative_events
         WHERE character_id = $1
         ORDER BY created_at DESC
         LIMIT 5`,
        [characterId]
      );

      const outcome = await consequenceEngine.generateOutcome(
        quest,
        character,
        characterId,
        memoriesResult.rows
      );

      narrativeOutcome = outcome.narrative || narrativeOutcome;
    } catch (err) {
      console.error('[QuestProgression] Consequence engine failed, using default outcome:', err);
    }

    await client.query('COMMIT');

    console.log(`[QuestProgression] Quest ${quest.id} fully completed, awarded ${finalXP} XP`);

    return {
      quest_id: quest.id,
      quest_title: quest.title,
      xp_awarded: finalXP,
      gold_awarded: quest.gold_reward || 10,
      stat_awarded: quest.stat_reward,
      narrative_outcome: narrativeOutcome,
      character_level: character.level
    };

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[QuestProgression] Error completing quest:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Check if a specific stage is completed
 *
 * @param {object} quest - Quest object
 * @param {number} stageNumber - Stage to check
 * @returns {boolean} True if stage is completed
 */
async function isStageCompleted(questId, stageNumber) {
  // For now, stages aren't implemented in the database
  // This is a placeholder for future stage functionality
  return false;
}

/**
 * Check if quest is fully completed
 *
 * @param {number} questId - Quest ID
 * @returns {Promise<boolean>} True if all objectives completed
 */
async function isQuestCompleted(questId) {
  const result = await pool.query(
    `SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE completed = true) as completed
     FROM quest_objectives
     WHERE quest_id = $1`,
    [questId]
  );

  const { total, completed } = result.rows[0];
  return parseInt(total) > 0 && parseInt(total) === parseInt(completed);
}

/**
 * Get quest progress summary
 *
 * @param {number} questId - Quest ID
 * @returns {Promise<object>} Progress summary
 */
async function getQuestProgress(questId) {
  const questResult = await pool.query(
    `SELECT * FROM quests WHERE id = $1`,
    [questId]
  );

  if (questResult.rows.length === 0) {
    throw new Error('Quest not found');
  }

  const quest = questResult.rows[0];

  // Get objectives
  const objectivesResult = await pool.query(
    `SELECT * FROM quest_objectives WHERE quest_id = $1 ORDER BY order_index`,
    [questId]
  );

  const objectives = objectivesResult.rows;

  const completedObjectives = objectives.filter(obj => obj.completed === true).length;
  const totalObjectives = objectives.length;
  const percentage = totalObjectives > 0 ? Math.floor((completedObjectives / totalObjectives) * 100) : 0;

  return {
    quest_id: quest.id,
    quest_title: quest.title,
    status: quest.status,
    completed_objectives: completedObjectives,
    total_objectives: totalObjectives,
    percentage,
    objectives: objectives.map(obj => ({
      description: obj.description,
      completed: obj.completed || false,
      goal_mapping: obj.goal_mapping,
      stat_reward: obj.stat_reward,
      xp_reward: obj.xp_reward
    }))
  };
}

module.exports = {
  onGoalCompleted,
  updateQuestProgress,
  awardStageReward,
  completeQuest,
  isStageCompleted,
  isQuestCompleted,
  getQuestProgress
};
