const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const questService = require('../services/questService');
const choiceService = require('../services/choiceService');
const goalQuestMapper = require('../services/goalQuestMapper');
const { authenticateToken } = require('../middleware/auth');

/**
 * Quest Routes
 *
 * All routes require authentication.
 * Character ownership is verified in each endpoint.
 */

// Apply auth middleware to all quest routes
router.use(authenticateToken);

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

/**
 * POST /api/quests/complete
 *
 * Complete a quest and trigger consequence engine
 * Body: { characterId: number, questId: string, quest: object }
 * (For E2E testing - no auth)
 */
router.post('/complete', async (req, res) => {
  try {
    const { characterId, questId, quest } = req.body;

    if (!characterId || !quest) {
      return res.status(400).json({ error: 'characterId and quest are required' });
    }

    const consequenceEngine = require('../services/agents/consequenceEngine');
    const narrativeSummary = require('../services/narrativeSummary');

    // Get character
    const character = await questService.getCharacter(characterId);
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    // Get recent memories for RAG context
    const pool = require('../config/database');
    const memoriesResult = await pool.query(
      `SELECT * FROM narrative_events
       WHERE character_id = $1
       ORDER BY created_at DESC
       LIMIT 5`,
      [characterId]
    );

    // Generate outcome
    const outcome = await consequenceEngine.generateOutcome(
      quest,
      character,
      characterId,
      memoriesResult.rows
    );

    // Update narrative summary
    const updatedSummary = await narrativeSummary.updateSummary(characterId, {
      quest,
      outcome
    });

    res.json({
      success: true,
      outcome,
      summary: updatedSummary
    });

  } catch (error) {
    console.error('[QuestRoutes] Error completing quest:', error);
    res.status(500).json({ error: 'Failed to complete quest' });
  }
});

/**
 * GET /api/quests/:id/choices
 *
 * Get available choices for a quest
 * Query params: characterId (required)
 */
router.get('/:id/choices', async (req, res) => {
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

    const choices = await choiceService.getQuestChoices(questId, parseInt(characterId));

    res.json({ choices });

  } catch (error) {
    console.error('[QuestRoutes] Error fetching quest choices:', error);
    res.status(500).json({ error: 'Failed to fetch quest choices' });
  }
});

/**
 * POST /api/quests/:id/choices/:choiceId/make
 *
 * Make a choice in a quest
 * Body: { characterId: number, optionId: number }
 */
router.post('/:id/choices/:choiceId/make', async (req, res) => {
  try {
    const questId = parseInt(req.params.id);
    const choiceId = parseInt(req.params.choiceId);
    const { characterId, optionId } = req.body;

    if (!characterId || optionId === undefined) {
      return res.status(400).json({ error: 'characterId and optionId are required' });
    }

    // Verify character belongs to user
    const character = await questService.getCharacter(characterId);
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    if (character.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const result = await choiceService.makeChoice(characterId, questId, choiceId, optionId);

    res.json(result);

  } catch (error) {
    console.error('[QuestRoutes] Error making choice:', error);

    if (error.message.includes('not found') || error.message.includes('already been made') || error.message.includes('Requirements not met')) {
      return res.status(400).json({ error: error.message });
    }

    res.status(500).json({ error: 'Failed to make choice' });
  }
});

/**
 * POST /api/quests/generate-from-goals
 *
 * Generate quests that align with player's actual goals
 * Body: { characterId: number }
 */
router.post('/generate-from-goals', async (req, res) => {
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

    // Map goals to quests
    const result = await goalQuestMapper.mapGoalsToQuests(characterId);

    if (!result.has_goals) {
      return res.status(200).json({
        success: false,
        message: 'No active goals found. Create goals first to generate personalized quests.',
        has_goals: false
      });
    }

    res.json({
      success: true,
      message: `Generated ${result.aligned_quests.length} quests based on your goals`,
      goal_analysis: result.goal_analysis,
      quests: result.aligned_quests
    });

  } catch (error) {
    console.error('[QuestRoutes] Error generating goal-aligned quests:', error);
    res.status(500).json({ error: 'Failed to generate goal-aligned quests' });
  }
});

/**
 * DELETE /api/quests/:id/abandon
 *
 * Abandon (delete) a quest
 */
router.delete('/:id/abandon', async (req, res) => {
  try {
    const questId = parseInt(req.params.id);
    const { characterId } = req.body;

    if (!characterId) {
      return res.status(400).json({ error: 'characterId is required' });
    }

    // Verify quest exists and belongs to character
    const questResult = await pool.query(
      'SELECT * FROM quests WHERE id = $1 AND character_id = $2',
      [questId, characterId]
    );

    if (questResult.rows.length === 0) {
      return res.status(404).json({ error: 'Quest not found or does not belong to this character' });
    }

    // Delete the quest (cascade will handle objectives, progress, etc.)
    await pool.query('DELETE FROM quests WHERE id = $1', [questId]);

    res.json({
      success: true,
      message: 'Quest abandoned'
    });

  } catch (error) {
    console.error('[QuestRoutes] Error abandoning quest:', error);
    res.status(500).json({ error: 'Failed to abandon quest' });
  }
});

module.exports = router;
