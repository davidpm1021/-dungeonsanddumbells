const db = require('../config/database');
const healthDataAggregator = require('./healthDataAggregator');

/**
 * Goal Auto-Completion Service
 * Automatically completes trackable goals based on wearable health data.
 * Supports graduated success (Bronze 50%, Silver 75%, Gold 100%).
 */
class GoalAutoCompletionService {

  // Map goal types to health data fields
  static GOAL_TO_HEALTH_MAPPING = {
    // Activity goals
    'steps': { field: 'steps', displayName: 'Steps' },
    'active_minutes': { field: 'active_minutes', displayName: 'Active Minutes' },
    'calories': { field: 'calories_burned', displayName: 'Calories Burned' },
    'distance': { field: 'distance_meters', displayName: 'Distance (m)' },
    'floors': { field: 'floors_climbed', displayName: 'Floors Climbed' },

    // Sleep goals
    'sleep_hours': { field: 'sleep_duration_minutes', multiplier: 1/60, displayName: 'Sleep Hours' },
    'sleep_minutes': { field: 'sleep_duration_minutes', displayName: 'Sleep Minutes' },
    'deep_sleep': { field: 'sleep_deep_minutes', displayName: 'Deep Sleep (min)' },

    // Workout goals
    'workout_count': { field: 'workout_count', displayName: 'Workouts' },
    'workout_minutes': { field: 'workout_minutes', displayName: 'Workout Minutes' },

    // Mindfulness goals
    'meditation_minutes': { field: 'meditation_minutes', displayName: 'Meditation Minutes' },

    // Heart health
    'resting_hr_below': { field: 'resting_heart_rate', comparison: 'lte', displayName: 'Resting HR' },
    'hrv_above': { field: 'hrv_avg', comparison: 'gte', displayName: 'HRV' }
  };

  // Graduated success thresholds
  static SUCCESS_TIERS = {
    bronze: { threshold: 0.50, label: 'Bronze', xpMultiplier: 0.5 },
    silver: { threshold: 0.75, label: 'Silver', xpMultiplier: 0.75 },
    gold: { threshold: 1.00, label: 'Gold', xpMultiplier: 1.0 }
  };

  /**
   * Check and auto-complete eligible goals for a user
   * Called when new health data is received
   * @param {number} userId - User ID
   * @param {Date} date - Date to check goals for
   * @returns {Promise<Array>} Completed goals
   */
  async checkAndCompleteGoals(userId, date = new Date()) {
    const dateStr = date.toISOString().split('T')[0];

    console.log(`[GoalAutoCompletion] Checking goals for user ${userId} on ${dateStr}`);

    // Get user's trackable goals for today
    const trackableGoals = await this.getTrackableGoals(userId, date);

    if (trackableGoals.length === 0) {
      console.log('[GoalAutoCompletion] No trackable goals found');
      return [];
    }

    // Get daily health data
    const healthData = await healthDataAggregator.getDailyData(userId, date);

    if (!healthData) {
      console.log('[GoalAutoCompletion] No health data for today');
      return [];
    }

    const completedGoals = [];

    for (const goal of trackableGoals) {
      const result = await this.evaluateGoal(goal, healthData);

      if (result.eligible) {
        const completion = await this.completeGoal(userId, goal, result, date);
        if (completion) {
          completedGoals.push({
            goal,
            ...result,
            completion
          });
        }
      }
    }

    console.log(`[GoalAutoCompletion] Completed ${completedGoals.length} goals`);
    return completedGoals;
  }

  /**
   * Get user's trackable goals (goals that can be auto-completed from wearable data)
   * @param {number} userId - User ID
   * @param {Date} date - Date to check
   * @returns {Promise<Array>} Trackable goals
   */
  async getTrackableGoals(userId, date) {
    const result = await db.query(`
      SELECT g.*
      FROM goals g
      JOIN characters c ON g.character_id = c.id
      WHERE c.user_id = $1
        AND g.active = true
        AND g.auto_track_type IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM goal_completions gc
          WHERE gc.goal_id = g.id
            AND DATE(gc.completed_at) = DATE($2)
        )
    `, [userId, date]);

    return result.rows;
  }

  /**
   * Evaluate a goal against health data
   * @param {Object} goal - Goal to evaluate
   * @param {Object} healthData - Daily health data
   * @returns {Object} Evaluation result
   */
  evaluateGoal(goal, healthData) {
    const mapping = GoalAutoCompletionService.GOAL_TO_HEALTH_MAPPING[goal.auto_track_type];

    if (!mapping) {
      return { eligible: false, reason: 'Unknown tracking type' };
    }

    let actualValue = healthData[mapping.field];

    if (actualValue === null || actualValue === undefined) {
      return { eligible: false, reason: 'No data available' };
    }

    // Apply multiplier if defined (e.g., minutes to hours)
    if (mapping.multiplier) {
      actualValue = actualValue * mapping.multiplier;
    }

    const targetValue = goal.target_value;
    const comparison = mapping.comparison || 'gte'; // Default: greater than or equal

    // Calculate achievement percentage
    let percentage;
    if (comparison === 'gte') {
      percentage = actualValue / targetValue;
    } else if (comparison === 'lte') {
      // For "below" targets, invert the calculation
      percentage = targetValue / actualValue;
    } else {
      percentage = actualValue / targetValue;
    }

    // Determine success tier
    let tier = null;
    let tierLabel = null;
    let xpMultiplier = 0;

    if (percentage >= GoalAutoCompletionService.SUCCESS_TIERS.gold.threshold) {
      tier = 'gold';
      tierLabel = GoalAutoCompletionService.SUCCESS_TIERS.gold.label;
      xpMultiplier = GoalAutoCompletionService.SUCCESS_TIERS.gold.xpMultiplier;
    } else if (percentage >= GoalAutoCompletionService.SUCCESS_TIERS.silver.threshold) {
      tier = 'silver';
      tierLabel = GoalAutoCompletionService.SUCCESS_TIERS.silver.label;
      xpMultiplier = GoalAutoCompletionService.SUCCESS_TIERS.silver.xpMultiplier;
    } else if (percentage >= GoalAutoCompletionService.SUCCESS_TIERS.bronze.threshold) {
      tier = 'bronze';
      tierLabel = GoalAutoCompletionService.SUCCESS_TIERS.bronze.label;
      xpMultiplier = GoalAutoCompletionService.SUCCESS_TIERS.bronze.xpMultiplier;
    }

    const eligible = tier !== null;

    return {
      eligible,
      tier,
      tierLabel,
      percentage: Math.round(percentage * 100),
      actualValue: Math.round(actualValue * 100) / 100,
      targetValue,
      xpMultiplier,
      displayName: mapping.displayName,
      reason: eligible
        ? `${tierLabel} achievement: ${Math.round(actualValue)} / ${targetValue} (${Math.round(percentage * 100)}%)`
        : `Below Bronze threshold: ${Math.round(actualValue)} / ${targetValue} (${Math.round(percentage * 100)}%)`
    };
  }

  /**
   * Complete a goal with graduated success
   * @param {number} userId - User ID
   * @param {Object} goal - Goal to complete
   * @param {Object} result - Evaluation result
   * @param {Date} date - Completion date
   * @returns {Promise<Object>} Completion record
   */
  async completeGoal(userId, goal, result, date) {
    try {
      // Calculate XP with graduated multiplier
      const baseXp = 10; // Default XP per goal
      const adjustedXp = Math.round(baseXp * result.xpMultiplier);

      // Create completion record
      const completionResult = await db.query(`
        INSERT INTO goal_completions (
          goal_id, value, notes, completed_at,
          completion_level, completion_percentage, is_auto_completed,
          verification_source, xp_awarded
        )
        VALUES ($1, $2, $3, $4, $5, $6, true, 'wearable', $7)
        RETURNING *
      `, [
        goal.id,
        result.actualValue,
        `Auto-completed from wearable data: ${result.reason}`,
        date,
        result.tier,
        result.percentage,
        adjustedXp
      ]);

      // Award XP to character
      await this.awardXpToCharacter(userId, goal.stat_mapping, adjustedXp);

      console.log(`[GoalAutoCompletion] Completed goal "${goal.name}" with ${result.tierLabel} (${adjustedXp} XP)`);

      return {
        ...completionResult.rows[0],
        xpAwarded: adjustedXp,
        tier: result.tier
      };

    } catch (error) {
      console.error(`[GoalAutoCompletion] Error completing goal ${goal.id}:`, error);
      return null;
    }
  }

  /**
   * Award XP to character's stat
   * @param {number} userId - User ID
   * @param {string} stat - Stat to award (STR, DEX, etc.)
   * @param {number} xp - XP amount
   */
  async awardXpToCharacter(userId, stat, xp) {
    const statColumn = `${stat.toLowerCase()}_xp`;

    await db.query(`
      UPDATE character_stats cs
      SET ${statColumn} = ${statColumn} + $1
      FROM characters c
      WHERE cs.id = c.id
        AND c.user_id = $2
    `, [xp, userId]);
  }

  /**
   * Get auto-trackable goal types and their requirements
   * @returns {Object} Available tracking types
   */
  getAvailableTrackingTypes() {
    const types = {};

    for (const [key, mapping] of Object.entries(GoalAutoCompletionService.GOAL_TO_HEALTH_MAPPING)) {
      types[key] = {
        displayName: mapping.displayName,
        field: mapping.field,
        requiresWearable: true,
        graduatedSuccess: true
      };
    }

    return types;
  }

  /**
   * Preview what goals would be auto-completed with current data
   * (For user to see before enabling auto-track)
   * @param {number} userId - User ID
   * @param {Date} date - Date to preview
   * @returns {Promise<Array>} Preview of potential completions
   */
  async previewAutoCompletions(userId, date = new Date()) {
    const trackableGoals = await this.getTrackableGoals(userId, date);
    const healthData = await healthDataAggregator.getDailyData(userId, date);

    if (!healthData) {
      return {
        hasData: false,
        message: 'No wearable data available for today',
        goals: []
      };
    }

    const previews = trackableGoals.map(goal => {
      const result = this.evaluateGoal(goal, healthData);
      return {
        goalId: goal.id,
        goalName: goal.name,
        targetValue: goal.target_value,
        ...result
      };
    });

    return {
      hasData: true,
      dataDate: healthData.date,
      dataSources: healthData.data_sources,
      goals: previews
    };
  }

  /**
   * Enable auto-tracking for a goal
   * @param {number} goalId - Goal ID
   * @param {number} userId - User ID
   * @param {string} trackingType - Type of auto-tracking
   * @returns {Promise<Object>} Updated goal
   */
  async enableAutoTracking(goalId, userId, trackingType) {
    if (!GoalAutoCompletionService.GOAL_TO_HEALTH_MAPPING[trackingType]) {
      throw new Error(`Invalid tracking type: ${trackingType}`);
    }

    const result = await db.query(`
      UPDATE goals
      SET auto_track_type = $1, updated_at = NOW()
      WHERE id = $2 AND user_id = $3
      RETURNING *
    `, [trackingType, goalId, userId]);

    if (result.rows.length === 0) {
      throw new Error('Goal not found');
    }

    return result.rows[0];
  }

  /**
   * Disable auto-tracking for a goal
   * @param {number} goalId - Goal ID
   * @param {number} userId - User ID
   * @returns {Promise<Object>} Updated goal
   */
  async disableAutoTracking(goalId, userId) {
    const result = await db.query(`
      UPDATE goals
      SET auto_track_type = NULL, updated_at = NOW()
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `, [goalId, userId]);

    if (result.rows.length === 0) {
      throw new Error('Goal not found');
    }

    return result.rows[0];
  }
}

module.exports = new GoalAutoCompletionService();
