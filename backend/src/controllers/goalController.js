const goalService = require('../services/goalService');
const characterService = require('../services/characterService');
const questProgressionService = require('../services/questProgressionService');

class GoalController {
  /**
   * POST /api/goals
   * Create a new goal
   */
  async create(req, res) {
    try {
      const userId = req.user.userId;
      const character = await characterService.getCharacterByUserId(userId);

      if (!character) {
        return res.status(404).json({
          error: 'Character not found',
          message: 'Create a character first before adding goals'
        });
      }

      const goal = await goalService.createGoal(character.id, req.body);

      res.status(201).json({
        message: 'Goal created successfully',
        goal
      });
    } catch (err) {
      if (err.message.includes('required') || err.message.includes('Invalid')) {
        return res.status(400).json({ error: err.message });
      }

      console.error('Create goal error:', err);
      res.status(500).json({
        error: 'Failed to create goal',
        message: 'An error occurred while creating the goal'
      });
    }
  }

  /**
   * GET /api/goals
   * List all goals for current user's character
   */
  async list(req, res) {
    try {
      const userId = req.user.userId;
      const character = await characterService.getCharacterByUserId(userId);

      if (!character) {
        return res.json({ goals: [] });
      }

      const activeOnly = req.query.active !== 'false'; // Default true
      const goals = await goalService.getGoalsByCharacter(character.id, activeOnly);

      // Add completedToday and currentStreak for each goal
      const goalsWithStatus = await Promise.all(
        goals.map(async (goal) => {
          const streak = await goalService.getGoalStreak(goal.id);
          const completedToday = await goalService.isCompletedToday(goal.id);
          return {
            ...goal,
            currentStreak: streak,
            completedToday: completedToday
          };
        })
      );

      res.json({ goals: goalsWithStatus });
    } catch (err) {
      console.error('List goals error:', err);
      res.status(500).json({
        error: 'Failed to retrieve goals',
        message: 'An error occurred while fetching goals'
      });
    }
  }

  /**
   * GET /api/goals/:id
   * Get a specific goal
   */
  async getById(req, res) {
    try {
      const { id } = req.params;
      const goal = await goalService.getGoalById(parseInt(id));

      // Add streak and completion info
      const streak = await goalService.getGoalStreak(goal.id);
      const completedToday = await goalService.isCompletedToday(goal.id);

      res.json({
        goal: {
          ...goal,
          currentStreak: streak,
          completedToday
        }
      });
    } catch (err) {
      if (err.message === 'Goal not found') {
        return res.status(404).json({ error: err.message });
      }

      console.error('Get goal error:', err);
      res.status(500).json({
        error: 'Failed to retrieve goal'
      });
    }
  }

  /**
   * POST /api/goals/:id/complete
   * Complete a goal and award XP
   */
  async complete(req, res) {
    try {
      const { id } = req.params;
      const { value, notes } = req.body;

      const result = await goalService.completeGoal(
        parseInt(id),
        value,
        notes
      );

      // Fetch updated goal with completedToday and streak info
      const updatedGoal = await goalService.getGoalById(parseInt(id));
      const streak = await goalService.getGoalStreak(parseInt(id));
      const completedToday = await goalService.isCompletedToday(parseInt(id));

      // GOAL-QUEST INTEGRATION: Check for quest progression
      let questUpdates = [];
      try {
        const characterId = result.character.id;
        const questProgression = await questProgressionService.onGoalCompleted(
          characterId,
          parseInt(id),
          {
            value: value || 1,
            xp_gained: result.xpAwarded,
            stat: result.statMapping,
            notes
          }
        );

        questUpdates = questProgression.quest_updates || [];

        if (questUpdates.length > 0) {
          console.log(`[GoalController] Goal completion updated ${questUpdates.length} quest(s)`);
        }
      } catch (questErr) {
        // Don't fail the entire goal completion if quest progression fails
        console.error('[GoalController] Quest progression error (non-fatal):', questErr.message);
      }

      res.json({
        success: true,
        message: 'Goal completed successfully!',
        goal: {
          ...updatedGoal,
          currentStreak: streak,
          completedToday: completedToday
        },
        completion: result.completion,
        xpAwarded: result.xpAwarded,
        statMapping: result.statMapping,
        character: result.character,
        streakBonus: result.streakBonus,
        // Include quest updates in response
        questUpdates: questUpdates
      });
    } catch (err) {
      if (err.message.includes('already been completed')) {
        return res.status(409).json({ error: err.message });
      }

      if (err.message === 'Goal not found') {
        return res.status(404).json({ error: err.message });
      }

      console.error('Complete goal error:', err);
      res.status(500).json({
        error: 'Failed to complete goal',
        message: 'An error occurred while completing the goal'
      });
    }
  }

  /**
   * GET /api/goals/:id/streak
   * Get current streak for a goal
   */
  async getStreak(req, res) {
    try {
      const { id } = req.params;
      const streak = await goalService.getGoalStreak(parseInt(id));

      res.json({ streak });
    } catch (err) {
      console.error('Get streak error:', err);
      res.status(500).json({
        error: 'Failed to retrieve streak'
      });
    }
  }

  /**
   * GET /api/goals/:id/completions
   * Get completion history for a goal
   */
  async getCompletions(req, res) {
    try {
      const { id } = req.params;
      const limit = parseInt(req.query.limit) || 30;
      const offset = parseInt(req.query.offset) || 0;

      const completions = await goalService.getGoalCompletions(
        parseInt(id),
        limit,
        offset
      );

      res.json({ completions });
    } catch (err) {
      console.error('Get completions error:', err);
      res.status(500).json({
        error: 'Failed to retrieve completions'
      });
    }
  }

  /**
   * PATCH /api/goals/:id
   * Update a goal
   */
  async update(req, res) {
    try {
      const { id } = req.params;
      const goal = await goalService.updateGoal(parseInt(id), req.body);

      res.json({
        message: 'Goal updated successfully',
        goal
      });
    } catch (err) {
      if (err.message === 'Goal not found') {
        return res.status(404).json({ error: err.message });
      }

      if (err.message.includes('No valid fields')) {
        return res.status(400).json({ error: err.message });
      }

      console.error('Update goal error:', err);
      res.status(500).json({
        error: 'Failed to update goal'
      });
    }
  }

  /**
   * DELETE /api/goals/:id
   * Delete (deactivate) a goal
   */
  async delete(req, res) {
    try {
      const { id } = req.params;
      const goal = await goalService.deleteGoal(parseInt(id));

      res.json({
        message: 'Goal deleted successfully',
        goal
      });
    } catch (err) {
      if (err.message === 'Goal not found') {
        return res.status(404).json({ error: err.message });
      }

      console.error('Delete goal error:', err);
      res.status(500).json({
        error: 'Failed to delete goal'
      });
    }
  }
}

module.exports = new GoalController();
