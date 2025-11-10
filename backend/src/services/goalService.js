const pool = require('../config/database');
const characterService = require('./characterService');

class GoalService {
  /**
   * Create a new goal for a character
   */
  async createGoal(characterId, goalData) {
    const { name, description, statMapping, goalType, targetValue, frequency } = goalData;

    // Validate required fields
    if (!name || !statMapping || !goalType) {
      throw new Error('Name, stat mapping, and goal type are required');
    }

    // Validate stat mapping
    const validStats = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];
    if (!validStats.includes(statMapping.toUpperCase())) {
      throw new Error(`Invalid stat mapping. Must be one of: ${validStats.join(', ')}`);
    }

    // Validate goal type
    const validTypes = ['binary', 'quantitative', 'streak'];
    if (!validTypes.includes(goalType)) {
      throw new Error(`Invalid goal type. Must be one of: ${validTypes.join(', ')}`);
    }

    // Validate target value for quantitative goals
    if (goalType === 'quantitative' && (!targetValue || targetValue <= 0)) {
      throw new Error('Target value is required for quantitative goals and must be positive');
    }

    // Validate frequency
    const validFrequencies = ['daily', 'weekly', 'monthly'];
    const freq = frequency || 'daily';
    if (!validFrequencies.includes(freq)) {
      throw new Error(`Invalid frequency. Must be one of: ${validFrequencies.join(', ')}`);
    }

    const result = await pool.query(
      `INSERT INTO goals (character_id, name, description, stat_mapping, goal_type, target_value, frequency)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [characterId, name, description, statMapping.toUpperCase(), goalType, targetValue, freq]
    );

    return result.rows[0];
  }

  /**
   * Get all goals for a character
   */
  async getGoalsByCharacter(characterId, activeOnly = true) {
    const query = activeOnly
      ? 'SELECT * FROM goals WHERE character_id = $1 AND active = true ORDER BY created_at'
      : 'SELECT * FROM goals WHERE character_id = $1 ORDER BY created_at';

    const result = await pool.query(query, [characterId]);

    // Add streak info to each goal
    const goalsWithStreaks = await Promise.all(
      result.rows.map(async (goal) => ({
        ...goal,
        currentStreak: await this.getGoalStreak(goal.id),
        completedToday: await this.isCompletedToday(goal.id)
      }))
    );

    return goalsWithStreaks;
  }

  /**
   * Get a single goal by ID
   */
  async getGoalById(goalId) {
    const result = await pool.query(
      'SELECT * FROM goals WHERE id = $1',
      [goalId]
    );

    if (result.rows.length === 0) {
      throw new Error('Goal not found');
    }

    return result.rows[0];
  }

  /**
   * Complete a goal (award XP)
   */
  async completeGoal(goalId, value = null, notes = null) {
    const goal = await this.getGoalById(goalId);

    // Check if already completed today
    const completedToday = await this.isCompletedToday(goalId);
    if (completedToday && goal.goal_type !== 'quantitative') {
      throw new Error('This goal has already been completed today');
    }

    // Calculate XP based on goal type and frequency
    let xpAwarded = this.calculateXP(goal);

    // Check for streak bonus (every 7 days)
    const streak = await this.getGoalStreak(goalId);
    if (streak > 0 && (streak + 1) % 7 === 0) {
      xpAwarded += 100; // 7-day streak bonus
    }

    // Record completion
    const completion = await pool.query(
      `INSERT INTO goal_completions (goal_id, value, notes, xp_awarded)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [goalId, value, notes, xpAwarded]
    );

    // Award XP to character
    const updatedCharacter = await characterService.awardXP(
      goal.character_id,
      goal.stat_mapping,
      xpAwarded
    );

    return {
      completion: completion.rows[0],
      xpAwarded,
      statMapping: goal.stat_mapping,
      character: updatedCharacter,
      streakBonus: (streak + 1) % 7 === 0
    };
  }

  /**
   * Calculate XP for goal completion
   */
  calculateXP(goal) {
    // Base XP by frequency
    const frequencyXP = {
      daily: 10,
      weekly: 50,
      monthly: 200
    };

    return frequencyXP[goal.frequency] || 10;
  }

  /**
   * Get current streak for a goal
   */
  async getGoalStreak(goalId) {
    const result = await pool.query(
      'SELECT get_goal_streak($1) as streak',
      [goalId]
    );

    return result.rows[0].streak || 0;
  }

  /**
   * Check if goal was completed today
   */
  async isCompletedToday(goalId) {
    const result = await pool.query(
      `SELECT COUNT(*) as count
       FROM goal_completions
       WHERE goal_id = $1
         AND DATE(completed_at) = CURRENT_DATE`,
      [goalId]
    );

    return result.rows[0].count > 0;
  }

  /**
   * Get today's completions for a goal
   */
  async getTodaysCompletions(goalId) {
    const result = await pool.query(
      `SELECT * FROM goal_completions
       WHERE goal_id = $1
         AND DATE(completed_at) = CURRENT_DATE
       ORDER BY completed_at DESC`,
      [goalId]
    );

    return result.rows;
  }

  /**
   * Get all completions for a goal (with pagination)
   */
  async getGoalCompletions(goalId, limit = 30, offset = 0) {
    const result = await pool.query(
      `SELECT * FROM goal_completions
       WHERE goal_id = $1
       ORDER BY completed_at DESC
       LIMIT $2 OFFSET $3`,
      [goalId, limit, offset]
    );

    return result.rows;
  }

  /**
   * Update goal (toggle active status, edit details)
   */
  async updateGoal(goalId, updates) {
    const allowedUpdates = ['name', 'description', 'active', 'target_value'];
    const updateFields = [];
    const values = [];
    let paramCount = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (allowedUpdates.includes(key)) {
        updateFields.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    }

    if (updateFields.length === 0) {
      throw new Error('No valid fields to update');
    }

    values.push(goalId);

    const result = await pool.query(
      `UPDATE goals
       SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramCount}
       RETURNING *`,
      values
    );

    return result.rows[0];
  }

  /**
   * Delete goal (soft delete by setting active = false)
   */
  async deleteGoal(goalId) {
    const result = await pool.query(
      `UPDATE goals
       SET active = false, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [goalId]
    );

    if (result.rows.length === 0) {
      throw new Error('Goal not found');
    }

    return result.rows[0];
  }
}

module.exports = new GoalService();
