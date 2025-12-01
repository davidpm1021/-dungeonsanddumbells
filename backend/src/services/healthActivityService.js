const db = require('../config/database');
const statDecayService = require('./statDecayService');
const narrativeActivityService = require('./narrativeActivityService');

/**
 * Health Activity Service
 * Logs and tracks real-world health activities (workouts, meditation, sleep, etc.)
 * Implements research-based anti-exploit mechanics (diminishing returns)
 * Integrates with stat mapping for D&D-style character progression
 */
class HealthActivityService {

  /**
   * Log a health activity
   * @param {Object} params - Activity parameters
   * @param {number} params.userId - User ID
   * @param {number} params.characterId - Character ID (optional)
   * @param {string} params.activityType - Type: 'strength', 'cardio', 'flexibility', 'meditation', 'sleep', 'nutrition', 'social', 'learning'
   * @param {string} params.title - Activity title (e.g., "Morning run")
   * @param {string} params.description - Activity description (optional)
   * @param {number} params.durationMinutes - Duration in minutes (optional for non-time-based activities)
   * @param {string} params.intensity - Intensity: 'low', 'moderate', 'high', 'max'
   * @param {number} params.quantityValue - Quantity value (steps, miles, reps, etc.)
   * @param {string} params.quantityUnit - Quantity unit ('steps', 'miles', 'reps', etc.)
   * @param {string} params.verificationMethod - Verification method: 'self_report', 'wearable', 'community', 'photo'
   * @param {Object} params.verificationData - Verification data (JSON)
   * @param {Date} params.completedAt - When activity was completed
   * @param {number} params.goalId - Linked goal ID (optional, for auto-completion and XP adjustment)
   * @returns {Promise<Object>} Created activity with XP earned
   */
  async logActivity(params) {
    const {
      userId,
      characterId = null,
      activityType,
      title,
      description = null,
      durationMinutes = null,
      intensity = 'moderate',
      quantityValue = null,
      quantityUnit = null,
      verificationMethod = 'self_report',
      verificationData = null,
      completedAt = new Date(),
      goalId = null
    } = params;

    try {
      // 1. Get stat mapping for this activity type
      const statMapping = await this.getStatMapping(activityType);
      if (!statMapping) {
        throw new Error(`Unknown activity type: ${activityType}`);
      }

      // 2. Determine activity category
      const category = this.determineCategory(activityType);

      // 3. Calculate XP with diminishing returns
      const xpEarned = await this.calculateXP({
        userId,
        activityType,
        durationMinutes,
        intensity,
        completedAt
      });

      // 4. Determine difficulty class (DC) based on intensity/duration
      const difficultyClass = this.calculateDifficultyClass(intensity, durationMinutes);

      // 5. Handle goal linking (if goalId provided)
      let contributesToGoal = false;
      let adjustedXP = xpEarned;
      let goalCompleted = null;

      if (goalId) {
        const goalLinking = await this.handleGoalLinking({
          goalId,
          userId,
          characterId,
          quantityValue,
          activityType,
          xpEarned
        });

        contributesToGoal = goalLinking.contributesToGoal;
        adjustedXP = goalLinking.adjustedXP;
        goalCompleted = goalLinking.goalCompleted;
      }

      // 6. Insert activity into database
      const result = await db.query(`
        INSERT INTO health_activities (
          user_id, character_id, activity_type, activity_category,
          primary_stat, secondary_stat,
          title, description,
          duration_minutes, intensity,
          quantity_value, quantity_unit,
          verification_method, verification_data, verified_at,
          xp_earned, difficulty_class, success,
          completed_at,
          goal_id, contributes_to_goal, adjusted_xp
        ) VALUES (
          $1, $2, $3, $4,
          $5, $6,
          $7, $8,
          $9, $10,
          $11, $12,
          $13, $14, $15,
          $16, $17, $18,
          $19,
          $20, $21, $22
        )
        RETURNING *
      `, [
        userId, characterId, activityType, category,
        statMapping.primaryStat, statMapping.secondaryStat,
        title, description,
        durationMinutes, intensity,
        quantityValue, quantityUnit,
        verificationMethod, verificationData || null, verificationMethod !== 'self_report' ? new Date() : null,
        xpEarned, difficultyClass, true, // Assume success unless proven otherwise
        completedAt,
        goalId, contributesToGoal, adjustedXP
      ]);

      const activity = result.rows[0];

      // 7. Award XP to character if character_id provided (use adjusted XP to prevent double rewards)
      if (characterId && adjustedXP > 0) {
        await this.awardXPToCharacter(characterId, statMapping.primaryStat, adjustedXP);

        // 8. Reset decay timer for this stat (activity resets decay)
        try {
          await statDecayService.recordStatActivity(characterId, statMapping.primaryStat);
        } catch (decayErr) {
          console.warn('[HealthActivityService] Failed to reset decay timer:', decayErr.message);
          // Non-fatal - activity was still logged
        }
      }

      // 9. Update streak tracking
      const streakInfo = await this.updateStreaks(userId, activityType, completedAt);

      // 10. Create narrative event for Story Coordinator (Activity → Narrative Pipeline)
      let narrativeEvent = null;
      if (characterId) {
        try {
          narrativeEvent = await narrativeActivityService.createActivityNarrativeEvent({
            characterId,
            activityType,
            intensity,
            title,
            xpEarned: adjustedXP,
            primaryStat: statMapping.primaryStat,
            durationMinutes,
            isStreak: streakInfo?.isStreak || false,
            streakDays: streakInfo?.currentStreak || 0
          });
          console.log(`[HealthActivityService] Created narrative event for activity: ${narrativeEvent?.id}`);
        } catch (narrativeErr) {
          console.warn('[HealthActivityService] Failed to create narrative event:', narrativeErr.message);
          // Non-fatal - activity was still logged
        }
      }

      return {
        ...activity,
        // verification_data is JSONB - PostgreSQL returns it as object already
        stat_mapping: statMapping,
        narrative_event: narrativeEvent,
        streak_info: streakInfo
      };

    } catch (error) {
      console.error('[HealthActivityService] Error logging activity:', error);
      throw error;
    }
  }

  /**
   * Get stat mapping for an activity type
   * @param {string} activityType - Activity type
   * @returns {Promise<Object>} Stat mapping
   */
  async getStatMapping(activityType) {
    const result = await db.query(`
      SELECT stat_code, stat_name, activity_types, base_xp_per_minute, intensity_multipliers
      FROM stat_health_mappings
      WHERE $1 = ANY(activity_types)
    `, [activityType]);

    if (result.rows.length === 0) {
      return null;
    }

    const mapping = result.rows[0];
    return {
      primaryStat: mapping.stat_code,
      secondaryStat: null, // TODO: Support secondary stats
      statName: mapping.stat_name,
      baseXPPerMinute: mapping.base_xp_per_minute,
      intensityMultipliers: mapping.intensity_multipliers
    };
  }

  /**
   * Determine activity category from activity type
   * @param {string} activityType - Activity type
   * @returns {string} Category
   */
  determineCategory(activityType) {
    const categoryMap = {
      strength: 'physical',
      cardio: 'physical',
      flexibility: 'physical',
      endurance: 'physical',
      resistance: 'physical',
      yoga: 'physical',
      coordination: 'physical',

      meditation: 'mental',
      mindfulness: 'mental',
      journaling: 'mental',
      reflection: 'mental',

      social: 'social',
      community: 'social',
      group_activities: 'social',

      learning: 'learning',
      reading: 'learning',
      skill_development: 'learning',

      sleep: 'physical',
      nutrition: 'physical'
    };

    return categoryMap[activityType] || 'physical';
  }

  /**
   * Calculate XP with diminishing returns (anti-exploit)
   * Research: 1st activity = 100%, 2nd = 50%, 3rd = 10%, 4th+ = 0%
   * @param {Object} params - Calculation parameters
   * @returns {Promise<number>} XP earned
   */
  async calculateXP({ userId, activityType, durationMinutes, intensity, completedAt }) {
    // Use PostgreSQL function for consistent calculation
    const result = await db.query(`
      SELECT calculate_health_activity_xp($1, $2, $3, $4, $5) AS xp
    `, [activityType, durationMinutes || 30, intensity, userId, completedAt.toISOString().split('T')[0]]);

    return result.rows[0].xp;
  }

  /**
   * Calculate difficulty class (DC) for activity
   * @param {string} intensity - Intensity level
   * @param {number} durationMinutes - Duration in minutes
   * @returns {number} Difficulty class (DC 10-25)
   */
  calculateDifficultyClass(intensity, durationMinutes) {
    const baseDC = {
      low: 10,
      moderate: 15,
      high: 20,
      max: 25
    };

    let dc = baseDC[intensity] || 15;

    // Adjust for duration (longer = harder)
    if (durationMinutes) {
      if (durationMinutes >= 60) dc += 2;
      else if (durationMinutes >= 30) dc += 1;
      else if (durationMinutes <= 10) dc -= 2;
    }

    return Math.max(10, Math.min(25, dc)); // Clamp between 10-25
  }

  /**
   * Award XP to character for a specific stat
   * @param {number} characterId - Character ID
   * @param {string} stat - Stat code (STR, DEX, CON, INT, WIS, CHA)
   * @param {number} xp - XP to award
   */
  async awardXPToCharacter(characterId, stat, xp) {
    const statColumn = `${stat.toLowerCase()}_xp`;

    await db.query(`
      UPDATE characters
      SET ${statColumn} = ${statColumn} + $1,
          last_active = NOW()
      WHERE id = $2
    `, [xp, characterId]);

    console.log(`[HealthActivityService] Awarded ${xp} XP to ${stat} for character ${characterId}`);
  }

  /**
   * Update health streaks
   * @param {number} userId - User ID
   * @param {string} activityType - Activity type
   * @param {Date} completedAt - Completion date
   * @returns {Promise<Object>} Streak info { isStreak, currentStreak, level }
   */
  async updateStreaks(userId, activityType, completedAt) {
    // Use PostgreSQL function for streak tracking
    await db.query(`
      SELECT update_health_streak($1, $2, 'daily', 1)
    `, [userId, activityType]);

    // Get updated streak info
    try {
      const result = await db.query(`
        SELECT current_streak, current_level, best_streak
        FROM health_streaks
        WHERE user_id = $1 AND activity_type = $2
      `, [userId, activityType]);

      if (result.rows.length > 0) {
        const streak = result.rows[0];
        return {
          isStreak: streak.current_streak > 1,
          currentStreak: streak.current_streak,
          level: streak.current_level,
          bestStreak: streak.best_streak
        };
      }
    } catch (err) {
      console.warn('[HealthActivityService] Failed to get streak info:', err.message);
    }

    return { isStreak: false, currentStreak: 0, level: 'bronze' };
  }

  /**
   * Get activity history for a user
   * @param {number} userId - User ID
   * @param {Object} filters - Filter options
   * @param {string} filters.activityType - Filter by activity type
   * @param {Date} filters.startDate - Start date
   * @param {Date} filters.endDate - End date
   * @param {number} filters.limit - Result limit
   * @param {number} filters.offset - Result offset
   * @returns {Promise<Array>} Activities
   */
  async getActivityHistory(userId, filters = {}) {
    const {
      activityType = null,
      startDate = null,
      endDate = null,
      limit = 50,
      offset = 0
    } = filters;

    let query = `
      SELECT
        ha.*,
        sm.stat_name,
        sm.stat_code
      FROM health_activities ha
      LEFT JOIN stat_health_mappings sm ON ha.activity_type = ANY(sm.activity_types)
      WHERE ha.user_id = $1
    `;

    const params = [userId];
    let paramIndex = 2;

    if (activityType) {
      query += ` AND ha.activity_type = $${paramIndex}`;
      params.push(activityType);
      paramIndex++;
    }

    if (startDate) {
      query += ` AND ha.completed_at >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      query += ` AND ha.completed_at <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }

    query += ` ORDER BY ha.completed_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await db.query(query, params);

    // verification_data is JSONB - PostgreSQL returns it as object already
    return result.rows;
  }

  /**
   * Get activity summary (total XP, count by type, etc.)
   * @param {number} userId - User ID
   * @param {Date} startDate - Start date (optional)
   * @param {Date} endDate - End date (optional)
   * @returns {Promise<Object>} Summary stats
   */
  async getActivitySummary(userId, startDate = null, endDate = null) {
    let dateFilter = '';
    const params = [userId];

    if (startDate && endDate) {
      dateFilter = ` AND completed_at BETWEEN $2 AND $3`;
      params.push(startDate, endDate);
    }

    const result = await db.query(`
      SELECT
        COUNT(*) AS total_activities,
        SUM(xp_earned) AS total_xp,
        SUM(duration_minutes) AS total_minutes,
        activity_type,
        primary_stat,
        COUNT(*) AS count_by_type
      FROM health_activities
      WHERE user_id = $1 ${dateFilter}
      GROUP BY activity_type, primary_stat
    `, params);

    return {
      activities: result.rows,
      totalXP: result.rows.reduce((sum, row) => sum + parseInt(row.total_xp || 0), 0),
      totalActivities: result.rows.reduce((sum, row) => sum + parseInt(row.count_by_type), 0),
      totalMinutes: result.rows.reduce((sum, row) => sum + parseInt(row.total_minutes || 0), 0)
    };
  }

  /**
   * Get current streaks for a user
   * @param {number} userId - User ID
   * @returns {Promise<Array>} Streaks
   */
  async getStreaks(userId) {
    const result = await db.query(`
      SELECT *
      FROM health_streaks
      WHERE user_id = $1
      ORDER BY current_streak DESC
    `, [userId]);

    return result.rows;
  }

  /**
   * Delete an activity (admin/debugging only)
   * @param {number} activityId - Activity ID
   * @param {number} userId - User ID (for verification)
   * @returns {Promise<boolean>} Success
   */
  async deleteActivity(activityId, userId) {
    const result = await db.query(`
      DELETE FROM health_activities
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `, [activityId, userId]);

    if (result.rows.length === 0) {
      throw new Error('Activity not found or unauthorized');
    }

    console.log(`[HealthActivityService] Deleted activity ${activityId} for user ${userId}`);
    return true;
  }

  /**
   * Handle goal linking and XP adjustment
   * Prevents double XP exploit by deducting goal reward from activity XP
   * Auto-completes goals when linked activities reach target
   *
   * @param {Object} params - Linking parameters
   * @param {number} params.goalId - Goal ID to link to
   * @param {number} params.userId - User ID
   * @param {number} params.characterId - Character ID
   * @param {number} params.quantityValue - Activity quantity (miles, reps, etc.)
   * @param {string} params.activityType - Activity type
   * @param {number} params.xpEarned - Base XP earned from activity
   * @returns {Promise<Object>} { contributesToGoal, adjustedXP, goalCompleted }
   */
  async handleGoalLinking({ goalId, userId, characterId, quantityValue, activityType, xpEarned }) {
    try {
      // 1. Retrieve goal details
      const goalResult = await db.query(`
        SELECT id, character_id, name, goal_type, target_value, stat_mapping, frequency, active
        FROM goals
        WHERE id = $1
      `, [goalId]);

      if (goalResult.rows.length === 0) {
        console.warn(`[HealthActivityService] Goal ${goalId} not found`);
        return { contributesToGoal: false, adjustedXP: xpEarned, goalCompleted: null };
      }

      const goal = goalResult.rows[0];

      // 2. Verify goal is active and belongs to the same character
      if (!goal.active) {
        console.warn(`[HealthActivityService] Goal ${goalId} is inactive`);
        return { contributesToGoal: false, adjustedXP: xpEarned, goalCompleted: null };
      }

      if (characterId && goal.character_id !== characterId) {
        console.warn(`[HealthActivityService] Goal ${goalId} belongs to different character`);
        return { contributesToGoal: false, adjustedXP: xpEarned, goalCompleted: null };
      }

      // 3. For quantitative goals, calculate current progress
      if (goal.goal_type === 'quantitative') {
        if (!quantityValue || !goal.target_value) {
          console.warn(`[HealthActivityService] Missing quantity for quantitative goal ${goalId}`);
          return { contributesToGoal: false, adjustedXP: xpEarned, goalCompleted: null };
        }

        // Get sum of existing linked activities for this goal
        const progressResult = await db.query(`
          SELECT COALESCE(SUM(quantity_value), 0) AS current_progress
          FROM health_activities
          WHERE goal_id = $1 AND contributes_to_goal = true
        `, [goalId]);

        const currentProgress = parseFloat(progressResult.rows[0].current_progress);
        const newProgress = currentProgress + quantityValue;

        console.log(`[HealthActivityService] Goal ${goalId} progress: ${currentProgress}/${goal.target_value} -> ${newProgress}/${goal.target_value}`);

        // 4. Determine if this activity contributes to goal completion
        const contributesToGoal = true; // Always contribute for linked activities

        // 5. Calculate adjusted XP
        // Strategy: Deduct proportional goal XP based on percentage of goal completed by this activity
        const goalXP = this.calculateGoalXP(goal.frequency);
        const percentageOfGoal = (quantityValue / goal.target_value) * 100;
        const goalXPPortion = Math.floor((goalXP * percentageOfGoal) / 100);
        const adjustedXP = Math.max(0, xpEarned - goalXPPortion);

        console.log(`[HealthActivityService] XP adjustment: ${xpEarned} - ${goalXPPortion} (${percentageOfGoal.toFixed(1)}% of goal XP) = ${adjustedXP}`);

        // 6. Auto-complete goal if target reached
        let goalCompleted = null;
        if (newProgress >= goal.target_value) {
          console.log(`[HealthActivityService] Goal ${goalId} target reached! Auto-completing...`);

          // Check if goal hasn't been completed today
          const completionCheck = await db.query(`
            SELECT COUNT(*) AS count
            FROM goal_completions
            WHERE goal_id = $1 AND DATE(completed_at) = CURRENT_DATE
          `, [goalId]);

          console.log(`[HealthActivityService] Completion check for goal ${goalId}: count = ${completionCheck.rows[0].count}`);

          if (completionCheck.rows[0].count == 0) {
            // Import goalService to complete the goal
            const goalService = require('./goalService');
            console.log(`[HealthActivityService] Calling goalService.completeGoal()...`);
            goalCompleted = await goalService.completeGoal(
              goalId,
              newProgress,
              `Auto-completed via linked health activities (${newProgress}/${goal.target_value})`
            );
            console.log(`[HealthActivityService] Goal ${goalId} completed successfully with ${goalCompleted.graduatedSuccess.level} level`);
          } else {
            console.log(`[HealthActivityService] Goal ${goalId} already completed today (count: ${completionCheck.rows[0].count}), skipping auto-completion`);
          }
        }

        return {
          contributesToGoal,
          adjustedXP,
          goalCompleted
        };

      } else if (goal.goal_type === 'binary' || goal.goal_type === 'streak') {
        // For binary/streak goals, each activity counts as 1 completion
        const contributesToGoal = true;

        // Deduct full goal XP since binary goals are all-or-nothing
        const goalXP = this.calculateGoalXP(goal.frequency);
        const adjustedXP = Math.max(0, xpEarned - goalXP);

        console.log(`[HealthActivityService] Binary/streak goal: XP adjustment ${xpEarned} - ${goalXP} = ${adjustedXP}`);

        // Auto-complete binary goal
        const completionCheck = await db.query(`
          SELECT COUNT(*) AS count
          FROM goal_completions
          WHERE goal_id = $1 AND DATE(completed_at) = CURRENT_DATE
        `, [goalId]);

        console.log(`[HealthActivityService] Binary goal ${goalId} completion check: count = ${completionCheck.rows[0].count}`);

        let goalCompleted = null;
        if (completionCheck.rows[0].count == 0) {
          const goalService = require('./goalService');
          console.log(`[HealthActivityService] Calling goalService.completeGoal() for binary goal ${goalId}...`);
          goalCompleted = await goalService.completeGoal(
            goalId,
            null,
            `Auto-completed via linked health activity`
          );
          console.log(`[HealthActivityService] Binary goal ${goalId} auto-completed successfully`);
        } else {
          console.log(`[HealthActivityService] Binary goal ${goalId} already completed today (count: ${completionCheck.rows[0].count}), skipping`);
        }

        return {
          contributesToGoal,
          adjustedXP,
          goalCompleted
        };
      }

      // Unknown goal type
      return { contributesToGoal: false, adjustedXP: xpEarned, goalCompleted: null };

    } catch (error) {
      console.error('[HealthActivityService] Error in handleGoalLinking:', error);
      // On error, don't penalize user - return full XP
      return { contributesToGoal: false, adjustedXP: xpEarned, goalCompleted: null };
    }
  }

  /**
   * Calculate base XP for a goal based on frequency
   * Mirrors goalService.calculateXP() to maintain consistency
   * @param {string} frequency - Goal frequency (daily, weekly, monthly)
   * @returns {number} Base XP
   */
  calculateGoalXP(frequency) {
    const frequencyXP = {
      daily: 10,
      weekly: 50,
      monthly: 200
    };
    return frequencyXP[frequency] || 10;
  }
}

module.exports = new HealthActivityService();
