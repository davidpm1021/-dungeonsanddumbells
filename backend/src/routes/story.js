const express = require('express');
const router = express.Router();
const storyCoordinator = require('../services/agents/storyCoordinator');
const questService = require('../services/questService');

/**
 * Story Coordinator Routes
 * For E2E testing - no auth required
 */

/**
 * POST /api/story/analyze
 *
 * Analyze character and goals to make storylet decision
 * Body: { characterId: number }
 */
router.post('/analyze', async (req, res) => {
  try {
    const { characterId } = req.body;

    if (!characterId) {
      return res.status(400).json({ error: 'characterId is required' });
    }

    // Get character
    const character = await questService.getCharacter(characterId);
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    // Get character's goals
    const pool = require('../config/database');
    const goalsResult = await pool.query(
      'SELECT * FROM wellness_goals WHERE character_id = $1 AND active = true',
      [characterId]
    );

    const goals = goalsResult.rows;

    // Make storylet decision
    const decision = await storyCoordinator.analyzeAndDecide(characterId, goals);

    res.json({
      success: true,
      decision,
      metadata: {
        goalsAnalyzed: goals.length
      }
    });

  } catch (error) {
    console.error('[StoryRoutes] Error analyzing story:', error);
    res.status(500).json({ error: 'Failed to analyze story' });
  }
});

module.exports = router;
