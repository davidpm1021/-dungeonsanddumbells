/**
 * Choice Service
 * Handles player choice processing, consequence application, and story branching
 * Reference: PRD Addendum - Player Agency & Choice System
 */

const pool = require('../config/database');
const memoryManager = require('./memoryManager');

/**
 * Record a player choice and apply consequences
 *
 * @param {number} characterId - Character ID
 * @param {number} questId - Quest ID containing the choice
 * @param {number} choiceId - Quest choice ID
 * @param {number} optionId - Selected option ID
 * @returns {Promise<object>} Choice result with consequences
 */
async function makeChoice(characterId, questId, choiceId, optionId) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Get the quest choice
    const choiceResult = await client.query(
      `SELECT qc.*, q.title as quest_title, q.status as quest_status
      FROM quest_choices qc
      JOIN quests q ON q.id = qc.quest_id
      WHERE qc.id = $1 AND q.character_id = $2`,
      [choiceId, characterId]
    );

    if (choiceResult.rows.length === 0) {
      throw new Error('Choice not found or does not belong to this character');
    }

    const choice = choiceResult.rows[0];

    if (choice.choice_made !== null) {
      throw new Error('Choice has already been made');
    }

    if (choice.quest_status === 'completed' || choice.quest_status === 'failed') {
      throw new Error('Cannot make choices on completed or failed quests');
    }

    // 2. Validate option exists
    const options = choice.choice_options;
    const selectedOption = options.find(opt => opt.id === optionId);

    if (!selectedOption) {
      throw new Error(`Invalid option ID: ${optionId}`);
    }

    // 3. Check if character meets requirements for this option
    if (selectedOption.requirements) {
      const meetsRequirements = await checkChoiceRequirements(
        client,
        characterId,
        selectedOption.requirements
      );

      if (!meetsRequirements.valid) {
        throw new Error(`Requirements not met: ${meetsRequirements.reason}`);
      }
    }

    // 4. Record the choice in quest_choices table
    await client.query(
      `UPDATE quest_choices
      SET choice_made = $1, chosen_at = NOW()
      WHERE id = $2`,
      [optionId, choiceId]
    );

    // 5. Get consequences for this option
    const consequences = choice.story_consequences?.[optionId] || {};

    // 6. Apply consequences
    const appliedConsequences = await applyConsequences(
      client,
      characterId,
      questId,
      selectedOption,
      consequences
    );

    // 7. Record in character_choices table
    await client.query(
      `INSERT INTO character_choices
        (character_id, choice_context, choice_made, quest_id, narrative_impact,
         affected_npcs, unlocked_content, locked_content)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        characterId,
        choice.choice_point_description,
        selectedOption.label,
        questId,
        consequences.narrative_impact || 'moderate',
        JSON.stringify(consequences.affected_npcs || []),
        JSON.stringify(consequences.unlocks || []),
        JSON.stringify(consequences.locks || [])
      ]
    );

    // 8. Store narrative event
    await memoryManager.storeNarrativeEvent(characterId, {
      eventType: 'choice_made',
      eventDescription: `Made choice: "${selectedOption.label}" in quest "${choice.quest_title}"`,
      participants: consequences.affected_npcs || [],
      questId: questId,
      metadata: {
        choiceId,
        optionId,
        consequences
      }
    });

    // 9. Update story branch if applicable
    if (choice.affects_branch) {
      await updateStoryBranch(client, characterId, choice.affects_branch, {
        choiceId,
        optionId,
        choiceLabel: selectedOption.label
      });
    }

    await client.query('COMMIT');

    console.log(`[Choice] Character ${characterId} made choice ${choiceId} option ${optionId}`);

    return {
      success: true,
      choice: {
        id: choiceId,
        questId,
        optionSelected: selectedOption,
        consequences: appliedConsequences
      }
    };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[Choice] Error making choice:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Check if character meets requirements for a choice option
 *
 * @param {object} client - Database client
 * @param {number} characterId - Character ID
 * @param {object} requirements - Requirements object
 * @returns {Promise<object>} Validation result
 */
async function checkChoiceRequirements(client, characterId, requirements) {
  // Check stat requirements
  if (requirements.stat) {
    const statCheck = await client.query(
      `SELECT ${requirements.stat.toLowerCase()} as stat_value
      FROM characters WHERE id = $1`,
      [characterId]
    );

    if (statCheck.rows[0].stat_value < requirements.minValue) {
      return {
        valid: false,
        reason: `Requires ${requirements.stat} ${requirements.minValue}+`
      };
    }
  }

  // Check quality requirements
  if (requirements.qualities) {
    for (const [qualityName, requiredValue] of Object.entries(requirements.qualities)) {
      const qualityCheck = await client.query(
        `SELECT quality_value FROM character_qualities
        WHERE character_id = $1 AND quality_name = $2`,
        [characterId, qualityName]
      );

      if (qualityCheck.rows.length === 0 || qualityCheck.rows[0].quality_value < requiredValue) {
        return {
          valid: false,
          reason: `Requires ${qualityName} ${requiredValue}+`
        };
      }
    }
  }

  return { valid: true };
}

/**
 * Apply consequences of a choice
 *
 * @param {object} client - Database client
 * @param {number} characterId - Character ID
 * @param {number} questId - Quest ID
 * @param {object} option - Selected option
 * @param {object} consequences - Consequences to apply
 * @returns {Promise<object>} Applied consequences summary
 */
async function applyConsequences(client, characterId, questId, option, consequences) {
  const applied = {
    relationshipChanges: [],
    unlockedQuests: [],
    lockedQuests: [],
    qualityChanges: [],
    branchActivated: null
  };

  // 1. Apply NPC relationship changes
  if (consequences.npc_relationships) {
    for (const [npcName, change] of Object.entries(consequences.npc_relationships)) {
      await updateNPCRelationship(client, characterId, npcName, change);
      applied.relationshipChanges.push({ npc: npcName, change });
    }
  }

  // 2. Unlock quests
  if (consequences.unlocks && consequences.unlocks.length > 0) {
    for (const questIdentifier of consequences.unlocks) {
      // Quest identifier can be quest ID or template name
      if (typeof questIdentifier === 'number') {
        applied.unlockedQuests.push(questIdentifier);
      } else if (typeof questIdentifier === 'string') {
        // It's a template name or quest tag - will be used for future generation
        console.log(`[Choice] Marked for unlock: ${questIdentifier}`);
      }
    }
  }

  // 3. Lock quests (make unavailable)
  if (consequences.locks && consequences.locks.length > 0) {
    for (const questIdentifier of consequences.locks) {
      if (typeof questIdentifier === 'number') {
        await client.query(
          `UPDATE quests SET status = 'expired'
          WHERE id = $1 AND character_id = $2 AND status = 'available'`,
          [questIdentifier, characterId]
        );
        applied.lockedQuests.push(questIdentifier);
      }
    }
  }

  // 4. Set character qualities
  if (consequences.set_qualities) {
    for (const [qualityName, value] of Object.entries(consequences.set_qualities)) {
      await client.query(
        `INSERT INTO character_qualities (character_id, quality_name, quality_value)
        VALUES ($1, $2, $3)
        ON CONFLICT (character_id, quality_name)
        DO UPDATE SET quality_value = $3, updated_at = NOW()`,
        [characterId, qualityName, value]
      );
      applied.qualityChanges.push({ quality: qualityName, value });
    }
  }

  // 5. Activate story branch
  if (consequences.activate_branch) {
    const branchName = consequences.activate_branch;
    await client.query(
      `INSERT INTO story_branches
        (character_id, branch_name, key_choices, npcs_affected, world_state_changes)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (character_id, branch_name)
      DO UPDATE SET
        key_choices = story_branches.key_choices || $3,
        updated_at = NOW()`,
      [
        characterId,
        branchName,
        JSON.stringify([{ questId, option: option.label }]),
        JSON.stringify(consequences.affected_npcs || []),
        JSON.stringify(consequences.world_state_changes || {})
      ]
    );
    applied.branchActivated = branchName;
  }

  return applied;
}

/**
 * Update NPC relationship
 *
 * @param {object} client - Database client
 * @param {number} characterId - Character ID
 * @param {string} npcName - NPC name
 * @param {object} change - Relationship change {delta: number, notes: string}
 */
async function updateNPCRelationship(client, characterId, npcName, change) {
  // Get current world state
  const wsResult = await client.query(
    `SELECT npc_relationships_json FROM world_state WHERE character_id = $1`,
    [characterId]
  );

  let npcRelationships = {};
  if (wsResult.rows.length > 0 && wsResult.rows[0].npc_relationships_json) {
    npcRelationships = wsResult.rows[0].npc_relationships_json;
  }

  // Initialize NPC if doesn't exist
  if (!npcRelationships[npcName]) {
    npcRelationships[npcName] = { level: 0, notes: [] };
  }

  // Apply change
  npcRelationships[npcName].level += change.delta || 0;
  if (change.notes) {
    npcRelationships[npcName].notes.push({
      note: change.notes,
      timestamp: new Date().toISOString()
    });
  }

  // Update world state
  await client.query(
    `UPDATE world_state
    SET npc_relationships_json = $1, updated_at = NOW()
    WHERE character_id = $2`,
    [JSON.stringify(npcRelationships), characterId]
  );
}

/**
 * Update story branch with choice information
 *
 * @param {object} client - Database client
 * @param {number} characterId - Character ID
 * @param {string} branchName - Story branch name
 * @param {object} choiceInfo - Choice information
 */
async function updateStoryBranch(client, characterId, branchName, choiceInfo) {
  const result = await client.query(
    `SELECT key_choices FROM story_branches
    WHERE character_id = $1 AND branch_name = $2`,
    [characterId, branchName]
  );

  let keyChoices = [];
  if (result.rows.length > 0) {
    keyChoices = result.rows[0].key_choices || [];
  }

  keyChoices.push(choiceInfo);

  await client.query(
    `INSERT INTO story_branches
      (character_id, branch_name, key_choices)
    VALUES ($1, $2, $3)
    ON CONFLICT (character_id, branch_name)
    DO UPDATE SET
      key_choices = $3,
      updated_at = NOW()`,
    [characterId, branchName, JSON.stringify(keyChoices)]
  );
}

/**
 * Get choice history for a character
 *
 * @param {number} characterId - Character ID
 * @param {number} limit - Number of choices to return
 * @returns {Promise<array>} Choice history
 */
async function getChoiceHistory(characterId, limit = 20) {
  const result = await pool.query(
    `SELECT
      cc.*,
      q.title as quest_title,
      q.status as quest_status
    FROM character_choices cc
    LEFT JOIN quests q ON q.id = cc.quest_id
    WHERE cc.character_id = $1
    ORDER BY cc.made_at DESC
    LIMIT $2`,
    [characterId, limit]
  );

  return result.rows;
}

/**
 * Get available choices for a quest
 *
 * @param {number} questId - Quest ID
 * @param {number} characterId - Character ID for requirement checking
 * @returns {Promise<array>} Available choices
 */
async function getQuestChoices(questId, characterId) {
  const result = await pool.query(
    `SELECT * FROM quest_choices
    WHERE quest_id = $1
    ORDER BY id`,
    [questId]
  );

  const choices = result.rows;

  // Check requirements for each option
  for (const choice of choices) {
    if (choice.choice_made !== null) continue; // Already made

    const options = choice.choice_options;
    for (const option of options) {
      if (option.requirements) {
        const client = await pool.connect();
        try {
          const check = await checkChoiceRequirements(client, characterId, option.requirements);
          option.meetsRequirements = check.valid;
          option.requirementReason = check.reason;
        } finally {
          client.release();
        }
      } else {
        option.meetsRequirements = true;
      }
    }
  }

  return choices;
}

/**
 * Create a choice point for a quest
 * Used when Quest Creator agent generates quests with choices
 *
 * @param {number} questId - Quest ID
 * @param {object} choiceData - Choice point data
 * @returns {Promise<number>} Created choice ID
 */
async function createQuestChoice(questId, choiceData) {
  const result = await pool.query(
    `INSERT INTO quest_choices
      (quest_id, choice_point_description, choice_options, story_consequences, affects_branch)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id`,
    [
      questId,
      choiceData.description,
      JSON.stringify(choiceData.options),
      JSON.stringify(choiceData.consequences),
      choiceData.affectsBranch || null
    ]
  );

  return result.rows[0].id;
}

module.exports = {
  makeChoice,
  getChoiceHistory,
  getQuestChoices,
  createQuestChoice,
  checkChoiceRequirements,
  applyConsequences
};
