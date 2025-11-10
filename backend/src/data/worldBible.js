/**
 * World Bible for Dumbbells & Dragons
 *
 * This is the IMMUTABLE ground truth about the world of Vitalia.
 * The Lorekeeper agent validates all generated content against this document.
 *
 * These rules NEVER change. They are the foundation of narrative consistency.
 */

const WORLD_BIBLE = {
  // ========== WORLD OVERVIEW ==========
  setting: {
    name: "The Kingdom of Vitalia",
    description: `A fantasy realm where citizens have lost connection to ancient practices of body, mind, and spirit.
    Dark malaise spreads across the land - people are weaker, sadder, more isolated than in ages past.
    The old heroes spoke of "The Six Pillars" that kept the kingdom strong, but that knowledge has faded.

    You are a novice adventurer who's discovered hints of this lost wisdom.
    Your quest: rediscover the Six Pillars and restore Vitalia (and yourself).`,

    tone: "earnest but not preachy, challenges feel epic but achievable, light humor welcome, acknowledge struggle without being dark",

    forbidden_tones: [
      "shame or guilt about wellness failures",
      "toxic positivity",
      "patronizing language",
      "sarcasm about player effort"
    ]
  },

  // ========== THE SIX PILLARS (CORE MAGIC SYSTEM) ==========
  six_pillars: {
    STR: {
      name: "Pillar of Might",
      description: "Physical power, discipline of the body",
      real_world_mapping: "Strength training, weightlifting, resistance exercise",
      magic_manifestation: "Enhanced physical capability, increased resilience"
    },
    DEX: {
      name: "Pillar of Grace",
      description: "Agility, flexibility, fluid movement",
      real_world_mapping: "Cardio, agility training, flexibility work, dance",
      magic_manifestation: "Faster reflexes, better coordination, graceful movement"
    },
    CON: {
      name: "Pillar of Endurance",
      description: "Stamina, nourishment, vitality",
      real_world_mapping: "Endurance training, proper nutrition, sleep, recovery",
      magic_manifestation: "Increased stamina, resistance to exhaustion, faster healing"
    },
    INT: {
      name: "Pillar of Clarity",
      description: "Mental acuity, learning, focus",
      real_world_mapping: "Reading, learning new skills, mental challenges, study",
      magic_manifestation: "Sharper mind, better problem-solving, enhanced memory"
    },
    WIS: {
      name: "Pillar of Serenity",
      description: "Inner peace, reflection, balance",
      real_world_mapping: "Meditation, mindfulness, journaling, self-reflection",
      magic_manifestation: "Emotional regulation, insight, clarity of purpose"
    },
    CHA: {
      name: "Pillar of Radiance",
      description: "Self-love, connection, confidence",
      real_world_mapping: "Social connection, self-care, confidence building, helping others",
      magic_manifestation: "Magnetic presence, stronger relationships, self-assurance"
    }
  },

  // ========== IMMUTABLE WORLD RULES ==========
  core_rules: [
    "The Six Pillars are real magical forces that powered ancient civilization",
    "Individual growth in these pillars manifests as both personal wellness AND magical power",
    "Balance across pillars is more powerful than mastery of one (encourages well-rounded wellness)",
    "The malaise is a real magical effect caused by society abandoning the pillars",
    "Magic manifests as enhanced capability, not flashy combat spells (grounded, relatable)",
    "Death doesn't exist in Vitalia - failed quests have consequences but not character death",
    "NPCs remember player actions - relationships persist and evolve",
    "Time moves forward - events have lasting consequences",
    "The world responds to player choices - cause and effect are logical and consistent"
  ],

  magic_system_constraints: [
    "No flashy combat spells in MVP",
    "Magic enhances natural abilities, doesn't replace them",
    "Physical/mental growth = magical growth (1:1 correlation)",
    "All magic tied to the Six Pillars",
    "Magic requires practice and discipline, not innate talent",
    "Stronger body/mind = stronger magic (motivation for wellness)"
  ],

  // ========== KEY LOCATIONS ==========
  locations: {
    haven_village: {
      name: "Haven Village",
      description: "Starting location, safe hub for novice adventurers",
      npcs: ["Elder Thorne", "Village Blacksmith", "Healer Mara"],
      unlocked_by_default: true,
      atmosphere: "Peaceful but touched by malaise, hopeful"
    },

    elder_thorne_hermitage: {
      name: "Elder Thorne's Hermitage",
      description: "Tutorial area where you first learn about the Six Pillars",
      npcs: ["Elder Thorne"],
      unlocked_by: "tutorial_quest",
      atmosphere: "Rustic, wise, grounding"
    },

    vitalia_city: {
      name: "Vitalia City",
      description: "Main hub, Lady Seraphine's guild headquarters",
      npcs: ["Lady Seraphine", "Guild Members", "Merchants", "Citizens"],
      unlocked_by: "complete_tutorial",
      atmosphere: "Bustling but weary, hopeful under malaise"
    },

    forgotten_peaks: {
      name: "The Forgotten Peaks",
      description: "Mountain region for wisdom training and meditation",
      npcs: ["The Forgotten Sage", "Mountain Hermits"],
      unlocked_by: "wisdom_quest_chain",
      atmosphere: "Serene, challenging, introspective"
    },

    whispering_woods: {
      name: "The Whispering Woods",
      description: "Forest area for endurance and constitution challenges",
      npcs: ["Forest Guardian", "Herbalist"],
      unlocked_by: "endurance_quest_chain",
      atmosphere: "Mysterious, vital, alive"
    },

    mirror_lakes: {
      name: "The Mirror Lakes",
      description: "Reflective waters for charisma and self-discovery",
      npcs: ["Lady of the Lakes", "Fellow Seekers"],
      unlocked_by: "charisma_quest_chain",
      atmosphere: "Peaceful, introspective, beautiful"
    }
  },

  // ========== KEY NPCs (IMMUTABLE PERSONALITIES) ==========
  npcs: {
    elder_thorne: {
      name: "Elder Thorne",
      role: "Tutorial mentor, introduces player to the Six Pillars",
      personality: "Gruff but caring, sees potential in player, patient teacher",
      voice: "Short sentences, direct, occasional dry humor",
      speech_example: "You're weak. Good. Means you've room to grow. The Pillars await.",
      relationship_arc: "Starts cautious, warms with player progress, becomes proud mentor",
      knowledge: "Knows about the pillars but won't hand-feed answers, teaches through challenge",
      never_does: [
        "Contradicts player's chosen path",
        "Gives excessive exposition dumps",
        "Speaks in flowery language",
        "Shows excessive emotion"
      ],
      always_does: [
        "Challenges player to grow",
        "References past player achievements",
        "Speaks plainly and directly",
        "Shows pride through subtle gestures"
      ]
    },

    lady_seraphine: {
      name: "Lady Seraphine",
      role: "Guild master, main quest giver, tracks player's pillar balance",
      personality: "Charismatic, strategic, sees big picture, encouraging but demanding",
      voice: "Eloquent, encouraging, occasional playful teasing",
      speech_example: "Your mind sharp as ever, but those stairs left you winded. The pillars must grow together, dear adventurer.",
      relationship_arc: "Professional but warm from start, becomes invested in player success",
      knowledge: "Knows Vitalia's politics and dangers, understands balance is key",
      never_does: [
        "Lets player take quests beyond their capability",
        "Forgets past missions or player choices",
        "Shows favoritism without reason",
        "Speaks condescendingly"
      ],
      always_does: [
        "Notes player's stat imbalances",
        "References previous quests",
        "Encourages balanced growth",
        "Shows warmth tempered with professionalism"
      ]
    },

    forgotten_sage: {
      name: "The Forgotten Sage",
      role: "Wisdom guide, appears when player neglects mental/spiritual pillars",
      personality: "Mysterious, patient, speaks in riddles, asks more than answers",
      voice: "Poetic, thoughtful, philosophical",
      speech_example: "The strongest sword dulls without wisdom to wield it. What have you learned of silence?",
      relationship_arc: "Appears when needed, fades when lesson learned, mysterious presence",
      knowledge: "Deep understanding of balance, mental health, inner peace",
      never_does: [
        "Appears multiple times in one quest chain",
        "Forces decisions on player",
        "Speaks directly or plainly",
        "Breaks character's mysterious nature"
      ],
      always_does: [
        "Speaks in questions and riddles",
        "Appears when wisdom needed",
        "Respects player's journey",
        "Fades mysteriously"
      ]
    }
  },

  // ========== CHARACTER CLASSES ==========
  character_classes: {
    Fighter: {
      description: "Master of Strength & Constitution (cardio & lifting)",
      starting_stats: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 },
      flavor: "Warriors who rebuild the kingdom through physical prowess and endurance",
      iconic_goals: ["strength training", "cardio workouts", "endurance challenges"]
    },
    Mage: {
      description: "Scholar of Intelligence & Wisdom (learning & mindfulness)",
      starting_stats: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 },
      flavor: "Scholars who rediscover ancient knowledge through study and reflection",
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
      "You climb the stairs to the guild hall, breathing easier than last week. Lady Seraphine notices.",
      "The Sage's words echo in your mind as you find stillness in meditation. Clarity comes.",
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

// Validation function to ensure nothing contradicts the World Bible
function validateAgainstWorldBible(proposedContent, contentType) {
  const violations = [];

  // Check NPC behavior
  if (contentType === 'npc_dialogue' && proposedContent.npc_name) {
    const npc = WORLD_BIBLE.npcs[proposedContent.npc_name.toLowerCase().replace(' ', '_')];
    if (npc) {
      // Check voice consistency
      if (npc.never_does) {
        npc.never_does.forEach(forbidden => {
          if (proposedContent.dialogue.toLowerCase().includes(forbidden.toLowerCase())) {
            violations.push({
              type: 'npc_behavior',
              severity: 'critical',
              message: `${npc.name} would never: ${forbidden}`,
              location: 'dialogue'
            });
          }
        });
      }
    }
  }

  // Check world rules
  WORLD_BIBLE.core_rules.forEach(rule => {
    // Simple keyword-based check (in production, use LLM for semantic checking)
    if (rule.includes('death') && proposedContent.description?.includes('death')) {
      violations.push({
        type: 'world_rule_violation',
        severity: 'critical',
        message: 'Death doesn\'t exist in Vitalia',
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
