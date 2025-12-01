/**
 * Achievement Routes
 * Endpoints for managing health achievements and myth points
 */

const express = require('express');
const router = express.Router();
const achievementService = require('../services/achievementService');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

/**
 * GET /api/achievements
 * Get all available achievements
 */
router.get('/', async (req, res) => {
  try {
    const achievements = await achievementService.getAllAchievements();
    res.json({
      success: true,
      achievements,
    });
  } catch (error) {
    console.error('[Achievements] Error fetching all:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch achievements',
    });
  }
});

/**
 * GET /api/achievements/user
 * Get achievements unlocked by the current user
 */
router.get('/user', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const [userAchievements, mythPoints] = await Promise.all([
      achievementService.getUserAchievements(userId),
      achievementService.getMythPoints(userId),
    ]);

    res.json({
      success: true,
      achievements: userAchievements,
      mythPoints,
    });
  } catch (error) {
    console.error('[Achievements] Error fetching user achievements:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user achievements',
    });
  }
});

/**
 * GET /api/achievements/complete
 * Get all achievements with user unlock status (merged view)
 */
router.get('/complete', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const [allAchievements, userAchievements, mythPoints] = await Promise.all([
      achievementService.getAllAchievements(),
      achievementService.getUserAchievements(userId),
      achievementService.getMythPoints(userId),
    ]);

    res.json({
      success: true,
      achievements: allAchievements,
      userAchievements,
      mythPoints,
    });
  } catch (error) {
    console.error('[Achievements] Error fetching complete view:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch achievements',
    });
  }
});

/**
 * GET /api/achievements/myth-points
 * Get user's total myth points
 */
router.get('/myth-points', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const mythPoints = await achievementService.getMythPoints(userId);

    res.json({
      success: true,
      mythPoints,
    });
  } catch (error) {
    console.error('[Achievements] Error fetching myth points:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch myth points',
    });
  }
});

/**
 * POST /api/achievements/check
 * Trigger achievement check for the current user
 * Called after activities, streaks, etc.
 */
router.post('/check', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { characterId } = req.body;

    const newlyUnlocked = await achievementService.checkAndUnlockAchievements(userId, characterId);

    res.json({
      success: true,
      newlyUnlocked,
      count: newlyUnlocked.length,
    });
  } catch (error) {
    console.error('[Achievements] Error checking achievements:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check achievements',
    });
  }
});

/**
 * GET /api/achievements/:id/progress
 * Get progress toward a specific achievement
 */
router.get('/:id/progress', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const achievementId = parseInt(req.params.id);

    const progress = await achievementService.getAchievementProgress(userId, achievementId);

    if (!progress) {
      return res.status(404).json({
        success: false,
        error: 'Achievement not found',
      });
    }

    res.json({
      success: true,
      progress,
    });
  } catch (error) {
    console.error('[Achievements] Error fetching progress:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch achievement progress',
    });
  }
});

module.exports = router;
