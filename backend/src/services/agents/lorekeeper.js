const claudeAPI = require('../claudeAPI');
const modelRouter = require('../modelRouter');
const { WORLD_BIBLE } = require('../../data/worldBible');

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

      // Parse validation result (strip markdown code blocks if present)
      const cleanedContent = this.extractJSON(response.content);
      const validation = JSON.parse(cleanedContent);

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
   * Extract JSON from response (handles markdown code blocks)
   */
  extractJSON(content) {
    let cleaned = content.trim();

    // Remove markdown code blocks if present - more aggressive approach
    if (cleaned.startsWith('```')) {
      // Try regex matching first
      const jsonMatch = cleaned.match(/```json\s*([\s\S]*?)\s*```/i);
      if (jsonMatch) {
        cleaned = jsonMatch[1].trim();
      } else {
        // Fallback: also handle plain ``` blocks
        const codeMatch = cleaned.match(/```\s*([\s\S]*?)\s*```/);
        if (codeMatch) {
          cleaned = codeMatch[1].trim();
        } else {
          // Last resort: simple replacement
          cleaned = cleaned.replace(/^```[a-z]*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
        }
      }
    }

    // Final validation - ensure it looks like JSON
    if (!cleaned.startsWith('{') && !cleaned.startsWith('[')) {
      console.error('[Lorekeeper] Content does not appear to be JSON:', cleaned.substring(0, 100));
      throw new Error('Response does not appear to be valid JSON');
    }

    return cleaned;
  }

  /**
   * Get Lorekeeper system prompt
   */
  getLorekeeperSystemPrompt() {
    // Serial Position Effect: Place World Bible at BOTH start AND end
    const worldBibleSection = `<world_bible>
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
</world_bible>`;

    return `You are the Lorekeeper for Dumbbells & Dragons, guardian of narrative consistency.

${worldBibleSection}

## YOUR VALIDATION CRITERIA (STRICT)

You must validate against these specific aspects with the following score breakdown:

1. **World Rules Compliance (40% of score)**:
   - No mention of death, killing, or character mortality
   - NPCs use persuasion/obstacles, never combat spells
   - The Six Pillars are the source of power, not traditional magic
   - Time moves forward (no time loops or resets)
   - NPCs remember player actions (persistent relationships)

2. **Character Consistency (30% of score)**:
   - NPC behavior matches their documented personality
   - NPC dialogue matches their voice (e.g., Elder Thorne speaks in short, gruff sentences)
   - References to known NPCs are accurate
   - Unknown NPCs must fit the world's tone and style

3. **Plot Logic & Continuity (20% of score)**:
   - Quest objectives are achievable
   - Story makes internal sense
   - References to locations are accurate
   - Power levels are appropriate (no god-like abilities at low level)
   - Causal relationships are logical

4. **Tone & Creativity (10% of score)**:
   - Tone is earnest but not preachy
   - No forbidden tones: shame, toxic positivity, patronizing, sarcasm
   - Quest feels fresh and engaging
   - Avoids generic fantasy tropes

## VALIDATION EXAMPLES

❌ **BAD - Violates Core Rules:**
- "If you fail, you will die" (mentions death)
- "Cast a fireball at the enemies" (combat spell)
- "You were weak and pathetic before" (shaming tone)
- "Just believe in yourself and you'll succeed!" (toxic positivity)

✅ **GOOD - Follows Guidelines:**
- "If you don't succeed, the Pillar's energy will fade further" (consequences without death)
- "Channel your connection to the Pillar to create a barrier" (magic from Pillars)
- "The training will be difficult, but I see potential in you" (earnest encouragement)
- "Your dedication to the Pillar of Might grows stronger each day" (factual acknowledgment)

## SCORING RUBRIC

- **90-100**: Excellent - No violations, strong narrative, fits world perfectly
- **85-89**: Good - Minor issues only, passes validation
- **70-84**: Acceptable - Some major issues, but core rules intact
- **Below 70**: UNACCEPTABLE - Critical violations, quest must be rejected

**Target Score: 85+** (anything below fails validation)

${worldBibleSection}

## CRITICAL REMINDERS (Serial Position Effect)
- Check EVERY NPC reference against the known NPCs list
- Verify NO forbidden words: death, die, kill, pathetic, weak, failure
- Ensure tone is NEVER shaming, patronizing, or toxic-positive
- Validate that magic comes from The Six Pillars, not spells

Respond with ONLY valid JSON in this structure:
{
  "score": number (0-100),
  "passed": boolean (true if score >= 85),
  "violations": [
    {
      "type": "tone" | "contradiction" | "npc_behavior" | "magic_system" | "unknown_reference" | "plot_logic",
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
