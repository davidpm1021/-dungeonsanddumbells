/**
 * World Bible for Dumbbells & Dragons
 *
 * This defines the base structure for narrative consistency.
 * Actual world details come from the user's personal world generator.
 * This file provides generic framework and validation rules.
 */

const WORLD_BIBLE = {
  // ========== WORLD OVERVIEW ==========
  setting: {
    name: "Your Personal World",
    description: `A fantasy realm shaped by your journey. Your wellness practices manifest as magical growth in this world.

    Through discipline and dedication, you will unlock your true potential.`,

    tone: "earnest but not preachy, challenges feel epic but achievable, light humor welcome, acknowledge struggle without being dark",

    forbidden_tones: [
      "shame or guilt about wellness failures",
      "toxic positivity",
      "patronizing language",
      "sarcasm about player effort"
    ]
  },

  // ========== STAT SYSTEM (CORE ATTRIBUTES) ==========
  stats: {
    STR: {
      name: "Strength",
      description: "Physical power, discipline of the body",
      real_world_mapping: "Strength training, weightlifting, resistance exercise",
      magic_manifestation: "Enhanced physical capability, increased resilience"
    },
    DEX: {
      name: "Dexterity",
      description: "Agility, flexibility, fluid movement",
      real_world_mapping: "Cardio, agility training, flexibility work, dance",
      magic_manifestation: "Faster reflexes, better coordination, graceful movement"
    },
    CON: {
      name: "Constitution",
      description: "Stamina, nourishment, vitality",
      real_world_mapping: "Endurance training, proper nutrition, sleep, recovery",
      magic_manifestation: "Increased stamina, resistance to exhaustion, faster healing"
    },
    INT: {
      name: "Intelligence",
      description: "Mental acuity, learning, focus",
      real_world_mapping: "Reading, learning new skills, mental challenges, study",
      magic_manifestation: "Sharper mind, better problem-solving, enhanced memory"
    },
    WIS: {
      name: "Wisdom",
      description: "Inner peace, reflection, balance",
      real_world_mapping: "Meditation, mindfulness, journaling, self-reflection",
      magic_manifestation: "Emotional regulation, insight, clarity of purpose"
    },
    CHA: {
      name: "Charisma",
      description: "Self-love, connection, confidence",
      real_world_mapping: "Social connection, self-care, confidence building, helping others",
      magic_manifestation: "Magnetic presence, stronger relationships, self-assurance"
    }
  },

  // ========== IMMUTABLE WORLD RULES ==========
  core_rules: [
    "Individual growth manifests as both personal wellness AND magical power",
    "Balance across stats is more powerful than mastery of one (encourages well-rounded wellness)",
    "Magic manifests as enhanced capability, not flashy combat spells (grounded, relatable)",
    "Failed quests have consequences but not character death",
    "NPCs remember player actions - relationships persist and evolve",
    "Time moves forward - events have lasting consequences",
    "The world responds to player choices - cause and effect are logical and consistent"
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
      description: "Master of Strength & Constitution (cardio & lifting)",
      starting_stats: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 },
      flavor: "Warriors who build strength through physical prowess and endurance",
      iconic_goals: ["strength training", "cardio workouts", "endurance challenges"]
    },
    Mage: {
      description: "Scholar of Intelligence & Wisdom (learning & mindfulness)",
      starting_stats: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 },
      flavor: "Scholars who gain power through study and reflection",
      iconic_goals: ["reading", "learning", "meditation", "mindfulness"]
    },
    Rogue: {
      description: "Expert in Dexterity & Charisma (agility & social)",
      starting_stats: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 },
      flavor: "Agile adventurers who thrive through grace and social connection",
      iconic_goals: ["cardio", "agility training", "social activities", "confidence building"]
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
      "You climb the stairs, breathing easier than last week. Your mentor notices.",
      "The words echo in your mind as you find stillness in meditation. Clarity comes.",
      "Your muscles ache from the climb, but it's the good kind of ache. Progress."
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
    xp_costs: [100, 120, 140, 160, 180, 200], // Caps at 200 XP per level
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
    // Simple keyword-based check (in production, use LLM for semantic checking)
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
