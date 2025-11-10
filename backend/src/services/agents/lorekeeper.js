const claudeAPI = require('../claudeAPI');
const modelRouter = require('../modelRouter');
const { WORLD_BIBLE } = require('../data/worldBible');

/**
 * Lorekeeper Agent
 *
 * Guardian of narrative consistency. Validates all AI-generated content against
 * the World Bible and established facts to prevent the "11 kids problem".
 *
 * Validation criteria:
 * - No contradictions with world rules
 * - NPC behavior matches personality
 * - Tone is consistent (earnest but not preachy)
 * - No forbidden tones (shame, toxic positivity, sarcasm)
 * - References to past events are accurate
 *
 * Outputs a consistency score (0-100) with target of 85+
 */

class Lorekeeper {
  /**
   * Validate a generated quest
   *
   * @param {Object} quest - Generated quest data
   * @param {Object} character - Character data
   * @param {number} characterId - Character ID
   * @returns {Promise<Object>} - Validation result
   */
  async validateQuest(quest, character, characterId) {
    try {
      console.log('[Lorekeeper] Validating quest:', quest.title);

      // Build validation prompt
      const prompt = this.buildValidationPrompt(quest, character);

      // Call Claude API with Sonnet 4.5 for deep validation
      const model = 'claude-sonnet-4-20250514';

      const response = await claudeAPI.call({
        model,
        system: this.getLorekeeperSystemPrompt(),
        messages: [{ role: 'user', content: prompt }],
        maxTokens: 512,
        temperature: 0.2, // Low temperature for consistent validation
        agentType: 'lorekeeper',
        characterId,
        useCache: false // Don't cache validations (each quest is unique)
      });

      // Parse validation result
      const validation = JSON.parse(response.content);

      // Validate response structure
      this.validateResult(validation);

      console.log('[Lorekeeper] Validation complete:', {
        score: validation.score,
        passed: validation.passed,
        violations: validation.violations?.length || 0
      });

      return {
        ...validation,
        metadata: {
          model: response.model,
          latency: response.latency,
          cost: response.cost
        }
      };

    } catch (error) {
      console.error('[Lorekeeper] Validation error:', error.message);

      // Fallback to rule-based validation
      return this.getFallbackValidation(quest);
    }
  }

  /**
   * Get Lorekeeper system prompt
   */
  getLorekeeperSystemPrompt() {
    return `You are the Lorekeeper for Dumbbells & Dragons, guardian of narrative consistency.

Your role is to validate generated content against the World Bible and ensure:
1. No contradictions with established world rules
2. NPC behavior matches their documented personality
3. Tone matches the required style (earnest but not preachy)
4. No forbidden tones (shame, toxic positivity, patronizing, sarcasm)
5. Magic system constraints are respected
6. References to locations/NPCs/events are accurate

<world_bible>
# Core Rules (NEVER VIOLATE)
${WORLD_BIBLE.core_rules.map((rule, i) => `${i + 1}. ${rule}`).join('\n')}

# Forbidden Tones
${WORLD_BIBLE.setting.forbidden_tones.map(t => `- ${t}`).join('\n')}

# Magic System Constraints
${WORLD_BIBLE.magic_system_constraints.map(c => `- ${c}`).join('\n')}

# Known NPCs
${Object.entries(WORLD_BIBLE.npcs).slice(0, 3).map(([key, npc]) => `
## ${npc.name}
- Personality: ${npc.personality}
- Never does: ${npc.never_does.join(', ')}
- Always does: ${npc.always_does.join(', ')}
`).join('\n')}

# Known Locations
${Object.entries(WORLD_BIBLE.locations).slice(0, 5).map(([key, loc]) => `
- ${loc.name}: ${loc.description}
`).join('\n')}
</world_bible>

Respond with ONLY valid JSON in this structure:
{
  "score": number (0-100),
  "passed": boolean (true if score >= 85),
  "violations": [
    {
      "type": "tone" | "contradiction" | "npc_behavior" | "magic_system" | "unknown_reference",
      "severity": "critical" | "major" | "minor",
      "description": string,
      "location": string (where in the quest this occurs)
    }
  ],
  "suggestions": [string] (how to fix violations),
  "strengths": [string] (what the quest does well)
}`;
  }

  /**
   * Build validation prompt
   */
  buildValidationPrompt(quest, character) {
    return `Validate this quest for narrative consistency:

<quest>
**Title:** ${quest.title}
**Description:** ${quest.description}
**Type:** ${quest.questType || 'side'}
**Difficulty:** ${quest.difficulty}
${quest.npcInvolved ? `**NPC:** ${quest.npcInvolved}` : ''}
${quest.theme ? `**Theme:** ${quest.theme}` : ''}

**Objectives:**
${quest.objectives.map((obj, i) => `${i + 1}. ${obj.description} (Reward: ${obj.statReward} +${obj.xpReward} XP)`).join('\n')}
</quest>

<character_context>
**Name:** ${character.name}
**Class:** ${character.class}
**Level:** ${character.level || 1}
**Stats:** STR ${character.str || 10}, DEX ${character.dex || 10}, CON ${character.con || 10}, INT ${character.int || 10}, WIS ${character.wis || 10}, CHA ${character.cha || 10}
</character_context>

Check for:
1. Tone violations (shaming, toxic positivity, patronizing, sarcastic)
2. Contradictions with world rules (e.g., mentions death, combat spells, character death)
3. NPC behavior inconsistencies
4. Unknown/invalid references (locations, NPCs, items not in world)
5. Magic system violations

Assign a score (0-100) where:
- 90-100: Excellent, no issues
- 85-89: Good, minor issues only
- 70-84: Acceptable, some major issues
- Below 70: Unacceptable, critical violations

Target is 85+ for publication.`;
  }

  /**
   * Validate result structure
   */
  validateResult(result) {
    if (typeof result.score !== 'number' || result.score < 0 || result.score > 100) {
      throw new Error('Invalid validation: score must be 0-100');
    }

    if (typeof result.passed !== 'boolean') {
      throw new Error('Invalid validation: passed must be boolean');
    }

    if (!Array.isArray(result.violations)) {
      throw new Error('Invalid validation: violations must be array');
    }

    result.violations.forEach((v, i) => {
      const validTypes = ['tone', 'contradiction', 'npc_behavior', 'magic_system', 'unknown_reference'];
      if (!validTypes.includes(v.type)) {
        throw new Error(`Invalid validation: violation ${i} has invalid type`);
      }

      const validSeverities = ['critical', 'major', 'minor'];
      if (!validSeverities.includes(v.severity)) {
        throw new Error(`Invalid validation: violation ${i} has invalid severity`);
      }
    });
  }

  /**
   * Fallback validation if AI fails
   */
  getFallbackValidation(quest) {
    const violations = [];
    let score = 100;

    // Check for forbidden words/phrases (rule-based)
    const forbiddenPhrases = [
      { phrase: 'you should', penalty: 10, type: 'tone', severity: 'major' },
      { phrase: 'pathetic', penalty: 20, type: 'tone', severity: 'critical' },
      { phrase: 'you failed', penalty: 15, type: 'tone', severity: 'major' },
      { phrase: 'death', penalty: 20, type: 'contradiction', severity: 'critical' },
      { phrase: 'die', penalty: 20, type: 'contradiction', severity: 'critical' },
      { phrase: 'kill', penalty: 15, type: 'contradiction', severity: 'major' },
      { phrase: 'fireball', penalty: 10, type: 'magic_system', severity: 'minor' },
      { phrase: 'lightning bolt', penalty: 10, type: 'magic_system', severity: 'minor' }
    ];

    const fullText = `${quest.title} ${quest.description} ${quest.objectives?.map(o => o.description).join(' ')}`.toLowerCase();

    forbiddenPhrases.forEach(({ phrase, penalty, type, severity }) => {
      if (fullText.includes(phrase)) {
        score -= penalty;
        violations.push({
          type,
          severity,
          description: `Contains forbidden phrase: "${phrase}"`,
          location: 'quest text'
        });
      }
    });

    // Check for unknown NPCs
    const knownNPCs = Object.values(WORLD_BIBLE.npcs).map(npc => npc.name.toLowerCase());
    if (quest.npcInvolved && !knownNPCs.includes(quest.npcInvolved.toLowerCase())) {
      score -= 15;
      violations.push({
        type: 'unknown_reference',
        severity: 'major',
        description: `References unknown NPC: "${quest.npcInvolved}"`,
        location: 'npcInvolved'
      });
    }

    return {
      score: Math.max(0, score),
      passed: score >= 85,
      violations,
      suggestions: violations.map(v => `Fix ${v.type}: ${v.description}`),
      strengths: score >= 85 ? ['No major violations detected'] : [],
      metadata: {
        fallback: true
      }
    };
  }

  /**
   * Batch validate multiple quests
   *
   * @param {Array} quests - Array of quest data
   * @param {Object} character - Character data
   * @param {number} characterId - Character ID
   * @returns {Promise<Array>} - Array of validation results
   */
  async batchValidate(quests, character, characterId) {
    const results = [];

    for (const quest of quests) {
      try {
        const validation = await this.validateQuest(quest, character, characterId);
        results.push({
          quest: quest.title,
          validation
        });

        // Rate limit between validations
        await this.sleep(500);
      } catch (error) {
        console.error(`[Lorekeeper] Failed to validate "${quest.title}":`, error.message);
        results.push({
          quest: quest.title,
          validation: {
            score: 0,
            passed: false,
            violations: [{ type: 'validation_error', severity: 'critical', description: error.message }]
          }
        });
      }
    }

    const passRate = results.filter(r => r.validation.passed).length / results.length * 100;
    console.log(`[Lorekeeper] Batch validation complete: ${passRate.toFixed(1)}% pass rate`);

    return results;
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = new Lorekeeper();
