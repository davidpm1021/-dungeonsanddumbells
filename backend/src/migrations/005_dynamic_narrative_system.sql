-- Migration 005: Dynamic Narrative System
-- Implements MMO-style quest system with player agency, quest chains, and world events
-- Reference: PRD Addendum.md - Dynamic Narrative System

-- ============================================================================
-- PART 1: Alter Quests Table for Dynamic Narrative System
-- ============================================================================

-- Drop existing CHECK constraint on quest_type to update it
ALTER TABLE quests DROP CONSTRAINT IF EXISTS quests_quest_type_check;

-- Add new columns to quests table
ALTER TABLE quests
  -- Update quest_type to support new types
  ADD COLUMN IF NOT EXISTS quest_chain_id INTEGER,
  ADD COLUMN IF NOT EXISTS unlocks_quest_ids JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS mutually_exclusive_with JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS time_pressure VARCHAR(50) DEFAULT 'none' CHECK (time_pressure IN ('urgent', 'relaxed', 'none')),
  ADD COLUMN IF NOT EXISTS story_branch VARCHAR(100),
  ADD COLUMN IF NOT EXISTS player_choice_origin JSONB,
  ADD COLUMN IF NOT EXISTS world_state_requirements JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS narrative_weight INTEGER DEFAULT 5 CHECK (narrative_weight BETWEEN 1 AND 10);

-- Add updated CHECK constraint for quest_type with new types
ALTER TABLE quests
  ADD CONSTRAINT quests_quest_type_check
  CHECK (quest_type IN ('main_story', 'side_story', 'world_event', 'character_arc', 'corrective', 'exploration', 'main', 'side'));

-- Add index for new columns
CREATE INDEX IF NOT EXISTS idx_quests_chain ON quests(quest_chain_id);
CREATE INDEX IF NOT EXISTS idx_quests_branch ON quests(story_branch);
CREATE INDEX IF NOT EXISTS idx_quests_time_pressure ON quests(time_pressure);
CREATE INDEX IF NOT EXISTS idx_quests_narrative_weight ON quests(narrative_weight DESC);

-- ============================================================================
-- PART 2: Quest Chains Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS quest_chains (
  id SERIAL PRIMARY KEY,

  -- Chain Identity
  chain_name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,

  -- Chain Configuration
  starting_quest_id INTEGER REFERENCES quests(id) ON DELETE SET NULL,
  branch_type VARCHAR(50), -- 'linear', 'branching', 'parallel'
  story_impact VARCHAR(20) CHECK (story_impact IN ('major', 'moderate', 'minor')),

  -- Chain Focus
  stat_focus_primary VARCHAR(3) CHECK (stat_focus_primary IN ('STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA')),
  npc_involved VARCHAR(100),

  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT true
);

CREATE INDEX idx_quest_chains_stat ON quest_chains(stat_focus_primary);
CREATE INDEX idx_quest_chains_active ON quest_chains(is_active);

COMMENT ON TABLE quest_chains IS 'Quest chain definitions linking related quests into narrative arcs';

-- ============================================================================
-- PART 3: Story Branches Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS story_branches (
  id SERIAL PRIMARY KEY,
  character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,

  -- Branch Identity
  branch_name VARCHAR(100) NOT NULL,
  activated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Branch State
  current_status VARCHAR(50) DEFAULT 'active' CHECK (current_status IN ('active', 'completed', 'abandoned', 'failed')),
  key_choices JSONB DEFAULT '[]'::jsonb, -- Array of choice IDs that activated this branch

  -- Branch Impact
  npcs_affected JSONB DEFAULT '{}'::jsonb, -- {"Elder Thorne": {"relationship_delta": +10}, ...}
  world_state_changes JSONB DEFAULT '{}'::jsonb, -- What changed in the world

  -- Metadata
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(character_id, branch_name)
);

CREATE INDEX idx_story_branches_character ON story_branches(character_id);
CREATE INDEX idx_story_branches_status ON story_branches(current_status);
CREATE INDEX idx_story_branches_activated ON story_branches(activated_at DESC);

COMMENT ON TABLE story_branches IS 'Tracks narrative branches activated by player choices per character';

-- ============================================================================
-- PART 4: World Events Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS world_events (
  id SERIAL PRIMARY KEY,

  -- Event Identity
  event_name VARCHAR(100) NOT NULL UNIQUE,
  event_description TEXT NOT NULL,

  -- Event Trigger & Duration
  trigger_condition JSONB, -- What caused this event to spawn
  affects_all_players BOOLEAN DEFAULT true,
  duration_days INTEGER DEFAULT 7,
  starts_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ends_at TIMESTAMP,

  -- Event Quest Generation
  spawns_quest_type VARCHAR(50) DEFAULT 'world_event',
  narrative_consequences TEXT, -- What happens based on collective player participation

  -- Event State
  is_active BOOLEAN DEFAULT true,
  participation_count INTEGER DEFAULT 0, -- How many players participated
  completion_count INTEGER DEFAULT 0, -- How many completed event quests

  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_world_events_active ON world_events(is_active);
CREATE INDEX idx_world_events_dates ON world_events(starts_at, ends_at);

COMMENT ON TABLE world_events IS 'Global world events affecting all players with time-limited quests';

-- ============================================================================
-- PART 5: Quest Choices Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS quest_choices (
  id SERIAL PRIMARY KEY,
  quest_id INTEGER NOT NULL REFERENCES quests(id) ON DELETE CASCADE,

  -- Choice Point
  choice_point_description TEXT NOT NULL, -- "The sage offers you a choice..."
  choice_options JSONB NOT NULL, -- [{"id": 1, "label": "Train in strength", "description": "...", ...}, ...]

  -- Choice Consequences
  story_consequences JSONB DEFAULT '{}'::jsonb, -- What each choice unlocks/locks
  affects_branch VARCHAR(100), -- Which story branch this impacts

  -- Choice State
  choice_made INTEGER, -- Which option ID was selected (null if not yet chosen)
  chosen_at TIMESTAMP,

  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_quest_choices_quest ON quest_choices(quest_id);
CREATE INDEX idx_quest_choices_made ON quest_choices(choice_made);

COMMENT ON TABLE quest_choices IS 'Choice points within quests that affect narrative branching';

-- ============================================================================
-- PART 6: Character Choices Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS character_choices (
  id SERIAL PRIMARY KEY,
  character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,

  -- Choice Context
  choice_context TEXT NOT NULL, -- Description of the decision point
  choice_made TEXT NOT NULL, -- What the player chose
  quest_id INTEGER REFERENCES quests(id) ON DELETE SET NULL,

  -- Choice Impact
  narrative_impact VARCHAR(20) CHECK (narrative_impact IN ('major', 'moderate', 'minor')),
  affected_npcs JSONB DEFAULT '[]'::jsonb, -- ["Elder Thorne", "Lady Seraphine"]
  unlocked_content JSONB DEFAULT '[]'::jsonb, -- ["quest_id_123", "location_forgotten_peaks"]
  locked_content JSONB DEFAULT '[]'::jsonb, -- ["quest_id_456"]

  -- Timestamp
  made_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_character_choices_character ON character_choices(character_id);
CREATE INDEX idx_character_choices_quest ON character_choices(quest_id);
CREATE INDEX idx_character_choices_impact ON character_choices(narrative_impact);
CREATE INDEX idx_character_choices_made ON character_choices(made_at DESC);

COMMENT ON TABLE character_choices IS 'Complete history of meaningful choices made by each character';

-- ============================================================================
-- PART 7: Add Foreign Key for Quest Chains
-- ============================================================================

ALTER TABLE quests
  ADD CONSTRAINT fk_quests_chain
  FOREIGN KEY (quest_chain_id) REFERENCES quest_chains(id) ON DELETE SET NULL;

-- ============================================================================
-- PART 8: Update Existing Quest Templates to Use New Quest Types
-- ============================================================================

-- Update the tutorial quest to use 'main_story' instead of 'main'
UPDATE quest_templates
SET quest_type = 'main_story'
WHERE quest_type = 'main' AND template_name = 'tutorial_elder_thorne';

-- Drop and recreate CHECK constraint on quest_templates to match quests table
ALTER TABLE quest_templates DROP CONSTRAINT IF EXISTS quest_templates_quest_type_check;
ALTER TABLE quest_templates
  ADD CONSTRAINT quest_templates_quest_type_check
  CHECK (quest_type IN ('main_story', 'side_story', 'world_event', 'character_arc', 'corrective', 'exploration', 'main', 'side'));

-- ============================================================================
-- Comments for Documentation
-- ============================================================================

COMMENT ON COLUMN quests.quest_chain_id IS 'Links quest to a narrative chain (optional)';
COMMENT ON COLUMN quests.unlocks_quest_ids IS 'Array of quest IDs that become available after completing this quest';
COMMENT ON COLUMN quests.mutually_exclusive_with IS 'Array of quest IDs that cannot be active simultaneously';
COMMENT ON COLUMN quests.time_pressure IS 'Urgency level: urgent (1-2 days), relaxed (7+ days), none';
COMMENT ON COLUMN quests.story_branch IS 'Which narrative branch this quest belongs to';
COMMENT ON COLUMN quests.player_choice_origin IS 'What player choice led to this quest being offered';
COMMENT ON COLUMN quests.world_state_requirements IS 'World conditions needed for quest to be available';
COMMENT ON COLUMN quests.narrative_weight IS 'Importance score 1-10, affects quest prioritization in UI';
