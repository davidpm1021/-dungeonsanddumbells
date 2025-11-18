const express = require('express');
const router = express.Router();
const DMOrchestrator = require('../services/dmOrchestrator');
const StoryCoordinator = require('../services/agents/storyCoordinator');
const QuestCreator = require('../services/agents/questCreator');
const CombatManager = require('../services/combatManager');
const ConditionService = require('../services/conditionService');

/**
 * POST /dm/interact
 * Process player action through full multi-agent pipeline
 */
router.post('/interact', async (req, res) => {
  try {
    const { character, action, worldContext, recentMessages, sessionId } = req.body;

    if (!character || !action) {
      return res.status(400).json({ error: 'Character and action are required' });
    }

    // Generate session ID if not provided
    const effectiveSessionId = sessionId || `session_${character.name}_${Date.now()}`;

    // Process through full orchestration pipeline
    const result = await DMOrchestrator.processAction({
      character,
      action,
      worldContext: worldContext || '',
      recentMessages: recentMessages || [],
      sessionId: effectiveSessionId
    });

    // Format response for frontend
    const response = {
      narrative: result.narrative || 'The world responds to your action...',
      continuation: result.continuation || null,
      sessionId: effectiveSessionId,
      metadata: result.metadata || {}
    };

    res.json(response);

  } catch (error) {
    console.error('DM interact error:', error);

    // Provide fallback response
    const fallback = generateFallbackResponse(req.body.action, req.body.character);
    res.json(fallback);
  }
});

/**
 * POST /dm/quest
 * Generate a new quest for the player
 */
router.post('/quest', async (req, res) => {
  try {
    const { character } = req.body;

    if (!character) {
      return res.status(400).json({ error: 'Character is required' });
    }

    // Check if quest is needed
    const coordResult = await StoryCoordinator.evaluateQuestNeed(character, 0);

    if (!coordResult.needsQuest) {
      return res.json({ message: 'No quest needed at this time' });
    }

    // Generate quest
    const quest = await QuestCreator.generateQuest(
      character,
      coordResult.questType || 'side',
      coordResult.suggestedTheme || 'exploration',
      coordResult.suggestedDifficulty || 'easy'
    );

    res.json(quest);

  } catch (error) {
    console.error('DM quest generation error:', error);
    res.status(500).json({ error: 'Failed to generate quest' });
  }
});

/**
 * Fallback response generator when AI is unavailable
 */
function generateFallbackResponse(action, character) {
  const actionLower = (action || '').toLowerCase();
  const charName = character?.name || 'Adventurer';
  const charClass = character?.class || 'Fighter';

  if (actionLower.includes('look') || actionLower.includes('examine')) {
    return {
      narrative: 'You carefully observe your surroundings. The details come into focus as you take in the scene before you. Every shadow holds potential secrets, every sound tells a story.',
      continuation: 'What catches your attention most?'
    };
  }

  if (actionLower.includes('attack') || actionLower.includes('fight') || actionLower.includes('strike')) {
    const weaponDesc = charClass === 'Fighter' ? 'Your weapon gleams with deadly intent' :
                       charClass === 'Mage' ? 'Arcane energy crackles at your fingertips' :
                       'Your blade whispers through the air';
    return {
      narrative: `${weaponDesc} as you prepare for combat! Your training kicks in, every muscle tensed and ready for action.`,
      continuation: 'Roll for initiative! What is your combat strategy?'
    };
  }

  if (actionLower.includes('talk') || actionLower.includes('speak') || actionLower.includes('ask') || actionLower.includes('approach')) {
    return {
      narrative: 'You step forward to engage in conversation, your words carrying the weight of your intentions. Your presence commands attention.',
      continuation: 'The listener turns their attention to you expectantly. What do you say?'
    };
  }

  if (actionLower.includes('rest') || actionLower.includes('sleep') || actionLower.includes('camp')) {
    return {
      narrative: 'You find a moment of respite, allowing your body and mind to recover. The weariness of adventure fades as you rest.',
      continuation: 'As you rest, you reflect on your journey so far. What memories come to mind?'
    };
  }

  if (actionLower.includes('search') || actionLower.includes('investigate')) {
    return {
      narrative: 'You begin a thorough investigation, your keen senses alert for any clues. Nothing escapes your careful scrutiny.',
      continuation: 'Your search reveals interesting details. What are you hoping to find?'
    };
  }

  if (actionLower.includes('cast') || actionLower.includes('spell') || actionLower.includes('magic')) {
    return {
      narrative: 'You channel your inner power, feeling the mystical energies flow through you. The air around you shimmers with potential.',
      continuation: 'The magic responds to your will. What effect are you trying to achieve?'
    };
  }

  // Default response
  return {
    narrative: `${charName} ${action}. The world responds to your action, and new possibilities unfold before you.`,
    continuation: 'What do you do next?'
  };
}


/**
 * GET /dm/combat/active
 * Check if character has active combat
 */
router.get('/combat/active', async (req, res) => {
  try {
    const { characterId } = req.query;

    if (!characterId) {
      return res.status(400).json({ error: 'Character ID is required' });
    }

    const activeCombat = await CombatManager.getActiveCombat(parseInt(characterId));

    if (activeCombat) {
      // Get active conditions
      const activeConditions = await ConditionService.getActiveConditions(parseInt(characterId));

      res.json({
        ...activeCombat,
        activeConditions
      });
    } else {
      res.status(404).json({ message: 'No active combat' });
    }

  } catch (error) {
    console.error('Get active combat error:', error);
    res.status(500).json({ error: 'Failed to get active combat' });
  }
});


/**
 * POST /dm/combat/action
 * Process a combat action
 */
router.post('/combat/action', async (req, res) => {
  try {
    const { encounterId, action } = req.body;

    if (!encounterId || !action) {
      return res.status(400).json({ error: 'Encounter ID and action are required' });
    }

    const result = await CombatManager.processCombatAction(encounterId, action);

    // Check if combat ended
    const encounter = await CombatManager.getActiveCombatByEncounterId(encounterId);
    const combatEnded = !encounter || encounter.status !== 'active';

    res.json({
      ...result,
      combatEnded,
      victoryMessage: combatEnded && encounter?.status === 'victory'
        ? 'Victory! All enemies have been defeated!'
        : combatEnded && encounter?.status === 'defeat'
        ? 'You have been defeated...'
        : null
    });

  } catch (error) {
    console.error('Combat action error:', error);
    res.status(500).json({ error: 'Failed to process combat action: ' + error.message });
  }
});

module.exports = router;
