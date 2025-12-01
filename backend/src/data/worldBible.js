/**
 * World Bible for Dumbbells & Dragons
 *
 * THE WORLD: IRONHOLD
 * A realm where the Great Sundering shattered the barrier between worlds,
 * causing reality itself to respond to mortal discipline and will.
 */

const WORLD_BIBLE = {
  // ========== WORLD OVERVIEW ==========
  setting: {
    name: "Ironhold",
    description: `Long ago, the Great Sundering cracked the barrier between worlds, flooding the land with raw potential.

Now, Ironhold exists in a state of flux—reality bends to those with the will to shape it. Your discipline in the waking world echoes here as tangible power. Every push-up, every moment of focus, every challenge overcome strengthens your connection to Ironhold's dormant magic.

The Waystation stands at the crossroads of fate, where new arrivals first feel the pulse of this fractured realm. Here, Warden Kael watches for those strong enough to walk the path ahead.`,

    tone: "earnest but not preachy, challenges feel epic but achievable, light humor welcome, acknowledge struggle without being dark",

    forbidden_tones: [
      "shame or guilt about wellness failures",
      "toxic positivity",
      "patronizing language",
      "sarcasm about player effort"
    ]
  },

  // ========== THE SIX FOUNDATIONS ==========
  foundations: {
    description: "The Six Foundations are the primal forces that govern Ironhold. They are not gods, but aspects of reality that respond to mortal will.",

    IRON: {
      stat: "STR",
      name: "The Foundation of Iron",
      domain: "Physical might, raw power, the strength to endure",
      manifestation: "Your muscles remember the weight you've lifted. In Ironhold, that memory becomes real.",
      real_world: "Strength training, weightlifting, resistance exercise"
    },
    WIND: {
      stat: "DEX",
      name: "The Foundation of Wind",
      domain: "Speed, agility, the grace of flowing movement",
      manifestation: "Each step you run, each stretch you hold, teaches your body to move like air.",
      real_world: "Cardio, agility training, flexibility, dance, running"
    },
    STONE: {
      stat: "CON",
      name: "The Foundation of Stone",
      domain: "Endurance, vitality, the patience of mountains",
      manifestation: "Rest is not weakness—it is how stone becomes unbreakable.",
      real_world: "Endurance training, proper nutrition, sleep, recovery"
    },
    SPARK: {
      stat: "INT",
      name: "The Foundation of Spark",
      domain: "Knowledge, focus, the fire of understanding",
      manifestation: "Every book opened, every skill learned, feeds the spark within.",
      real_world: "Reading, learning, mental challenges, study, puzzles"
    },
    TIDE: {
      stat: "WIS",
      name: "The Foundation of Tide",
      domain: "Insight, awareness, the rhythm of breath and mind",
      manifestation: "In stillness, the tide reveals what haste obscures.",
      real_world: "Meditation, mindfulness, journaling, self-reflection"
    },
    FLAME: {
      stat: "CHA",
      name: "The Foundation of Flame",
      domain: "Presence, connection, the warmth of shared purpose",
      manifestation: "No fire burns alone. Your light strengthens when shared.",
      real_world: "Social connection, self-care, confidence building, helping others"
    }
  },

  // ========== STAT SYSTEM ==========
  stats: {
    STR: {
      name: "Strength",
      foundation: "Iron",
      description: "Physical power, discipline of the body",
      real_world_mapping: "Strength training, weightlifting, resistance exercise",
      magic_manifestation: "Enhanced physical capability, increased resilience"
    },
    DEX: {
      name: "Dexterity",
      foundation: "Wind",
      description: "Agility, flexibility, fluid movement",
      real_world_mapping: "Cardio, agility training, flexibility work, dance",
      magic_manifestation: "Faster reflexes, better coordination, graceful movement"
    },
    CON: {
      name: "Constitution",
      foundation: "Stone",
      description: "Stamina, nourishment, vitality",
      real_world_mapping: "Endurance training, proper nutrition, sleep, recovery",
      magic_manifestation: "Increased stamina, resistance to exhaustion, faster healing"
    },
    INT: {
      name: "Intelligence",
      foundation: "Spark",
      description: "Mental acuity, learning, focus",
      real_world_mapping: "Reading, learning new skills, mental challenges, study",
      magic_manifestation: "Sharper mind, better problem-solving, enhanced memory"
    },
    WIS: {
      name: "Wisdom",
      foundation: "Tide",
      description: "Inner peace, reflection, balance",
      real_world_mapping: "Meditation, mindfulness, journaling, self-reflection",
      magic_manifestation: "Emotional regulation, insight, clarity of purpose"
    },
    CHA: {
      name: "Charisma",
      foundation: "Flame",
      description: "Self-love, connection, confidence",
      real_world_mapping: "Social connection, self-care, confidence building, helping others",
      magic_manifestation: "Magnetic presence, stronger relationships, self-assurance"
    }
  },

  // ========== KEY LOCATIONS ==========
  locations: {
    waystation: {
      name: "The Waystation",
      description: "A weathered fortress at the crossroads of Ironhold, where new arrivals first set foot. Warden Kael oversees the training grounds here.",
      significance: "Starting location for all adventurers"
    },
    shattered_peaks: {
      name: "The Shattered Peaks",
      description: "Mountains torn apart during the Sundering, their floating fragments held aloft by residual power. A place of danger and discovery.",
      significance: "Higher-level exploration zone"
    },
    still_waters: {
      name: "The Still Waters",
      description: "A chain of lakes where the Tide foundation is strongest. Seekers come here for clarity and insight.",
      significance: "Wisdom-focused quests"
    },
    ember_quarter: {
      name: "The Ember Quarter",
      description: "A bustling district where merchants, performers, and wanderers gather. The Flame burns brightest where people connect.",
      significance: "Social and charisma-focused area"
    }
  },

  // ========== KEY NPCS ==========
  npcs: {
    warden_kael: {
      name: "Warden Kael",
      role: "Mentor and gatekeeper",
      description: "A scarred veteran who has seen countless adventurers pass through the Waystation. Gruff exterior, but genuinely invested in seeing newcomers succeed.",
      speech_style: "Direct, practical, occasional dry humor. Short sentences. Doesn't waste words.",
      sample_dialogue: [
        "You made it. Good. That's step one.",
        "The road ahead won't care about your excuses. Neither do I. But I'll be here when you're ready.",
        "Strength isn't given. It's forged. Every day, you choose whether to put in the work."
      ]
    },
    sage_mirren: {
      name: "Sage Mirren",
      role: "Keeper of lore and balance",
      description: "An ageless scholar who maintains the Waystation's archives. Speaks in measured tones and sees patterns others miss.",
      speech_style: "Thoughtful, sometimes cryptic, but never condescending. Asks questions that make you think.",
      sample_dialogue: [
        "The Foundations don't favor the strong—they favor the persistent.",
        "Balance isn't standing still. It's learning to move without falling.",
        "What do you seek here? Not what you think you should seek—what calls to you?"
      ]
    },
    hollow_voice: {
      name: "The Hollow Voice",
      role: "Mysterious guide",
      description: "A presence rather than a person—a whisper at the edge of perception. Appears to those at crossroads in their journey.",
      speech_style: "Sparse, poetic, speaks in metaphor. Never gives direct answers.",
      sample_dialogue: [
        "The path forks. Both ways lead forward. Only one leads home.",
        "You carry more than you know. Set something down.",
        "When the spark dims, feed it. Or let it teach you about darkness."
      ]
    }
  },

  // ========== IMMUTABLE WORLD RULES ==========
  core_rules: [
    "Real-world discipline manifests as magical power in Ironhold",
    "Balance across Foundations creates greater strength than mastery of one",
    "Magic enhances natural abilities—it doesn't replace effort",
    "Failed quests have consequences but not character death",
    "NPCs remember player actions—relationships persist and evolve",
    "Time moves forward—events have lasting consequences",
    "The world responds to player choices—cause and effect are logical"
  ],

  magic_system_constraints: [
    "No flashy combat spells in MVP",
    "Magic enhances natural abilities, doesn't replace them",
    "Physical/mental growth = magical growth (1:1 correlation)",
    "Magic requires practice and discipline, not innate talent",
    "Stronger body/mind = stronger magic (motivation for wellness)"
  ],

  // ========== CHARACTER CLASSES ==========
  character_classes: {
    Fighter: {
      description: "Forged in Iron and Stone—masters of physical prowess",
      starting_stats: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 },
      flavor: "Warriors who build strength through relentless physical discipline",
      iconic_goals: ["strength training", "cardio workouts", "endurance challenges"],
      foundation_affinity: ["Iron", "Stone"]
    },
    Mage: {
      description: "Touched by Spark and Tide—seekers of knowledge and clarity",
      starting_stats: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 },
      flavor: "Scholars who gain power through study and reflection",
      iconic_goals: ["reading", "learning", "meditation", "mindfulness"],
      foundation_affinity: ["Spark", "Tide"]
    },
    Rogue: {
      description: "Shaped by Wind and Flame—swift, social, and adaptable",
      starting_stats: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 },
      flavor: "Agile adventurers who thrive through grace and connection",
      iconic_goals: ["cardio", "agility training", "social activities", "confidence building"],
      foundation_affinity: ["Wind", "Flame"]
    }
  },

  // ========== CONTINUITY RULES ==========
  continuity_enforcement: {
    npc_memory: "NPCs MUST remember player actions and reference them in future interactions",
    location_persistence: "If a quest destroys/changes something, it stays changed",
    relationship_evolution: "Betrayals remembered, kindness compounds, relationships never reset",
    time_consistency: "If something took 'three days', future references must respect timeline",
    cause_and_effect: "Player actions have logical consequences that persist",
    no_retcons: "Mistakes become 'mysteries to solve' not erasures of history"
  },

  // ========== NARRATIVE GUIDELINES ==========
  narrative_style: {
    perspective: "Second person (You, your)",
    tense: "Present tense for immediacy",
    length: "Quest descriptions: 2-3 sentences. Outcomes: 3-5 sentences.",

    good_examples: [
      "You climb the path, breathing easier than last week. Warden Kael notices.",
      "The words settle in your mind as stillness takes hold. Clarity comes.",
      "Your muscles ache from the effort, but it's the good kind of ache. Progress."
    ],

    bad_examples: [
      "You should really work on your cardio more. (preachy)",
      "OMG YOU'RE SO STRONG NOW!!! (toxic positivity)",
      "Wow, stairs again? Really? (sarcastic)",
      "You're pathetic for skipping meditation. (shaming)"
    ]
  },

  // ========== QUEST STRUCTURE RULES ==========
  quest_rules: {
    must_haves: [
      "Clear objective tied to real wellness goal",
      "Appropriate difficulty for player level",
      "Reference to at least one past event",
      "Logical connection to current narrative",
      "Stat mapping that makes sense"
    ],

    forbidden: [
      "Quests requiring equipment/items player doesn't have",
      "Difficulty spikes without narrative justification",
      "Contradictions with established world state",
      "References to events that never happened",
      "Shaming language for past failures"
    ],

    types: {
      main_quest: "Linear story progression, handwritten, introduces core mechanics",
      side_quest: "AI-generated, addresses stat imbalances or player interest",
      corrective_quest: "AI-generated when stat imbalance >5 points, encourages balance"
    }
  },

  // ========== PROGRESSION SYSTEM ==========
  progression: {
    xp_costs: [100, 120, 140, 160, 180, 200],
    level_calculation: "(sum_of_stats - 60) / 6",

    xp_rewards: {
      small_daily_goal: 10,
      weekly_goal: 50,
      streak_milestone_7_days: 100,
      streak_milestone_30_days: 300
    },

    balance_philosophy: "Reward balanced growth. Penalize min-maxing through narrative."
  }
};

// Validation function to ensure nothing contradicts core rules
function validateAgainstWorldBible(proposedContent, contentType) {
  const violations = [];

  // Check world rules
  WORLD_BIBLE.core_rules.forEach(rule => {
    if (rule.includes('death') && proposedContent.description?.includes('death')) {
      violations.push({
        type: 'world_rule_violation',
        severity: 'critical',
        message: 'Character death is not allowed',
        location: 'description'
      });
    }
  });

  return {
    valid: violations.length === 0,
    violations
  };
}

module.exports = {
  WORLD_BIBLE,
  validateAgainstWorldBible
};
