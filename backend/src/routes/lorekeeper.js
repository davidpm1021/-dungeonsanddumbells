const express = require('express');
const router = express.Router();
const lorekeeper = require('../services/agents/lorekeeper');

/**
 * Lorekeeper Routes
 * For E2E testing - no auth required
 */

/**
 * POST /api/lorekeeper/validate
 *
 * Validate a quest against World Bible
 * Body: { quest: object }
 */
router.post('/validate', async (req, res) => {
  try {
    const { quest } = req.body;

    if (!quest) {
      return res.status(400).json({ error: 'quest is required' });
    }

    // Validate quest
    const validation = await lorekeeper.validateQuest(quest);

    res.json({
      success: true,
      validation
    });

  } catch (error) {
    console.error('[LorekeeperRoutes] Error validating quest:', error);
    res.status(500).json({ error: 'Failed to validate quest' });
  }
});

module.exports = router;
