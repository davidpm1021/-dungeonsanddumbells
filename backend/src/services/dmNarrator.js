const claudeAPI = require('./claudeAPI');

/**
 * DM Narrator Service
 * Generates contextual narrative responses to player actions
 */
class DMNarrator {
  /**
   * Response style prompts - guide the AI on response length/format based on input type
   */
  responseStyles = {
    quick_question: `
RESPONSE LENGTH: BRIEF (1-2 sentences only)
This is a simple question - give a direct, concise answer.`,

    specific_action: `
RESPONSE LENGTH: FOCUSED (1 short paragraph, 3-5 sentences)
Describe the action's outcome clearly. Focus on what happened.`,

    exploration: `
RESPONSE LENGTH: DESCRIPTIVE (2-3 paragraphs)
Paint the scene with sensory details.`,

    dialogue: `
RESPONSE LENGTH: CONVERSATIONAL (1-2 exchanges)
Focus on the NPC's voice and personality. Use direct speech.`,

    combat: `
RESPONSE LENGTH: PUNCHY (1 paragraph, varied rhythm)
Combat is visceral. Short sentences for impacts. Mix them for energy.`,

    dramatic_moment: `
RESPONSE LENGTH: EVOCATIVE (3-4 paragraphs)
Take time to build atmosphere. Vary sentence length for rhythm.`
  };

  /**
   * Simple response style classification based on action text
   */
  classifyResponseStyle(action) {
    const actionLower = action.toLowerCase().trim();

    // Quick questions
    if (actionLower.length < 40 && /^(is|are|do|does|can|how many|where|who|what's)\b/.test(actionLower)) {
      return 'quick_question';
    }

    // Exploration
    if (/\b(look|examine|inspect|survey|observe|search|investigate|explore|check out|what do i see|describe)\b/.test(actionLower)) {
      return 'exploration';
    }

    // Dialogue
    if (/\b(ask|tell|say|speak|talk|reply|respond|greet|thank)\b/.test(actionLower)) {
      return 'dialogue';
    }

    // Combat
    if (/\b(attack|fight|strike|swing|shoot|cast.*at|charge)\b/.test(actionLower)) {
      return 'combat';
    }

    // Very short inputs → quick response
    if (actionLower.length < 25) {
      return 'specific_action';
    }

    return 'specific_action';
  }

  /**
   * Generate narrative response to player action
   * @param {Object} params
   * @param {Object} params.character - Character data
   * @param {string} params.action - Player's action
   * @param {string} params.worldContext - World description
   * @param {Array} params.recentMessages - Recent conversation history
   */
  async generateResponse({ character, action, worldContext, recentMessages = [] }) {
    try {
      console.log('[DMNarrator] Generating response for action:', action);

      const responseStyle = this.classifyResponseStyle(action);
      console.log(`[DMNarrator] Response style: ${responseStyle}`);

      const systemPrompt = this.buildSystemPrompt(character, worldContext, responseStyle);
      const userPrompt = this.buildUserPrompt(action, recentMessages);

      const response = await claudeAPI.call({
        model: 'claude-sonnet-4-20250514',
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
        maxTokens: 500,
        temperature: 0.7, // Creative but not wild
        agentType: 'dm_narrator',
        characterId: character.id || 999,
        useCache: false
      });

      // Parse the response
      const parsed = this.parseResponse(response.content);

      console.log('[DMNarrator] Response generated successfully');
      return parsed;

    } catch (error) {
      console.error('[DMNarrator] Error:', error.message);
      // Return fallback
      return this.generateFallback(action, character);
    }
  }

  buildSystemPrompt(character, worldContext, responseStyle = 'specific_action') {
    const styleGuidance = this.responseStyles[responseStyle] || this.responseStyles.specific_action;

    return `You are a skilled Dungeon Master running a tabletop RPG session. Your role is to narrate the story, describe the world, and respond to player actions with immersive, descriptive prose.

## RESPONSE STYLE GUIDANCE
${styleGuidance}

## WORLD CONTEXT
${worldContext || 'A fantasy realm of adventure and mystery.'}

## CHARACTER
Name: ${character.name}
Class: ${character.class}
Level: ${character.level || 1}
Stats: STR ${character.str}, DEX ${character.dex}, CON ${character.con}, INT ${character.int}, WIS ${character.wis}, CHA ${character.cha}

## YOUR GUIDELINES

1. **Be Immersive**: Write vivid, sensory descriptions that bring the world to life
2. **Show Consequences**: Player actions should have logical results in the world
3. **Maintain Consistency**: Stay true to the established world and character capabilities
4. **Offer Agency**: End with prompts or situations that invite further player action
5. **Follow Response Style**: Match your response length to the RESPONSE STYLE GUIDANCE above
6. **Stay In Character**: You are the DM, not an AI assistant

## RESPONSE FORMAT

Respond with a JSON object containing:
{
  "narrative": "Your response following the RESPONSE STYLE GUIDANCE above",
  "continuation": "A brief DM prompt inviting the next action (1 sentence)"
}

IMPORTANT:
- Respond ONLY with valid JSON. No markdown, no code blocks.
- Follow the RESPONSE STYLE GUIDANCE for narrative length - some responses should be just 1-2 sentences!`;
  }

  buildUserPrompt(action, recentMessages) {
    let prompt = '';

    // Include recent context if available
    if (recentMessages.length > 0) {
      prompt += 'RECENT EVENTS:\n';
      recentMessages.slice(-5).forEach(msg => {
        if (msg.type === 'player') {
          prompt += `Player: ${msg.content}\n`;
        } else if (msg.type === 'dm') {
          prompt += `DM: ${msg.content.substring(0, 200)}...\n`;
        }
      });
      prompt += '\n';
    }

    prompt += `CURRENT PLAYER ACTION: ${action}\n\nGenerate the DM's narrative response.`;
    return prompt;
  }

  parseResponse(content) {
    try {
      // Clean up the response
      let cleaned = content.trim();

      // Remove markdown code blocks if present
      if (cleaned.startsWith('```')) {
        const match = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (match) {
          cleaned = match[1].trim();
        }
      }

      const parsed = JSON.parse(cleaned);

      return {
        narrative: parsed.narrative || 'The world responds to your action.',
        continuation: parsed.continuation || 'What do you do next?',
        metadata: { source: 'ai' }
      };
    } catch (error) {
      console.error('[DMNarrator] Failed to parse response:', error.message);
      // Try to extract narrative from raw text
      return {
        narrative: content.substring(0, 500),
        continuation: 'What do you do next?',
        metadata: { source: 'ai_raw' }
      };
    }
  }

/**
   * Generate AI-powered welcome narrative for new characters
   * Creates an immersive opening that sets the stage for the adventure
   * @param {Object} params
   * @param {Object} params.character - Character data
   * @param {Array} params.goals - User's wellness goals/focus areas
   */
  async generateWelcomeNarrative({ character, goals = [] }) {
    try {
      console.log('[DMNarrator] Generating welcome narrative for:', character.name);

      const systemPrompt = this.buildWelcomeSystemPrompt(character, goals);
      const userPrompt = `Create a dramatic, personalized welcome narrative for ${character.name}, a new ${character.class || character.character_class} arriving in Ironhold.`;

      const response = await claudeAPI.call({
        model: 'claude-sonnet-4-20250514',
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
        maxTokens: 800,
        temperature: 0.8, // More creative for welcome narratives
        agentType: 'dm_narrator',
        characterId: character.id || 999,
        useCache: false
      });

      const parsed = this.parseWelcomeResponse(response.content);
      console.log('[DMNarrator] Welcome narrative generated successfully');
      return parsed;

    } catch (error) {
      console.error('[DMNarrator] Welcome narrative error:', error.message);
      return this.generateWelcomeFallback(character, goals);
    }
  }

  buildWelcomeSystemPrompt(character, goals) {
    const goalDescriptions = {
      strength: 'building physical might through strength training',
      cardio: 'forging endurance through cardiovascular challenges',
      flexibility: 'cultivating grace and balance through flexibility work',
      meditation: 'seeking inner wisdom through mindfulness',
      learning: 'expanding knowledge through study and curiosity',
      social: 'strengthening bonds through connection with others',
      sleep: 'honoring rest as the foundation of power'
    };

    const goalNarratives = goals.map(g => goalDescriptions[g] || g).join(', ');

    return `You are a masterful Dungeon Master welcoming a new adventurer to your campaign.

## THE WORLD: IRONHOLD
Long ago, the Great Sundering cracked the barrier between worlds, flooding the land with raw potential. Now, Ironhold exists in a state of flux—reality bends to those with the will to shape it.

The Six Foundations govern all power in Ironhold:
- IRON (Strength) - Physical might, raw power, discipline of the body
- WIND (Dexterity) - Speed, agility, the grace of flowing movement
- STONE (Constitution) - Endurance, vitality, the patience of mountains
- SPARK (Intelligence) - Knowledge, focus, the fire of understanding
- TIDE (Wisdom) - Insight, awareness, the rhythm of breath and mind
- FLAME (Charisma) - Presence, connection, the warmth of shared purpose

The Waystation stands at the crossroads of fate, where new arrivals first feel the pulse of this fractured realm. Warden Kael, a scarred veteran, watches for those strong enough to walk the path ahead.

## THE NEW ADVENTURER
Name: ${character.name}
Class: ${character.class || character.character_class}
${goals.length > 0 ? `Their path focuses on: ${goalNarratives}` : ''}

## YOUR TASK
Write a dramatic, immersive welcome narrative that:
1. Introduces ${character.name} arriving at the Waystation in Ironhold
2. References their class abilities and connection to the Foundations
3. Introduces Warden Kael as their first contact
4. Hints at the Great Sundering and the power waiting to be awakened
5. Mentions the connection between real-world effort and magical growth

## TONE
- Epic and inspiring, like the opening of a great adventure
- Personal and specific to this character
- Hopeful but with hints of challenges to come
- 3-4 paragraphs, vivid and sensory

## FORMAT
Respond with JSON:
{
  "narrative": "Your epic welcome narrative here",
  "hook": "A short teaser about what awaits (1-2 sentences)",
  "dmSignOff": "A brief DM sign-off"
}`;
  }

  parseWelcomeResponse(content) {
    try {
      let cleaned = content.trim();
      if (cleaned.startsWith('```')) {
        const match = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (match) cleaned = match[1].trim();
      }

      const parsed = JSON.parse(cleaned);
      return {
        narrative: parsed.narrative,
        hook: parsed.hook || 'Your legend begins now.',
        dmSignOff: parsed.dmSignOff || '— Your Dungeon Master',
        fullText: `${parsed.narrative}\n\n${parsed.hook || ''}\n\n${parsed.dmSignOff || '— Your Dungeon Master'}`,
        source: 'ai'
      };
    } catch (error) {
      console.error('[DMNarrator] Failed to parse welcome response:', error.message);
      return {
        narrative: content.substring(0, 800),
        hook: 'Your legend begins now.',
        dmSignOff: '— Your Dungeon Master',
        fullText: content.substring(0, 800) + '\n\n— Your Dungeon Master',
        source: 'ai_raw'
      };
    }
  }

  generateWelcomeFallback(character, goals) {
    const name = character.name;
    const charClass = character.class || character.character_class || 'adventurer';

    const classOpenings = {
      Fighter: `The clash of steel echoes through the training grounds as ${name} arrives at the Waystation. The Foundation of Iron stirs, recognizing a warrior's spirit forged through discipline.`,
      Mage: `The air crackles with potential as ${name} crosses the threshold into Ironhold. The Spark within flickers to life, hungry for knowledge, ready to ignite.`,
      Rogue: `Silent as wind, ${name} slips through the Waystation's gates. The Foundation of Wind whispers welcome to one who moves with purpose and grace.`,
      Cleric: `A steady warmth heralds ${name}'s arrival in Ironhold. The Flame and Tide respond, sensing one who would heal and guide.`,
      Ranger: `The wind carries whispers of distant peaks as ${name} emerges into the Waystation. Stone and Wind answer, recognizing a guardian of the wild paths.`
    };

    const opening = classOpenings[charClass] || `A new chapter begins as ${name} steps through the gates of the Waystation, ready for adventure.`;

    const narrative = `${opening}

Since the Great Sundering shattered the barriers between worlds, Ironhold has existed in flux—a realm where reality bends to those with the will to shape it. Every feat of strength, every moment of stillness, every challenge overcome in the waking world echoes here as tangible power. The Six Foundations—Iron, Wind, Stone, Spark, Tide, and Flame—await your contribution.

Warden Kael, a scarred veteran who has seen countless adventurers pass through these gates, turns to regard you. His voice is gravel and iron. "You made it. Good. That's step one. The road ahead won't care about your excuses—but I'll be here when you're ready."

Your journey begins now, ${name}. The fractured realm of Ironhold stretches before you, full of mystery, danger, and dormant power waiting to be awakened. What will your legend say?`;

    return {
      narrative,
      hook: 'The Waystation awaits your first challenge...',
      dmSignOff: '— Your Dungeon Master',
      fullText: `${narrative}\n\nThe Waystation awaits your first challenge...\n\n— Your Dungeon Master`,
      source: 'fallback'
    };
  }

  generateFallback(action, character) {
    const actionLower = (action || '').toLowerCase();
    const charName = character?.name || 'Adventurer';
    const charClass = character?.class || 'Fighter';

    if (actionLower.includes('look') || actionLower.includes('examine')) {
      return {
        narrative: 'You carefully observe your surroundings. The details come into focus as you take in the scene before you. Every shadow holds potential secrets, every sound tells a story.',
        continuation: 'What catches your attention most?',
        metadata: { source: 'fallback' }
      };
    }

    if (actionLower.includes('attack') || actionLower.includes('fight') || actionLower.includes('strike')) {
      const weaponDesc = charClass === 'Fighter' ? 'Your weapon gleams with deadly intent' :
                         charClass === 'Mage' ? 'Arcane energy crackles at your fingertips' :
                         'Your blade whispers through the air';
      return {
        narrative: `${weaponDesc} as you prepare for combat! Your training kicks in, every muscle tensed and ready for action.`,
        continuation: 'Roll for initiative! What is your combat strategy?',
        metadata: { source: 'fallback' }
      };
    }

    if (actionLower.includes('talk') || actionLower.includes('speak') || actionLower.includes('ask') || actionLower.includes('approach')) {
      return {
        narrative: 'You step forward to engage in conversation, your words carrying the weight of your intentions. Your presence commands attention.',
        continuation: 'The listener turns their attention to you expectantly. What do you say?',
        metadata: { source: 'fallback' }
      };
    }

    return {
      narrative: `${charName} ${action}. The world responds to your action, and new possibilities unfold before you.`,
      continuation: 'What do you do next?',
      metadata: { source: 'fallback' }
    };
  }
}

module.exports = new DMNarrator();
