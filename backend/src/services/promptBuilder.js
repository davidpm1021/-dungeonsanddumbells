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
      story_coordinator: `You are the Story Coordinator, a narrative director for a personalized RPG experience.

Your role is to analyze the player's current state and decide what narrative content they need next. You evaluate:
- Story arc progression (where are they in their personal narrative?)
- Character development (strengths, weaknesses, growth opportunities)
- Pacing (active quest load, recent activity)
- Narrative coherence (themes, threads, character motivations)

You think in terms of STORY BEATS, not game mechanics. Your job is to craft a compelling narrative journey where the player's real-world goals have narrative weight and consequence.

NEVER think in terms of "training stats" or "leveling up". Think in terms of character arcs, plot development, and emotional stakes.`,

      quest_creator: `You are the Quest Creator, a master storyteller crafting personalized narrative experiences.

Your role is to create quests that:
- Feel like authentic narrative moments in the character's story
- Integrate the player's real-world wellness goals as narratively essential actions
- Respect the world's established tone, rules, and characters
- Create emotional investment through stakes and consequences
- Advance the character's personal story arc

The player should never feel like they're "doing homework" - they should feel like heroes whose daily rituals are essential to their story.

DO NOT reference game mechanics, stat points, or experience. Frame everything through narrative.`,

      memory_manager: `You are the Memory Manager, responsible for maintaining narrative coherence across sessions.

Your role is to:
- Identify key story events worth preserving
- Compress multiple events into concise narrative summaries
- Preserve important details (character relationships, world changes, emotional beats)
- Discard redundant or trivial information
- Maintain the thread of the character's personal story

Your summaries enable the narrative to maintain consistency without the player having to remember every detail.`,

      lorekeeper: () => `You are the Lorekeeper, the guardian of narrative consistency.

Your role is to validate generated content against the established world and story:
- Check for contradictions with world rules
- Verify character behavior matches their established personality
- Ensure tone remains consistent throughout
- Flag narrative drift or logical inconsistencies
- Score content for coherence (0-100)

You prevent the story from becoming incoherent. A score of 85+ means the content is ready for the player.`
    };

    return roles[agentType] || `You are a narrative AI agent.`;
  }

  /**
   * Build World Bible section
   */
  buildWorldBibleSection() {
    return `<world_bible>
# World Rules - Immutable Ground Truth

## Setting
${WORLD_BIBLE.setting.description}

**Tone:** ${WORLD_BIBLE.setting.tone}

**Forbidden Tones:**
${WORLD_BIBLE.setting.forbidden_tones.map(t => `- ${t}`).join('\n')}

## Character Stats (Core Attributes)
${Object.entries(WORLD_BIBLE.stats || {}).map(([stat, info]) => `
### ${stat} - ${info.name}
- **Description:** ${info.description}
- **Real-World:** ${info.real_world_mapping}
- **Magic:** ${info.magic_manifestation}
`).join('\n')}

## Core Rules (NEVER VIOLATE)
${WORLD_BIBLE.core_rules.map((rule, i) => `${i + 1}. ${rule}`).join('\n')}

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
    let section = `<character_state>
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

    // Add inline narrative context if provided (for Agent Lab testing without DB)
    if (character.narrativeContext) {
      section += `\n\n<narrative_memory>
${character.narrativeContext}
</narrative_memory>`;
    }

    // Add known NPCs if provided
    if (character.knownNPCs && character.knownNPCs.length > 0) {
      const npcs = Array.isArray(character.knownNPCs)
        ? character.knownNPCs.join(', ')
        : character.knownNPCs;
      section += `\n\n<known_characters>
IMPORTANT: These are characters already established in the story. Reuse them when appropriate.
${npcs}
</known_characters>`;
    }

    // Add unresolved plot threads
    if (character.unresolvedThreads) {
      const threads = typeof character.unresolvedThreads === 'string'
        ? character.unresolvedThreads
        : `${character.unresolvedThreads} active threads`;
      section += `\n\n<unresolved_plot_threads>
CRITICAL: These threads must be addressed, not ignored:
${threads}
</unresolved_plot_threads>`;
    }

    return section;
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
      story_coordinator: () => `Analyze ${character.name}'s current state and decide what narrative content they need next.

## PLAYER PROGRESSION
- Active quests: ${context.activeQuestCount || 0}
- Completed quests: ${context.completedQuestCount || 0}
- Character qualities: ${Object.keys(context.characterQualities || {}).length > 0 ? JSON.stringify(context.characterQualities) : 'None yet'}
${context.worldContext ? `\n## WORLD CONTEXT\n${JSON.stringify(context.worldContext, null, 2)}` : ''}

## REAL-WORLD FITNESS CONTEXT (Critical for Narrative Integration!)
${context.fitnessContext ? context.fitnessContext : 'No fitness activity data available.'}
${context.fitnessEngagement ? `Player engagement level: ${context.fitnessEngagement}` : ''}
${context.activityTriggers && context.activityTriggers.length > 0 ? `
**Activity Triggers to Consider:**
${context.activityTriggers.map(t => `- ${t.type}: ${t.suggestion}`).join('\n')}

Use these triggers to inform narrative decisions. A player on a 7-day streak should be acknowledged by NPCs. An inactive player needs gentle encouragement, not punishment.` : ''}

## NARRATIVE THEME PROGRESSION
Choose themes based on player's story arc, NOT game mechanics:

**Opening Act (0 completed quests)**:
- "inciting_incident" - Something disrupts the character's status quo
- "call_to_action" - They discover their role in the story
- "first_ally" - Meet someone who will help them

**Rising Action (1-3 completed quests)**:
- "skill_test" - Early challenge that tests their abilities
- "world_revelation" - Learn something important about the setting
- "ally_in_need" - Help someone, build a relationship
- "first_obstacle" - Face a meaningful setback

**Developing Conflict (4-7 completed quests)**:
- "mystery_deepens" - Uncover hidden truths
- "moral_choice" - Face an ethical dilemma
- "rival_appears" - Meet an antagonist or competitor
- "personal_stakes" - Story becomes more personal
- "npc_backstory" - Learn about an ally's past

**Escalation (8-12 completed quests)**:
- "point_of_no_return" - Commit to a path
- "betrayal_or_revelation" - Major twist
- "lost_something" - Meaningful sacrifice or loss
- "gathering_strength" - Prepare for major challenge

**Climactic Arc (13+ completed quests)**:
- "final_preparation" - Last steps before confrontation
- "ultimate_test" - Face the core conflict
- "transformation" - Character fundamentally changes
- "aftermath" - Deal with consequences

**Recurring Themes (use sparingly, intersperse with arc themes)**:
- "investigation" - Solve a mystery or gather information
- "rescue" - Save someone in danger
- "escort" - Protect something/someone on a journey
- "combat" - Direct confrontation with threat
- "social_challenge" - Navigate relationships or politics
- "exploration" - Discover new places or secrets

## STAT BALANCE CHECK
${character ? `Current stats: STR ${character.str || 10}, DEX ${character.dex || 10}, CON ${character.con || 10}, INT ${character.int || 10}, WIS ${character.wis || 10}, CHA ${character.cha || 10}` : ''}

If any stat is 3+ points lower than others, the character has a weakness that should be addressed narratively (not as "training a stat").

Respond with JSON:
{
  "needsQuest": boolean,
  "questType": "main" | "side" | "corrective",
  "suggestedTheme": string (from themes above - be SPECIFIC),
  "suggestedDifficulty": "easy" | "medium" | "hard",
  "reasoning": string (explain narrative logic, NOT game mechanics),
  "targetStat": "STR" | "DEX" | "CON" | "INT" | "WIS" | "CHA" (only if corrective)
}`,

      quest_creator: () => `You are a master fantasy storyteller crafting a ${context.questType || 'side'} quest${character?.name ? ` for ${character.name}` : ''}.

## CHARACTER CONTEXT
${character?.name ? `${character.name} is a ${character.class}` : 'The player is'} with focus on ${context.targetStat || 'various attributes'}.
${context.userGoals && context.userGoals.length > 0 ? `\n## PLAYER'S REAL-WORLD GOALS (Integrate as narrative-essential actions):\n${context.userGoals.map(g => `- ${g.name}: ${g.description || 'Daily practice'} (${g.frequency || 'daily'})`).join('\n')}\n\nThese goals must become STORY-CRITICAL actions, not "training" or "stats". The character needs to do these things for NARRATIVE reasons.` : ''}
${context.relevantPastEvents && context.relevantPastEvents.length > 0 ? `\n## RELEVANT PAST EVENTS (Reference for Continuity):\n${this.formatPastEventsForPrompt(context.relevantPastEvents)}\n\nUse these to create narrative continuity - reference past NPCs, locations, or story threads when appropriate.` : ''}
${context.decision?.existingNPCs && context.decision.existingNPCs.length > 0 ? `\n## EXISTING NPCs (REUSE THESE - DO NOT CREATE NEW ONES WITH SIMILAR NAMES!)
${context.decision.existingNPCs.map(npc => `- ${npc.name} (${npc.role || 'unknown role'}) - Relationship: ${npc.relationship || 'neutral'}`).join('\n')}

**CRITICAL**: Reuse these established characters whenever possible. If you need a merchant, use one from this list. If you need an informant, check if one exists. DO NOT create "Kael Ironbottom" if "Kael Ironwright" already exists.` : ''}
${context.decision?.activeThreads && context.decision.activeThreads.length > 0 ? `\n## UNRESOLVED PLOT THREADS (MUST ADDRESS!)
${context.decision.activeThreads.map(t => `- ${t.thread} (introduced Round ${t.introduced})`).join('\n')}

**MANDATORY**: This quest MUST advance or resolve at least ONE of these threads. DO NOT introduce new plot threads while ignoring existing ones. The player's story must progress, not scatter.` : ''}

## VARIETY CONSTRAINTS (CRITICAL!)
${context.recentQuestTitles && context.recentQuestTitles.length > 0 ? `Recent quest titles to AVOID repeating:\n${context.recentQuestTitles.map(t => `- "${t}"`).join('\n')}\n\n` : ''}${context.varietyConstraints ? context.varietyConstraints.map(c => `- ${c}`).join('\n') : ''}

DO NOT use generic, repetitive titles. Each quest must feel fresh and unique.

## YOUR TASK
Create an IMMERSIVE NARRATIVE EXPERIENCE where the player's real-world goals become NARRATIVELY ESSENTIAL.

The player should feel like they're:
- Living IN a story, not playing a game
- Their daily habits are CRITICAL to the plot (not "training stats")
- Building relationships with memorable, complex NPCs
- Uncovering mysteries and making discoveries
- Part of something larger than themselves

**CRITICAL**: NO references to game mechanics, stat training, foundations, experience points, or leveling up. Frame EVERYTHING through narrative.

## NARRATIVE REQUIREMENTS
1. **Opening Scene** (100-150 words): Set the scene dramatically. Where are they? Who do they meet? What's the tension?
   - Use vivid sensory details (sight, sound, smell)
   - Show, don't tell
   - Create immediate intrigue
   - Reference their past actions if available

2. **NPC Interaction**: Create a compelling character with their own goals
   - Give them distinct voice and personality
   - Show their relationship with the player
   - Have them speak in dialogue, not summary
   - They should have their OWN motivations

3. **Story Stakes**: Make it clear WHY this matters NARRATIVELY
   - What's at risk if they fail?
   - Who else is affected?
   - Create emotional investment through consequences

${context.userGoals ? `\n4. **Goals as Plot-Critical Actions**: The player's real-world goals become essential story actions
   - "Morning Run" might become "scout the perimeter for signs of the enemy"
   - "Meditation" might become "commune with the spirits to decipher the message"
   - "Reading" might become "study the ancient texts for the ritual"
   - The character MUST do these things to advance the story, not to "get stronger"` : ''}

Respond with JSON:
{
  "title": string (evocative, specific - "The Cartographer's Dying Wish" not "Explore Area"),
  "openingScene": string (100-150 words, immersive, present tense, second person),
  "description": string (1-2 sentence quest log summary),
  "npcDialogue": {
    "npcName": string (create a memorable character),
    "opening": string (what they say when giving the quest - NO game terminology),
    "during": string (encouragement during the quest - optional),
    "completion": string (what they say when completed - focus on story impact)
  },
  "objectives": [
    {
      "narrativeDescription": string (story framing - "Scout the northern trails before dawn" not "Train DEX"),
      "mechanicalDescription": string (the actual activity - "Complete morning run"),
      "goalMapping": string (${context.userGoals ? 'match to their actual goals listed above' : 'activity type'}),
      "statReward": "STR" | "DEX" | "CON" | "INT" | "WIS" | "CHA",
      "xpReward": number,
      "storyBeat": string (narrative consequence when objective completes - what do they discover/achieve?)
    }
  ],
  "worldContext": string (2-3 sentences about the broader situation this quest relates to),
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
