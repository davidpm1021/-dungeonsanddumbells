const express = require('express');
const router = express.Router();
const questService = require('../services/questService');
const authMiddleware = require('../middleware/authMiddleware');

/**
 * Quest Routes
 *
 * All routes require authentication.
 * Character ownership is verified in each endpoint.
 */

// Apply auth middleware to all quest routes
router.use(authMiddleware);

/**
 * POST /api/quests/generate
 *
 * Generate a new AI quest for a character
 * Body: { characterId: number }
 */
router.post('/generate', async (req, res) => {
  try {
    const { characterId } = req.body;

    if (!characterId) {
      return res.status(400).json({ error: 'characterId is required' });
    }

    // Verify character belongs to user
    const character = await questService.getCharacter(characterId);
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    if (character.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Generate quest (full AI pipeline)
    const result = await questService.generateQuest(characterId);

    if (!result.success) {
      return res.status(200).json({
        success: false,
        message: result.reason,
        decision: result.decision
      });
    }

    res.status(201).json({
      success: true,
      quest: result.quest,
      objectives: result.objectives,
      validation: result.validation,
      metadata: result.metadata
    });

  } catch (error) {
    console.error('[QuestRoutes] Error generating quest:', error);
    res.status(500).json({ error: 'Failed to generate quest' });
  }
});

/**
 * GET /api/quests
 *
 * Get all quests for authenticated user's character
 * Query params: characterId (required), status (optional)
 */
router.get('/', async (req, res) => {
  try {
    const { characterId, status } = req.query;

    if (!characterId) {
      return res.status(400).json({ error: 'characterId is required' });
    }

    // Verify character belongs to user
    const character = await questService.getCharacter(parseInt(characterId));
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    if (character.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const quests = await questService.getQuests(parseInt(characterId), status);

    res.json({ quests });

  } catch (error) {
    console.error('[QuestRoutes] Error fetching quests:', error);
    res.status(500).json({ error: 'Failed to fetch quests' });
  }
});

/**
 * GET /api/quests/:id
 *
 * Get a single quest by ID
 * Query params: characterId (required)
 */
router.get('/:id', async (req, res) => {
  try {
    const questId = parseInt(req.params.id);
    const { characterId } = req.query;

    if (!characterId) {
      return res.status(400).json({ error: 'characterId is required' });
    }

    // Verify character belongs to user
    const character = await questService.getCharacter(parseInt(characterId));
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    if (character.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const quest = await questService.getQuest(questId, parseInt(characterId));

    res.json({ quest });

  } catch (error) {
    console.error('[QuestRoutes] Error fetching quest:', error);

    if (error.message === 'Quest not found') {
      return res.status(404).json({ error: 'Quest not found' });
    }

    res.status(500).json({ error: 'Failed to fetch quest' });
  }
});

/**
 * POST /api/quests/:id/start
 *
 * Start a quest
 * Body: { characterId: number }
 */
router.post('/:id/start', async (req, res) => {
  try {
    const questId = parseInt(req.params.id);
    const { characterId } = req.body;

    if (!characterId) {
      return res.status(400).json({ error: 'characterId is required' });
    }

    // Verify character belongs to user
    const character = await questService.getCharacter(characterId);
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    if (character.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const quest = await questService.startQuest(questId, characterId);

    res.json({
      success: true,
      quest
    });

  } catch (error) {
    console.error('[QuestRoutes] Error starting quest:', error);

    if (error.message === 'Quest not found or already started') {
      return res.status(400).json({ error: error.message });
    }

    res.status(500).json({ error: 'Failed to start quest' });
  }
});

/**
 * POST /api/quests/:id/objectives/:objectiveId/complete
 *
 * Complete a quest objective
 * Body: { characterId: number }
 */
router.post('/:id/objectives/:objectiveId/complete', async (req, res) => {
  try {
    const questId = parseInt(req.params.id);
    const objectiveId = parseInt(req.params.objectiveId);
    const { characterId } = req.body;

    if (!characterId) {
      return res.status(400).json({ error: 'characterId is required' });
    }

    // Verify character belongs to user
    const character = await questService.getCharacter(characterId);
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    if (character.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const result = await questService.completeObjective(questId, objectiveId, characterId);

    res.json(result);

  } catch (error) {
    console.error('[QuestRoutes] Error completing objective:', error);

    if (error.message === 'Quest not found' || error.message === 'Objective not found or already completed') {
      return res.status(400).json({ error: error.message });
    }

    res.status(500).json({ error: 'Failed to complete objective' });
  }
});

/**
 * POST /api/quests/from-template
 *
 * Generate quest from template
 * Body: { templateName: string, characterId: number }
 */
router.post('/from-template', async (req, res) => {
  try {
    const { templateName, characterId } = req.body;

    if (!templateName || !characterId) {
      return res.status(400).json({ error: 'templateName and characterId are required' });
    }

    // Verify character belongs to user
    const character = await questService.getCharacter(characterId);
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    if (character.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const result = await questService.generateFromTemplate(templateName, characterId);

    res.status(201).json({
      success: true,
      quest: result.quest,
      objectives: result.objectives,
      validation: result.validation,
      metadata: result.metadata
    });

  } catch (error) {
    console.error('[QuestRoutes] Error generating from template:', error);

    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }

    res.status(500).json({ error: 'Failed to generate quest from template' });
  }
});

module.exports = router;
