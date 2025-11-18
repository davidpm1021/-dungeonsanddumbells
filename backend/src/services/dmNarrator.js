const claudeAPI = require('./claudeAPI');

/**
 * DM Narrator Service
 * Generates contextual narrative responses to player actions
 */
class DMNarrator {
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

      const systemPrompt = this.buildSystemPrompt(character, worldContext);
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

  buildSystemPrompt(character, worldContext) {
    return `You are a skilled Dungeon Master running a tabletop RPG session. Your role is to narrate the story, describe the world, and respond to player actions with immersive, descriptive prose.

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
5. **Be Concise**: Keep responses to 2-4 paragraphs. Don't overwrite.
6. **Stay In Character**: You are the DM, not an AI assistant

## RESPONSE FORMAT

Respond with a JSON object containing:
{
  "narrative": "The main narrative response describing what happens (2-3 paragraphs)",
  "continuation": "A brief DM prompt inviting the next action (1 sentence)"
}

Important: Respond ONLY with valid JSON. No markdown, no code blocks, just the JSON object.`;
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
