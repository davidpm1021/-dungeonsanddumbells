const { WORLD_BIBLE } = require('../data/worldBible');
const memoryManager = require('./memoryManager');

/**
 * Prompt Builder
 *
 * Constructs prompts for AI agents with proper context injection:
 * - World Bible (immutable ground truth)
 * - Character state and stats
 * - Memory context (working, episode, long-term)
 * - Agent-specific instructions
 *
 * Uses XML structure for Claude's extended thinking format
 */

class PromptBuilder {
  /**
   * Build a complete prompt for an agent
   *
   * @param {Object} options
   * @param {string} options.agentType - Type of agent (story_coordinator, quest_creator, etc.)
   * @param {number} options.characterId - Character ID
   * @param {Object} options.character - Character data
   * @param {Object} options.context - Additional context
   * @param {boolean} options.includeWorldBible - Include full world bible
   * @param {boolean} options.includeMemory - Include memory context
   * @returns {Promise<Object>} - { system, messages }
   */
  async build(options) {
    const {
      agentType,
      characterId,
      character,
      context = {},
      includeWorldBible = true,
      includeMemory = true
    } = options;

    // Build system prompt
    const systemPrompt = await this.buildSystemPrompt({
      agentType,
      characterId,
      character,
      includeWorldBible,
      includeMemory
    });

    // Build user message with task-specific instructions
    const userMessage = this.buildUserMessage(agentType, character, context);

    return {
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userMessage
        }
      ]
    };
  }

  /**
   * Build system prompt with world context
   */
  async buildSystemPrompt(options) {
    const {
      agentType,
      characterId,
      character,
      includeWorldBible,
      includeMemory
    } = options;

    let prompt = '';

    // Agent role definition
    prompt += this.getAgentRoleDefinition(agentType);
    prompt += '\n\n';

    // World Bible (immutable rules)
    if (includeWorldBible) {
      prompt += this.buildWorldBibleSection();
      prompt += '\n\n';
    }

    // Character state
    if (character) {
      prompt += this.buildCharacterSection(character);
      prompt += '\n\n';
    }

    // Memory context
    if (includeMemory && characterId) {
      const memoryContext = await memoryManager.getCompleteContext(characterId);
      prompt += this.buildMemorySection(memoryContext);
      prompt += '\n\n';
    }

    // Output format instructions
    prompt += this.getOutputFormat(agentType);

    return prompt;
  }

  /**
   * Get agent role definition
   */
  getAgentRoleDefinition(agentType) {
    const roles = {
      story_coordinator: `You are the Story Coordinator for Dumbbells & Dragons, a wellness RPG where real-world fitness goals drive fantasy narrative progression.

Your role is to analyze the player's current state and decide what narrative content they need next. You evaluate:
- Character stat balance (are they neglecting certain pillars?)
- Recent activity patterns
- Active quest count
- Narrative progression

You make strategic decisions about quest generation, difficulty, and themes to keep the player engaged and encourage balanced wellness.`,

      quest_creator: `You are the Quest Creator for Dumbbells & Dragons, responsible for generating compelling narrative quests that map to real-world wellness goals.

Your role is to create quests that:
- Feel like authentic fantasy adventures
- Map clearly to specific wellness activities (STR, DEX, CON, INT, WIS, CHA)
- Match the player's current level and stat distribution
- Reference established world lore and NPCs
- Encourage balanced stat growth

Each quest must be achievable, motivating, and narratively consistent with the player's story so far.`,

      memory_manager: `You are the Memory Manager for Dumbbells & Dragons, responsible for compressing old narrative events into coherent summaries.

Your role is to:
- Identify key events worth preserving
- Compress multiple events into concise summaries
- Preserve important details (NPC interactions, stat milestones, story beats)
- Discard redundant or trivial information
- Maintain narrative continuity

Your summaries enable the AI to remember the player's journey without consuming excessive context.`,

      lorekeeper: `You are the Lorekeeper for Dumbbells & Dragons, the guardian of narrative consistency.

Your role is to validate generated content against the World Bible and established facts:
- Check for contradictions with world rules
- Verify NPC behavior matches their personality
- Ensure tone is consistent (earnest but not preachy)
- Flag narrative drift or inconsistencies
- Score content for coherence (0-100)

You act as quality control, preventing the "11 kids problem" where AI forgets established facts.`
    };

    return roles[agentType] || `You are an AI agent for Dumbbells & Dragons.`;
  }

  /**
   * Build World Bible section
   */
  buildWorldBibleSection() {
    return `<world_bible>
# The Kingdom of Vitalia - Immutable Ground Truth

## Setting
${WORLD_BIBLE.setting.description}

**Tone:** ${WORLD_BIBLE.setting.tone}

**Forbidden Tones:**
${WORLD_BIBLE.setting.forbidden_tones.map(t => `- ${t}`).join('\n')}

## The Six Pillars (Magic System)
${Object.entries(WORLD_BIBLE.six_pillars).map(([stat, pillar]) => `
### ${stat} - ${pillar.name}
- **Description:** ${pillar.description}
- **Real-World:** ${pillar.real_world_mapping}
- **Magic:** ${pillar.magic_manifestation}
`).join('\n')}

## Core Rules (NEVER VIOLATE)
${WORLD_BIBLE.core_rules.map((rule, i) => `${i + 1}. ${rule}`).join('\n')}

## Key NPCs
${Object.entries(WORLD_BIBLE.npcs).slice(0, 3).map(([key, npc]) => `
### ${npc.name}
- **Role:** ${npc.role}
- **Personality:** ${npc.personality}
- **Voice:** ${npc.voice}
- **Example:** "${npc.speech_example}"
- **Never:** ${npc.never_does.slice(0, 2).join(', ')}
- **Always:** ${npc.always_does.slice(0, 2).join(', ')}
`).join('\n')}

## Narrative Style
- Perspective: ${WORLD_BIBLE.narrative_style.perspective}
- Tense: ${WORLD_BIBLE.narrative_style.tense}
- Length: ${WORLD_BIBLE.narrative_style.length}

</world_bible>`;
  }

  /**
   * Build character section
   */
  buildCharacterSection(character) {
    return `<character_state>
**Name:** ${character.name}
**Class:** ${character.class}
**Level:** ${character.level || 1}

**Stats:**
- STR: ${character.str || 10}
- DEX: ${character.dex || 10}
- CON: ${character.con || 10}
- INT: ${character.int || 10}
- WIS: ${character.wis || 10}
- CHA: ${character.cha || 10}

**Stat Analysis:**
- Highest: ${this.getHighestStat(character)}
- Lowest: ${this.getLowestStat(character)}
- Balance: ${this.getStatBalance(character)}
</character_state>`;
  }

  /**
   * Build memory section
   */
  buildMemorySection(memoryContext) {
    let section = '<memory_context>\n';

    // Narrative summary
    if (memoryContext.narrative_summary) {
      section += `## Story So Far\n${memoryContext.narrative_summary}\n\n`;
    }

    // Recent events (working memory)
    if (memoryContext.working_memory && memoryContext.working_memory.length > 0) {
      section += `## Recent Events (Last ${Math.min(5, memoryContext.working_memory.length)})\n`;
      memoryContext.working_memory.slice(-5).forEach((event, i) => {
        section += `${i + 1}. ${event.event_description}\n`;
      });
      section += '\n';
    }

    // World state
    if (memoryContext.world_state) {
      const ws = memoryContext.world_state;

      if (ws.npc_relationships && Object.keys(ws.npc_relationships).length > 0) {
        section += `## NPC Relationships\n`;
        Object.entries(ws.npc_relationships).forEach(([npc, data]) => {
          section += `- ${npc}: ${data.level} - ${data.notes}\n`;
        });
        section += '\n';
      }

      if (ws.unlocked_locations && ws.unlocked_locations.length > 0) {
        section += `## Unlocked Locations\n${ws.unlocked_locations.join(', ')}\n\n`;
      }

      if (ws.story_flags && Object.keys(ws.story_flags).length > 0) {
        section += `## Story Flags\n`;
        Object.entries(ws.story_flags).forEach(([flag, value]) => {
          section += `- ${flag}: ${value}\n`;
        });
        section += '\n';
      }
    }

    section += '</memory_context>';
    return section;
  }

  /**
   * Build user message with task instructions
   */
  buildUserMessage(agentType, character, context) {
    const messages = {
      story_coordinator: `Analyze ${character.name}'s current state and decide what content they need next.

Consider:
- Are their stats balanced or is one being neglected?
- How many active quests do they have?
- What was their last activity?

Respond with a JSON object:
{
  "needsQuest": boolean,
  "questType": "main" | "side" | "corrective",
  "suggestedTheme": string,
  "suggestedDifficulty": "easy" | "medium" | "hard",
  "reasoning": string,
  "targetStat": "STR" | "DEX" | "CON" | "INT" | "WIS" | "CHA" (if corrective)
}`,

      quest_creator: `Generate a ${context.questType || 'side'} quest for ${character.name}.

Requirements:
- Difficulty: ${context.difficulty || 'medium'}
${context.targetStat ? `- Must focus on ${context.targetStat} (${WORLD_BIBLE.six_pillars[context.targetStat].name})` : ''}
- Theme: ${context.theme || 'Personal growth and adventure'}

Respond with a JSON object:
{
  "title": string (max 50 chars),
  "description": string (2-3 sentences, present tense, second person),
  "objectives": [
    {
      "description": string,
      "goalMapping": string (wellness activity),
      "statReward": "STR" | "DEX" | "CON" | "INT" | "WIS" | "CHA",
      "xpReward": number
    }
  ],
  "npcInvolved": string (optional),
  "estimatedDuration": string ("1 day", "3 days", "1 week"),
  "prerequisites": [] (empty for now)
}`,

      memory_manager: `Compress the following events into a concise summary (max 200 words):

${context.events?.map((e, i) => `${i + 1}. ${e.event_description}`).join('\n')}

Preserve:
- Key milestones (stat increases, NPC interactions)
- Story progression beats
- Important decisions or achievements

Discard:
- Redundant daily activities
- Trivial details

Respond with a JSON object:
{
  "summary": string,
  "keyEvents": [string] (3-5 most important),
  "participantsInvolved": [string] (NPCs),
  "statChanges": { "STR": number, ... }
}`
    };

    return messages[agentType] || 'Process the given context and respond appropriately.';
  }

  /**
   * Get output format instructions
   */
  getOutputFormat(agentType) {
    return `<output_format>
Respond with ONLY valid JSON. No markdown, no explanations outside the JSON structure.
Ensure all strings are properly escaped and the JSON is parseable.
</output_format>`;
  }

  /**
   * Helper: Get highest stat
   */
  getHighestStat(character) {
    const stats = {
      STR: character.str || 10,
      DEX: character.dex || 10,
      CON: character.con || 10,
      INT: character.int || 10,
      WIS: character.wis || 10,
      CHA: character.cha || 10
    };

    const highest = Object.entries(stats).reduce((a, b) => b[1] > a[1] ? b : a);
    return `${highest[0]} (${highest[1]})`;
  }

  /**
   * Helper: Get lowest stat
   */
  getLowestStat(character) {
    const stats = {
      STR: character.str || 10,
      DEX: character.dex || 10,
      CON: character.con || 10,
      INT: character.int || 10,
      WIS: character.wis || 10,
      CHA: character.cha || 10
    };

    const lowest = Object.entries(stats).reduce((a, b) => b[1] < a[1] ? b : a);
    return `${lowest[0]} (${lowest[1]})`;
  }

  /**
   * Helper: Get stat balance description
   */
  getStatBalance(character) {
    const stats = [
      character.str || 10,
      character.dex || 10,
      character.con || 10,
      character.int || 10,
      character.wis || 10,
      character.cha || 10
    ];

    const avg = stats.reduce((a, b) => a + b, 0) / stats.length;
    const variance = stats.reduce((sum, stat) => sum + Math.pow(stat - avg, 2), 0) / stats.length;
    const stdDev = Math.sqrt(variance);

    if (stdDev < 2) return 'Very balanced';
    if (stdDev < 4) return 'Mostly balanced';
    if (stdDev < 6) return 'Somewhat imbalanced';
    return 'Heavily imbalanced';
  }
}

module.exports = new PromptBuilder();
