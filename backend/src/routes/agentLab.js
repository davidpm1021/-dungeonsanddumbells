const express = require('express');
const router = express.Router();

// Import all agents
const storyCoordinator = require('../services/agents/storyCoordinator');
const questCreator = require('../services/agents/questCreator');
const lorekeeper = require('../services/agents/lorekeeper');
const consequenceEngine = require('../services/agents/consequenceEngine');
const memoryManagerAgent = require('../services/agents/memoryManagerAgent');
const promptBuilder = require('../services/promptBuilder');
const { GENRES, getGenrePromptGuidance } = require('../data/genres');

// Import new orchestration systems
const narrativeDirector = require('../services/narrativeDirector');
const knowledgeGraph = require('../services/knowledgeGraph');
const validationPipeline = require('../services/validationPipeline');
const storyletSystem = require('../services/storyletSystem');
const selfConsistencyValidator = require('../services/selfConsistencyValidator');

/**
 * Agent Lab Routes
 * For testing and evaluating DM agents independently from game mechanics
 * No auth required - development/testing only
 */

// Mock character for testing
const createMockCharacter = (overrides = {}) => ({
  id: 999,
  name: 'TestHero',
  class: 'Fighter',
  level: 1,
  str: 12,
  dex: 10,
  con: 11,
  int: 9,
  wis: 10,
  cha: 10,
  ...overrides
});

// Mock goals for testing
const createMockGoals = () => [
  { id: 1, name: 'Morning Run', statMapping: 'DEX', frequency: 'daily', goalType: 'binary' },
  { id: 2, name: 'Meditation', statMapping: 'WIS', frequency: 'daily', goalType: 'binary' },
  { id: 3, name: 'Reading', statMapping: 'INT', frequency: 'daily', goalType: 'quantitative' }
];

// Mock quest for testing
const createMockQuest = (overrides = {}) => ({
  id: 1,
  title: 'The Lost Artifact',
  description: 'Retrieve a powerful artifact from the ancient ruins',
  openingScene: 'You stand before the crumbling entrance of an ancient temple...',
  questType: 'main',
  difficulty: 'medium',
  npcInvolved: 'Elder Thorne',
  npcDialogue: {
    npcName: 'Elder Thorne',
    opening: 'Ah, young warrior. I have a task that requires your... unique talents.',
    completion: 'Well done. Your strength grows with each trial.'
  },
  objectives: [
    {
      id: 1,
      narrativeDescription: 'Navigate through the trapped corridors',
      mechanicalDescription: 'Complete 10 minutes of cardio',
      goalMapping: 'Morning Run',
      statReward: 'DEX',
      xpReward: 50,
      completed: false
    }
  ],
  ...overrides
});

/**
 * POST /api/agent-lab/story-coordinator
 * Test the Story Coordinator agent
 */
router.post('/story-coordinator', async (req, res) => {
  try {
    const { character: customChar, activeQuestCount = 0 } = req.body;
    const character = createMockCharacter(customChar || {});

    console.log('[AgentLab] Testing Story Coordinator...');

    const startTime = Date.now();

    // Build prompt manually without DB lookups for testing
    const prompt = await promptBuilder.build({
      agentType: 'story_coordinator',
      characterId: character.id,
      character,
      context: { activeQuestCount },
      includeMemory: false, // Skip DB lookups for mock character
      includeWorldBible: false // Skip hardcoded Vitalia/Pillars - we're testing personal worlds now
    });

    // Call the agent directly with mock data
    const claudeAPI = require('../services/claudeAPI');
    const response = await claudeAPI.call({
      model: 'claude-sonnet-4-20250514',
      system: prompt.system,
      messages: prompt.messages,
      maxTokens: 512,
      temperature: 0.5,
      agentType: 'story_coordinator',
      characterId: character.id,
      useCache: false // Don't cache test runs
    });

    // Parse the response
    let decision;
    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        decision = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      decision = {
        needsQuest: true,
        questType: 'main',
        suggestedTheme: 'exploration',
        suggestedDifficulty: 'medium',
        reasoning: 'Parse error - using fallback',
        parseError: parseError.message,
        rawResponse: response.content.substring(0, 500)
      };
    }

    const totalTime = Date.now() - startTime;

    res.json({
      success: true,
      agent: 'Story Coordinator',
      input: {
        character,
        activeQuestCount
      },
      output: {
        ...decision,
        metadata: {
          model: response.model,
          cost: response.cost,
          latency: response.latency,
          cached: response.cached
        }
      },
      prompt: {
        system: prompt.system.substring(0, 2000) + '... [truncated]',
        userMessage: prompt.messages[0]?.content || 'No user message'
      },
      metrics: {
        totalTime,
        model: response.model,
        cost: response.cost,
        cached: response.cached
      }
    });
  } catch (error) {
    console.error('[AgentLab] Story Coordinator error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * POST /api/agent-lab/quest-creator
 * Test the Quest Creator agent
 */
router.post('/quest-creator', async (req, res) => {
  try {
    const {
      character: customChar,
      decision: customDecision
    } = req.body;

    const character = createMockCharacter(customChar || {});
    const decision = customDecision || {
      needsQuest: true,
      questType: 'main',
      suggestedTheme: 'exploration',
      suggestedDifficulty: 'medium',
      reasoning: 'Character needs narrative progression',
      userGoals: createMockGoals()
    };

    // Ensure userGoals is set
    if (!decision.userGoals) {
      decision.userGoals = createMockGoals();
    }

    console.log('[AgentLab] Testing Quest Creator...');

    const startTime = Date.now();

    // Build prompt without DB lookups
    const prompt = await promptBuilder.build({
      agentType: 'quest_creator',
      characterId: character.id,
      character,
      context: { decision },
      includeMemory: false,
      includeWorldBible: false // Skip hardcoded Vitalia/Pillars
    });

    // Call Claude directly
    const claudeAPI = require('../services/claudeAPI');
    const response = await claudeAPI.call({
      model: 'claude-sonnet-4-20250514',
      system: prompt.system,
      messages: prompt.messages,
      maxTokens: 1024,
      temperature: 0.5,
      agentType: 'quest_creator',
      characterId: character.id,
      useCache: false
    });

    // Parse the response
    let quest;
    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        quest = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      quest = {
        title: 'Parse Error Quest',
        description: 'Failed to parse quest from AI response',
        parseError: parseError.message,
        rawResponse: response.content.substring(0, 1000)
      };
    }

    const totalTime = Date.now() - startTime;

    res.json({
      success: true,
      agent: 'Quest Creator',
      input: {
        character,
        decision
      },
      output: {
        ...quest,
        metadata: {
          model: response.model,
          cost: response.cost,
          latency: response.latency,
          decision
        }
      },
      prompt: {
        system: prompt.system.substring(0, 2000) + '... [truncated]',
        userMessage: prompt.messages[0]?.content || 'No user message'
      },
      metrics: {
        totalTime,
        model: response.model,
        cost: response.cost,
        cached: false
      }
    });
  } catch (error) {
    console.error('[AgentLab] Quest Creator error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * POST /api/agent-lab/lorekeeper
 * Test the Lorekeeper validation agent
 */
router.post('/lorekeeper', async (req, res) => {
  try {
    const {
      character: customChar,
      quest: customQuest
    } = req.body;

    const character = createMockCharacter(customChar || {});
    const quest = customQuest || createMockQuest();

    console.log('[AgentLab] Testing Lorekeeper...');

    const startTime = Date.now();

    // Use lorekeeper directly - it has its own system prompt builder
    // that doesn't require DB access
    const validation = await lorekeeper.validateQuest(quest, character, character.id);
    const totalTime = Date.now() - startTime;

    res.json({
      success: true,
      agent: 'Lorekeeper',
      input: {
        character,
        quest
      },
      output: validation,
      metrics: {
        totalTime,
        model: validation.metadata?.model,
        cost: validation.metadata?.cost,
        score: validation.score,
        passed: validation.passed
      }
    });
  } catch (error) {
    console.error('[AgentLab] Lorekeeper error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * POST /api/agent-lab/consequence-engine
 * Test the Consequence Engine agent
 */
router.post('/consequence-engine', async (req, res) => {
  try {
    const {
      character: customChar,
      quest: customQuest,
      recentMemories = []
    } = req.body;

    const character = createMockCharacter(customChar || {});
    const quest = customQuest || createMockQuest();

    console.log('[AgentLab] Testing Consequence Engine...');

    const startTime = Date.now();

    // Build prompt without DB lookups
    const prompt = await promptBuilder.build({
      agentType: 'consequence_engine',
      characterId: character.id,
      character,
      context: { quest, recentMemories },
      includeMemory: false,
      includeWorldBible: false
    });

    // Call Claude directly
    const claudeAPI = require('../services/claudeAPI');
    const response = await claudeAPI.call({
      model: 'claude-sonnet-4-20250514',
      system: prompt.system,
      messages: prompt.messages,
      maxTokens: 768,
      temperature: 0.7,
      agentType: 'consequence_engine',
      characterId: character.id,
      useCache: false
    });

    // Parse the response
    let outcome;
    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        outcome = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      outcome = {
        narrativeText: 'Parse error - check raw response',
        npcInteractions: [],
        worldStateChanges: [],
        futurePlotHooks: [],
        parseError: parseError.message,
        rawResponse: response.content.substring(0, 1000)
      };
    }

    const totalTime = Date.now() - startTime;

    res.json({
      success: true,
      agent: 'Consequence Engine',
      input: {
        character,
        quest,
        recentMemories
      },
      output: {
        ...outcome,
        metadata: {
          model: response.model,
          cost: response.cost,
          latency: response.latency
        }
      },
      metrics: {
        totalTime,
        model: response.model,
        cost: response.cost
      }
    });
  } catch (error) {
    console.error('[AgentLab] Consequence Engine error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * POST /api/agent-lab/memory-manager
 * Test the Memory Manager agent
 */
router.post('/memory-manager', async (req, res) => {
  try {
    const { events = [] } = req.body;
    const character = createMockCharacter();

    // Create mock events if none provided
    const testEvents = events.length > 0 ? events : [
      {
        eventType: 'quest_completed',
        eventData: {
          questTitle: 'The Cartographer\'s Last Map',
          outcome: 'success',
          discoveredLocation: 'Hidden Grove'
        },
        narrativeText: 'The hero successfully traced the old cartographer\'s final map, discovering a hidden grove that had been lost for generations. The ancient trees whispered secrets of the land\'s forgotten history.',
        timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      },
      {
        eventType: 'npc_interaction',
        eventData: {
          npcName: 'Marcus the Innkeeper',
          relationshipChange: 'improved'
        },
        narrativeText: 'Marcus, the gruff innkeeper, finally cracked a smile as the hero returned with news of the hidden grove. "My grandmother used to tell stories of that place," he said, pouring a drink on the house.',
        timestamp: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000)
      },
      {
        eventType: 'objective_completed',
        eventData: {
          objectiveTitle: 'Scout the Northern Trail',
          questTitle: 'The Cartographer\'s Last Map'
        },
        narrativeText: 'During the early morning patrol along the northern trail, the hero spotted unusual markings on the trees - the same symbols from the old map. The cartographer had been here, leaving breadcrumbs for those who would follow.',
        timestamp: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000)
      }
    ];

    console.log('[AgentLab] Testing Memory Manager...');

    const startTime = Date.now();

    // Build prompt directly without DB lookups
    const prompt = await promptBuilder.build({
      agentType: 'memory_manager',
      characterId: character.id,
      character,
      context: { events: testEvents },
      includeMemory: false,
      includeWorldBible: false
    });

    // Call Claude directly
    const claudeAPI = require('../services/claudeAPI');
    const response = await claudeAPI.call({
      model: 'claude-sonnet-4-20250514',
      system: prompt.system,
      messages: prompt.messages,
      maxTokens: 512,
      temperature: 0.3,
      agentType: 'memory_manager',
      characterId: character.id,
      useCache: false
    });

    // Parse the response
    let summary;
    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        summary = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      summary = {
        summary: 'Parse error - check raw response',
        keyEvents: [],
        participantsInvolved: [],
        statChanges: {},
        parseError: parseError.message,
        rawResponse: response.content.substring(0, 1000)
      };
    }

    const totalTime = Date.now() - startTime;

    res.json({
      success: true,
      agent: 'Memory Manager',
      input: {
        eventCount: testEvents.length,
        events: testEvents
      },
      output: {
        ...summary,
        period: {
          start: testEvents[testEvents.length - 1]?.timestamp,
          end: testEvents[0]?.timestamp
        },
        eventCount: testEvents.length,
        metadata: {
          model: response.model,
          cost: response.cost,
          latency: response.latency
        }
      },
      metrics: {
        totalTime,
        model: response.model,
        cost: response.cost
      }
    });
  } catch (error) {
    console.error('[AgentLab] Memory Manager error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * POST /api/agent-lab/full-pipeline
 * Test the complete quest generation pipeline
 */
router.post('/full-pipeline', async (req, res) => {
  try {
    const { character: customChar } = req.body;
    const character = createMockCharacter(customChar || {});
    const results = {
      steps: [],
      totalTime: 0,
      totalCost: 0
    };

    console.log('[AgentLab] Testing Full Pipeline...');
    const pipelineStart = Date.now();

    // Step 1: Story Coordinator
    console.log('[AgentLab] Step 1: Story Coordinator');
    const step1Start = Date.now();
    const decision = await storyCoordinator.evaluateQuestNeed(character.id, character, 0);
    results.steps.push({
      agent: 'Story Coordinator',
      time: Date.now() - step1Start,
      cost: decision.metadata?.cost || 0,
      output: decision
    });

    // Step 2: Quest Creator
    console.log('[AgentLab] Step 2: Quest Creator');
    const step2Start = Date.now();
    const decisionWithGoals = { ...decision, userGoals: createMockGoals() };
    const quest = await questCreator.generateQuest(decisionWithGoals, character, character.id);
    results.steps.push({
      agent: 'Quest Creator',
      time: Date.now() - step2Start,
      cost: quest.metadata?.cost || 0,
      output: quest
    });

    // Step 3: Lorekeeper Validation
    console.log('[AgentLab] Step 3: Lorekeeper');
    const step3Start = Date.now();
    const validation = await lorekeeper.validateQuest(quest, character, character.id);
    results.steps.push({
      agent: 'Lorekeeper',
      time: Date.now() - step3Start,
      cost: validation.metadata?.cost || 0,
      output: validation
    });

    // Step 4: Consequence Engine (simulate quest completion)
    console.log('[AgentLab] Step 4: Consequence Engine');
    const step4Start = Date.now();
    const outcome = await consequenceEngine.generateOutcome(quest, character, character.id, []);
    results.steps.push({
      agent: 'Consequence Engine',
      time: Date.now() - step4Start,
      cost: outcome.metadata?.cost || 0,
      output: outcome
    });

    results.totalTime = Date.now() - pipelineStart;
    results.totalCost = results.steps.reduce((sum, step) => sum + step.cost, 0);

    res.json({
      success: true,
      pipeline: 'Full Quest Lifecycle',
      character,
      results,
      summary: {
        questTitle: quest.title,
        validationScore: validation.score,
        validationPassed: validation.passed,
        totalAgentCalls: results.steps.length,
        totalTime: results.totalTime,
        totalCost: results.totalCost
      }
    });
  } catch (error) {
    console.error('[AgentLab] Full Pipeline error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * GET /api/agent-lab/genres
 * List all available genres
 */
router.get('/genres', (req, res) => {
  const genreList = Object.values(GENRES).map(g => ({
    id: g.id,
    name: g.name,
    description: g.description,
    themes: g.themes,
    tone: g.tone
  }));

  res.json({
    success: true,
    genres: genreList
  });
});

/**
 * POST /api/agent-lab/generate-world
 * Generate a unique world based on genre + character + goals
 * This replaces the static "Vitalia" world with a personal narrative
 */
router.post('/generate-world', async (req, res) => {
  try {
    const {
      genre: genreId = 'dark_fantasy',
      character: customChar,
      goals: customGoals
    } = req.body;

    const character = createMockCharacter(customChar || {});
    const goals = customGoals || createMockGoals();

    const genreGuidance = getGenrePromptGuidance(genreId);
    if (!genreGuidance) {
      return res.status(400).json({ error: `Unknown genre: ${genreId}` });
    }

    console.log(`[AgentLab] Generating world for ${genreId} + ${character.class}...`);

    const systemPrompt = `You are a master worldbuilder creating a personal narrative world for a player.

Your task: Generate a unique world context that naturally integrates the player's real-world wellness goals into an immersive narrative. The goals should feel like organic parts of the story, NOT like "gamified habit tracking."

${genreGuidance}

CRITICAL RULES:
- Goals must emerge from the character's story, not be mapped to generic "pillars"
- Each goal should have narrative weight and consequence
- The world should feel lived-in and personal to THIS character
- NPCs should have their own motivations, not just serve the player
- Avoid meta-references to "quests," "stats," or "leveling up"
- The story context should make the player WANT to complete goals for narrative reasons

Respond with ONLY valid JSON in this exact structure:
{
  "worldName": "Name of this personal world/realm",
  "premise": "2-3 sentence hook that establishes why this character is here and what's at stake",
  "setting": {
    "description": "100-150 word vivid description of the world",
    "keyLocations": ["3-5 important places relevant to the story"],
    "atmosphere": "The overall mood and feeling"
  },
  "characterContext": {
    "backstory": "How this specific character fits into this world (100 words)",
    "currentSituation": "What immediate circumstances they face",
    "motivation": "What drives them forward",
    "innerConflict": "What internal struggle they face"
  },
  "goalIntegrations": [
    {
      "realWorldGoal": "The actual wellness goal",
      "narrativeWrapper": "How this manifests in the story (NOT 'training a stat')",
      "storyReason": "Why the character MUST do this in the narrative",
      "consequence": "What happens narratively if they neglect it"
    }
  ],
  "keyNPCs": [
    {
      "name": "NPC name",
      "role": "Their function in the story",
      "personality": "Brief personality description",
      "relationship": "How they relate to the player character",
      "ownGoals": "What they want (independent of player)"
    }
  ],
  "narrativeThreads": [
    "3-4 ongoing story threads that quests can explore"
  ],
  "immutableRules": [
    "3-5 world rules that must remain consistent"
  ]
}`;

    const userMessage = `Generate a personal world for:

CHARACTER:
- Name: ${character.name}
- Class: ${character.class}
- Level: ${character.level}
- Stats: STR ${character.str}, DEX ${character.dex}, CON ${character.con}, INT ${character.int}, WIS ${character.wis}, CHA ${character.cha}

REAL-WORLD WELLNESS GOALS TO INTEGRATE:
${goals.map((g, i) => `${i + 1}. ${g.name} (${g.frequency || 'daily'}) - relates to ${g.statMapping}`).join('\n')}

Create a world where these goals become narratively essential, not mechanically mapped.`;

    const claudeAPI = require('../services/claudeAPI');
    const startTime = Date.now();

    const response = await claudeAPI.call({
      model: 'claude-sonnet-4-20250514',
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
      maxTokens: 2048,
      temperature: 0.8, // Higher for creativity
      agentType: 'world_generator',
      characterId: character.id,
      useCache: false
    });

    // Parse the response
    let world;
    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        world = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      world = {
        parseError: parseError.message,
        rawResponse: response.content.substring(0, 2000)
      };
    }

    const totalTime = Date.now() - startTime;

    res.json({
      success: true,
      agent: 'World Generator',
      input: {
        genre: genreId,
        character,
        goals
      },
      output: world,
      metrics: {
        totalTime,
        model: response.model,
        cost: response.cost,
        cached: false
      }
    });
  } catch (error) {
    console.error('[AgentLab] World Generator error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * GET /api/agent-lab/prompt-preview/:agentType
 * Preview the prompt structure for an agent
 */
router.get('/prompt-preview/:agentType', async (req, res) => {
  try {
    const { agentType } = req.params;
    const character = createMockCharacter();

    const prompt = await promptBuilder.build({
      agentType,
      characterId: character.id,
      character,
      context: {},
      includeMemory: false
    });

    res.json({
      success: true,
      agentType,
      prompt: {
        systemPromptLength: prompt.system.length,
        systemPromptPreview: prompt.system.substring(0, 3000) + '\n\n... [TRUNCATED - Full length: ' + prompt.system.length + ' chars]',
        userMessage: prompt.messages[0]?.content || 'No user message'
      }
    });
  } catch (error) {
    console.error('[AgentLab] Prompt preview error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/agent-lab/narrative-director
 * Test the complete Narrative Director orchestration with all research-backed systems:
 * - Multi-agent coordination
 * - Three-tier memory hierarchy
 * - Knowledge graph tracking
 * - Defense-in-depth validation
 * - Storylet prerequisites/effects
 * - Self-consistency checking
 */
router.post('/narrative-director', async (req, res) => {
  try {
    const {
      character: customChar,
      worldContext = {},
      testScenario = 'new_quest'
    } = req.body;

    const character = createMockCharacter(customChar || {});

    console.log(`[AgentLab] Testing Narrative Director - Scenario: ${testScenario}`);

    const startTime = Date.now();
    let result;

    switch (testScenario) {
      case 'new_quest':
        // Test full quest generation orchestration
        result = await narrativeDirector.orchestrateNarrativeGeneration(
          character.id,
          character,
          {
            activeQuestCount: worldContext.activeQuestCount || 0,
            ...worldContext
          }
        );
        break;

      case 'quest_completion':
        // Test quest completion orchestration
        const quest = createMockQuest(worldContext.quest || {});
        result = await narrativeDirector.orchestrateQuestCompletion(
          character.id,
          character,
          quest
        );
        break;

      default:
        result = { error: `Unknown test scenario: ${testScenario}` };
    }

    const totalTime = Date.now() - startTime;

    res.json({
      success: true,
      agent: 'Narrative Director',
      scenario: testScenario,
      input: {
        character,
        worldContext
      },
      output: result,
      orchestrationMetrics: narrativeDirector.getMetrics(),
      metrics: {
        totalTime,
        validationScore: result.validation?.lorekeeperScore || null,
        ragContextUsed: result.metadata?.ragContextUsed || 0
      }
    });
  } catch (error) {
    console.error('[AgentLab] Narrative Director error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * POST /api/agent-lab/validation-pipeline
 * Test the defense-in-depth validation system
 */
router.post('/validation-pipeline', async (req, res) => {
  try {
    const {
      character: customChar,
      quest: customQuest,
      tier = 'all'
    } = req.body;

    const character = createMockCharacter(customChar || {});
    const quest = createMockQuest(customQuest || {});

    console.log(`[AgentLab] Testing Validation Pipeline - Tier: ${tier}`);

    const startTime = Date.now();
    let results = {};

    const context = {
      character,
      ragContext: [],
      narrativeSummary: 'The hero embarks on their journey...',
      characterQualities: { journey_begun: true, quests_completed: 1 },
      narrativeNeed: { suggestedTheme: 'skill_test', emotionalTone: 'neutral' }
    };

    if (tier === 'all' || tier === 'pre') {
      results.preGeneration = await validationPipeline.validatePreGeneration({
        character,
        context,
        narrativeNeed: context.narrativeNeed
      });
    }

    if (tier === 'all' || tier === 'generation') {
      results.generation = await validationPipeline.validateGeneration(quest, context);
    }

    if (tier === 'all' || tier === 'post') {
      results.postGeneration = await validationPipeline.validatePostGeneration(quest, context);
    }

    if (tier === 'all') {
      // Run full pipeline
      results.fullPipeline = await validationPipeline.runFullPipeline(
        { character, context, narrativeNeed: context.narrativeNeed },
        quest,
        { consistencyScore: 0.85 }
      );
    }

    const totalTime = Date.now() - startTime;

    res.json({
      success: true,
      agent: 'Validation Pipeline',
      tier,
      input: {
        character,
        quest
      },
      output: results,
      metrics: {
        totalTime,
        tiersValidated: Object.keys(results).length
      }
    });
  } catch (error) {
    console.error('[AgentLab] Validation Pipeline error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/agent-lab/storylet-system
 * Test the storylet prerequisite/effects system
 */
router.post('/storylet-system', async (req, res) => {
  try {
    const {
      character: customChar,
      qualities: customQualities = {},
      action = 'get_available'
    } = req.body;

    const character = createMockCharacter(customChar || {});

    console.log(`[AgentLab] Testing Storylet System - Action: ${action}`);

    const startTime = Date.now();
    let result = {};

    switch (action) {
      case 'get_available':
        // Get available storylets based on qualities
        const mockQualities = {
          journey_begun: true,
          first_challenge_overcome: false,
          quests_completed: 1,
          current_act: 1,
          ...customQualities
        };
        result = {
          qualities: mockQualities,
          availableStorylets: await storyletSystem.getAvailableStorylets(character.id, mockQualities),
          progressionStage: storyletSystem.calculateProgressionStage(mockQualities),
          anchor: await storyletSystem.getNarrativeAnchors(character.id)
        };
        break;

      case 'check_prerequisites':
        // Check specific prerequisite
        const prereq = req.body.prerequisite || {
          all: [
            { quality: 'journey_begun', operator: 'has' },
            { quality: 'quests_completed', operator: '>=', value: 2 }
          ]
        };
        const testQualities = {
          journey_begun: true,
          quests_completed: 3,
          ...customQualities
        };
        result = {
          prerequisite: prereq,
          qualities: testQualities,
          met: storyletSystem.checkPrerequisites(prereq, testQualities)
        };
        break;

      case 'simulate_progression':
        // Simulate narrative progression
        const progressionStages = [];
        let simQualities = { quests_completed: 0 };

        // Stage 1: Beginning
        simQualities.journey_begun = true;
        progressionStages.push({
          event: 'journey_begun',
          stage: storyletSystem.calculateProgressionStage(simQualities),
          qualities: { ...simQualities }
        });

        // Stage 2: First challenge
        simQualities.first_challenge_overcome = true;
        simQualities.quests_completed = 1;
        progressionStages.push({
          event: 'first_challenge_overcome',
          stage: storyletSystem.calculateProgressionStage(simQualities),
          qualities: { ...simQualities }
        });

        // Stage 3: Rising action
        simQualities.inner_doubt_faced = true;
        simQualities.quests_completed = 3;
        progressionStages.push({
          event: 'inner_doubt_faced',
          stage: storyletSystem.calculateProgressionStage(simQualities),
          qualities: { ...simQualities }
        });

        // Stage 4: Hidden strength
        simQualities.hidden_strength_revealed = true;
        simQualities.quests_completed = 5;
        progressionStages.push({
          event: 'hidden_strength_revealed',
          stage: storyletSystem.calculateProgressionStage(simQualities),
          qualities: { ...simQualities }
        });

        // Stage 5: Breakthrough
        simQualities.breakthrough_achieved = true;
        simQualities.quests_completed = 8;
        progressionStages.push({
          event: 'breakthrough_achieved',
          stage: storyletSystem.calculateProgressionStage(simQualities),
          qualities: { ...simQualities }
        });

        result = {
          progressionStages,
          finalStage: storyletSystem.calculateProgressionStage(simQualities)
        };
        break;

      default:
        result = { error: `Unknown action: ${action}` };
    }

    const totalTime = Date.now() - startTime;

    res.json({
      success: true,
      agent: 'Storylet System',
      action,
      output: result,
      metrics: {
        totalTime
      }
    });
  } catch (error) {
    console.error('[AgentLab] Storylet System error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/agent-lab/knowledge-graph
 * Test the temporal knowledge graph system
 */
router.post('/knowledge-graph', async (req, res) => {
  try {
    const {
      character: customChar,
      quest: customQuest,
      action = 'extract'
    } = req.body;

    const character = createMockCharacter(customChar || {});
    const quest = createMockQuest(customQuest || {});

    console.log(`[AgentLab] Testing Knowledge Graph - Action: ${action}`);

    const startTime = Date.now();
    let result = {};

    switch (action) {
      case 'extract':
        // Extract entities and relationships from quest
        const entities = knowledgeGraph.extractEntitiesFromQuest(quest);
        const relationships = knowledgeGraph.extractRelationshipsFromQuest(quest);
        result = {
          extractedEntities: entities,
          extractedRelationships: relationships,
          entityCount: entities.length,
          relationshipCount: relationships.length
        };
        break;

      case 'get_graph':
        // Get full entity graph for character
        result = await knowledgeGraph.getEntityGraph(character.id);
        break;

      case 'query_relationships':
        // Query specific relationships
        const query = req.body.query || { entityName: 'Elder Thorne' };
        result = await knowledgeGraph.queryRelationships(character.id, query);
        break;

      default:
        result = { error: `Unknown action: ${action}` };
    }

    const totalTime = Date.now() - startTime;

    res.json({
      success: true,
      agent: 'Knowledge Graph',
      action,
      input: action === 'extract' ? { quest } : { characterId: character.id },
      output: result,
      metrics: {
        totalTime
      }
    });
  } catch (error) {
    console.error('[AgentLab] Knowledge Graph error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/agent-lab/self-consistency
 * Test the self-consistency validator
 */
router.post('/self-consistency', async (req, res) => {
  try {
    const {
      character: customChar,
      quest: customQuest,
      variations = 3
    } = req.body;

    const character = createMockCharacter(customChar || {});
    const quest = createMockQuest(customQuest || {});

    console.log(`[AgentLab] Testing Self-Consistency Validator with ${variations} variations`);

    const startTime = Date.now();

    // Quick structural check first
    const quickCheck = await selfConsistencyValidator.quickCheck(quest);

    // Full consistency check (will generate variations)
    const fullCheck = await selfConsistencyValidator.validateContent(
      quest,
      character,
      { narrativeSummary: 'The hero continues their journey...' },
      { variations, threshold: 0.7 }
    );

    const totalTime = Date.now() - startTime;

    res.json({
      success: true,
      agent: 'Self-Consistency Validator',
      input: {
        quest,
        variationsRequested: variations
      },
      output: {
        quickCheck,
        fullCheck: {
          consistent: fullCheck.consistent,
          score: fullCheck.score,
          variance: fullCheck.variance,
          analysis: fullCheck.analysis,
          variationsGenerated: fullCheck.allVariations?.length || 0
        }
      },
      metrics: {
        totalTime,
        variationsGenerated: fullCheck.allVariations?.length || 0
      }
    });
  } catch (error) {
    console.error('[AgentLab] Self-Consistency error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/agent-lab/orchestration-metrics
 * Get metrics for the Narrative Director orchestration
 */
router.get('/orchestration-metrics', (req, res) => {
  const metrics = narrativeDirector.getMetrics();

  res.json({
    success: true,
    metrics,
    systemStatus: {
      knowledgeGraph: 'operational',
      validationPipeline: 'operational',
      storyletSystem: 'operational',
      selfConsistency: 'operational',
      narrativeDirector: 'operational'
    }
  });
});

module.exports = router;
