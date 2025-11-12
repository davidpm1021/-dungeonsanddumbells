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

      lorekeeper: () => `You are the Lorekeeper for Dumbbells & Dragons, the guardian of narrative consistency.

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
    console.log('[PromptBuilder] Building message for', agentType, 'with context:', Object.keys(context));
    console.log('[PromptBuilder] Character:', character?.name, character?.class);
    console.log('[PromptBuilder] User goals count:', context.userGoals?.length);

    // Use functions to delay template literal evaluation
    const messageBuilders = {
      story_coordinator: () => `Analyze ${character.name}'s current state and decide what content they need next.

## PLAYER PROGRESSION
- Active quests: ${context.activeQuestCount || 0}
- Completed quests: ${context.completedQuestCount || 0}
- Character qualities: ${Object.keys(context.characterQualities || {}).length > 0 ? JSON.stringify(context.characterQualities) : 'None yet'}

## THEME PROGRESSION GUIDE
Choose themes dynamically based on player progression:

**First-Time Player (0 completed quests, no qualities)**:
- "pillar_introduction" - Meet Elder Thorne, learn about the Six Pillars
- "first_steps" - Begin training, choose a Pillar to focus on

**Early Game (1-3 completed quests)**:
- "skill_discovery" - Unlock new abilities related to their stat
- "mentor_relationship" - Deepen bond with Elder Thorne or meet Lady Seraphine
- "local_crisis" - Small problem in Thornhaven that needs their help

**Mid Game (4-10 completed quests)**:
- "mystery_begins" - Strange occurrences related to Pillar energy
- "faction_choice" - Choose between competing groups (Guards, Scholars, Merchants)
- "npc_personal_quest" - Help an NPC with their backstory
- "rival_encounter" - Meet another adventurer (not hostile, competitive)

**Late Game (11+ completed quests)**:
- "pillar_restoration" - Major quest to restore a fading Pillar
- "kingdom_threat" - Larger crisis affecting all of Vitalia
- "character_milestone" - Personal achievement/transformation

**DO NOT repeat themes too often. Vary between story types:**
- Main story quests advance the Pillar crisis
- Side quests develop NPCs and world-building
- Corrective quests help balance neglected stats

## STAT BALANCE ASSESSMENT
${character ? `Current stats: STR ${character.str || 10}, DEX ${character.dex || 10}, CON ${character.con || 10}, INT ${character.int || 10}, WIS ${character.wis || 10}, CHA ${character.cha || 10}` : ''}

If any stat is 3+ points lower than others, consider a corrective quest for that stat.

Respond with a JSON object:
{
  "needsQuest": boolean,
  "questType": "main" | "side" | "corrective",
  "suggestedTheme": string (choose from themes above - be specific!),
  "suggestedDifficulty": "easy" | "medium" | "hard",
  "reasoning": string (explain your theme choice based on progression),
  "targetStat": "STR" | "DEX" | "CON" | "INT" | "WIS" | "CHA" (if corrective)
}`,

      quest_creator: () => `You are a master fantasy storyteller crafting a ${context.questType || 'side'} quest${character?.name ? ` for ${character.name}` : ''}.

## CHARACTER CONTEXT
${character?.name ? `${character.name} is a ${character.class}` : 'The player is'} training in ${context.targetStat ? WORLD_BIBLE.six_pillars[context.targetStat].name : 'multiple Pillars'}.
${context.userGoals && context.userGoals.length > 0 ? `\n## THEIR TRAINING REGIMEN (USE THESE AS OBJECTIVES):\n${context.userGoals.map(g => `- ${g.name}: ${g.description} (${g.frequency})`).join('\n')}` : ''}
${context.relevantPastEvents && context.relevantPastEvents.length > 0 ? `\n## RELEVANT PAST EVENTS (Reference for Continuity):\n${this.formatPastEventsForPrompt(context.relevantPastEvents)}\n\nUse these to create narrative continuity - reference past NPCs, locations, or story threads when appropriate.` : ''}

## VARIETY CONSTRAINTS (CRITICAL!)
${context.recentQuestTitles && context.recentQuestTitles.length > 0 ? `Recent quest titles to AVOID repeating:\n${context.recentQuestTitles.map(t => `- "${t}"`).join('\n')}\n\n` : ''}${context.varietyConstraints ? context.varietyConstraints.map(c => `- ${c}`).join('\n') : ''}

DO NOT use generic, repetitive titles. Each quest must feel fresh and unique.

## YOUR TASK
Create an IMMERSIVE NARRATIVE EXPERIENCE. Lead with story, not stats.

The player should feel like they're:
- Living in a fantasy world, not tracking workouts
- Making meaningful choices that affect their story
- Building relationships with memorable NPCs
- Uncovering mysteries about the Six Pillars
- Part of something larger than themselves

## NARRATIVE REQUIREMENTS
1. **Opening Scene** (100-150 words): Set the scene dramatically. Where are they? Who do they meet? What's the tension?
   - Use vivid sensory details (sight, sound, smell)
   - Show, don't tell
   - Create immediate intrigue
   - Reference their past actions if available

2. **NPC Interaction**: Include a specific named NPC from the World Bible (Elder Thorne, Lady Seraphine, etc.)
   - Give them distinct voice and personality
   - Show their relationship with the player
   - Have them speak in dialogue, not summary

3. **Story Stakes**: Make it clear WHY this matters
   - Connect to the Pillar crisis
   - Reference world events or past player choices
   - Create emotional investment

${context.userGoals ? `\n4. **Objectives as Story Beats**: Frame their existing training as narrative progression
   - Don't say "do 3 strength workouts" - say "prove your dedication to the Pillar of Might"
   - Wrap wellness goals in story context
   - Make completing goals feel like advancing the plot` : ''}

Respond with JSON:
{
  "title": string (evocative, not generic - "The Binding Ritual" not "Train Strength"),
  "openingScene": string (100-150 words, immersive, present tense, second person),
  "description": string (1-2 sentence quest log summary),
  "npcDialogue": {
    "npcName": string,
    "opening": string (what they say when giving the quest),
    "during": string (encouragement during the quest - optional),
    "completion": string (what they say when completed)
  },
  "objectives": [
    {
      "narrativeDescription": string (story framing - "Prove your worth to the Pillar of Might"),
      "mechanicalDescription": string (what they actually do - "Complete 3 strength training sessions"),
      "goalMapping": string (${context.userGoals ? 'match to their actual goals listed above' : 'STR/DEX/CON/INT/WIS/CHA'}),
      "statReward": "STR" | "DEX" | "CON" | "INT" | "WIS" | "CHA",
      "xpReward": number,
      "storyBeat": string (narrative that plays when this objective completes)
    }
  ],
  "worldContext": string (2-3 sentences about what's happening in Thornhaven related to this quest),
  "choicePoint": {
    "description": string (a decision the player must make during the quest - optional),
    "options": [
      {
        "label": string,
        "consequence": string
      }
    ]
  } (optional for now),
  "estimatedDuration": string,
  "questType": "${context.questType || 'side'}"
}

CRITICAL: This is a STORY first, a wellness tracker second. Make the player forget they're exercising.`,

      memory_manager: () => `Compress the following events into a concise summary (max 200 words):

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
}`,

      consequence_engine: () => `${character.name} has ${context.questFailed ? 'not completed' : 'completed'} the quest "${context.quest.title}".

<quest_details>
Title: ${context.quest.title}
Description: ${context.quest.description}
Objectives: ${context.quest.objectives?.map(obj => obj.description).join('; ')}
${context.quest.npcInvolved ? `NPC Involved: ${context.quest.npcInvolved}` : ''}
</quest_details>

${context.recentMemories && context.recentMemories.length > 0 ? `
<recent_events>
${context.recentMemories.slice(0, 5).map(m => `- ${m.event_description}`).join('\n')}
</recent_events>` : ''}

Generate a narrative outcome (150-250 words) that:
${context.questFailed ? `
- Acknowledges the struggle without shaming
- Offers a compassionate path forward
- Suggests this opens different opportunities
- Maintains hope and encouragement` : `
- Celebrates the achievement genuinely
- References at least one past event or character detail
- Shows consequences of player's actions
- Sets up potential future story hooks
- Maintains consistent NPC relationships`}

CRITICAL: ${context.questFailed ? 'Be compassionate, not punishing. Life happens.' : 'Reference the player\'s journey. This moment should feel earned and connected to past actions.'}

Respond with a JSON object:
{
  "narrativeText": string (150-250 words, present tense, second person),
  "npcInteractions": [
    {
      "npc": string,
      "relationshipChange": "improved" | "worsened" | "neutral",
      "note": string
    }
  ],
  "worldStateChanges": [
    {
      "change": string,
      "description": string
    }
  ],
  "futurePlotHooks": [string] (1-3 potential future quest ideas)
}`
    };

    console.log('[PromptBuilder] Successfully built message for', agentType);

    // Call the function to get the actual message
    const builder = messageBuilders[agentType];
    if (builder) {
      return builder();
    }

    return 'Process the given context and respond appropriately.';
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

  /**
   * Format past events for prompt context (RAG)
   *
   * @param {Array} events - Past narrative events
   * @returns {string} - Formatted text for prompt
   */
  formatPastEventsForPrompt(events) {
    if (!events || events.length === 0) {
      return 'No relevant past events.';
    }

    return events.map((event, i) => {
      const participants = event.participants ? ` (with ${event.participants.join(', ')})` : '';
      const timeAgo = this.getTimeAgo(event.created_at || event.createdAt);

      return `${i + 1}. [${timeAgo}] ${event.event_description || event.eventDescription}${participants}`;
    }).join('\n');
  }

  /**
   * Get human-readable time ago
   */
  getTimeAgo(timestamp) {
    if (!timestamp) return 'Recently';

    const daysAgo = Math.floor((Date.now() - new Date(timestamp)) / (1000 * 60 * 60 * 24));

    if (daysAgo === 0) return 'Today';
    if (daysAgo === 1) return 'Yesterday';
    if (daysAgo < 7) return `${daysAgo} days ago`;
    if (daysAgo < 30) return `${Math.floor(daysAgo / 7)} weeks ago`;
    return `${Math.floor(daysAgo / 30)} months ago`;
  }
}

module.exports = new PromptBuilder();
