const express = require('express');
const router = express.Router();
const DMOrchestrator = require('../services/dmOrchestrator');
const StoryCoordinator = require('../services/agents/storyCoordinator');
const QuestCreator = require('../services/agents/questCreator');
const CombatManager = require('../services/combatManager');
const ConditionService = require('../services/conditionService');
const SkillCheckService = require('../services/skillCheckService');
const HealthConditionService = require('../services/healthConditionService');
const { optionalAuth } = require('../middleware/auth');

/**
 * POST /dm/interact
 * Process player action through full multi-agent pipeline
 */
router.post('/interact', optionalAuth, async (req, res) => {
  try {
    const { character, action, worldContext, recentMessages, sessionId } = req.body;

    if (!character || !action) {
      return res.status(400).json({ error: 'Character and action are required' });
    }

    // Enhance character with userId from auth if available
    const enhancedCharacter = {
      ...character,
      userId: req.user?.userId || character.userId || null
    };

    // Generate session ID if not provided
    const effectiveSessionId = sessionId || `session_${character.name}_${Date.now()}`;

    // Process through full orchestration pipeline
    const result = await DMOrchestrator.processAction({
      character: enhancedCharacter,
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
      metadata: result.metadata || {},
      skillCheckResult: result.skillCheckResult || null,
      combatState: result.combatState || null,
      pendingRoll: result.pendingRoll || null // For player agency dice rolling
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
 * POST /dm/combat/:encounterId/submit-initiative
 * Submit player's initiative roll
 */
router.post('/combat/:encounterId/submit-initiative', async (req, res) => {
  try {
    const { encounterId } = req.params;
    const { roll, characterId } = req.body;

    if (!roll) {
      return res.status(400).json({ error: 'Roll is required' });
    }

    if (!characterId) {
      return res.status(400).json({ error: 'Character ID is required' });
    }

    // Validate roll is between 1-20
    const rollValue = parseInt(roll);
    if (isNaN(rollValue) || rollValue < 1 || rollValue > 20) {
      return res.status(400).json({ error: 'Roll must be a number between 1 and 20' });
    }

    // Update player's initiative in combat
    const updatedCombat = await CombatManager.updatePlayerInitiative(
      parseInt(encounterId),
      parseInt(characterId),
      rollValue
    );

    // Generate narrative about turn order
    const initiativeOrder = updatedCombat.initiativeOrder;
    const playerCombatant = initiativeOrder.find(c => c.type === 'player');
    const firstCombatant = initiativeOrder[0];

    let turnOrderNarrative = `Initiative results! `;
    initiativeOrder.forEach((c, idx) => {
      if (c.type === 'player') {
        turnOrderNarrative += `You rolled ${c.playerRoll} + ${c.dexMod} = ${c.initiative}. `;
      } else {
        const enemyRoll = c.initiative - c.dexMod;
        turnOrderNarrative += `The ${c.name} rolled ${enemyRoll} + ${c.dexMod} = ${c.initiative}. `;
      }
    });

    turnOrderNarrative += `\n\n**${firstCombatant.name} goes first!** `;

    if (firstCombatant.type === 'player') {
      turnOrderNarrative += `It's your turn! What do you do?`;
    } else {
      turnOrderNarrative += `The ${firstCombatant.name} prepares to act...`;
    }

    res.json({
      combat: updatedCombat,
      narrative: turnOrderNarrative,
      roll: rollValue,
      modifier: playerCombatant.dexMod,
      total: playerCombatant.initiative
    });

  } catch (error) {
    console.error('Submit initiative error:', error);
    res.status(500).json({ error: 'Failed to submit initiative: ' + error.message });
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

/**
 * POST /dm/resolve-roll
 * Resolve a pending skill check/attack/initiative roll with player's dice result
 */
router.post('/resolve-roll', optionalAuth, async (req, res) => {
  try {
    const { characterId, rollType, roll, skillType, dc, encounterId } = req.body;

    if (!characterId || !rollType || roll === undefined) {
      return res.status(400).json({ error: 'characterId, rollType, and roll are required' });
    }

    // Validate roll is between 1-20
    const rollValue = parseInt(roll);
    if (isNaN(rollValue) || rollValue < 1 || rollValue > 20) {
      return res.status(400).json({ error: 'Roll must be a number between 1 and 20' });
    }

    let result = {};

    if (rollType === 'skill_check' && skillType && dc) {
      // Resolve skill check using player's roll
      const checkResult = await SkillCheckService.resolveCheck(
        parseInt(characterId),
        skillType,
        parseInt(dc),
        rollValue
      );

      // Generate narrative based on result
      const narrativeResult = checkResult.success
        ? `Your ${skillType} check succeeds! (${checkResult.total} vs DC ${dc})`
        : `Your ${skillType} check fails. (${checkResult.total} vs DC ${dc})`;

      result = {
        success: true,
        checkResult,
        narrative: narrativeResult
      };

    } else if (rollType === 'initiative' && encounterId) {
      // Resolve initiative roll
      const combatResult = await CombatManager.updatePlayerInitiative(
        parseInt(encounterId),
        parseInt(characterId),
        rollValue
      );

      result = {
        success: true,
        combatState: combatResult,
        narrative: `Initiative set to ${rollValue}!`
      };

    } else if (rollType === 'attack' && encounterId) {
      // Attack rolls handled separately through combat action
      result = {
        success: true,
        narrative: `Attack roll: ${rollValue}`,
        roll: rollValue
      };
    }

    res.json(result);

  } catch (error) {
    console.error('Resolve roll error:', error);
    res.status(500).json({ error: 'Failed to resolve roll: ' + error.message });
  }
});

/**
 * GET /dm/welcome/:characterId
 * Get the stored welcome narrative for a character
 */
router.get('/welcome/:characterId', async (req, res) => {
  try {
    const { characterId } = req.params;
    const memoryManager = require('../services/memoryManager');
    const pool = require('../config/database');

    // First try to get welcome narrative from working memory
    const memories = await memoryManager.getWorkingMemory(parseInt(characterId));
    const welcomeMemory = memories.find(m => m.eventType === 'welcome_narrative');

    if (welcomeMemory && welcomeMemory.eventDescription) {
      return res.json({
        narrative: welcomeMemory.eventDescription,
        source: 'memory'
      });
    }

    // Try to get from world_state narrative summary
    const worldStateResult = await pool.query(
      'SELECT narrative_summary FROM world_state WHERE character_id = $1',
      [parseInt(characterId)]
    );

    if (worldStateResult.rows.length > 0 && worldStateResult.rows[0].narrative_summary) {
      return res.json({
        narrative: worldStateResult.rows[0].narrative_summary,
        source: 'world_state'
      });
    }

    // No stored narrative found
    res.json({ narrative: null });

  } catch (error) {
    console.error('Get welcome narrative error:', error);
    res.json({ narrative: null, error: error.message });
  }
});

/**
 * GET /dm/health-conditions/:characterId
 * Get active health conditions for a character (fitness affects combat)
 */
router.get('/health-conditions/:characterId', async (req, res) => {
  try {
    const { characterId } = req.params;

    const conditions = await HealthConditionService.getActiveConditions(parseInt(characterId));

    res.json({
      conditions,
      statModifiers: await HealthConditionService.calculateTotalStatModifiers(parseInt(characterId))
    });

  } catch (error) {
    console.error('Get health conditions error:', error);
    res.status(500).json({ error: 'Failed to get health conditions' });
  }
});

module.exports = router;
