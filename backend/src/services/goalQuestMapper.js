/**
 * Goal-Quest Mapper Service
 * Maps user's real-world goals to quest objectives dynamically
 * Key insight: User's goals ARE their story preferences
 * Reference: PRD Addendum - Phase 4: Goal-Quest Integration
 */

const pool = require('../config/database');
const questCreator = require('./agents/questCreator');

/**
 * Analyze user's goals and create quests that align with what they're actually training
 *
 * @param {number} characterId - Character ID
 * @returns {Promise<object>} Goal analysis and aligned quests
 */
async function mapGoalsToQuests(characterId) {
  try {
    console.log(`[GoalQuestMapper] Mapping goals to quests for character ${characterId}`);

    // Get all active goals for this character
    const userGoals = await getUserGoals(characterId);

    if (userGoals.length === 0) {
      console.log(`[GoalQuestMapper] No active goals found for character ${characterId}`);
      return {
        has_goals: false,
        goal_analysis: null,
        aligned_quests: []
      };
    }

    // Get character state
    const characterResult = await pool.query(
      `SELECT * FROM characters WHERE id = $1`,
      [characterId]
    );

    if (characterResult.rows.length === 0) {
      throw new Error('Character not found');
    }

    const character = characterResult.rows[0];

    // Analyze goal patterns
    const goalAnalysis = {
      primary_stats: analyzePrimaryStats(userGoals),
      training_frequency: analyzeFrequency(userGoals),
      commitment_level: analyzeCommitment(userGoals),
      preferred_activities: analyzeActivities(userGoals),
      goal_count: userGoals.length,
      stat_distribution: getStatDistribution(userGoals)
    };

    console.log(`[GoalQuestMapper] Goal analysis:`, {
      primary_stats: goalAnalysis.primary_stats,
      commitment: goalAnalysis.commitment_level,
      goal_count: goalAnalysis.goal_count
    });

    // Generate quests aligned with their goals
    const alignedQuests = await generateAlignedQuests(
      character,
      userGoals,
      goalAnalysis
    );

    return {
      has_goals: true,
      goal_analysis: goalAnalysis,
      aligned_quests: alignedQuests
    };

  } catch (error) {
    console.error('[GoalQuestMapper] Error mapping goals to quests:', error);
    throw error;
  }
}

/**
 * Get all active goals for a character
 *
 * @param {number} characterId - Character ID
 * @returns {Promise<array>} Active goals
 */
async function getUserGoals(characterId) {
  const result = await pool.query(
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

  return result.rows;
}

/**
 * Analyze which stats the player is primarily training
 *
 * @param {array} userGoals - User's active goals
 * @returns {array} Stats ranked by focus (most to least)
 */
function analyzePrimaryStats(userGoals) {
  const statCounts = {};

  userGoals.forEach(goal => {
    const stat = goal.stat_mapping;
    if (!statCounts[stat]) {
      statCounts[stat] = {
        stat,
        goal_count: 0,
        total_completions: 0
      };
    }
    statCounts[stat].goal_count++;
    statCounts[stat].total_completions += goal.completion_count || 0;
  });

  // Sort by total completions (actual training), then goal count
  const ranked = Object.values(statCounts).sort((a, b) => {
    if (b.total_completions !== a.total_completions) {
      return b.total_completions - a.total_completions;
    }
    return b.goal_count - a.goal_count;
  });

  return ranked.map(s => s.stat);
}

/**
 * Analyze training frequency patterns
 *
 * @param {array} userGoals - User's active goals
 * @returns {object} Frequency analysis
 */
function analyzeFrequency(userGoals) {
  const totalCompletions = userGoals.reduce((sum, goal) => sum + (goal.completion_count || 0), 0);

  // Check recent activity
  const recentGoals = userGoals.filter(goal => {
    if (!goal.last_completed) return false;
    const daysSince = Math.floor((Date.now() - new Date(goal.last_completed).getTime()) / (1000 * 60 * 60 * 24));
    return daysSince <= 7;
  });

  let frequency = 'inactive';
  if (recentGoals.length > 0 && totalCompletions > 0) {
    const recentCompletions = recentGoals.reduce((sum, goal) => sum + (goal.completion_count || 0), 0);
    if (recentCompletions >= 10) frequency = 'daily';
    else if (recentCompletions >= 5) frequency = 'regular';
    else frequency = 'occasional';
  }

  return {
    frequency,
    recent_goals: recentGoals.length,
    total_completions: totalCompletions,
    active_within_week: recentGoals.length > 0
  };
}

/**
 * Analyze commitment level based on goal completion history
 *
 * @param {array} userGoals - User's active goals
 * @returns {string} Commitment level: new, engaged, committed, veteran
 */
function analyzeCommitment(userGoals) {
  const totalCompletions = userGoals.reduce((sum, goal) => sum + (goal.completion_count || 0), 0);

  if (totalCompletions >= 50) return 'veteran';
  if (totalCompletions >= 20) return 'committed';
  if (totalCompletions >= 5) return 'engaged';
  return 'new';
}

/**
 * Analyze preferred activity types
 *
 * @param {array} userGoals - User's active goals
 * @returns {array} Activity types
 */
function analyzeActivities(userGoals) {
  const activities = userGoals.map(goal => ({
    name: goal.goal_name,
    type: goal.goal_type,
    stat: goal.stat_mapping
  }));

  return activities;
}

/**
 * Get distribution of goals across stats
 *
 * @param {array} userGoals - User's active goals
 * @returns {object} Stat distribution
 */
function getStatDistribution(userGoals) {
  const distribution = {
    STR: 0,
    DEX: 0,
    CON: 0,
    INT: 0,
    WIS: 0,
    CHA: 0
  };

  userGoals.forEach(goal => {
    if (distribution.hasOwnProperty(goal.stat_mapping)) {
      distribution[goal.stat_mapping]++;
    }
  });

  return distribution;
}

/**
 * Generate quests that align with player's actual goals
 * Quests use their existing goals as objectives
 *
 * @param {object} character - Character object
 * @param {array} userGoals - User's active goals
 * @param {object} goalAnalysis - Analysis of goal patterns
 * @returns {Promise<array>} Generated quests
 */
async function generateAlignedQuests(character, userGoals, goalAnalysis) {
  const quests = [];

  // Group goals by stat
  const goalsByStat = {};
  userGoals.forEach(goal => {
    const stat = goal.stat_mapping;
    if (!goalsByStat[stat]) {
      goalsByStat[stat] = [];
    }
    goalsByStat[stat].push(goal);
  });

  // For each primary stat, create a character arc quest
  const primaryStats = goalAnalysis.primary_stats.slice(0, 2); // Top 2 stats

  for (const stat of primaryStats) {
    const statGoals = goalsByStat[stat] || [];
    if (statGoals.length === 0) continue;

    try {
      const arcQuest = await questCreator.generateQuest({
        characterId: character.id,
        characterName: character.name,
        characterClass: character.class,
        characterLevel: character.level,
        questType: 'character_arc',
        statFocus: stat,
        userGoals: statGoals,
        context: `
Player is focused on ${stat} training with ${statGoals.length} active goal(s).
Their goals: ${statGoals.map(g => `"${g.goal_name}" (${g.goal_type})`).join(', ')}

Generate a character arc quest that:
1. Uses their existing goals as objectives (don't create new requirements)
2. Provides narrative framing for why these activities matter
3. Shows how their training strengthens their ${stat} attribute
4. Creates multi-stage progression (partial rewards for incremental progress)

Example narrative framing:
If player has goal "Lift weights 3x/week" for STR:
"Your dedication to physical training shows results. Each session builds upon the last, strengthening your body and spirit. Continue your strength training - consistency is the key to mastery."
        `
      });

      if (arcQuest && arcQuest.quest) {
        quests.push(arcQuest.quest);
      }
    } catch (error) {
      console.error(`[GoalQuestMapper] Failed to generate arc quest for ${stat}:`, error.message);
    }
  }

  // If training multiple stats (3+), create a balance quest
  if (Object.keys(goalsByStat).length >= 3) {
    try {
      const balanceQuest = await questCreator.generateQuest({
        characterId: character.id,
        characterName: character.name,
        characterClass: character.class,
        characterLevel: character.level,
        questType: 'main_story',
        statFocus: 'balanced',
        userGoals: userGoals.slice(0, 6), // All goals across stats
        context: `
Player is training multiple stats: ${Object.keys(goalsByStat).join(', ')}
This demonstrates the Balance philosophy!

Generate a main story quest that:
1. Celebrates their holistic approach
2. Uses goals from different stats as objectives
3. Advances the main plot (balance is key to true power)
4. Rewards versatility

Example:
"Your balanced dedication sets you apart. Most adventurers focus on a single aspect of growth, but you understand the secret: true power comes from harmony across all attributes. Your varied training demonstrates wisdom beyond your years."
        `
      });

      if (balanceQuest && balanceQuest.quest) {
        quests.push(balanceQuest.quest);
      }
    } catch (error) {
      console.error('[GoalQuestMapper] Failed to generate balance quest:', error.message);
    }
  }

  console.log(`[GoalQuestMapper] Generated ${quests.length} aligned quests`);
  return quests;
}

/**
 * Create multi-stage objectives from user goals
 * Allows partial rewards for incremental progress
 *
 * @param {array} userGoals - User's active goals
 * @returns {array} Multi-stage objectives
 */
function createMultiStageObjectives(userGoals) {
  return userGoals.map(goal => {
    const targetValue = goal.target_value || 1;

    // Create 3 stages: First attempt, Build momentum, Master
    const stages = [
      {
        stage_number: 1,
        description: `Begin your practice: Complete ${goal.goal_name} once`,
        narrative_framing: `Take the first step. Your dedication will be noticed.`,
        goal_id: goal.id,
        stat_focus: goal.stat_mapping,
        target_value: 1,
        reward_narrative: "Every journey begins with a single step. Your commitment is acknowledged.",
        current_progress: 0,
        completed: false
      },
      {
        stage_number: 2,
        description: `Build momentum: Complete ${goal.goal_name} ${Math.ceil(targetValue / 2)} times`,
        narrative_framing: `Consistency is key. Your power responds to regular practice.`,
        goal_id: goal.id,
        stat_focus: goal.stat_mapping,
        target_value: Math.ceil(targetValue / 2),
        reward_narrative: "Your dedication strengthens. Progress becomes visible.",
        current_progress: 0,
        completed: false
      },
      {
        stage_number: 3,
        description: `Master the practice: Complete your full weekly goal`,
        narrative_framing: `Achieve mastery through commitment.`,
        goal_id: goal.id,
        stat_focus: goal.stat_mapping,
        target_value: targetValue,
        reward_narrative: "True mastery achieved. Your growth reveals new possibilities.",
        current_progress: 0,
        completed: false
      }
    ];

    return {
      goal_id: goal.id,
      goal_name: goal.goal_name,
      stat: goal.stat_mapping,
      stages
    };
  });
}

/**
 * Get stat name
 *
 * @param {string} stat - Stat code (STR, INT, etc.)
 * @returns {string} Full stat name
 */
function getStatPillar(stat) {
  const statNames = {
    STR: 'Strength',
    DEX: 'Dexterity',
    CON: 'Constitution',
    INT: 'Intelligence',
    WIS: 'Wisdom',
    CHA: 'Charisma'
  };

  return statNames[stat] || 'Balance';
}

module.exports = {
  mapGoalsToQuests,
  getUserGoals,
  analyzePrimaryStats,
  analyzeFrequency,
  analyzeCommitment,
  analyzeActivities,
  generateAlignedQuests,
  createMultiStageObjectives,
  getStatDistribution,
  getStatPillar
};
