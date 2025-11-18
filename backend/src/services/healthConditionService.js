const db = require('../config/database');

/**
 * Health Condition Service
 * Applies buffs/debuffs to characters based on real-world health state
 * Research-based: Well-Rested +2, Fatigued -2, workout consistency unlocks combat buffs
 * Integrates with combat system for stat modifiers
 */
class HealthConditionService {

  /**
   * Evaluate and apply health conditions for a character
   * Called periodically or before combat to ensure buffs/debuffs are current
   * @param {number} characterId - Character ID
   * @param {number} userId - User ID
   * @returns {Promise<Array>} Active conditions
   */
  async evaluateAndApplyConditions(characterId, userId) {
    try {
      // 1. Get recent health data
      const healthData = await this.getRecentHealthData(userId);

      // 2. Determine which conditions should be active
      const conditionsToApply = [];

      // Sleep-based conditions
      const sleepCondition = this.evaluateSleepCondition(healthData.lastSleep);
      if (sleepCondition) conditionsToApply.push(sleepCondition);

      // Workout consistency conditions
      const workoutConditions = this.evaluateWorkoutConsistency(healthData.recentWorkouts);
      conditionsToApply.push(...workoutConditions);

      // Overtraining detection
      const overtrainingCondition = this.evaluateOvertraining(healthData.recentWorkouts);
      if (overtrainingCondition) conditionsToApply.push(overtrainingCondition);

      // 3. Clear expired conditions
      await this.clearExpiredConditions(characterId);

      // 4. Apply new conditions
      for (const condition of conditionsToApply) {
        await this.applyCondition(characterId, condition);
      }

      // 5. Return all active conditions
      return await this.getActiveConditions(characterId);

    } catch (error) {
      console.error('[HealthConditionService] Error evaluating conditions:', error);
      throw error;
    }
  }

  /**
   * Get recent health data for condition evaluation
   * @param {number} userId - User ID
   * @returns {Promise<Object>} Health data
   */
  async getRecentHealthData(userId) {
    // Get last sleep activity (within last 48 hours)
    const sleepResult = await db.query(`
      SELECT *
      FROM health_activities
      WHERE user_id = $1
        AND activity_type = 'sleep'
        AND completed_at >= NOW() - INTERVAL '48 hours'
      ORDER BY completed_at DESC
      LIMIT 1
    `, [userId]);

    // Get workouts from last 7 days
    const workoutResult = await db.query(`
      SELECT *
      FROM health_activities
      WHERE user_id = $1
        AND activity_category = 'physical'
        AND activity_type IN ('strength', 'cardio', 'resistance', 'endurance')
        AND completed_at >= NOW() - INTERVAL '7 days'
      ORDER BY completed_at DESC
    `, [userId]);

    return {
      lastSleep: sleepResult.rows[0] || null,
      recentWorkouts: workoutResult.rows || []
    };
  }

  /**
   * Evaluate sleep condition (Well-Rested vs Fatigued)
   * @param {Object} lastSleep - Last sleep activity
   * @returns {Object|null} Condition to apply
   */
  evaluateSleepCondition(lastSleep) {
    if (!lastSleep) {
      // No sleep data in last 48 hours - assume fatigued
      return {
        name: 'Fatigued',
        type: 'debuff',
        source: 'sleep_deprivation',
        statModifiers: { STR: -2, DEX: -2, CON: -2 },
        skillCheckModifier: -2,
        description: 'Exhaustion weighs on you like armor made of lead. Every action demands effort.',
        expiresInHours: 24
      };
    }

    const sleepHours = lastSleep.duration_minutes / 60;

    if (sleepHours >= 7) {
      // Well-rested!
      return {
        name: 'Well-Rested',
        type: 'buff',
        source: 'quality_sleep',
        statModifiers: { all: 2 }, // +2 to all stats
        skillCheckModifier: 1,
        description: 'You awaken refreshed, mind sharp, body energized. The world seems clearer.',
        expiresInHours: 24
      };
    } else if (sleepHours < 6) {
      // Fatigued
      return {
        name: 'Fatigued',
        type: 'debuff',
        source: 'insufficient_sleep',
        statModifiers: { STR: -2, DEX: -2, CON: -2 },
        skillCheckModifier: -2,
        description: 'Your body craves rest. Movements feel sluggish, thoughts unfocused.',
        expiresInHours: 24
      };
    }

    // 6-7 hours: no condition (neutral)
    return null;
  }

  /**
   * Evaluate workout consistency conditions
   * @param {Array} recentWorkouts - Workouts from last 7 days
   * @returns {Array} Conditions to apply
   */
  evaluateWorkoutConsistency(recentWorkouts) {
    const conditions = [];
    const workoutCount = recentWorkouts.length;

    if (workoutCount >= 5) {
      // 5+ workouts/week: Unstoppable (30-day streak simulation)
      conditions.push({
        name: 'Unstoppable',
        type: 'buff',
        source: 'workout_consistency',
        statModifiers: { all: 1 },
        skillCheckModifier: 0,
        description: 'Your dedication is unshakable. Immune to fear and doubt.',
        expiresInHours: 168 // 7 days
      });
    } else if (workoutCount >= 3) {
      // 3-4 workouts/week: Battle-Ready
      conditions.push({
        name: 'Battle-Ready',
        type: 'buff',
        source: 'workout_consistency',
        statModifiers: { STR: 1, CON: 1 },
        skillCheckModifier: 0,
        description: 'Your training shows. Muscles primed, reflexes sharp, ready for anything.',
        expiresInHours: 168 // 7 days
      });
    } else if (workoutCount === 0) {
      // No workouts this week: Deconditioned
      conditions.push({
        name: 'Deconditioned',
        type: 'debuff',
        source: 'workout_inactivity',
        statModifiers: { STR: -1, CON: -1 },
        skillCheckModifier: 0,
        description: 'Your body has lost its edge. Muscles feel soft, endurance diminished.',
        expiresInHours: 168 // 7 days
      });
    }

    return conditions;
  }

  /**
   * Evaluate overtraining (too many high-intensity workouts)
   * @param {Array} recentWorkouts - Recent workouts
   * @returns {Object|null} Condition to apply
   */
  evaluateOvertraining(recentWorkouts) {
    // Count high/max intensity workouts in last 3 days
    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

    const highIntensityCount = recentWorkouts.filter(w => {
      const workoutDate = new Date(w.completed_at);
      return workoutDate >= threeDaysAgo && (w.intensity === 'high' || w.intensity === 'max');
    }).length;

    if (highIntensityCount >= 4) {
      // Overtraining detected
      return {
        name: 'Overtrained',
        type: 'debuff',
        source: 'excessive_training',
        statModifiers: { STR: -1, DEX: -1, CON: -2 },
        skillCheckModifier: -1,
        description: 'Your body rebels against relentless pushing. Muscles ache, recovery incomplete.',
        expiresInHours: 72 // 3 days
      };
    }

    return null;
  }

  /**
   * Apply a condition to a character
   * @param {number} characterId - Character ID
   * @param {Object} condition - Condition object
   */
  async applyCondition(characterId, condition) {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + condition.expiresInHours);

    // Check if condition already exists
    const existing = await db.query(`
      SELECT id FROM character_health_conditions
      WHERE character_id = $1 AND condition_name = $2 AND is_active = true
    `, [characterId, condition.name]);

    if (existing.rows.length > 0) {
      // Update expiration time
      await db.query(`
        UPDATE character_health_conditions
        SET expires_at = $1, updated_at = NOW()
        WHERE id = $2
      `, [expiresAt, existing.rows[0].id]);

      console.log(`[HealthConditionService] Renewed condition "${condition.name}" for character ${characterId}`);
    } else {
      // Insert new condition
      await db.query(`
        INSERT INTO character_health_conditions (
          character_id, condition_name, condition_type, source,
          stat_modifiers, skill_check_modifier, description,
          expires_at, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
      `, [
        characterId,
        condition.name,
        condition.type,
        condition.source,
        JSON.stringify(condition.statModifiers),
        condition.skillCheckModifier,
        condition.description,
        expiresAt
      ]);

      console.log(`[HealthConditionService] Applied condition "${condition.name}" (${condition.type}) to character ${characterId}`);
    }
  }

  /**
   * Clear expired conditions
   * @param {number} characterId - Character ID
   */
  async clearExpiredConditions(characterId) {
    await db.query(`
      UPDATE character_health_conditions
      SET is_active = false
      WHERE character_id = $1
        AND is_active = true
        AND expires_at IS NOT NULL
        AND expires_at < NOW()
    `, [characterId]);
  }

  /**
   * Get all active conditions for a character
   * @param {number} characterId - Character ID
   * @returns {Promise<Array>} Active conditions
   */
  async getActiveConditions(characterId) {
    const result = await db.query(`
      SELECT *
      FROM character_health_conditions
      WHERE character_id = $1 AND is_active = true
      ORDER BY applied_at DESC
    `, [characterId]);

    return result.rows.map(row => ({
      ...row,
      stat_modifiers: JSON.parse(row.stat_modifiers)
    }));
  }

  /**
   * Calculate total stat modifiers from all active conditions
   * Used by combat system to apply buffs/debuffs
   * @param {number} characterId - Character ID
   * @returns {Promise<Object>} Stat modifiers { STR: +2, DEX: -1, etc. }
   */
  async calculateTotalStatModifiers(characterId) {
    const conditions = await this.getActiveConditions(characterId);

    const totals = {
      STR: 0,
      DEX: 0,
      CON: 0,
      INT: 0,
      WIS: 0,
      CHA: 0
    };

    for (const condition of conditions) {
      const modifiers = condition.stat_modifiers;

      if (modifiers.all !== undefined) {
        // Apply to all stats
        for (const stat in totals) {
          totals[stat] += modifiers.all;
        }
      } else {
        // Apply specific stat modifiers
        for (const stat in modifiers) {
          if (totals[stat] !== undefined) {
            totals[stat] += modifiers[stat];
          }
        }
      }
    }

    return totals;
  }

  /**
   * Manually remove a condition (for admin/debugging)
   * @param {number} conditionId - Condition ID
   * @param {number} characterId - Character ID (for verification)
   */
  async removeCondition(conditionId, characterId) {
    await db.query(`
      UPDATE character_health_conditions
      SET is_active = false, updated_at = NOW()
      WHERE id = $1 AND character_id = $2
    `, [conditionId, characterId]);

    console.log(`[HealthConditionService] Manually removed condition ${conditionId} for character ${characterId}`);
  }

  /**
   * Get condition summary for display
   * @param {number} characterId - Character ID
   * @returns {Promise<Object>} Summary with buffs/debuffs
   */
  async getConditionSummary(characterId) {
    const conditions = await this.getActiveConditions(characterId);

    const buffs = conditions.filter(c => c.condition_type === 'buff');
    const debuffs = conditions.filter(c => c.condition_type === 'debuff');

    return {
      totalConditions: conditions.length,
      buffs,
      debuffs,
      statModifiers: await this.calculateTotalStatModifiers(characterId)
    };
  }
}

module.exports = new HealthConditionService();
