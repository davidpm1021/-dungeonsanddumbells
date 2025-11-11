/**
 * Quest Type Configuration for Dynamic Narrative System
 * Reference: PRD Addendum - Dynamic Narrative System
 *
 * Defines quest types, concurrency limits, XP multipliers, and generation rules
 */

/**
 * Quest Type Definitions
 *
 * Each quest type has:
 * - concurrencyLimit: Max active quests of this type
 * - xpMultiplier: XP reward multiplier (1.0 = baseline)
 * - narrativeWeight: Default importance (1-10)
 * - description: What this quest type represents
 * - icon: Emoji for UI display
 * - timePressure: Default urgency level
 * - canAbandon: Whether player can abandon quests of this type
 */
const QUEST_TYPES = {
  main_story: {
    id: 'main_story',
    label: 'Main Story',
    concurrencyLimit: 2,
    xpMultiplier: 1.5,
    narrativeWeight: 10,
    description: 'Critical narrative quests that drive the main plot forward',
    icon: '⚔️',
    timePressure: 'none',
    canAbandon: false,
    generationPriority: 'high'
  },

  character_arc: {
    id: 'character_arc',
    label: 'Your Path',
    concurrencyLimit: 3,
    xpMultiplier: 1.3,
    narrativeWeight: 8,
    description: 'Personal growth quests based on your stat focus and training habits',
    icon: '🌟',
    timePressure: 'relaxed',
    canAbandon: true,
    generationPriority: 'high'
  },

  world_event: {
    id: 'world_event',
    label: 'World Event',
    concurrencyLimit: 2,
    xpMultiplier: 1.4,
    narrativeWeight: 9,
    description: 'Time-limited events affecting all players in the kingdom',
    icon: '🔥',
    timePressure: 'urgent',
    canAbandon: false,
    generationPriority: 'medium'
  },

  side_story: {
    id: 'side_story',
    label: 'Side Quest',
    concurrencyLimit: 5,
    xpMultiplier: 1.0,
    narrativeWeight: 5,
    description: 'Optional narrative content that adds depth to the world',
    icon: '📖',
    timePressure: 'none',
    canAbandon: true,
    generationPriority: 'medium'
  },

  exploration: {
    id: 'exploration',
    label: 'Exploration',
    concurrencyLimit: 3,
    xpMultiplier: 0.8,
    narrativeWeight: 3,
    description: 'Low-pressure lore discovery and world-building quests',
    icon: '🗺️',
    timePressure: 'none',
    canAbandon: true,
    generationPriority: 'low'
  },

  corrective: {
    id: 'corrective',
    label: 'Balance Quest',
    concurrencyLimit: 1,
    xpMultiplier: 1.2,
    narrativeWeight: 7,
    description: 'AI-generated quests to address stat imbalances or neglected goals',
    icon: '⚖️',
    timePressure: 'relaxed',
    canAbandon: false,
    generationPriority: 'conditional'
  }
};

/**
 * Global Concurrency Limits
 */
const CONCURRENCY_LIMITS = {
  // Maximum total active quests across all types
  maxTotalActive: 10,

  // Minimum total active quests to maintain
  minTotalActive: 3,

  // Recommended range for optimal engagement
  recommendedMin: 5,
  recommendedMax: 8,

  // Maximum available quests (active + offered but not accepted)
  maxTotalAvailable: 15
};

/**
 * Quest Pool Generation Targets
 * How many quests of each type to generate for quest pool
 */
const GENERATION_TARGETS = {
  main_story: { min: 1, max: 2 },
  character_arc: { min: 2, max: 3 },
  world_event: { min: 0, max: 2 }, // 0 if no active world events
  side_story: { min: 3, max: 5 },
  exploration: { min: 2, max: 3 },
  corrective: { min: 0, max: 1 } // Only if stat imbalance detected
};

/**
 * Time Pressure Definitions
 */
const TIME_PRESSURE = {
  urgent: {
    id: 'urgent',
    label: 'Urgent',
    durationDays: 2,
    expirationWarningDays: 1,
    color: 'red',
    description: 'Time-sensitive quest that expires soon'
  },
  relaxed: {
    id: 'relaxed',
    label: 'Relaxed',
    durationDays: 14,
    expirationWarningDays: 3,
    color: 'blue',
    description: 'Take your time with this quest'
  },
  none: {
    id: 'none',
    label: 'No Time Limit',
    durationDays: null,
    expirationWarningDays: null,
    color: 'gray',
    description: 'Complete at your own pace'
  }
};

/**
 * Narrative Weight Tiers
 * Used for UI sorting and quest prioritization
 */
const NARRATIVE_WEIGHT_TIERS = {
  critical: { min: 9, max: 10, label: 'Critical', badge: '!!' },
  important: { min: 7, max: 8, label: 'Important', badge: '!' },
  moderate: { min: 4, max: 6, label: 'Moderate', badge: '' },
  optional: { min: 1, max: 3, label: 'Optional', badge: '' }
};

/**
 * Quest Generation Rules
 */
const GENERATION_RULES = {
  // Stat imbalance threshold for corrective quest generation
  // If any stat is 3+ points behind the highest stat, generate corrective quest
  statImbalanceThreshold: 3,

  // Neglected stat threshold
  // If a stat hasn't been trained in X days, consider corrective quest
  neglectedStatDays: 7,

  // Goal priority influence
  // How much weight to give to user's explicit goal priorities
  goalPriorityWeight: 0.7,

  // Stat focus influence
  // How much weight to give to actual training patterns
  statFocusWeight: 0.3,

  // Choice consequence lookback
  // How many recent choices to consider when generating quests
  choiceConsequenceLookback: 5,

  // Story branch consideration
  // Whether to consider active story branches when generating
  considerActiveBranches: true,

  // World event priority
  // Whether world events take generation priority
  worldEventPriority: true
};

/**
 * Helper Functions
 */

/**
 * Get quest type configuration by ID
 * @param {string} questTypeId - Quest type ID
 * @returns {object|null} Quest type configuration
 */
function getQuestType(questTypeId) {
  return QUEST_TYPES[questTypeId] || null;
}

/**
 * Get all quest types
 * @returns {object} All quest type configurations
 */
function getAllQuestTypes() {
  return QUEST_TYPES;
}

/**
 * Get quest types sorted by generation priority
 * @returns {array} Quest types in priority order
 */
function getQuestTypesByPriority() {
  const priorityOrder = { high: 1, medium: 2, low: 3, conditional: 4 };

  return Object.values(QUEST_TYPES).sort((a, b) => {
    return priorityOrder[a.generationPriority] - priorityOrder[b.generationPriority];
  });
}

/**
 * Calculate total active quest limit
 * @returns {number} Maximum active quests
 */
function getTotalActiveLimit() {
  return CONCURRENCY_LIMITS.maxTotalActive;
}

/**
 * Calculate available slots for a specific quest type
 * @param {string} questTypeId - Quest type ID
 * @param {number} currentActive - Current active quests of this type
 * @returns {number} Available slots (0 if at limit)
 */
function getAvailableSlots(questTypeId, currentActive) {
  const questType = getQuestType(questTypeId);
  if (!questType) return 0;

  const available = questType.concurrencyLimit - currentActive;
  return Math.max(0, available);
}

/**
 * Get time pressure configuration
 * @param {string} pressureLevel - 'urgent', 'relaxed', or 'none'
 * @returns {object|null} Time pressure configuration
 */
function getTimePressure(pressureLevel) {
  return TIME_PRESSURE[pressureLevel] || null;
}

/**
 * Calculate quest expiration date
 * @param {string} timePressure - Time pressure level
 * @param {Date} startDate - Quest start date (defaults to now)
 * @returns {Date|null} Expiration date or null for no expiration
 */
function calculateExpirationDate(timePressure, startDate = new Date()) {
  const pressure = getTimePressure(timePressure);
  if (!pressure || !pressure.durationDays) return null;

  const expiration = new Date(startDate);
  expiration.setDate(expiration.getDate() + pressure.durationDays);
  return expiration;
}

/**
 * Get narrative weight tier for a weight value
 * @param {number} weight - Narrative weight (1-10)
 * @returns {object|null} Weight tier configuration
 */
function getWeightTier(weight) {
  for (const [key, tier] of Object.entries(NARRATIVE_WEIGHT_TIERS)) {
    if (weight >= tier.min && weight <= tier.max) {
      return { id: key, ...tier };
    }
  }
  return null;
}

/**
 * Validate quest type ID
 * @param {string} questTypeId - Quest type ID to validate
 * @returns {boolean} True if valid
 */
function isValidQuestType(questTypeId) {
  return questTypeId in QUEST_TYPES;
}

module.exports = {
  QUEST_TYPES,
  CONCURRENCY_LIMITS,
  GENERATION_TARGETS,
  TIME_PRESSURE,
  NARRATIVE_WEIGHT_TIERS,
  GENERATION_RULES,

  // Helper functions
  getQuestType,
  getAllQuestTypes,
  getQuestTypesByPriority,
  getTotalActiveLimit,
  getAvailableSlots,
  getTimePressure,
  calculateExpirationDate,
  getWeightTier,
  isValidQuestType
};
