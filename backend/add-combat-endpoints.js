const fs = require('fs');
const path = require('path');

const dmRoutePath = path.join(__dirname, 'src', 'routes', 'dm.js');
let content = fs.readFileSync(dmRoutePath, 'utf8');

// 1. Add CombatManager and ConditionService imports
if (!content.includes('const CombatManager')) {
  content = content.replace(
    "const QuestCreator = require('../services/agents/questCreator');",
    `const QuestCreator = require('../services/agents/questCreator');\nconst CombatManager = require('../services/combatManager');\nconst ConditionService = require('../services/conditionService');`
  );
}

// 2. Add GET /dm/combat/active endpoint
const activeEndpoint = `
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
`;

if (!content.includes('GET /dm/combat/active')) {
  // Insert before the module.exports line
  content = content.replace(
    'module.exports = router;',
    `${activeEndpoint}\nmodule.exports = router;`
  );
}

// 3. Add POST /dm/combat/action endpoint
const actionEndpoint = `
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
`;

if (!content.includes('POST /dm/combat/action')) {
  content = content.replace(
    'module.exports = router;',
    `${actionEndpoint}\nmodule.exports = router;`
  );
}

fs.writeFileSync(dmRoutePath, content, 'utf8');
console.log('✅ Combat endpoints added to dm.js');
