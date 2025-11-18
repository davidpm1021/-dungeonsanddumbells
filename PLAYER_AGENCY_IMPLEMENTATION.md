# Player Agency & Dice Rolling Implementation Plan

**Status:** Phase 1 Complete (DM Prompts Updated) - Remaining phases needed for full implementation

**Core Principle:** Never roll dice for the player. Never decide player actions.

---

## ✅ Phase 1: DM Narrative Prompts (COMPLETE)

**What Was Done:**
1. ✅ Added "CORE PRINCIPLE: PLAYER AGENCY" section to DM Orchestrator system prompt
2. ✅ Updated combat initialization to prompt player to roll instead of announcing auto-rolled results
3. ✅ Documented player agency as core principle in CLAUDE.md
4. ✅ DM now explicitly instructed to say: "Roll for initiative!" instead of "You rolled a 15"

**What This Achieves:**
- DM narrator will now ASK for rolls instead of announcing results
- Sets proper expectations: player is in control
- Example output: "The bandit draws his sword! Roll for initiative - roll a d20 and add your DEX modifier (+3)! I rolled an 11 for the bandit. What did you roll?"

**What's Still Missing:**
- System still auto-rolls initiative in backend (placeholder)
- No way for player to submit their actual roll
- Frontend has no dice roller or input field
- Skill checks still auto-roll for player

---

## Phase 2: Backend - Combat Roll Submission (IN PROGRESS)

### 2A. Update CombatManager to Accept Player Rolls

**File:** `backend/src/services/combatManager.js`

**Changes Needed:**

```javascript
// Current: rollInitiative() auto-rolls for player
rollInitiative(character, enemies) {
  const playerInitiative = this.rollD20(false, false) + playerDexMod; // ❌ Auto-rolling
  ...
}

// Needed: Accept player's roll as parameter
async initializeEncounter(characterId, combatData, questId = null, playerInitiativeRoll = null) {
  // If playerInitiativeRoll provided, use it
  // Otherwise, use placeholder (to be updated later)
  const initiativeOrder = this.rollInitiative(character, combatData.enemies, playerInitiativeRoll);
  ...
}

rollInitiative(character, enemies, playerRoll = null) {
  const combatants = [];
  const playerDexMod = Math.floor((character.dex - 10) / 2);

  // Use player's roll if provided, otherwise placeholder
  const playerInitiative = playerRoll !== null
    ? playerRoll + playerDexMod
    : 10 + playerDexMod; // Neutral placeholder

  combatants.push({
    name: character.name,
    type: 'player',
    initiative: playerInitiative,
    dexMod: playerDexMod,
    needsRoll: playerRoll === null // Flag to indicate player hasn't rolled yet
  });
  ...
}
```

### 2B. Create Endpoint for Submitting Initiative Roll

**File:** `backend/src/routes/dm.js`

**New Endpoint:**

```javascript
// POST /api/dm/combat/:encounterId/submit-initiative
// Body: { roll: 15 } (player's d20 roll, system adds modifiers)
router.post('/combat/:encounterId/submit-initiative', loadCharacter, async (req, res) => {
  try {
    const { encounterId } = req.params;
    const { roll } = req.body; // Player's raw d20 roll (1-20)

    if (!roll || roll < 1 || roll > 20) {
      return res.status(400).json({ error: 'Invalid roll. Must be between 1 and 20.' });
    }

    // Get character DEX modifier
    const character = await characterService.getCharacterById(req.character.id);
    const dexMod = Math.floor((character.dex - 10) / 2);
    const total = roll + dexMod;

    // Update combat encounter with player's initiative
    const updatedCombat = await CombatManager.updatePlayerInitiative(
      encounterId,
      req.character.id,
      total,
      dexMod
    );

    // Re-sort initiative order
    updatedCombat.initiativeOrder.sort((a, b) => b.initiative - a.initiative);
    updatedCombat.currentTurnIndex = 0; // Reset to first in new order

    // Generate narrative announcing turn order
    const turnOrderNarrative = generateTurnOrderNarrative(updatedCombat);

    res.json({
      combat: updatedCombat,
      narrative: turnOrderNarrative,
      roll: roll,
      modifier: dexMod,
      total: total
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### 2C. Add Method to Update Initiative

**File:** `backend/src/services/combatManager.js`

```javascript
async updatePlayerInitiative(encounterId, characterId, initiative, dexMod) {
  // Get current combat state
  const combat = await db.query(
    'SELECT * FROM combat_encounters WHERE id = $1 AND character_id = $2',
    [encounterId, characterId]
  );

  if (combat.rows.length === 0) {
    throw new Error('Combat encounter not found');
  }

  const encounterData = combat.rows[0];
  const initiativeOrder = encounterData.initiative_order;

  // Update player's initiative in order
  const playerIndex = initiativeOrder.findIndex(c => c.type === 'player');
  if (playerIndex !== -1) {
    initiativeOrder[playerIndex].initiative = initiative;
    initiativeOrder[playerIndex].dexMod = dexMod;
    initiativeOrder[playerIndex].needsRoll = false;
  }

  // Re-sort by initiative
  initiativeOrder.sort((a, b) => b.initiative - a.initiative);

  // Update database
  await db.query(
    'UPDATE combat_encounters SET initiative_order = $1, current_turn_index = 0 WHERE id = $2',
    [JSON.stringify(initiativeOrder), encounterId]
  );

  return this.getActiveCombat(characterId);
}
```

---

## Phase 3: Backend - Skill Check Roll Submission

### 3A. Update Skill Check Flow

**File:** `backend/src/services/skillCheckService.js`

**Changes Needed:**

```javascript
// Current: performCheck() auto-rolls for player
async performCheck(characterId, skillType, dc) {
  const roll = this.rollD20(); // ❌ Auto-rolling
  ...
}

// Needed: Accept player's roll
async performCheck(characterId, skillType, dc, playerRoll = null) {
  const roll = playerRoll !== null ? playerRoll : 10; // Use player roll or neutral placeholder
  ...
  return {
    ...result,
    needsRoll: playerRoll === null
  };
}
```

### 3B. Create Endpoint for Submitting Skill Check Roll

**File:** `backend/src/routes/dm.js`

```javascript
// POST /api/dm/skill-check/submit-roll
// Body: { skillCheckId: 123, roll: 18 }
router.post('/skill-check/submit-roll', loadCharacter, async (req, res) => {
  try {
    const { skillCheckId, roll } = req.body;

    if (!roll || roll < 1 || roll > 20) {
      return res.status(400).json({ error: 'Invalid roll. Must be between 1 and 20.' });
    }

    // Retrieve pending skill check from session/database
    const skillCheck = await getStoredSkillCheck(skillCheckId);

    // Re-run check with player's roll
    const result = await skillCheckService.performCheck(
      req.character.id,
      skillCheck.skillType,
      skillCheck.dc,
      roll // Player's roll
    );

    // Generate narrative based on success/failure
    const narrative = await dmOrchestrator.narrateSkillCheckResult(
      req.character,
      skillCheck.action,
      result
    );

    res.json({
      skillCheck: result,
      narrative: narrative
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

---

## Phase 4: Frontend - Dice Roller UI

### 4A. Create Dice Roller Component

**File:** `frontend/src/components/DiceRoller.jsx`

**Features:**
- Animated 3D d20 roll (CSS or library like `react-dice-complete`)
- Manual input field as alternative
- Shows modifier clearly: "Roll d20 + 3 (DEX)"
- Displays result: "You rolled 15 + 3 = 18"
- Submit button to send roll to backend

**Component Structure:**

```jsx
import React, { useState } from 'react';

const DiceRoller = ({
  diceType = 'd20',
  modifier = 0,
  modifierLabel = '',
  onRollSubmit,
  purpose = 'roll' // 'initiative', 'attack', 'skill', 'damage'
}) => {
  const [roll, setRoll] = useState(null);
  const [manualInput, setManualInput] = useState('');
  const [isRolling, setIsRolling] = useState(false);

  const handleDigitalRoll = () => {
    setIsRolling(true);
    // Animate dice roll
    setTimeout(() => {
      const result = Math.floor(Math.random() * 20) + 1;
      setRoll(result);
      setIsRolling(false);
    }, 1000); // Animation duration
  };

  const handleManualSubmit = () => {
    const value = parseInt(manualInput);
    if (value >= 1 && value <= 20) {
      setRoll(value);
    }
  };

  const handleSubmit = () => {
    if (roll) {
      onRollSubmit({ roll, total: roll + modifier, modifier });
    }
  };

  const total = roll ? roll + modifier : null;

  return (
    <div className="dice-roller">
      <h3>Roll {diceType} {modifier >= 0 ? '+' : ''}{modifier} ({modifierLabel})</h3>

      {/* Digital Dice Roller */}
      <div className="digital-dice">
        <div className={`dice ${isRolling ? 'rolling' : ''}`}>
          {roll || '?'}
        </div>
        <button onClick={handleDigitalRoll} disabled={isRolling}>
          {isRolling ? 'Rolling...' : 'Roll Dice'}
        </button>
      </div>

      {/* Manual Input Option */}
      <div className="manual-input">
        <p>Or enter your physical dice roll:</p>
        <input
          type="number"
          min="1"
          max="20"
          value={manualInput}
          onChange={(e) => setManualInput(e.target.value)}
          placeholder="Enter 1-20"
        />
        <button onClick={handleManualSubmit}>Use This Roll</button>
      </div>

      {/* Result Display */}
      {roll && (
        <div className="roll-result">
          <p className="result-text">
            You rolled: <strong>{roll}</strong> + {modifier} = <strong>{total}</strong>
          </p>
          <button onClick={handleSubmit} className="btn-primary">
            Submit Roll
          </button>
        </div>
      )}
    </div>
  );
};

export default DiceRoller;
```

### 4B. Integrate into DungeonMaster Component

**File:** `frontend/src/pages/DungeonMaster.jsx`

**Changes:**

```jsx
import DiceRoller from '../components/DiceRoller';

// Add state for pending rolls
const [pendingRoll, setPendingRoll] = useState(null);
// pendingRoll = { type: 'initiative', data: { encounterId, dexMod } }

// When combat starts and initiative needed
if (result.metadata?.combatTriggered && !result.metadata?.initiativeComplete) {
  setPendingRoll({
    type: 'initiative',
    data: {
      encounterId: result.combatState.id,
      dexMod: character.dex ? Math.floor((character.dex - 10) / 2) : 0
    }
  });
}

// Render dice roller when pending
{pendingRoll && pendingRoll.type === 'initiative' && (
  <DiceRoller
    diceType="d20"
    modifier={pendingRoll.data.dexMod}
    modifierLabel="DEX"
    purpose="initiative"
    onRollSubmit={async ({ roll, total, modifier }) => {
      try {
        const response = await api.dm.submitInitiative(pendingRoll.data.encounterId, roll);
        setCombat(response.data.combat);
        addMessage('system', response.data.narrative);
        setPendingRoll(null);
      } catch (error) {
        addMessage('system', `Error submitting initiative: ${error.message}`);
      }
    }}
  />
)}
```

### 4C. Create API Service Methods

**File:** `frontend/src/services/api.js`

```javascript
dm: {
  interact: (data) => axios.post('/api/dm/interact', data),
  submitInitiative: (encounterId, roll) =>
    axios.post(`/api/dm/combat/${encounterId}/submit-initiative`, { roll }),
  submitSkillCheck: (skillCheckId, roll) =>
    axios.post('/api/dm/skill-check/submit-roll', { skillCheckId, roll }),
  submitAttack: (encounterId, roll) =>
    axios.post(`/api/dm/combat/${encounterId}/submit-attack`, { roll }),
  submitDamage: (encounterId, rolls) =>
    axios.post(`/api/dm/combat/${encounterId}/submit-damage`, { rolls })
},
```

---

## Phase 5: Agent Prompts - Player Agency Guidelines

Apply the same "NEVER ROLL FOR PLAYER" principle to all agents:

### Files to Update:

1. **`backend/src/services/promptBuilder.js`** - Add player agency section to all agent prompts
2. **`backend/src/services/agents/storyCoordinator.js`** - Quest suggestions, not mandates
3. **`backend/src/services/agents/questCreator.js`** - Offer choices, don't force paths
4. **`backend/src/services/agents/consequenceEngine.js`** - React to choices, don't override
5. **`backend/src/services/agents/lorekeeper.js`** - Validate consistency with player agency

**Common Addition to All Agent Prompts:**

```
## PLAYER AGENCY PRINCIPLE

NEVER:
- Roll dice for the player
- Decide what the player does
- Override player choices
- Force a specific path

ALWAYS:
- Offer choices and consequences
- React to player decisions
- Prompt for player input when needed
- Respect player autonomy
```

---

## Success Criteria

**Phase 1 (Complete):**
- ✅ DM narrative prompts for rolls instead of announcing
- ✅ Player agency documented in CLAUDE.md
- ✅ DM Orchestrator system prompt updated

**Phase 2 (Backend - Combat):**
- ⚠️ Combat initialization accepts optional player roll parameter
- ⚠️ API endpoint to submit initiative roll
- ⚠️ CombatManager method to update player initiative
- ⚠️ Turn order recalculated after player submits roll

**Phase 3 (Backend - Skill Checks):**
- ⚠️ Skill check flow accepts optional player roll parameter
- ⚠️ API endpoint to submit skill check roll
- ⚠️ Skill check results calculated with player's roll

**Phase 4 (Frontend):**
- ⚠️ DiceRoller component with animation
- ⚠️ Manual input option for physical dice
- ⚠️ Integration into DungeonMaster component
- ⚠️ UI prompts when rolls are needed
- ⚠️ Submit buttons for initiative, attacks, skill checks

**Phase 5 (Agent Prompts):**
- ⚠️ All agent prompts include player agency guidelines
- ⚠️ Agents suggest rather than mandate
- ⚠️ Agents react rather than decide

---

## User Experience Flow (Target)

**Example: Combat Initiation**

1. **Player action:** "I attack the bandit!"
2. **DM response:** "The bandit draws his sword, eyes wild! Roll for initiative - roll a d20 and add your DEX modifier (+3)! I rolled an 11 for the bandit. What did you roll?"
3. **UI shows:**
   - Digital d20 dice roller button
   - OR manual input field: "Enter your physical dice roll (1-20)"
4. **Player rolls:** Clicks dice (rolls 15) OR enters 15
5. **UI displays:** "You rolled 15 + 3 = 18!"
6. **Player clicks:** "Submit Roll"
7. **DM response:** "You rolled an 18! The bandit rolled 11. You go first! The battle begins. What do you do?"
8. **Combat UI shows:** Turn order, HP bars, action buttons

**Example: Skill Check**

1. **Player action:** "I try to climb the cliff"
2. **DM response:** "The cliff face is steep and slippery. Roll an Athletics check - roll a d20 and add your STR modifier (+2). The DC is 15."
3. **UI shows dice roller**
4. **Player rolls 13**
5. **UI displays:** "You rolled 13 + 2 = 15!"
6. **Player clicks:** "Submit Roll"
7. **DM response:** "You barely manage to find handholds, pulling yourself up the cliff face. You reach the top, winded but successful!"

---

## Implementation Priority

1. **HIGH:** Phase 2A-C (Combat initiative roll submission) - Most visible, frequently used
2. **HIGH:** Phase 4A-B (Frontend dice roller) - Required for player interaction
3. **MEDIUM:** Phase 3A-B (Skill check roll submission) - Common but less critical than combat
4. **MEDIUM:** Phase 5 (Agent prompt updates) - Reinforces consistency
5. **LOW:** Advanced dice features (damage rolls, saving throws) - Can add incrementally

---

## Next Steps

1. ✅ Test current DM narrative changes (should now prompt for rolls)
2. Implement Phase 2: Backend combat roll submission endpoints
3. Implement Phase 4A: Create DiceRoller component
4. Integrate dice roller into DungeonMaster component
5. Test full flow: combat trigger → roll prompt → player rolls → submit → turn order announced
6. Extend to skill checks and attack rolls
7. Update all agent prompts with player agency guidelines

**The goal:** Make the player FEEL like they're sitting at a table, rolling real dice, with a DM who respects their choices.
