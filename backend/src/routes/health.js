const express = require('express');
const router = express.Router();
const healthActivityService = require('../services/healthActivityService');
const healthConditionService = require('../services/healthConditionService');
const achievementService = require('../services/achievementService');
const { authenticateToken, optionalAuth, loadCharacter } = require('../middleware/auth');
const pool = require('../config/database');

// Optional character loader - loads character if user is authenticated, doesn't fail otherwise
async function optionalLoadCharacter(req, res, next) {
  if (!req.user || !req.user.userId) {
    return next(); // No user, continue without character
  }

  try {
    const characterId = req.query.characterId || req.params.characterId;
    let query;
    let params;

    if (characterId) {
      query = `
        SELECT c.*, cs.str, cs.dex, cs.con, cs.int, cs.wis, cs.cha,
               cs.str_xp, cs.dex_xp, cs.con_xp, cs.int_xp, cs.wis_xp, cs.cha_xp
        FROM characters c
        JOIN character_stats cs ON c.id = cs.id
        WHERE c.id = $1 AND c.user_id = $2
      `;
      params = [characterId, req.user.userId];
    } else {
      query = `
        SELECT c.*, cs.str, cs.dex, cs.con, cs.int, cs.wis, cs.cha,
               cs.str_xp, cs.dex_xp, cs.con_xp, cs.int_xp, cs.wis_xp, cs.cha_xp
        FROM characters c
        JOIN character_stats cs ON c.id = cs.id
        WHERE c.user_id = $1
        ORDER BY c.created_at DESC
        LIMIT 1
      `;
      params = [req.user.userId];
    }

    const result = await pool.query(query, params);
    if (result.rows.length > 0) {
      req.character = result.rows[0];
    }

    next();
  } catch (err) {
    console.error('Error loading character:', err);
    next(); // Continue even if character load fails
  }
}

/**
 * POST /api/health/activities
 * Log a health activity (workout, meditation, sleep, etc.)
 */
router.post('/activities', authenticateToken, loadCharacter, async (req, res) => {
  try {
    const {
      activityType,
      title,
      description,
      durationMinutes,
      intensity,
      quantityValue,
      quantityUnit,
      verificationMethod,
      verificationData,
      completedAt
    } = req.body;

    if (!activityType || !title) {
      return res.status(400).json({ error: 'Activity type and title are required' });
    }

    const activity = await healthActivityService.logActivity({
      userId: req.user.userId,
      characterId: req.character?.id || null,
      activityType,
      title,
      description,
      durationMinutes,
      intensity: intensity || 'moderate',
      quantityValue,
      quantityUnit,
      verificationMethod: verificationMethod || 'self_report',
      verificationData,
      completedAt: completedAt ? new Date(completedAt) : new Date()
    });

    // If character exists, re-evaluate health conditions
    if (req.character?.id) {
      await healthConditionService.evaluateAndApplyConditions(req.character.id, req.user.userId);
    }

    // Check for newly unlocked achievements
    let newlyUnlockedAchievements = [];
    try {
      newlyUnlockedAchievements = await achievementService.checkAndUnlockAchievements(
        req.user.userId,
        req.character?.id || null
      );
    } catch (achievementError) {
      console.error('Achievement check error (non-blocking):', achievementError);
      // Don't fail the request if achievement check fails
    }

    res.status(201).json({
      ...activity,
      newlyUnlockedAchievements
    });

  } catch (error) {
    console.error('Log activity error:', error);
    res.status(500).json({ error: 'Failed to log activity', message: error.message });
  }
});

/**
 * GET /api/health/activities
 * Get activity history for the logged-in user
 */
router.get('/activities', authenticateToken, async (req, res) => {
  try {
    const {
      activityType,
      startDate,
      endDate,
      limit,
      offset
    } = req.query;

    const activities = await healthActivityService.getActivityHistory(req.user.userId, {
      activityType,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      limit: limit ? parseInt(limit) : 50,
      offset: offset ? parseInt(offset) : 0
    });

    res.json(activities);

  } catch (error) {
    console.error('Get activities error:', error);
    res.status(500).json({ error: 'Failed to get activities' });
  }
});

/**
 * GET /api/health/activities/summary
 * Get activity summary (total XP, counts, etc.)
 */
router.get('/activities/summary', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const summary = await healthActivityService.getActivitySummary(
      req.user.userId,
      startDate ? new Date(startDate) : null,
      endDate ? new Date(endDate) : null
    );

    res.json(summary);

  } catch (error) {
    console.error('Get summary error:', error);
    res.status(500).json({ error: 'Failed to get activity summary' });
  }
});

/**
 * DELETE /api/health/activities/:id
 * Delete an activity (for corrections/debugging)
 */
router.delete('/activities/:id', authenticateToken, async (req, res) => {
  try {
    const activityId = parseInt(req.params.id);

    await healthActivityService.deleteActivity(activityId, req.user.userId);

    res.json({ success: true, message: 'Activity deleted' });

  } catch (error) {
    console.error('Delete activity error:', error);
    res.status(500).json({ error: 'Failed to delete activity', message: error.message });
  }
});

/**
 * GET /api/health/streaks
 * Get current health streaks
 */
router.get('/streaks', optionalAuth, async (req, res) => {
  try {
    // If no user, return empty array
    if (!req.user) {
      return res.json([]);
    }

    const streaks = await healthActivityService.getStreaks(req.user.userId);

    res.json(streaks);

  } catch (error) {
    console.error('Get streaks error:', error);
    res.status(500).json({ error: 'Failed to get streaks' });
  }
});

/**
 * GET /api/health/conditions
 * Get active health conditions (buffs/debuffs) for character
 */
router.get('/conditions', optionalAuth, optionalLoadCharacter, async (req, res) => {
  try {
    // If no user or no character, return empty conditions
    if (!req.user || !req.character?.id) {
      return res.json({
        buffs: [],
        debuffs: [],
        statModifiers: {}
      });
    }

    // Evaluate conditions before returning
    await healthConditionService.evaluateAndApplyConditions(req.character.id, req.user.userId);

    const summary = await healthConditionService.getConditionSummary(req.character.id);

    res.json(summary);

  } catch (error) {
    console.error('Get conditions error:', error);
    res.status(500).json({ error: 'Failed to get conditions' });
  }
});

/**
 * POST /api/health/conditions/refresh
 * Manually refresh health conditions
 * Useful after completing activities to see immediate buff/debuff updates
 */
router.post('/conditions/refresh', authenticateToken, loadCharacter, async (req, res) => {
  try {
    if (!req.character?.id) {
      return res.status(400).json({ error: 'No character found. Create a character first.' });
    }

    const conditions = await healthConditionService.evaluateAndApplyConditions(req.character.id, req.user.userId);

    res.json({
      message: 'Conditions refreshed',
      conditions,
      statModifiers: await healthConditionService.calculateTotalStatModifiers(req.character.id)
    });

  } catch (error) {
    console.error('Refresh conditions error:', error);
    res.status(500).json({ error: 'Failed to refresh conditions' });
  }
});

/**
 * DELETE /api/health/conditions/:id
 * Remove a specific condition (admin/debugging)
 */
router.delete('/conditions/:id', authenticateToken, loadCharacter, async (req, res) => {
  try {
    if (!req.character?.id) {
      return res.status(400).json({ error: 'No character found' });
    }

    const conditionId = parseInt(req.params.id);

    await healthConditionService.removeCondition(conditionId, req.character.id);

    res.json({ success: true, message: 'Condition removed' });

  } catch (error) {
    console.error('Remove condition error:', error);
    res.status(500).json({ error: 'Failed to remove condition', message: error.message });
  }
});

/**
 * GET /api/health/stats
 * Get comprehensive health stats for dashboard
 * Combines activities, streaks, conditions, and XP earned
 */
router.get('/stats', optionalAuth, optionalLoadCharacter, async (req, res) => {
  try {
    // If no user, return empty stats
    if (!req.user) {
      return res.json({
        activitySummary: {
          totalActivities: 0,
          totalMinutes: 0,
          totalXP: 0,
          activities: []
        },
        streaks: [],
        conditions: {
          buffs: [],
          debuffs: [],
          statModifiers: {}
        },
        period: req.query.period || 'week'
      });
    }

    const { period = 'week' } = req.query; // 'day', 'week', 'month', 'all'

    // Calculate date range
    let startDate = null;
    const now = new Date();

    switch (period) {
      case 'day':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = null; // All time
    }

    // Get activity summary
    const activitySummary = await healthActivityService.getActivitySummary(
      req.user.userId,
      startDate,
      now
    );

    // Get streaks
    const streaks = await healthActivityService.getStreaks(req.user.userId);

    // Get conditions (if character exists)
    let conditions = null;
    if (req.character?.id) {
      await healthConditionService.evaluateAndApplyConditions(req.character.id, req.user.userId);
      conditions = await healthConditionService.getConditionSummary(req.character.id);
    }

    res.json({
      period,
      activitySummary,
      streaks,
      conditions
    });

  } catch (error) {
    console.error('Get health stats error:', error);
    res.status(500).json({ error: 'Failed to get health stats' });
  }
});

module.exports = router;
