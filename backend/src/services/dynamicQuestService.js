/**
 * Dynamic Quest Service
 * Generates diverse quest pools based on player state, choices, and progression
 * Reference: PRD Addendum - Dynamic Narrative System
 */

const pool = require('../config/database');
const {
  QUEST_TYPES,
  CONCURRENCY_LIMITS,
  GENERATION_TARGETS,
  GENERATION_RULES,
  getQuestType,
  getAvailableSlots,
  calculateExpirationDate
} = require('../config/questTypes');
const questCreator = require('./agents/questCreator');

/**
 * Generate a dynamic quest pool for a character
 * Creates 5-15 quests based on character state, goals, and narrative context
 *
 * @param {number} characterId - Character ID
 * @returns {Promise<object>} Quest pool with generated quests
 */
async function generateQuestPool(characterId) {
  try {
    console.log(`[DynamicQuest] Generating quest pool for character ${characterId}`);

    // Step 1: Analyze character state
    const characterState = await analyzeCharacterState(characterId);

    // Step 2: Analyze goal priorities and stat focus
    const goalAnalysis = await analyzeGoalPriorities(characterId);

    // Step 3: Check for active world events
    const worldEvents = await getActiveWorldEvents();

    // Step 4: Retrieve active story branches
    const storyBranches = await getActiveStoryBranches(characterId);

    // Step 5: Get current quest counts by type
    const currentQuests = await getCurrentQuestCounts(characterId);

    // Step 6: Generate quests for each type
    const questPool = {
      mainStory: await generateMainStoryQuests(characterId, characterState, currentQuests),
      characterArcs: await generateCharacterArcQuests(characterId, goalAnalysis, currentQuests),
      worldEvents: await generateWorldEventQuests(characterId, worldEvents, currentQuests),
      sideStories: await generateSideStoryQuests(characterId, characterState, currentQuests),
      exploration: await generateExplorationQuests(characterId, characterState, currentQuests),
      corrective: await generateCorrectiveQuests(characterId, goalAnalysis, currentQuests)
    };

    // Step 7: Filter and prioritize
    const filteredPool = await filterAndPrioritize(questPool, characterState, currentQuests);

    console.log(`[DynamicQuest] Generated ${filteredPool.length} quests for character ${characterId}`);

    return {
      quests: filteredPool,
      metadata: {
        characterState,
        goalAnalysis,
        activeWorldEvents: worldEvents.length,
        activeBranches: storyBranches.length,
        currentQuestCounts: currentQuests
      }
    };
  } catch (error) {
    console.error(`[DynamicQuest] Error generating quest pool:`, error);
    throw error;
  }
}

/**
 * Analyze character state including stats, level, and progression
 * @param {number} characterId - Character ID
 * @returns {Promise<object>} Character state analysis
 */
async function analyzeCharacterState(characterId) {
  const result = await pool.query(
    `SELECT
      c.id, c.name, c.class, c.level, c.gold,
      c.str, c.dex, c.con, c.int, c.wis, c.cha,
      c.str_xp, c.dex_xp, c.con_xp, c.int_xp, c.wis_xp, c.cha_xp,
      COUNT(DISTINCT q.id) FILTER (WHERE q.status = 'active') as active_quest_count,
      COUNT(DISTINCT q.id) FILTER (WHERE q.status = 'completed') as completed_quest_count
    FROM characters c
    LEFT JOIN quests q ON q.character_id = c.id
    WHERE c.id = $1
    GROUP BY c.id`,
    [characterId]
  );

  if (result.rows.length === 0) {
    throw new Error(`Character ${characterId} not found`);
  }

  const char = result.rows[0];

  // Calculate stat analysis
  const stats = {
    str: char.str,
    dex: char.dex,
    con: char.con,
    int: char.int,
    wis: char.wis,
    cha: char.cha
  };

  const statValues = Object.values(stats);
  const maxStat = Math.max(...statValues);
  const minStat = Math.min(...statValues);
  const avgStat = statValues.reduce((a, b) => a + b, 0) / 6;

  // Determine stat imbalance
  const statImbalance = maxStat - minStat;
  const hasStatImbalance = statImbalance >= GENERATION_RULES.statImbalanceThreshold;

  // Find neglected stats
  const neglectedStats = Object.entries(stats)
    .filter(([stat, value]) => value < avgStat - 1)
    .map(([stat]) => stat.toUpperCase());

  return {
    id: char.id,
    name: char.name,
    class: char.class,
    level: char.level,
    gold: char.gold,
    stats,
    statAnalysis: {
      max: maxStat,
      min: minStat,
      avg: avgStat,
      imbalance: statImbalance,
      hasImbalance: hasStatImbalance,
      neglected: neglectedStats
    },
    questProgress: {
      active: char.active_quest_count,
      completed: char.completed_quest_count
    }
  };
}

/**
 * Analyze goal priorities - what stats is the character actually training?
 * @param {number} characterId - Character ID
 * @returns {Promise<object>} Goal priority analysis
 */
async function analyzeGoalPriorities(characterId) {
  // Get all active goals for character
  const goalsResult = await pool.query(
    `SELECT g.*,
      COUNT(gc.id) as completion_count,
      MAX(gc.completed_at) as last_completed
    FROM goals g
    LEFT JOIN goal_completions gc ON gc.goal_id = g.id
    WHERE g.character_id = $1 AND g.active = true
    GROUP BY g.id
    ORDER BY completion_count DESC, last_completed DESC`,
    [characterId]
  );

  const goals = goalsResult.rows;

  if (goals.length === 0) {
    return {
      hasGoals: false,
      statPriorities: [],
      primaryFocus: null,
      neglectedStats: [],
      commitmentLevel: 'new'
    };
  }

  // Count completions by stat
  const statCompletions = {};
  const statLastCompleted = {};

  goals.forEach(goal => {
    const stat = goal.stat_mapping;
    if (!statCompletions[stat]) {
      statCompletions[stat] = 0;
      statLastCompleted[stat] = null;
    }
    statCompletions[stat] += goal.completion_count || 0;

    if (goal.last_completed) {
      const lastDate = new Date(goal.last_completed);
      if (!statLastCompleted[stat] || lastDate > statLastCompleted[stat]) {
        statLastCompleted[stat] = lastDate;
      }
    }
  });

  // Rank stats by activity
  const statPriorities = Object.entries(statCompletions)
    .map(([stat, count]) => ({
      stat,
      completions: count,
      lastCompleted: statLastCompleted[stat],
      daysSinceCompletion: statLastCompleted[stat]
        ? Math.floor((Date.now() - statLastCompleted[stat].getTime()) / (1000 * 60 * 60 * 24))
        : null
    }))
    .sort((a, b) => b.completions - a.completions);

  // Identify neglected stats (not in top priorities or not completed recently)
  const allStats = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];
  const neglectedStats = allStats.filter(stat => {
    const priority = statPriorities.find(p => p.stat === stat);
    if (!priority) return true; // No goals for this stat
    if (priority.daysSinceCompletion === null) return true; // Never completed
    return priority.daysSinceCompletion > GENERATION_RULES.neglectedStatDays; // Not completed recently
  });

  // Determine commitment level
  const totalCompletions = Object.values(statCompletions).reduce((a, b) => a + b, 0);
  let commitmentLevel = 'new';
  if (totalCompletions >= 50) commitmentLevel = 'veteran';
  else if (totalCompletions >= 20) commitmentLevel = 'committed';
  else if (totalCompletions >= 5) commitmentLevel = 'engaged';

  return {
    hasGoals: true,
    statPriorities, // Ranked from most to least trained
    primaryFocus: statPriorities.length > 0 ? statPriorities[0].stat : null,
    neglectedStats,
    commitmentLevel,
    totalGoals: goals.length,
    totalCompletions
  };
}

/**
 * Get active world events
 * @returns {Promise<array>} Active world events
 */
async function getActiveWorldEvents() {
  const result = await pool.query(
    `SELECT * FROM world_events
    WHERE is_active = true
    AND (ends_at IS NULL OR ends_at > NOW())
    ORDER BY starts_at DESC`
  );

  return result.rows;
}

/**
 * Get active story branches for character
 * @param {number} characterId - Character ID
 * @returns {Promise<array>} Active story branches
 */
async function getActiveStoryBranches(characterId) {
  const result = await pool.query(
    `SELECT * FROM story_branches
    WHERE character_id = $1
    AND current_status = 'active'
    ORDER BY activated_at DESC`,
    [characterId]
  );

  return result.rows;
}

/**
 * Get current quest counts by type
 * @param {number} characterId - Character ID
 * @returns {Promise<object>} Quest counts by type
 */
async function getCurrentQuestCounts(characterId) {
  const result = await pool.query(
    `SELECT quest_type, COUNT(*) as count
    FROM quests
    WHERE character_id = $1 AND status = 'active'
    GROUP BY quest_type`,
    [characterId]
  );

  const counts = {};
  Object.keys(QUEST_TYPES).forEach(type => {
    counts[type] = 0;
  });

  result.rows.forEach(row => {
    counts[row.quest_type] = parseInt(row.count);
  });

  const totalActive = Object.values(counts).reduce((a, b) => a + b, 0);
  counts.total = totalActive;

  return counts;
}

/**
 * Generate main story quests (1-2)
 * @param {number} characterId - Character ID
 * @param {object} characterState - Character state analysis
 * @param {object} currentQuests - Current quest counts
 * @returns {Promise<array>} Generated main story quests
 */
async function generateMainStoryQuests(characterId, characterState, currentQuests) {
  const questType = getQuestType('main_story');
  const available = getAvailableSlots('main_story', currentQuests.main_story || 0);

  if (available === 0) {
    return [];
  }

  // For now, return empty - main story quests should be handwritten or require special AI generation
  // TODO: Integrate with Quest Creator agent for main story generation
  console.log(`[DynamicQuest] Main story generation: ${available} slots available`);
  return [];
}

/**
 * Generate character arc quests based on stat focus (2-3)
 * @param {number} characterId - Character ID
 * @param {object} goalAnalysis - Goal priority analysis
 * @param {object} currentQuests - Current quest counts
 * @returns {Promise<array>} Generated character arc quests
 */
async function generateCharacterArcQuests(characterId, goalAnalysis, currentQuests) {
  const questType = getQuestType('character_arc');
  const available = getAvailableSlots('character_arc', currentQuests.character_arc || 0);

  if (available === 0 || !goalAnalysis.hasGoals) {
    return [];
  }

  // Generate quests focused on player's top stat priorities
  // TODO: Integrate with Quest Creator agent
  console.log(`[DynamicQuest] Character arc generation: ${available} slots available, focus: ${goalAnalysis.primaryFocus}`);
  return [];
}

/**
 * Generate world event quests (0-2, depending on active events)
 * @param {number} characterId - Character ID
 * @param {array} worldEvents - Active world events
 * @param {object} currentQuests - Current quest counts
 * @returns {Promise<array>} Generated world event quests
 */
async function generateWorldEventQuests(characterId, worldEvents, currentQuests) {
  const questType = getQuestType('world_event');
  const available = getAvailableSlots('world_event', currentQuests.world_event || 0);

  if (available === 0 || worldEvents.length === 0) {
    return [];
  }

  // Generate quests for active world events
  // TODO: Integrate with Quest Creator agent
  console.log(`[DynamicQuest] World event generation: ${available} slots available, ${worldEvents.length} active events`);
  return [];
}

/**
 * Generate side story quests (3-5)
 * @param {number} characterId - Character ID
 * @param {object} characterState - Character state analysis
 * @param {object} currentQuests - Current quest counts
 * @returns {Promise<array>} Generated side story quests
 */
async function generateSideStoryQuests(characterId, characterState, currentQuests) {
  const questType = getQuestType('side_story');
  const available = getAvailableSlots('side_story', currentQuests.side_story || 0);

  if (available === 0) {
    return [];
  }

  // Generate optional narrative content
  // TODO: Integrate with Quest Creator agent
  console.log(`[DynamicQuest] Side story generation: ${available} slots available`);
  return [];
}

/**
 * Generate exploration quests (2-3)
 * @param {number} characterId - Character ID
 * @param {object} characterState - Character state analysis
 * @param {object} currentQuests - Current quest counts
 * @returns {Promise<array>} Generated exploration quests
 */
async function generateExplorationQuests(characterId, characterState, currentQuests) {
  const questType = getQuestType('exploration');
  const available = getAvailableSlots('exploration', currentQuests.exploration || 0);

  if (available === 0) {
    return [];
  }

  // Generate low-pressure lore quests
  // TODO: Integrate with Quest Creator agent
  console.log(`[DynamicQuest] Exploration generation: ${available} slots available`);
  return [];
}

/**
 * Generate corrective quests if stat imbalance detected (0-1)
 * @param {number} characterId - Character ID
 * @param {object} goalAnalysis - Goal priority analysis
 * @param {object} currentQuests - Current quest counts
 * @returns {Promise<array>} Generated corrective quests
 */
async function generateCorrectiveQuests(characterId, goalAnalysis, currentQuests) {
  const questType = getQuestType('corrective');
  const available = getAvailableSlots('corrective', currentQuests.corrective || 0);

  if (available === 0 || goalAnalysis.neglectedStats.length === 0) {
    return [];
  }

  // Generate quest to address stat imbalance
  // TODO: Integrate with Quest Creator agent
  console.log(`[DynamicQuest] Corrective generation: ${available} slots available, neglected stats: ${goalAnalysis.neglectedStats.join(', ')}`);
  return [];
}

/**
 * Filter and prioritize generated quests
 * Ensures total quest count stays within limits
 *
 * @param {object} questPool - Generated quests by type
 * @param {object} characterState - Character state
 * @param {object} currentQuests - Current quest counts
 * @returns {Promise<array>} Filtered and prioritized quests
 */
async function filterAndPrioritize(questPool, characterState, currentQuests) {
  // Flatten all quests
  const allQuests = [
    ...questPool.mainStory,
    ...questPool.characterArcs,
    ...questPool.worldEvents,
    ...questPool.sideStories,
    ...questPool.exploration,
    ...questPool.corrective
  ];

  // Sort by narrative weight (descending) and generation priority
  allQuests.sort((a, b) => {
    if (a.narrativeWeight !== b.narrativeWeight) {
      return b.narrativeWeight - a.narrativeWeight;
    }
    return a.id - b.id; // Fallback to ID for stable sorting
  });

  // Calculate how many total quests we can have
  const totalCurrent = currentQuests.total || 0;
  const maxAvailable = CONCURRENCY_LIMITS.maxTotalAvailable - totalCurrent;

  // Limit to max available
  const filtered = allQuests.slice(0, Math.max(0, maxAvailable));

  return filtered;
}

module.exports = {
  generateQuestPool,
  analyzeCharacterState,
  analyzeGoalPriorities,
  getActiveWorldEvents,
  getActiveStoryBranches,
  getCurrentQuestCounts
};
