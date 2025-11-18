const claudeAPI = require('../claudeAPI');

/**
 * Combat Detector Agent
 *
 * Analyzes player actions and narrative context to detect when combat should be initiated.
 * This agent runs when high-risk actions are taken or enemies are encountered.
 *
 * Design Philosophy:
 * - Uses Haiku for speed & cost efficiency
 * - Detects combat triggers (attacking, being attacked, aggressive actions)
 * - Identifies enemies and their initial positioning
 * - Suggests encounter difficulty based on context
 *
 * Zone System (Hybrid Combat):
 * - Close: Melee range (5-10 ft)
 * - Near: Short range (30-60 ft) - ranged attacks possible
 * - Far: Long range (100+ ft) - disadvantage on ranged, can't melee
 */
class CombatDetector {
  /**
   * Analyze action and context to detect if combat should be initiated
   *
   * @param {string} action - Player's action description
   * @param {string} worldContext - Current scene/situation
   * @param {Object} character - Character data
   * @param {Array} recentEvents - Recent narrative events for context
   * @returns {Promise<Object>} - Combat detection result
   */
  async analyze(action, worldContext, character = null, recentEvents = []) {
    try {
      console.log('[CombatDetector] Analyzing action:', action.substring(0, 50));

      const prompt = this.buildPrompt(action, worldContext, character, recentEvents);

      // Use Haiku for fast, cheap detection
      const response = await claudeAPI.call({
        model: 'claude-haiku-3-20240307',
        system: this.getSystemPrompt(),
        messages: [{ role: 'user', content: prompt }],
        maxTokens: 500,
        temperature: 0.3, // Low temperature for consistent detection
        agentType: 'combat_detector',
        characterId: character?.id || 999,
        useCache: true
      });

      // Parse response
      const result = this.parseResponse(response.content);

      console.log('[CombatDetector] Result:', result.combatTriggered ? `Combat! ${result.enemies.length} enemies` : 'No combat');

      return result;

    } catch (error) {
      console.error('[CombatDetector] Error:', error.message);
      // Fallback to rule-based detection
      return this.getFallbackDetection(action, worldContext);
    }
  }

  /**
   * System prompt for combat detection
   */
  getSystemPrompt() {
    return `You are a D&D 5e Dungeon Master's combat detection system.

Your job is to analyze player actions and determine if they should trigger a combat encounter.

## COMBAT TRIGGER CRITERIA

Combat is triggered when:
- Player explicitly attacks an enemy or NPC
- Enemy/NPC attacks the player
- Player takes aggressive action that would provoke combat (threatening with weapon drawn, breaking into hostile territory)
- Narrative context indicates imminent danger (ambush, trap sprung, cornered by enemies)

Combat is NOT triggered when:
- Player is just talking or negotiating (even if tense)
- Player is exploring without immediate threat
- Enemies are present but not hostile yet (guards watching, but not attacking)
- The situation can be resolved through skill checks or roleplay

## ENEMY IDENTIFICATION

When combat is triggered, identify:
- **Enemy types** from context (bandits, wolves, guards, monsters, etc.)
- **Number of enemies** (reasonable for encounter balance)
- **Enemy stats** based on challenge level:
  - **Easy** (1-2 weak enemies): AC 12-13, HP 10-20, Attack +3
  - **Medium** (2-3 normal enemies): AC 14-15, HP 20-40, Attack +4-5
  - **Hard** (3-4 strong enemies or 1 boss): AC 16-17, HP 40-80, Attack +6-7

## ZONE SYSTEM (Hybrid Combat)

Determine initial positioning:
- **Close**: Melee combat range (5-10 ft) - can use melee attacks, no ranged disadvantage
- **Near**: Short range (30-60 ft) - ranged attacks effective, can move to Close in 1 turn
- **Far**: Long range (100+ ft) - ranged attacks at disadvantage, 2+ turns to reach Close

**Zone Assignment Rules:**
- Ambush/surprise: Enemies start at Close or Near
- Player initiates: Player chooses starting zone (usually Close if attacking)
- Patrolling enemies: Start at Near, can move closer
- Ranged enemies (archers): Prefer Near or Far
- Melee enemies (wolves, bandits): Start at Close or Near

## RESPONSE FORMAT

Respond with ONLY valid JSON:

{
  "combatTriggered": true/false,
  "reasoning": "Brief explanation of why combat is/isn't triggered",
  "enemies": [
    {
      "name": "Bandit Scout",
      "type": "humanoid",
      "ac": 13,
      "hp": 15,
      "maxHp": 15,
      "attackBonus": 3,
      "damageRoll": "1d6+1",
      "zone": "near",
      "description": "A scruffy bandit with a shortsword and leather armor"
    }
  ],
  "playerZone": "close" | "near" | "far",
  "encounterDifficulty": "easy" | "medium" | "hard",
  "narrativeSetup": "Brief description of how combat begins"
}

If no combat:
{
  "combatTriggered": false,
  "reasoning": "Situation doesn't warrant combat yet"
}

## EXAMPLES

**Player:** "I draw my sword and attack the bandit leader"
**Response:**
{
  "combatTriggered": true,
  "reasoning": "Player explicitly initiated combat",
  "enemies": [
    {"name": "Bandit Leader", "type": "humanoid", "ac": 15, "hp": 30, "maxHp": 30, "attackBonus": 5, "damageRoll": "1d8+3", "zone": "close", "description": "Scarred veteran with a longsword"}
  ],
  "playerZone": "close",
  "encounterDifficulty": "medium",
  "narrativeSetup": "You lunge at the bandit leader, blade drawn!"
}

**Player:** "I sneak past the sleeping guard"
**Response:**
{
  "combatTriggered": false,
  "reasoning": "Player is avoiding combat, not initiating it"
}

**Player:** "I continue down the forest path"
**Context:** "You hear growling from the bushes. Three wolves emerge, teeth bared."
**Response:**
{
  "combatTriggered": true,
  "reasoning": "Wolves are attacking - ambush situation",
  "enemies": [
    {"name": "Wolf", "type": "beast", "ac": 13, "hp": 11, "maxHp": 11, "attackBonus": 4, "damageRoll": "2d4+2", "zone": "near", "description": "Gray wolf with matted fur"},
    {"name": "Wolf", "type": "beast", "ac": 13, "hp": 11, "maxHp": 11, "attackBonus": 4, "damageRoll": "2d4+2", "zone": "near", "description": "Gray wolf with matted fur"},
    {"name": "Wolf", "type": "beast", "ac": 13, "hp": 11, "maxHp": 11, "attackBonus": 4, "damageRoll": "2d4+2", "zone": "close", "description": "Alpha wolf, larger than the others"}
  ],
  "playerZone": "close",
  "encounterDifficulty": "medium",
  "narrativeSetup": "The wolves surround you, growling menacingly. Roll initiative!"
}`;
  }

  /**
   * Build user prompt for combat detection
   */
  buildPrompt(action, worldContext, character, recentEvents) {
    let prompt = `Analyze this situation for combat:\n\n`;
    prompt += `**Player Action:** ${action}\n\n`;

    if (worldContext) {
      prompt += `**Current Scene:** ${worldContext.substring(0, 500)}\n\n`;
    }

    if (character) {
      prompt += `**Character:** ${character.name} (Level ${character.level || 1} ${character.class})\n`;
      prompt += `**Stats:** STR ${character.str || 10}, DEX ${character.dex || 10}, CON ${character.con || 10}\n\n`;
    }

    if (recentEvents && recentEvents.length > 0) {
      prompt += `**Recent Events:**\n`;
      recentEvents.slice(0, 3).forEach(event => {
        prompt += `- ${event.description || event.event_text}\n`;
      });
      prompt += `\n`;
    }

    prompt += `Should this trigger combat? If so, what enemies are present and where are they positioned?`;

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
        const match = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (match) {
          cleaned = match[1].trim();
        }
      }

      const parsed = JSON.parse(cleaned);

      // Validate structure
      if (typeof parsed.combatTriggered !== 'boolean') {
        throw new Error('Invalid response: combatTriggered must be boolean');
      }

      if (parsed.combatTriggered) {
        if (!Array.isArray(parsed.enemies) || parsed.enemies.length === 0) {
          throw new Error('Invalid response: enemies array required when combat triggered');
        }

        // Validate each enemy
        parsed.enemies.forEach(enemy => {
          if (!enemy.name || !enemy.ac || !enemy.hp || !enemy.zone) {
            throw new Error('Invalid enemy: missing required fields (name, ac, hp, zone)');
          }
        });

        if (!parsed.playerZone || !['close', 'near', 'far'].includes(parsed.playerZone)) {
          throw new Error('Invalid response: playerZone must be close/near/far');
        }
      }

      return {
        combatTriggered: parsed.combatTriggered,
        reasoning: parsed.reasoning || '',
        enemies: parsed.enemies || [],
        playerZone: parsed.playerZone || 'close',
        encounterDifficulty: parsed.encounterDifficulty || 'medium',
        narrativeSetup: parsed.narrativeSetup || ''
      };

    } catch (error) {
      console.error('[CombatDetector] Parse error:', error.message);
      throw error;
    }
  }

  /**
   * Fallback rule-based detection if AI fails
   */
  getFallbackDetection(action, worldContext) {
    const actionLower = action.toLowerCase();
    const contextLower = (worldContext || '').toLowerCase();

    // Explicit attack keywords
    if (actionLower.match(/\b(attack|strike|stab|slash|punch|kick|shoot|fire at)\b/)) {
      return {
        combatTriggered: true,
        reasoning: 'Player initiated combat (fallback detection)',
        enemies: [
          {
            name: 'Enemy',
            type: 'humanoid',
            ac: 14,
            hp: 20,
            maxHp: 20,
            attackBonus: 4,
            damageRoll: '1d8+2',
            zone: 'close',
            description: 'Generic enemy combatant'
          }
        ],
        playerZone: 'close',
        encounterDifficulty: 'medium',
        narrativeSetup: 'Combat begins!',
        fallback: true
      };
    }

    // Ambush/attack keywords in context
    if (contextLower.match(/\b(ambush|attack|charge|lunge|surround)\b/)) {
      return {
        combatTriggered: true,
        reasoning: 'Enemies are attacking (fallback detection)',
        enemies: [
          {
            name: 'Attacker',
            type: 'humanoid',
            ac: 13,
            hp: 15,
            maxHp: 15,
            attackBonus: 3,
            damageRoll: '1d6+1',
            zone: 'near',
            description: 'Hostile combatant'
          }
        ],
        playerZone: 'close',
        encounterDifficulty: 'easy',
        narrativeSetup: 'You are under attack!',
        fallback: true
      };
    }

    // Default: no combat
    return {
      combatTriggered: false,
      reasoning: 'No combat trigger detected (fallback)',
      fallback: true
    };
  }
}

module.exports = new CombatDetector();
