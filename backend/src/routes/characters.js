const express = require('express');
const router = express.Router();
const characterController = require('../controllers/characterController');
const choiceService = require('../services/choiceService');
const characterQualitiesService = require('../services/characterQualitiesService');
const { authenticateToken } = require('../middleware/auth');

// All character routes require authentication
router.post('/', authenticateToken, characterController.create);
router.get('/me', authenticateToken, characterController.getMyCharacter);
router.get('/:id', authenticateToken, characterController.getById);

/**
 * GET /api/characters/:id/choices
 *
 * Get choice history for a character
 * Query params: limit (optional, default 20)
 */
router.get('/:id/choices', authenticateToken, async (req, res) => {
  try {
    const characterId = parseInt(req.params.id);
    const limit = parseInt(req.query.limit) || 20;

    // Verify character exists and belongs to user
    const pool = require('../config/database');
    const charResult = await pool.query(
      'SELECT user_id FROM characters WHERE id = $1',
      [characterId]
    );

    if (charResult.rows.length === 0) {
      return res.status(404).json({ error: 'Character not found' });
    }

    if (charResult.rows[0].user_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const choices = await choiceService.getChoiceHistory(characterId, limit);

    res.json({ choices });

  } catch (error) {
    console.error('[CharacterRoutes] Error fetching choice history:', error);
    res.status(500).json({ error: 'Failed to fetch choice history' });
  }
});

/**
 * GET /api/characters/:id/qualities
 *
 * Get character qualities (progression milestones)
 */
router.get('/:id/qualities', authenticateToken, async (req, res) => {
  try {
    const characterId = parseInt(req.params.id);

    // Verify character exists and belongs to user
    const pool = require('../config/database');
    const charResult = await pool.query(
      'SELECT user_id FROM characters WHERE id = $1',
      [characterId]
    );

    if (charResult.rows.length === 0) {
      return res.status(404).json({ error: 'Character not found' });
    }

    if (charResult.rows[0].user_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const qualities = await characterQualitiesService.getAllQualities(characterId);

    res.json({ qualities });

  } catch (error) {
    console.error('[CharacterRoutes] Error fetching qualities:', error);
    res.status(500).json({ error: 'Failed to fetch qualities' });
  }
});

module.exports = router;
