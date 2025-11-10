-- Migration 003: Quest System with Storylet Structure
-- Implements explicit prerequisites and effects to prevent narrative drift

-- Quests Table
CREATE TABLE IF NOT EXISTS quests (
  id SERIAL PRIMARY KEY,
  character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,

  -- Quest Identity
  title VARCHAR(100) NOT NULL,
  description TEXT NOT NULL, -- 2-3 sentences, present tense, second person
  quest_type VARCHAR(20) NOT NULL CHECK (quest_type IN ('main', 'side', 'corrective')),

  -- Difficulty & Progression
  difficulty VARCHAR(20) NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  estimated_duration VARCHAR(50), -- "1 day", "3 days", "1 week"

  -- NPCs & Theme
  npc_involved VARCHAR(100), -- Main NPC for this quest
  theme VARCHAR(200), -- "Strengthen your STR", "Discover inner wisdom"

  -- Storylet Prerequisites (explicit state requirements)
  -- Example: {"min_level": 2, "required_locations": ["Haven Village"], "required_qualities": {"tutorial_complete": 1}}
  prerequisites JSONB DEFAULT '{}'::jsonb,

  -- Storylet Effects (explicit state changes)
  -- Example: {"unlock_location": "Forgotten Peaks", "set_quality": {"sage_met": 1}, "npc_relationship": {"Elder Thorne": "friendly"}}
  effects JSONB DEFAULT '{}'::jsonb,

  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'active', 'completed', 'failed', 'expired')),

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  expires_at TIMESTAMP, -- Soft expiration (7 days default)

  -- AI Generation Metadata
  generated_by_ai BOOLEAN DEFAULT false,
  validation_score INTEGER, -- Lorekeeper score 0-100
  generation_prompt TEXT, -- Store prompt for debugging

  -- Rewards
  gold_reward INTEGER DEFAULT 0,
  item_reward VARCHAR(100) -- Narrative item: "Sage's Amulet"
);

CREATE INDEX idx_quests_character ON quests(character_id);
CREATE INDEX idx_quests_status ON quests(status);
CREATE INDEX idx_quests_type ON quests(quest_type);
CREATE INDEX idx_quests_created ON quests(created_at DESC);

-- Quest Objectives Table
CREATE TABLE IF NOT EXISTS quest_objectives (
  id SERIAL PRIMARY KEY,
  quest_id INTEGER NOT NULL REFERENCES quests(id) ON DELETE CASCADE,

  -- Objective Details
  description TEXT NOT NULL, -- "Complete a 30-minute strength workout"
  order_index INTEGER NOT NULL DEFAULT 0, -- For multi-step quests

  -- Goal Mapping
  goal_mapping TEXT, -- What wellness activity this maps to
  stat_reward VARCHAR(3) NOT NULL CHECK (stat_reward IN ('STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA')),
  xp_reward INTEGER NOT NULL DEFAULT 10,

  -- Completion
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP,

  -- Linked to actual goal completion (optional)
  goal_completion_id INTEGER REFERENCES goal_completions(id) ON DELETE SET NULL
);

CREATE INDEX idx_quest_objectives_quest ON quest_objectives(quest_id);
CREATE INDEX idx_quest_objectives_completed ON quest_objectives(completed);

-- Quest Progress Tracking
CREATE TABLE IF NOT EXISTS quest_progress (
  id SERIAL PRIMARY KEY,
  quest_id INTEGER NOT NULL REFERENCES quests(id) ON DELETE CASCADE,

  -- Progress snapshot
  objectives_completed INTEGER DEFAULT 0,
  objectives_total INTEGER NOT NULL,
  percentage INTEGER DEFAULT 0, -- 0-100

  -- Latest update
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notes TEXT
);

CREATE INDEX idx_quest_progress_quest ON quest_progress(quest_id);

-- Quest Templates (for handwritten main quests)
CREATE TABLE IF NOT EXISTS quest_templates (
  id SERIAL PRIMARY KEY,

  -- Template Identity
  template_name VARCHAR(100) NOT NULL UNIQUE,
  title VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  quest_type VARCHAR(20) NOT NULL CHECK (quest_type IN ('main', 'side', 'corrective')),

  -- Requirements
  difficulty VARCHAR(20) NOT NULL,
  prerequisites JSONB DEFAULT '{}'::jsonb,
  effects JSONB DEFAULT '{}'::jsonb,

  -- Narrative Details
  npc_involved VARCHAR(100),
  theme VARCHAR(200),
  estimated_duration VARCHAR(50),

  -- Objectives (stored as JSON array)
  objectives JSONB NOT NULL,

  -- Rewards
  gold_reward INTEGER DEFAULT 0,
  item_reward VARCHAR(100),

  -- Metadata
  created_by VARCHAR(100), -- "developer" or "ai_agent"
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_quest_templates_type ON quest_templates(quest_type);
CREATE INDEX idx_quest_templates_active ON quest_templates(is_active);

-- Add foreign key to narrative_events for quest_id (now that quests table exists)
ALTER TABLE narrative_events
  ADD CONSTRAINT fk_narrative_events_quest
  FOREIGN KEY (quest_id) REFERENCES quests(id) ON DELETE SET NULL;

-- Initialize with first handwritten quest template: Tutorial Quest
INSERT INTO quest_templates (
  template_name,
  title,
  description,
  quest_type,
  difficulty,
  npc_involved,
  theme,
  estimated_duration,
  objectives,
  gold_reward,
  prerequisites,
  effects,
  created_by
) VALUES (
  'tutorial_elder_thorne',
  'The Hermit''s Challenge',
  'You meet Elder Thorne at his mountain hermitage. He speaks of the Six Pillars - ancient forces that once kept the kingdom strong. "Show me you''re ready," he says, testing your resolve.',
  'main',
  'easy',
  'Elder Thorne',
  'Introduction to the Six Pillars',
  '1 day',
  '[
    {
      "description": "Complete your first strength training session",
      "goalMapping": "Any strength or cardio workout",
      "statReward": "STR",
      "xpReward": 25
    },
    {
      "description": "Take a moment for reflection and meditation",
      "goalMapping": "Meditation or mindfulness practice",
      "statReward": "WIS",
      "xpReward": 25
    }
  ]'::jsonb,
  50,
  '{}'::jsonb,
  '{
    "set_quality": {"tutorial_complete": 1, "elder_thorne_met": 1},
    "unlock_location": "Elder Thorne''s Hermitage",
    "npc_relationship": {"Elder Thorne": {"level": "friendly", "notes": "Impressed by your dedication"}}
  }'::jsonb,
  'developer'
);

-- Comments for documentation
COMMENT ON TABLE quests IS 'Individual quest instances for characters with storylet prerequisites/effects';
COMMENT ON TABLE quest_objectives IS 'Specific objectives within a quest that map to wellness activities';
COMMENT ON TABLE quest_templates IS 'Handwritten quest templates for main story quests';
COMMENT ON COLUMN quests.prerequisites IS 'Storylet prerequisites: min_level, required_locations, required_qualities';
COMMENT ON COLUMN quests.effects IS 'Storylet effects: unlock_location, set_quality, npc_relationship';
COMMENT ON COLUMN quests.validation_score IS 'Lorekeeper validation score (0-100), target 85+';
