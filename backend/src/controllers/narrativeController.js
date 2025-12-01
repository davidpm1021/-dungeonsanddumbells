const memoryManager = require('../services/memoryManager');

/**
 * Narrative Event Controller
 * Handles endpoints for retrieving and managing narrative events and memory
 */

/**
 * Get complete narrative context for a character
 * Combines working memory, episodes, long-term memory, and world state
 */
exports.getCompleteContext = async (req, res) => {
  try {
    const characterId = req.character.id;

    const context = await memoryManager.getCompleteContext(characterId);

    res.json({
      success: true,
      data: context
    });
  } catch (error) {
    console.error('Error fetching complete context:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch narrative context'
    });
  }
};

/**
 * Get working memory (last 10 interactions)
 */
exports.getWorkingMemory = async (req, res) => {
  try {
    const characterId = req.character.id;
    const limit = parseInt(req.query.limit) || 10;

    const workingMemory = await memoryManager.getWorkingMemory(characterId, limit);

    res.json({
      success: true,
      data: workingMemory
    });
  } catch (error) {
    console.error('Error fetching working memory:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch working memory'
    });
  }
};

/**
 * Get episode memory (compressed summaries)
 */
exports.getEpisodeMemory = async (req, res) => {
  try {
    const characterId = req.character.id;
    const count = parseInt(req.query.count) || 5;

    const episodes = await memoryManager.getEpisodeMemory(characterId, count);

    res.json({
      success: true,
      data: episodes
    });
  } catch (error) {
    console.error('Error fetching episode memory:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch episode memory'
    });
  }
};

/**
 * Get long-term memory (important facts)
 */
exports.getLongTermMemory = async (req, res) => {
  try {
    const characterId = req.character.id;

    const longTermMemory = await memoryManager.getLongTermMemory(characterId);

    res.json({
      success: true,
      data: longTermMemory
    });
  } catch (error) {
    console.error('Error fetching long-term memory:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch long-term memory'
    });
  }
};

/**
 * Store a fact in long-term memory
 * Used for critical information that should never be forgotten
 */
exports.storeLongTermMemory = async (req, res) => {
  try {
    const characterId = req.character.id;
    const { fact, importanceScore } = req.body;

    if (!fact) {
      return res.status(400).json({
        success: false,
        error: 'Fact is required'
      });
    }

    const score = importanceScore || 0.8;

    if (score < 0 || score > 1) {
      return res.status(400).json({
        success: false,
        error: 'Importance score must be between 0 and 1'
      });
    }

    await memoryManager.storeInLongTermMemory(characterId, fact, score);

    res.json({
      success: true,
      message: 'Fact stored in long-term memory'
    });
  } catch (error) {
    console.error('Error storing long-term memory:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to store long-term memory'
    });
  }
};

/**
 * Search for relevant memories
 */
exports.searchMemories = async (req, res) => {
  try {
    const characterId = req.character.id;
    const { query, limit } = req.query;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required'
      });
    }

    const searchLimit = parseInt(limit) || 5;
    const memories = await memoryManager.retrieveRelevantMemories(
      characterId,
      query,
      searchLimit
    );

    res.json({
      success: true,
      data: memories
    });
  } catch (error) {
    console.error('Error searching memories:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search memories'
    });
  }
};

/**
 * Get world state for character
 */
exports.getWorldState = async (req, res) => {
  try {
    const characterId = req.character.id;

    const worldState = await memoryManager.getWorldState(characterId);

    res.json({
      success: true,
      data: worldState
    });
  } catch (error) {
    console.error('Error fetching world state:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch world state'
    });
  }
};

/**
 * Update world state
 */
exports.updateWorldState = async (req, res) => {
  try {
    const characterId = req.character.id;
    const updates = req.body;

    await memoryManager.updateWorldState(characterId, updates);

    res.json({
      success: true,
      message: 'World state updated successfully'
    });
  } catch (error) {
    console.error('Error updating world state:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update world state'
    });
  }
};

/**
 * Get narrative summary
 */
exports.getNarrativeSummary = async (req, res) => {
  try {
    const characterId = req.character.id;

    const worldState = await memoryManager.getWorldState(characterId);

    res.json({
      success: true,
      data: {
        summary: worldState.narrative_summary
      }
    });
  } catch (error) {
    console.error('Error fetching narrative summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch narrative summary'
    });
  }
};

/**
 * Manually store a narrative event
 * Useful for custom events not triggered by goal completion
 */
exports.storeNarrativeEvent = async (req, res) => {
  try {
    const characterId = req.character.id;
    const {
      eventType,
      description,
      participants,
      statChanges,
      questId,
      context
    } = req.body;

    if (!eventType || !description) {
      return res.status(400).json({
        success: false,
        error: 'Event type and description are required'
      });
    }

    const event = await memoryManager.storeInWorkingMemory(characterId, {
      eventType,
      description,
      participants: participants || [],
      statChanges: statChanges || {},
      questId: questId || null,
      context: context || {}
    });

    res.json({
      success: true,
      data: event,
      message: 'Narrative event stored successfully'
    });
  } catch (error) {
    console.error('Error storing narrative event:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to store narrative event'
    });
  }
};

/**
 * Compress old events into an episode
 */
exports.compressEpisode = async (req, res) => {
  try {
    const characterId = req.character.id;
    const daysOld = parseInt(req.query.daysOld) || 7;

    const episode = await memoryManager.compressIntoEpisode(characterId, daysOld);

    if (!episode) {
      return res.json({
        success: true,
        message: 'No events old enough to compress',
        data: null
      });
    }

    res.json({
      success: true,
      data: episode,
      message: 'Episode created successfully'
    });
  } catch (error) {
    console.error('Error compressing episode:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to compress episode'
    });
  }
};

/**
 * Get World Bible (immutable ground truth)
 */
exports.getWorldBible = async (req, res) => {
  try {
    const { WORLD_BIBLE } = require('../data/worldBible');

    res.json({
      success: true,
      data: WORLD_BIBLE
    });
  } catch (error) {
    console.error('Error fetching World Bible:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch World Bible'
    });
  }
};

/**
 * Get narrative summary with stats
 */
exports.getNarrativeSummaryWithStats = async (req, res) => {
  try {
    const characterId = parseInt(req.params.characterId);
    const narrativeSummary = require('../services/narrativeSummary');

    const summary = await narrativeSummary.getSummary(characterId);
    const stats = await narrativeSummary.getSummaryStats(characterId);

    res.json({
      success: true,
      summary,
      stats
    });
  } catch (error) {
    console.error('Error fetching narrative summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch narrative summary'
    });
  }
};

/**
 * Get narrative events for character
 */
exports.getNarrativeEvents = async (req, res) => {
  try {
    const characterId = parseInt(req.params.characterId);
    const limit = parseInt(req.query.limit) || 10;
    const pool = require('../config/database');

    const result = await pool.query(
      `SELECT * FROM narrative_events
       WHERE character_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [characterId, limit]
    );

    res.json({
      success: true,
      events: result.rows
    });
  } catch (error) {
    console.error('Error fetching narrative events:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch narrative events'
    });
  }
};

/**
 * Generate daily narrative for the Journal view
 * Creates a contextual opening narrative based on character state, quests, and recent events
 * For new characters, shows the welcome narrative first
 */
exports.generateDailyNarrative = async (req, res) => {
  try {
    const characterId = parseInt(req.params.characterId);
    const pool = require('../config/database');

    // Get character data (character_stats is a VIEW where id = character id)
    const charResult = await pool.query(
      `SELECT * FROM character_stats WHERE id = $1`,
      [characterId]
    );

    if (charResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Character not found'
      });
    }

    const character = charResult.rows[0];

    // Check for welcome narrative (for new characters)
    const welcomeResult = await pool.query(
      `SELECT * FROM narrative_events
       WHERE character_id = $1 AND event_type = 'welcome_narrative'
       ORDER BY created_at DESC
       LIMIT 1`,
      [characterId]
    );

    // Get active quests
    const questResult = await pool.query(
      `SELECT * FROM quests
       WHERE character_id = $1 AND status IN ('active', 'pending')
       ORDER BY created_at DESC
       LIMIT 3`,
      [characterId]
    );

    // Get recent narrative events (excluding welcome)
    const eventsResult = await pool.query(
      `SELECT * FROM narrative_events
       WHERE character_id = $1 AND event_type != 'welcome_narrative'
       ORDER BY created_at DESC
       LIMIT 5`,
      [characterId]
    );

    // Get world state
    const worldResult = await pool.query(
      `SELECT * FROM world_state WHERE character_id = $1`,
      [characterId]
    );

    // Get today's goal completions (character_id is on goals table, not goal_completions)
    const today = new Date().toISOString().split('T')[0];
    const completionsResult = await pool.query(
      `SELECT g.name, g.stat_mapping, gc.completed_at
       FROM goal_completions gc
       JOIN goals g ON gc.goal_id = g.id
       WHERE g.character_id = $1
       AND DATE(gc.completed_at) = $2`,
      [characterId, today]
    );

    const welcomeNarrative = welcomeResult.rows[0];
    const activeQuests = questResult.rows;
    const recentEvents = eventsResult.rows;
    const worldState = worldResult.rows[0];
    const todaysCompletions = completionsResult.rows;

    // For new characters with no activity, show the welcome narrative
    const isNewCharacter = recentEvents.length === 0 && todaysCompletions.length === 0;

    let narrative;
    if (isNewCharacter && welcomeNarrative) {
      // Show the AI-generated welcome narrative
      narrative = welcomeNarrative.event_description;
    } else if (worldState?.narrative_summary && recentEvents.length > 0) {
      // Show narrative summary from world state
      narrative = worldState.narrative_summary;
    } else {
      // Generate contextual narrative
      narrative = generateContextualNarrative({
        character,
        activeQuests,
        recentEvents,
        worldState,
        todaysCompletions
      });
    }

    res.json({
      success: true,
      narrative,
      isWelcome: isNewCharacter && !!welcomeNarrative,
      context: {
        hasActiveQuests: activeQuests.length > 0,
        todaysCompletions: todaysCompletions.length,
        recentEventsCount: recentEvents.length,
        isNewCharacter
      }
    });
  } catch (error) {
    console.error('Error generating daily narrative:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate daily narrative'
    });
  }
};

/**
 * Helper function to generate contextual narrative
 */
function generateContextualNarrative({ character, activeQuests, recentEvents, worldState, todaysCompletions }) {
  const name = character.name;
  const charClass = character.character_class;

  // Time-based greeting
  const hour = new Date().getHours();
  let timeOfDay = 'morning';
  if (hour >= 12 && hour < 17) timeOfDay = 'afternoon';
  else if (hour >= 17 && hour < 21) timeOfDay = 'evening';
  else if (hour >= 21 || hour < 5) timeOfDay = 'night';

  const timeGreetings = {
    morning: [
      `The ${timeOfDay} sun casts golden light across your quarters as you rise.`,
      `Dawn breaks over the realm, and with it, new possibilities await.`,
      `The first light of ${timeOfDay} finds you ready for another day's challenges.`
    ],
    afternoon: [
      `The ${timeOfDay} sun hangs high as the day's adventures continue.`,
      `Midday finds you contemplating your next move.`,
      `The warmth of ${timeOfDay} brings clarity to your thoughts.`
    ],
    evening: [
      `As ${timeOfDay} settles over the land, you reflect on the day's events.`,
      `The fading light of ${timeOfDay} paints the sky in hues of amber and violet.`,
      `${timeOfDay.charAt(0).toUpperCase() + timeOfDay.slice(1)} approaches, and with it, a moment of calm.`
    ],
    night: [
      `The stars wheel overhead as ${timeOfDay} deepens around you.`,
      `Moonlight filters through, casting silver shadows in the ${timeOfDay}.`,
      `The quiet of ${timeOfDay} offers time for rest and reflection.`
    ]
  };

  const greeting = timeGreetings[timeOfDay][Math.floor(Math.random() * 3)];

  // Quest context
  let questContext = '';
  if (activeQuests.length > 0) {
    const quest = activeQuests[0];
    questContext = ` The matter of "${quest.title}" weighs on your mind—there is still much to be done.`;
  }

  // Recent activity context
  let activityContext = '';
  if (todaysCompletions.length > 0) {
    const activities = todaysCompletions.map(c => c.name).slice(0, 2);
    if (activities.length === 1) {
      activityContext = ` Your dedication shows—you have already completed ${activities[0]} today.`;
    } else {
      activityContext = ` Your discipline is evident—${activities.join(' and ')} mark your progress.`;
    }
  }

  // Class-specific flavor
  const classFlavorMap = {
    Fighter: 'Your muscles remember the training, ready for whatever challenges await.',
    Mage: 'Arcane knowledge whispers at the edges of your consciousness, eager to be applied.',
    Rogue: 'Your senses are sharp, attuned to every opportunity and danger.',
    Cleric: 'Divine purpose guides your steps, a beacon in uncertain times.',
    Ranger: 'The wild calls to you, its rhythms echoing in your heart.'
  };
  const classFlavor = classFlavorMap[charClass] || 'Adventure awaits those bold enough to seek it.';

  // Combine narrative
  let narrative = greeting;
  if (questContext) narrative += questContext;
  if (activityContext) narrative += activityContext;
  narrative += ` ${classFlavor}`;

  return narrative;
}

/**
 * Generate welcome narrative for new adventurers
 * Personalized introduction based on character class and wellness focus
 */
exports.generateWelcomeNarrative = async (req, res) => {
  try {
    const { characterName, characterClass, wellnessFocus } = req.body;

    if (!characterName || !characterClass) {
      return res.status(400).json({
        success: false,
        error: 'characterName and characterClass are required'
      });
    }

    const narrative = generateWelcomeNarrativeText({
      name: characterName,
      charClass: characterClass,
      wellnessFocus: wellnessFocus || []
    });

    res.json({
      success: true,
      narrative
    });
  } catch (error) {
    console.error('Error generating welcome narrative:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate welcome narrative'
    });
  }
};

/**
 * Helper function to generate welcome narrative text
 */
function generateWelcomeNarrativeText({ name, charClass, wellnessFocus }) {
  // Class-specific openings
  const classOpenings = {
    Fighter: `The training grounds fall silent as you step forward, ${name}. Your presence commands respect—a warrior born, tempered by discipline and determination.`,
    Mage: `The arcane energies swirl around you, ${name}, recognizing a kindred spirit. Your mind is sharp, your potential vast as the cosmos itself.`,
    Rogue: `From the shadows you emerge, ${name}, moving with purpose and precision. The world is full of secrets, and you have the cunning to uncover them all.`,
    Cleric: `A warm light surrounds you, ${name}, marking you as one who walks the path of purpose. Your spirit burns with conviction.`,
    Ranger: `The wind carries whispers of distant lands as you stand ready, ${name}. Nature itself seems to recognize a guardian in you.`
  };

  // Wellness focus to narrative elements
  const focusNarratives = {
    fitness: 'I sense the power within you yearns to grow. Physical strength shall be your foundation.',
    flexibility: 'Your body seeks grace and fluidity. Movement shall become your meditation.',
    cardio: 'Endurance burns within you like an eternal flame. Your stamina shall know no bounds.',
    learning: 'Knowledge calls to you across the ages. Wisdom awaits those patient enough to seek it.',
    mindfulness: 'Inner peace guides your steps. Clarity of mind shall be your greatest weapon.',
    social: 'The bonds you forge shall strengthen you beyond measure. Together, we are unbreakable.'
  };

  // Build the narrative
  const opening = classOpenings[charClass] || `Welcome, ${name}. A new chapter begins in the eternal story of heroes.`;

  // Middle section based on wellness focus
  let focusSection = '';
  if (wellnessFocus && wellnessFocus.length > 0) {
    const focusLines = wellnessFocus
      .slice(0, 2)
      .map(f => focusNarratives[f])
      .filter(Boolean);
    if (focusLines.length > 0) {
      focusSection = `\n\n${focusLines.join(' ')}`;
    }
  }

  // Closing
  const closings = [
    `\n\nThe fractured realm of Ironhold awaits, ${name}. Your legend begins today.`,
    `\n\nStep forward into destiny, ${name}. The Six Foundations shall witness your rise.`,
    `\n\nYour adventure begins now, ${name}. May your resolve never waver and your spirit never break.`
  ];
  const closing = closings[Math.floor(Math.random() * closings.length)];

  // DM sign-off
  const signOff = '\n\n— *Your Dungeon Master*';

  return opening + focusSection + closing + signOff;
}

/**
 * RAG retrieval endpoint
 */
exports.retrieveRelevantEvents = async (req, res) => {
  try {
    const { characterId, query, k } = req.body;
    const narrativeRAG = require('../services/narrativeRAG');

    if (!characterId || !query) {
      return res.status(400).json({
        success: false,
        error: 'characterId and query are required'
      });
    }

    const events = await narrativeRAG.retrieveRelevantEvents(
      characterId,
      query,
      k || 5
    );

    res.json({
      success: true,
      events
    });
  } catch (error) {
    console.error('Error retrieving relevant events:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve relevant events'
    });
  }
};
