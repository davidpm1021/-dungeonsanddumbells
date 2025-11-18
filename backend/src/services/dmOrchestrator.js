const claudeAPI = require('./claudeAPI');
const NarrativeRAG = require('./narrativeRAG');
const Lorekeeper = require('./agents/lorekeeper');
const MemoryManager = require('./memoryManager');
const NarrativeSummary = require('./narrativeSummary');
const SkillCheckDetector = require('./agents/skillCheckDetector');
const SkillCheckService = require('./skillCheckService');
const CombatDetector = require('./agents/combatDetector');
const CombatManager = require('./combatManager');
const db = require('../config/database');

/**
 * DM Orchestrator
 * Full multi-agent pipeline for narrative generation
 *
 * Pipeline:
 * 1. Retrieve relevant memories (RAG)
 * 2. Get narrative summary for context
 * 2.5. Detect if skill check is needed (Skill Check Detector)
 * 2.6. Perform skill check if required (Skill Check Service)
 * 2.7. Check for active combat or detect new combat (Combat Detector)
 * 2.8. Initialize combat encounter if triggered (Combat Manager)
 * 3. Generate narrative response (DM Agent with skill check + combat results)
 * 4. Validate with Lorekeeper
 * 5. Store event in memory system
 * 6. Update narrative summary
 * 7. Check for quest triggers
 */
class DMOrchestrator {
  constructor() {
    this.sessionMemory = new Map(); // In-memory session tracking
  }

  /**
   * Process player action through full pipeline
   */
  async processAction({ character, action, worldContext, recentMessages = [], sessionId }) {
    const startTime = Date.now();
    const pipelineLog = [];

    try {
      console.log('[DMOrchestrator] Starting full pipeline for action:', action);

      // Step 1: Retrieve relevant memories
      pipelineLog.push({ step: 'memory_retrieval', startTime: Date.now() });
      const relevantMemories = await this.retrieveMemories(character, action, worldContext);
      pipelineLog[pipelineLog.length - 1].duration = Date.now() - pipelineLog[pipelineLog.length - 1].startTime;
      pipelineLog[pipelineLog.length - 1].result = `Found ${relevantMemories.length} relevant memories`;
      console.log(`[DMOrchestrator] Step 1: Retrieved ${relevantMemories.length} memories`);

      // Step 2: Get or create narrative summary
      pipelineLog.push({ step: 'narrative_summary', startTime: Date.now() });
      const narrativeSummary = await this.getNarrativeSummary(sessionId, worldContext);
      pipelineLog[pipelineLog.length - 1].duration = Date.now() - pipelineLog[pipelineLog.length - 1].startTime;
      console.log('[DMOrchestrator] Step 2: Retrieved narrative summary');

      // Step 2.5: Detect if skill check is needed
      pipelineLog.push({ step: 'skill_check_detection', startTime: Date.now() });
      const skillCheckRequired = await SkillCheckDetector.analyze(action, worldContext, character);
      pipelineLog[pipelineLog.length - 1].duration = Date.now() - pipelineLog[pipelineLog.length - 1].startTime;
      pipelineLog[pipelineLog.length - 1].requiresCheck = skillCheckRequired.requiresCheck;
      console.log(`[DMOrchestrator] Step 2.5: Skill check ${skillCheckRequired.requiresCheck ? `required (${skillCheckRequired.skillType} DC${skillCheckRequired.dc})` : 'not needed'}`);

      // Step 2.6: Perform skill check if required
      let skillCheckResult = null;
      if (skillCheckRequired.requiresCheck && character.id) {
        pipelineLog.push({ step: 'skill_check_execution', startTime: Date.now() });
        try {
          skillCheckResult = await SkillCheckService.performCheck(
            character.id,
            skillCheckRequired.skillType,
            skillCheckRequired.dc,
            {
              narrativeContext: action.substring(0, 500),
              advantage: false, // TODO: Detect advantage/disadvantage from conditions
              disadvantage: false
            }
          );
          pipelineLog[pipelineLog.length - 1].duration = Date.now() - pipelineLog[pipelineLog.length - 1].startTime;
          pipelineLog[pipelineLog.length - 1].success = skillCheckResult.success;
          pipelineLog[pipelineLog.length - 1].total = skillCheckResult.total;
          console.log(`[DMOrchestrator] Step 2.6: Skill check rolled: ${skillCheckResult.modifiersBreakdown}`);
        } catch (error) {
          console.error('[DMOrchestrator] Skill check execution failed:', error.message);
          pipelineLog[pipelineLog.length - 1].duration = Date.now() - pipelineLog[pipelineLog.length - 1].startTime;
          pipelineLog[pipelineLog.length - 1].error = error.message;
        }
      }

      // Step 2.7: Check for active combat or detect new combat
      pipelineLog.push({ step: 'combat_detection', startTime: Date.now() });
      let combatState = null;
      let combatDetectionResult = null;

      // Check if character is already in active combat (only if they have an ID)
      if (character.id) {
        const activeCombat = await CombatManager.getActiveCombat(character.id);

        if (activeCombat) {
          combatState = activeCombat;
          pipelineLog[pipelineLog.length - 1].result = 'active_combat_found';
          console.log(`[DMOrchestrator] Step 2.7: Active combat found (${activeCombat.encounterName})`);
        }
      }

      // If no active combat, detect if this action should trigger combat
      // This works even for temporary characters without IDs
      if (!combatState) {
        combatDetectionResult = await CombatDetector.analyze(
          action,
          worldContext,
          character,
          relevantMemories
        );
        pipelineLog[pipelineLog.length - 1].result = combatDetectionResult.combatTriggered ? 'combat_triggered' : 'no_combat';
        console.log(`[DMOrchestrator] Step 2.7: Combat ${combatDetectionResult.combatTriggered ? `triggered (${combatDetectionResult.enemies.length} enemies)` : 'not triggered'}`);
      }

      pipelineLog[pipelineLog.length - 1].duration = Date.now() - pipelineLog[pipelineLog.length - 1].startTime;

      // Step 2.8: Initialize combat encounter if triggered
      if (combatDetectionResult && combatDetectionResult.combatTriggered && character.id) {
        pipelineLog.push({ step: 'combat_initialization', startTime: Date.now() });
        try {
          combatState = await CombatManager.initializeEncounter(
            character.id,
            combatDetectionResult,
            null // TODO: Link to quest if available
          );
          pipelineLog[pipelineLog.length - 1].duration = Date.now() - pipelineLog[pipelineLog.length - 1].startTime;
          pipelineLog[pipelineLog.length - 1].encounterId = combatState.id;
          pipelineLog[pipelineLog.length - 1].enemyCount = combatState.enemies.length;
          console.log(`[DMOrchestrator] Step 2.8: Combat initialized - ${combatState.encounterName}`);
        } catch (error) {
          console.error('[DMOrchestrator] Combat initialization failed:', error.message);
          pipelineLog[pipelineLog.length - 1].duration = Date.now() - pipelineLog[pipelineLog.length - 1].startTime;
          pipelineLog[pipelineLog.length - 1].error = error.message;
          combatState = null;
        }
      }

      // Step 3: Generate narrative response
      pipelineLog.push({ step: 'narrative_generation', startTime: Date.now() });
      const rawResponse = await this.generateNarrative({
        character,
        action,
        worldContext,
        recentMessages,
        relevantMemories,
        narrativeSummary,
        skillCheckResult, // Pass skill check result to narrative generation
        combatState // NEW: Pass combat state to narrative generation
      });
      pipelineLog[pipelineLog.length - 1].duration = Date.now() - pipelineLog[pipelineLog.length - 1].startTime;
      pipelineLog[pipelineLog.length - 1].tokens = rawResponse.tokens;
      console.log('[DMOrchestrator] Step 3: Generated narrative response');

      // Step 4: Validate with Lorekeeper
      pipelineLog.push({ step: 'lorekeeper_validation', startTime: Date.now() });
      const validation = await this.validateNarrative(rawResponse.narrative, worldContext, character);
      pipelineLog[pipelineLog.length - 1].duration = Date.now() - pipelineLog[pipelineLog.length - 1].startTime;
      pipelineLog[pipelineLog.length - 1].score = validation.score;
      console.log(`[DMOrchestrator] Step 4: Lorekeeper validation score: ${validation.score}`);

      // Step 5: Store in memory system
      pipelineLog.push({ step: 'memory_storage', startTime: Date.now() });
      await this.storeMemory(sessionId, character, action, rawResponse.narrative);
      pipelineLog[pipelineLog.length - 1].duration = Date.now() - pipelineLog[pipelineLog.length - 1].startTime;
      console.log('[DMOrchestrator] Step 5: Stored event in memory');

      // Step 6: Update narrative summary
      pipelineLog.push({ step: 'summary_update', startTime: Date.now() });
      await this.updateNarrativeSummary(sessionId, action, rawResponse.narrative);
      pipelineLog[pipelineLog.length - 1].duration = Date.now() - pipelineLog[pipelineLog.length - 1].startTime;
      console.log('[DMOrchestrator] Step 6: Updated narrative summary');

      // Step 7: Check for quest triggers
      pipelineLog.push({ step: 'quest_check', startTime: Date.now() });
      const questTrigger = await this.checkQuestTriggers(character, action, rawResponse.narrative);
      pipelineLog[pipelineLog.length - 1].duration = Date.now() - pipelineLog[pipelineLog.length - 1].startTime;
      pipelineLog[pipelineLog.length - 1].triggered = questTrigger.triggered;
      console.log(`[DMOrchestrator] Step 7: Quest trigger check: ${questTrigger.triggered ? 'YES' : 'NO'}`);

      const totalDuration = Date.now() - startTime;
      console.log(`[DMOrchestrator] Pipeline complete in ${totalDuration}ms`);

      return {
        narrative: rawResponse.narrative,
        continuation: rawResponse.continuation,
        skillCheckResult: skillCheckResult, // Include skill check result
        combatState: combatState, // NEW: Include combat state
        metadata: {
          source: 'orchestrated',
          pipeline: pipelineLog,
          totalDuration,
          validation: {
            score: validation.score,
            passed: validation.passed,
            violations: validation.violations?.length || 0
          },
          memoriesUsed: relevantMemories.length,
          questTriggered: questTrigger.triggered,
          questSuggestion: questTrigger.suggestion,
          skillCheckPerformed: skillCheckResult !== null, // Flag if skill check happened
          combatActive: combatState !== null, // NEW: Flag if combat is active
          combatTriggered: combatDetectionResult?.combatTriggered || false // NEW: Flag if combat just started
        }
      };

    } catch (error) {
      console.error('[DMOrchestrator] Pipeline error:', error);
      // Fallback to simple generation
      return this.fallbackGenerate(character, action, worldContext);
    }
  }

  /**
   * Step 1: Retrieve relevant memories via RAG
   */
  async retrieveMemories(character, action, worldContext) {
    try {
      // Use keywords from action to find relevant past events
      const keywords = this.extractKeywords(action);
      const memories = await NarrativeRAG.keywordRetrieval(
        character.id || 0,
        keywords.join(' '),
        5 // Top 5 memories
      );
      return memories || [];
    } catch (error) {
      console.error('[DMOrchestrator] Memory retrieval failed:', error.message);
      return [];
    }
  }

  /**
   * Extract keywords from action for RAG
   */
  extractKeywords(action) {
    const stopWords = ['i', 'the', 'a', 'an', 'to', 'and', 'or', 'in', 'on', 'at', 'for'];
    const words = action.toLowerCase().split(/\s+/);
    return words.filter(w => w.length > 2 && !stopWords.includes(w)).slice(0, 10);
  }

  /**
   * Step 2: Get narrative summary for session
   */
  async getNarrativeSummary(sessionId, worldContext) {
    if (!this.sessionMemory.has(sessionId)) {
      this.sessionMemory.set(sessionId, {
        summary: worldContext,
        events: [],
        createdAt: Date.now()
      });
    }
    return this.sessionMemory.get(sessionId).summary;
  }

  /**
   * Step 3: Generate narrative with full context
   */
  async generateNarrative({ character, action, worldContext, recentMessages, relevantMemories, narrativeSummary, skillCheckResult = null, combatState = null }) {
    const systemPrompt = this.buildOrchestratedSystemPrompt(character, worldContext, narrativeSummary, relevantMemories);
    const userPrompt = this.buildUserPrompt(action, recentMessages, skillCheckResult, combatState);

    const response = await claudeAPI.call({
      model: 'claude-sonnet-4-20250514',
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      maxTokens: 600,
      temperature: 0.6, // Balanced creativity and consistency
      agentType: 'dm_orchestrator',
      characterId: character.id || 999,
      useCache: false
    });

    const parsed = this.parseResponse(response.content);
    parsed.tokens = response.tokens;
    return parsed;
  }

  buildOrchestratedSystemPrompt(character, worldContext, narrativeSummary, relevantMemories) {
    let prompt = `You are a skilled Dungeon Master running a tabletop RPG session with a focus on narrative consistency and immersion.

## CORE PRINCIPLE: PLAYER AGENCY

**NEVER ROLL DICE FOR THE PLAYER. NEVER DECIDE PLAYER ACTIONS.**

The most sacred rule of being a Dungeon Master: **The player controls their character, you control the world.**

- ✅ DO: "Roll a d20 for your attack!" / "What do you do?"
- ✅ DO: "Roll for initiative! Add your DEX modifier (+3)"
- ✅ DO: "The bandit swings at you - roll a d20 for your Dexterity saving throw!"
- ❌ DON'T: "You roll a 15 and hit!" / "You decide to flee"
- ❌ DON'T: "Your initiative is 18" (let them roll it)
- ❌ DON'T: "You attack the guard" (only if they said so)

**YOU roll for:**
- Enemy actions, attacks, saves
- Environmental effects (random encounters, weather)
- NPC reactions and initiatives

**PLAYER rolls for:**
- Their own attacks, damage, saves, skill checks
- Their own initiative
- Any action their character takes

**Make them FEEL the dice.** The tension of rolling, the triumph of a natural 20, the dread of a critical fail - these are what make D&D magical.

## WORLD CONTEXT
${worldContext}

## CURRENT NARRATIVE SUMMARY
${narrativeSummary}

## CHARACTER
Name: ${character.name}
Class: ${character.class}
Level: ${character.level || 1}
Stats: STR ${character.str}, DEX ${character.dex}, CON ${character.con}, INT ${character.int}, WIS ${character.wis}, CHA ${character.cha}
`;

    if (relevantMemories.length > 0) {
      prompt += `\n## RELEVANT PAST EVENTS (maintain consistency with these)\n`;
      relevantMemories.forEach((mem, i) => {
        prompt += `${i + 1}. ${mem.description || mem.content || mem}\n`;
      });
    }

    prompt += `
## CRITICAL GUIDELINES

1. **Narrative Consistency**: Reference and build upon established events. Don't contradict what has happened.
2. **Character Capability**: Actions should match character stats and class abilities.
3. **World Logic**: Maintain internal consistency with the established world rules.
4. **Consequences**: Actions have logical outcomes - both positive and negative.
5. **Show, Don't Tell**: Use vivid, sensory descriptions.
6. **Player Agency**: End with situations that invite meaningful choices.
7. **No Meta-Gaming**: Stay in character as the DM.

## FORBIDDEN
- Breaking established world facts
- Ignoring character limitations
- Deus ex machina solutions
- Contradicting previous events
- Excessive hand-holding or telling players what to do

## RESPONSE FORMAT

Respond with a JSON object:
{
  "narrative": "The main narrative response (2-3 paragraphs)",
  "continuation": "A brief DM prompt for next action (1 sentence)",
  "worldStateChanges": ["key_event_1", "key_event_2"] // Track significant changes
}

IMPORTANT: Respond ONLY with valid JSON. No markdown code blocks.`;

    return prompt;
  }

  buildUserPrompt(action, recentMessages, skillCheckResult = null, combatState = null) {
    let prompt = '';

    if (recentMessages.length > 0) {
      prompt += 'RECENT CONVERSATION:\n';
      recentMessages.slice(-6).forEach(msg => {
        if (msg.type === 'player') {
          prompt += `Player: ${msg.content}\n`;
        } else if (msg.type === 'dm') {
          prompt += `DM: ${msg.content.substring(0, 150)}...\n`;
        }
      });
      prompt += '\n';
    }

    // Include combat state if present
    if (combatState) {
      const isFirstTurn = combatState.currentRound === 1 && combatState.currentTurnIndex === 0;

      if (isFirstTurn) {
        // FIRST TURN OF COMBAT - Initiative phase
        prompt += `🎲 COMBAT JUST STARTED - INITIATIVE PHASE!\n\n`;

        // Show enemy initiative rolls (DM already rolled these)
        prompt += `ENEMY INITIATIVE ROLLS (you rolled these):\n`;
        combatState.initiativeOrder.forEach((combatant) => {
          if (combatant.type === 'enemy') {
            const roll = combatant.initiative - combatant.dexMod;
            const sign = combatant.dexMod >= 0 ? '+' : '';
            prompt += `- ${combatant.name}: Rolled ${roll} ${sign}${combatant.dexMod} = ${combatant.initiative}\n`;
          }
        });

        // Get player's DEX modifier
        const playerInitiative = combatState.initiativeOrder.find(c => c.type === 'player');
        const sign = playerInitiative.dexMod >= 0 ? '+' : '';

        prompt += `\nPLAYER INITIATIVE:\n`;
        prompt += `- ${playerInitiative.name} needs to roll d20 ${sign}${playerInitiative.dexMod} for initiative\n`;
        prompt += `- Current roll in system: ${playerInitiative.initiative} (placeholder - player will provide real roll)\n\n`;

        prompt += `CRITICAL: As the DM, you MUST:\n`;
        prompt += `1. Describe the scene dramatically (enemy appearance, environment, rising tension)\n`;
        prompt += `2. Tell the PLAYER to roll: "Roll for initiative! Roll a d20 and add your DEX modifier (${sign}${playerInitiative.dexMod})!"\n`;
        prompt += `3. Announce enemy rolls: "I rolled a [X] for the ${combatState.enemies[0].name}!"\n`;
        prompt += `4. DO NOT announce turn order yet - wait for player's roll\n`;
        prompt += `5. End with: "What did you roll for initiative?"\n\n`;

        prompt += `NOTE: Turn order will be determined after player submits their initiative roll.\n\n`;
      } else {
        // ONGOING COMBAT
        prompt += `COMBAT STATUS:\n`;
        prompt += `Encounter: ${combatState.encounterName}\n`;
        prompt += `Round: ${combatState.currentRound}\n`;
        prompt += `Current Turn: ${combatState.initiativeOrder[combatState.currentTurnIndex].name}\n`;
        prompt += `\nIMPORTANT: This is an ongoing combat turn. Narrate the action and prompt for next move.\n\n`;
      }

      // Always include enemy status and zones
      prompt += `Player Zone: ${combatState.zoneSystem.player_zone}\n`;
      prompt += `\nEnemies:\n`;
      combatState.enemies.forEach((enemy, idx) => {
        const zone = combatState.zoneSystem.enemy_zones[`enemy_${idx}`] || 'near';
        prompt += `- ${enemy.name}: ${enemy.currentHp}/${enemy.maxHp} HP, AC ${enemy.ac}, Zone: ${zone}\n`;
      });
      prompt += `\n`;
    }

    prompt += `CURRENT PLAYER ACTION: ${action}\n\n`;

    // Include skill check result if present
    if (skillCheckResult) {
      prompt += `SKILL CHECK RESULT:\n`;
      prompt += `${skillCheckResult.skillType} check: Rolled ${skillCheckResult.roll} + modifiers = ${skillCheckResult.total} vs DC ${skillCheckResult.dc}\n`;
      prompt += `Result: ${skillCheckResult.success ? '**SUCCESS**' : '**FAILURE**'}\n`;
      prompt += `Breakdown: ${skillCheckResult.modifiersBreakdown}\n\n`;
      prompt += `IMPORTANT: Incorporate this skill check result into your narrative. The ${skillCheckResult.success ? 'success' : 'failure'} should meaningfully affect the outcome of the action.\n\n`;
    }

    prompt += `Generate the DM's narrative response, maintaining consistency with all established events${skillCheckResult ? ' and the skill check result' : ''}.`;
    return prompt;
  }

  parseResponse(content) {
    try {
      let cleaned = content.trim();
      if (cleaned.startsWith('```')) {
        const match = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (match) cleaned = match[1].trim();
      }

      const parsed = JSON.parse(cleaned);
      return {
        narrative: parsed.narrative || 'The world responds.',
        continuation: parsed.continuation || 'What do you do next?',
        worldStateChanges: parsed.worldStateChanges || []
      };
    } catch (error) {
      console.error('[DMOrchestrator] JSON parse failed:', error.message);
      return {
        narrative: content.substring(0, 600),
        continuation: 'What do you do next?',
        worldStateChanges: []
      };
    }
  }

  /**
   * Step 4: Validate with Lorekeeper
   */
  async validateNarrative(narrative, worldContext, character) {
    try {
      // Create a pseudo-quest object for validation
      const pseudoQuest = {
        title: 'DM Narrative Response',
        description: narrative,
        objectives: [
          {
            description: 'Continue the narrative',
            statReward: 'WIS',
            xpReward: 10
          }
        ],
        difficulty: 'medium',
        questType: 'side'
      };

      const validation = await Lorekeeper.validateQuest(pseudoQuest, character, character.id || 0);
      return validation;
    } catch (error) {
      console.error('[DMOrchestrator] Lorekeeper validation failed:', error.message);
      // Return passing validation on error to avoid blocking
      return { score: 75, passed: true, violations: [] };
    }
  }

  /**
   * Step 5: Store event in memory
   */
  async storeMemory(sessionId, character, action, narrative) {
    try {
      const session = this.sessionMemory.get(sessionId);
      if (session) {
        session.events.push({
          timestamp: Date.now(),
          action,
          narrative: narrative.substring(0, 500),
          characterName: character.name
        });

        // Keep only last 50 events in memory
        if (session.events.length > 50) {
          session.events = session.events.slice(-50);
        }
      }

      // If character has a real ID, store in database
      if (character.id && character.id !== 999) {
        await MemoryManager.storeEvent(character.id, {
          eventType: 'dm_interaction',
          description: `${character.name}: ${action} -> ${narrative.substring(0, 200)}`,
          importance: 'medium'
        });
      }
    } catch (error) {
      console.error('[DMOrchestrator] Memory storage failed:', error.message);
    }
  }

  /**
   * Step 6: Update narrative summary
   */
  async updateNarrativeSummary(sessionId, action, narrative) {
    try {
      const session = this.sessionMemory.get(sessionId);
      if (session && session.events.length % 5 === 0 && session.events.length > 0) {
        // Every 5 events, generate a new summary
        const recentEvents = session.events.slice(-10).map(e => `${e.action}: ${e.narrative.substring(0, 100)}`).join('\n');

        // Use NarrativeSummary service to compress
        const newSummary = await NarrativeSummary.generateUpdatedSummary({
          currentSummary: session.summary,
          newEvents: recentEvents,
          characterName: session.events[0]?.characterName || 'Adventurer'
        });

        session.summary = newSummary || session.summary;
        console.log('[DMOrchestrator] Narrative summary updated');
      }
    } catch (error) {
      console.error('[DMOrchestrator] Summary update failed:', error.message);
    }
  }

  /**
   * Step 7: Check for quest triggers
   */
  async checkQuestTriggers(character, action, narrative) {
    // Simple keyword-based trigger detection
    const triggers = {
      discovery: ['discover', 'find', 'uncover', 'reveal', 'ancient', 'artifact'],
      danger: ['attack', 'danger', 'threat', 'enemy', 'creature', 'monster'],
      mystery: ['strange', 'mysterious', 'puzzle', 'riddle', 'secret'],
      social: ['meet', 'speak', 'talk', 'negotiate', 'convince']
    };

    const combinedText = `${action} ${narrative}`.toLowerCase();

    for (const [type, keywords] of Object.entries(triggers)) {
      const matches = keywords.filter(k => combinedText.includes(k));
      if (matches.length >= 2) {
        return {
          triggered: true,
          type,
          suggestion: `A ${type} quest opportunity has emerged based on: ${matches.join(', ')}`
        };
      }
    }

    return { triggered: false };
  }

  /**
   * Fallback if pipeline fails
   */
  async fallbackGenerate(character, action, worldContext) {
    console.log('[DMOrchestrator] Using fallback generation');
    const DMNarrator = require('./dmNarrator');
    return DMNarrator.generateResponse({ character, action, worldContext });
  }
}

module.exports = new DMOrchestrator();
