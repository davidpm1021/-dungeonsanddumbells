-- Migration 011: Combat System Tables
-- Creates tables required for D&D 5e combat system

-- Character Combat Stats Table
-- Stores HP, AC, and combat-specific character data
CREATE TABLE IF NOT EXISTS character_combat_stats (
  character_id INTEGER PRIMARY KEY REFERENCES characters(id) ON DELETE CASCADE,
  armor_class INTEGER NOT NULL DEFAULT 10,
  max_hit_points INTEGER NOT NULL DEFAULT 20,
  current_hit_points INTEGER NOT NULL DEFAULT 20,
  temporary_hit_points INTEGER DEFAULT 0,
  death_saves_successes INTEGER DEFAULT 0,
  death_saves_failures INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT positive_hp CHECK (max_hit_points > 0),
  CONSTRAINT current_hp_limit CHECK (current_hit_points <= max_hit_points + temporary_hit_points),
  CONSTRAINT death_saves_range CHECK (
    death_saves_successes >= 0 AND death_saves_successes <= 3 AND
    death_saves_failures >= 0 AND death_saves_failures <= 3
  )
);

COMMENT ON TABLE character_combat_stats IS 'Combat-specific character stats (HP, AC, death saves)';
COMMENT ON COLUMN character_combat_stats.armor_class IS 'AC (10 + DEX mod + armor/shield bonuses)';
COMMENT ON COLUMN character_combat_stats.max_hit_points IS 'Maximum hit points';
COMMENT ON COLUMN character_combat_stats.current_hit_points IS 'Current hit points (can be negative for massive damage)';
COMMENT ON COLUMN character_combat_stats.temporary_hit_points IS 'Temporary HP from spells/abilities';
COMMENT ON COLUMN character_combat_stats.death_saves_successes IS 'Death saving throw successes (0-3)';
COMMENT ON COLUMN character_combat_stats.death_saves_failures IS 'Death saving throw failures (0-3)';

-- Combat Encounters Table
-- Stores active and historical combat encounters
CREATE TABLE IF NOT EXISTS combat_encounters (
  id SERIAL PRIMARY KEY,
  character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  quest_id INTEGER REFERENCES quests(id) ON DELETE SET NULL,

  encounter_name VARCHAR(255) NOT NULL,
  encounter_description TEXT,

  -- Combat State
  enemies JSONB NOT NULL, -- Array of enemy objects with HP, AC, stats
  initiative_order JSONB NOT NULL, -- Sorted initiative array
  current_turn_index INTEGER DEFAULT 0,
  current_round INTEGER DEFAULT 1,

  -- Zone System (hybrid combat positioning)
  zone_system JSONB DEFAULT '{"player_zone": "close", "enemy_zones": {}}'::jsonb,

  -- Status
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'victory', 'defeat', 'fled')),

  -- Narrative log
  combat_log JSONB DEFAULT '[]'::jsonb,

  -- Rewards (set on victory)
  xp_reward INTEGER DEFAULT 0,
  gold_reward INTEGER DEFAULT 0,
  loot JSONB DEFAULT '[]'::jsonb,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_combat_encounters_character ON combat_encounters(character_id);
CREATE INDEX IF NOT EXISTS idx_combat_encounters_status ON combat_encounters(status);
CREATE INDEX IF NOT EXISTS idx_combat_encounters_quest ON combat_encounters(quest_id);

COMMENT ON TABLE combat_encounters IS 'D&D 5e combat encounters with initiative and zone positioning';
COMMENT ON COLUMN combat_encounters.enemies IS 'Array of enemy objects: {name, hp, currentHp, ac, str, dex, con, attackBonus, damageBonus}';
COMMENT ON COLUMN combat_encounters.initiative_order IS 'Initiative-sorted array: [{name, type, initiative, dexMod, id}]';
COMMENT ON COLUMN combat_encounters.current_turn_index IS 'Index in initiative_order for current turn';
COMMENT ON COLUMN combat_encounters.current_round IS 'Current combat round (1-indexed)';
COMMENT ON COLUMN combat_encounters.zone_system IS 'Zone positioning: {player_zone, enemy_zones: {enemy_0: "close", enemy_1: "near"}}';
COMMENT ON COLUMN combat_encounters.combat_log IS 'Narrative log of combat events: [{round, turn, event, timestamp}]';
COMMENT ON COLUMN combat_encounters.status IS 'Combat status: active, victory, defeat, fled';
COMMENT ON COLUMN combat_encounters.xp_reward IS 'XP rewarded on victory';
COMMENT ON COLUMN combat_encounters.gold_reward IS 'Gold rewarded on victory';
COMMENT ON COLUMN combat_encounters.loot IS 'Items dropped: [{item, quantity}]';

-- Skill Check History Table (for skill checks during combat and exploration)
CREATE TABLE IF NOT EXISTS skill_check_history (
  id SERIAL PRIMARY KEY,
  character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  combat_encounter_id INTEGER REFERENCES combat_encounters(id) ON DELETE CASCADE,

  skill_type VARCHAR(50) NOT NULL, -- "Athletics", "Acrobatics", "Perception", etc.
  dc INTEGER NOT NULL, -- Difficulty Class

  -- Roll breakdown
  d20_roll INTEGER NOT NULL CHECK (d20_roll >= 1 AND d20_roll <= 20),
  stat_modifier INTEGER NOT NULL,
  proficiency_bonus INTEGER DEFAULT 0,
  other_modifiers INTEGER DEFAULT 0,
  total INTEGER NOT NULL,

  success BOOLEAN NOT NULL,
  critical BOOLEAN DEFAULT FALSE, -- Natural 20 or critical failure

  narrative_context TEXT, -- Why the check was made
  result_description TEXT, -- Outcome of the check

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_skill_checks_character ON skill_check_history(character_id);
CREATE INDEX IF NOT EXISTS idx_skill_checks_encounter ON skill_check_history(combat_encounter_id);
CREATE INDEX IF NOT EXISTS idx_skill_checks_skill_type ON skill_check_history(skill_type);

COMMENT ON TABLE skill_check_history IS 'D&D 5e skill check rolls and outcomes';
COMMENT ON COLUMN skill_check_history.skill_type IS 'D&D 5e skill: Athletics, Acrobatics, Perception, etc.';
COMMENT ON COLUMN skill_check_history.dc IS 'Difficulty Class (DC) to beat';
COMMENT ON COLUMN skill_check_history.d20_roll IS 'Raw d20 roll (1-20)';
COMMENT ON COLUMN skill_check_history.stat_modifier IS 'Stat modifier (STR, DEX, etc.)';
COMMENT ON COLUMN skill_check_history.proficiency_bonus IS 'Proficiency bonus if proficient in skill';
COMMENT ON COLUMN skill_check_history.other_modifiers IS 'Advantage/disadvantage, inspiration, etc.';
COMMENT ON COLUMN skill_check_history.total IS 'd20 + stat + proficiency + other';
COMMENT ON COLUMN skill_check_history.success IS 'Whether total >= DC';
COMMENT ON COLUMN skill_check_history.critical IS 'Natural 20 (auto-success) or nat 1 (auto-fail for combat)';
