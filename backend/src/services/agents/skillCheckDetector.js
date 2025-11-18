const claudeAPI = require('../claudeAPI');

/**
 * Skill Check Detector Agent
 *
 * Analyzes player actions to determine when skill checks are needed in D&D gameplay.
 * This agent runs on EVERY player action to detect opportunities for skill checks.
 *
 * Design Philosophy:
 * - Uses Haiku for speed & cost efficiency (called frequently)
 * - Detects implicit skill checks (climbing, sneaking, persuading, etc.)
 * - Calculates appropriate DC based on narrative difficulty
 * - Integrates with D&D 5e skill system
 *
 * Skill → Ability Score Mapping (D&D 5e):
 * - STR: Athletics
 * - DEX: Acrobatics, Sleight of Hand, Stealth
 * - INT: Arcana, History, Investigation, Nature, Religion
 * - WIS: Animal Handling, Insight, Medicine, Perception, Survival
 * - CHA: Deception, Intimidation, Performance, Persuasion
 */
class SkillCheckDetector {
  /**
   * Analyze player action to detect if skill check is needed
   *
   * @param {string} action - Player's action description
   * @param {string} worldContext - Current scene/situation
   * @param {Object} character - Character data (for context)
   * @returns {Promise<Object>} - Skill check requirement
   */
  async analyze(action, worldContext, character = null) {
    try {
      console.log('[SkillCheckDetector] Analyzing action:', action.substring(0, 50));

      const prompt = this.buildPrompt(action, worldContext, character);

      // Use Haiku for fast, cheap detection
      const response = await claudeAPI.call({
        model: 'claude-haiku-3-20240307',
        system: this.getSystemPrompt(),
        messages: [{ role: 'user', content: prompt }],
        maxTokens: 300,
        temperature: 0.3, // Low temperature for consistent detection
        agentType: 'skill_check_detector',
        characterId: character?.id || 999,
        useCache: true // Cache similar action patterns
      });

      // Parse response
      const result = this.parseResponse(response.content);

      console.log('[SkillCheckDetector] Result:', result.requiresCheck ? `${result.skillType} DC${result.dc}` : 'No check needed');

      return result;

    } catch (error) {
      console.error('[SkillCheckDetector] Error:', error.message);
      // Fallback to rule-based detection
      return this.getFallbackDetection(action);
    }
  }

  /**
   * System prompt for skill check detection
   */
  getSystemPrompt() {
    return `You are a D&D 5e Dungeon Master's skill check detection system.

Your job is to analyze player actions and determine if they require a skill check.

## SKILL CHECK CRITERIA

A skill check is needed when:
- The action has a meaningful chance of failure
- The outcome significantly affects the narrative
- The action requires a specific skill (Athletics, Stealth, Persuasion, etc.)

A skill check is NOT needed when:
- The action is trivial or automatic (walking, talking normally)
- The outcome doesn't matter narratively
- It would slow down gameplay unnecessarily

## D&D 5e SKILLS BY ABILITY SCORE

**Strength:**
- Athletics: Climbing, jumping, swimming, breaking objects

**Dexterity:**
- Acrobatics: Balance, tumbling, aerial maneuvers
- Sleight of Hand: Pickpocketing, concealing objects, trickery
- Stealth: Sneaking, hiding, moving silently

**Intelligence:**
- Arcana: Magic knowledge, identifying spells
- History: Recalling lore, past events
- Investigation: Finding clues, deduction, research
- Nature: Knowledge of terrain, plants, animals
- Religion: Knowledge of deities, rituals, holy symbols

**Wisdom:**
- Animal Handling: Calming or controlling animals
- Insight: Reading people, detecting lies
- Medicine: Treating wounds, diagnosing illness
- Perception: Noticing details, detecting hidden things
- Survival: Tracking, foraging, navigating wilderness

**Charisma:**
- Deception: Lying convincingly, disguises
- Intimidation: Threatening, coercing
- Performance: Acting, music, entertaining
- Persuasion: Convincing, negotiating, diplomacy

## DIFFICULTY CLASS (DC) GUIDELINES

- **DC 10 (Easy):** Simple tasks with some risk
  - Climbing a rope with knots
  - Sneaking past inattentive guards
  - Convincing someone of something they want to believe

- **DC 15 (Medium):** Moderately difficult tasks
  - Climbing a rough cliff face
  - Sneaking past alert guards
  - Persuading someone neutral to help you

- **DC 20 (Hard):** Difficult tasks requiring expertise
  - Climbing a smooth wall with few handholds
  - Sneaking past guards on high alert in broad daylight
  - Convincing a hostile NPC to change their mind

- **DC 25+ (Very Hard):** Near-impossible tasks
  - Only for truly extraordinary circumstances

## RESPONSE FORMAT

Respond with ONLY valid JSON:

{
  "requiresCheck": true/false,
  "skillType": "Athletics" | "Perception" | "Stealth" | etc. (if check required),
  "dc": 10 | 15 | 20 | 25 (if check required),
  "reasoning": "Brief explanation of why check is needed and difficulty"
}

If no check is needed:
{
  "requiresCheck": false,
  "reasoning": "Action is trivial/automatic"
}

## EXAMPLES

**Player:** "I climb the cliff to reach the hermitage"
**Response:** {"requiresCheck": true, "skillType": "Athletics", "dc": 15, "reasoning": "Climbing a natural cliff requires an Athletics check. DC 15 for medium difficulty rocky terrain."}

**Player:** "I sneak past the sleeping guard"
**Response:** {"requiresCheck": true, "skillType": "Stealth", "dc": 10, "reasoning": "Sneaking past a sleeping guard still requires stealth. DC 10 because they're asleep."}

**Player:** "I try to convince the merchant to lower their prices"
**Response:** {"requiresCheck": true, "skillType": "Persuasion", "dc": 15, "reasoning": "Negotiating prices requires Persuasion. DC 15 for a neutral merchant."}

**Player:** "I look around the room"
**Response:** {"requiresCheck": false, "reasoning": "Basic observation doesn't require a check unless searching for hidden objects."}

**Player:** "I walk down the street"
**Response:** {"requiresCheck": false, "reasoning": "Normal movement is automatic and doesn't require a check."}`;
  }

  /**
   * Build user prompt for skill check detection
   */
  buildPrompt(action, worldContext, character) {
    let prompt = `Analyze this player action:\n\n`;
    prompt += `**Action:** ${action}\n\n`;

    if (worldContext) {
      prompt += `**Scene:** ${worldContext.substring(0, 500)}\n\n`;
    }

    if (character) {
      prompt += `**Character:** ${character.name} (Level ${character.level || 1} ${character.class})\n\n`;
    }

    prompt += `Does this action require a skill check? If so, which skill and what DC?`;

    return prompt;
  }

  /**
   * Parse Claude's response
   */
  parseResponse(content) {
    try {
      let cleaned = content.trim();

      // Remove markdown code blocks
      if (cleaned.startsWith('```')) {
        const match = cleaned.match(/```(?:json)?\s*([\\s\\S]*?)\s*```/);
        if (match) {
          cleaned = match[1].trim();
        }
      }

      const parsed = JSON.parse(cleaned);

      // Validate structure
      if (typeof parsed.requiresCheck !== 'boolean') {
        throw new Error('Invalid response: requiresCheck must be boolean');
      }

      if (parsed.requiresCheck) {
        if (!parsed.skillType || typeof parsed.skillType !== 'string') {
          throw new Error('Invalid response: skillType required when check needed');
        }
        if (!parsed.dc || typeof parsed.dc !== 'number') {
          throw new Error('Invalid response: dc required when check needed');
        }
      }

      return {
        requiresCheck: parsed.requiresCheck,
        skillType: parsed.skillType || null,
        dc: parsed.dc || null,
        reasoning: parsed.reasoning || ''
      };

    } catch (error) {
      console.error('[SkillCheckDetector] Parse error:', error.message);
      throw error;
    }
  }

  /**
   * Fallback rule-based detection if AI fails
   */
  getFallbackDetection(action) {
    const actionLower = action.toLowerCase();

    // Climbing/jumping (Athletics)
    if (actionLower.match(/\b(climb|jump|leap|scale|ascend)\b/)) {
      return {
        requiresCheck: true,
        skillType: 'Athletics',
        dc: 15,
        reasoning: 'Physical activity detected (fallback detection)',
        fallback: true
      };
    }

    // Sneaking/hiding (Stealth)
    if (actionLower.match(/\b(sneak|hide|stealthy|quietly|silent)\b/)) {
      return {
        requiresCheck: true,
        skillType: 'Stealth',
        dc: 15,
        reasoning: 'Stealth activity detected (fallback detection)',
        fallback: true
      };
    }

    // Searching/investigating (Perception or Investigation)
    if (actionLower.match(/\b(search|investigate|examine|look for|find)\b/)) {
      return {
        requiresCheck: true,
        skillType: 'Perception',
        dc: 15,
        reasoning: 'Search activity detected (fallback detection)',
        fallback: true
      };
    }

    // Social interaction (Persuasion, Deception, Intimidation)
    if (actionLower.match(/\b(convince|persuade|negotiate|bargain)\b/)) {
      return {
        requiresCheck: true,
        skillType: 'Persuasion',
        dc: 15,
        reasoning: 'Persuasion detected (fallback detection)',
        fallback: true
      };
    }

    if (actionLower.match(/\b(lie|deceive|trick|bluff)\b/)) {
      return {
        requiresCheck: true,
        skillType: 'Deception',
        dc: 15,
        reasoning: 'Deception detected (fallback detection)',
        fallback: true
      };
    }

    if (actionLower.match(/\b(threaten|intimidate|scare|coerce)\b/)) {
      return {
        requiresCheck: true,
        skillType: 'Intimidation',
        dc: 15,
        reasoning: 'Intimidation detected (fallback detection)',
        fallback: true
      };
    }

    // Default: no check needed
    return {
      requiresCheck: false,
      reasoning: 'No skill check pattern detected (fallback)',
      fallback: true
    };
  }
}

module.exports = new SkillCheckDetector();
