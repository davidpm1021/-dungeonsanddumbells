-- Migration 005: D&D Mechanics System
-- Adds skill checks, combat stats, inventory, and conditions for D&D gameplay

-- ============================================================================
-- CHARACTER COMBAT STATS
-- ============================================================================
CREATE TABLE IF NOT EXISTS character_combat_stats (
  character_id INTEGER PRIMARY KEY REFERENCES characters(id) ON DELETE CASCADE,

  -- Core Combat Stats
  armor_class INTEGER DEFAULT 10 NOT NULL,
  max_hit_points INTEGER DEFAULT 10 NOT NULL,
  current_hit_points INTEGER DEFAULT 10 NOT NULL,
  temporary_hit_points INTEGER DEFAULT 0,

  -- Proficiencies
  proficiency_bonus INTEGER DEFAULT 2 NOT NULL,
  skill_proficiencies JSONB DEFAULT '[]'::jsonb,
  saving_throw_proficiencies JSONB DEFAULT '[]'::jsonb,

  -- Passive Scores
  passive_perception INTEGER DEFAULT 10,
  passive_insight INTEGER DEFAULT 10,
  passive_investigation INTEGER DEFAULT 10,

  -- Magic System (Stat-Based)
  magic_power_current INTEGER DEFAULT 0, -- Current magic points
  magic_power_max INTEGER DEFAULT 0,     -- Max magic points (based on INT/WIS)

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_character_combat_character ON character_combat_stats(character_id);

-- ============================================================================
-- COMBAT ENCOUNTERS (Must be before skill_check_history due to FK reference)
-- ============================================================================
CREATE TABLE IF NOT EXISTS combat_encounters (
  id SERIAL PRIMARY KEY,
  character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  quest_id INTEGER REFERENCES quests(id) ON DELETE SET NULL,

  -- Encounter Identity
  encounter_name VARCHAR(100) NOT NULL,
  encounter_description TEXT,

  -- Combatants (JSON structure for flexibility)
  enemies JSONB NOT NULL,           -- [{"name": "Mountain Troll", "ac": 14, "hp": 30, "zone": "close"}]
  allies JSONB DEFAULT '[]'::jsonb, -- Optional allies

  -- Combat State
  current_round INTEGER DEFAULT 1,
  initiative_order JSONB,           -- [{"name": "PlayerName", "initiative": 18, "type": "player"}, ...]
  current_turn_index INTEGER DEFAULT 0,

  -- Zone System (Hybrid combat)
  zone_system JSONB DEFAULT '{"player_zone": "close", "enemy_zones": {}}'::jsonb,

  -- Status
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'victory', 'defeat', 'fled')),
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ended_at TIMESTAMP,

  -- Narrative Log
  combat_log JSONB DEFAULT '[]'::jsonb -- Store combat narration for memory
);

CREATE INDEX idx_combat_encounters_character ON combat_encounters(character_id);
CREATE INDEX idx_combat_encounters_status ON combat_encounters(status);
CREATE INDEX idx_combat_encounters_active ON combat_encounters(character_id, status) WHERE status = 'active';

-- ============================================================================
-- SKILL CHECK HISTORY
-- ============================================================================
CREATE TABLE IF NOT EXISTS skill_check_history (
  id SERIAL PRIMARY KEY,
  character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,

  -- Check Details
  skill_type VARCHAR(50) NOT NULL, -- "Athletics", "Perception", "Persuasion", etc.
  dc INTEGER NOT NULL,
  roll_result INTEGER NOT NULL,    -- The d20 roll
  total_result INTEGER NOT NULL,   -- Roll + modifiers
  success BOOLEAN NOT NULL,

  -- Modifiers
  ability_modifier INTEGER,
  proficiency_bonus INTEGER DEFAULT 0,
  advantage BOOLEAN DEFAULT false,
  disadvantage BOOLEAN DEFAULT false,

  -- Context
  narrative_context TEXT,           -- "Climbing the cliff to reach the hermitage"
  encounter_id INTEGER REFERENCES combat_encounters(id) ON DELETE SET NULL,
  quest_id INTEGER REFERENCES quests(id) ON DELETE SET NULL,

  -- Timestamp
  checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_skill_check_history_character ON skill_check_history(character_id);
CREATE INDEX idx_skill_check_history_checked ON skill_check_history(checked_at DESC);
CREATE INDEX idx_skill_check_history_skill ON skill_check_history(skill_type);

-- ============================================================================
-- CHARACTER CONDITIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS character_conditions (
  id SERIAL PRIMARY KEY,
  character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,

  -- Condition Details
  condition_name VARCHAR(50) NOT NULL, -- "Grappled", "Prone", "Frightened", "Exhausted"
  severity INTEGER DEFAULT 1,          -- For stacking conditions (e.g., exhaustion levels 1-6)
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,                -- NULL = until manually removed

  -- Source
  source_description TEXT,             -- "Grappled by Mountain Troll"
  applied_by_encounter_id INTEGER REFERENCES combat_encounters(id) ON DELETE SET NULL,

  -- Condition Effects (narrative description)
  effects TEXT,                        -- "You have disadvantage on Dexterity checks while grappled"

  -- Active flag
  is_active BOOLEAN DEFAULT true
);

CREATE INDEX idx_character_conditions_character ON character_conditions(character_id);
CREATE INDEX idx_character_conditions_active ON character_conditions(character_id, is_active) WHERE is_active = true;

-- ============================================================================
-- CHARACTER INVENTORY
-- ============================================================================
CREATE TABLE IF NOT EXISTS character_inventory (
  id SERIAL PRIMARY KEY,
  character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,

  -- Item Identity
  item_name VARCHAR(100) NOT NULL,
  item_description TEXT,
  item_type VARCHAR(50),              -- "weapon", "armor", "accessory", "quest_item", "consumable"

  -- Item Effects (narrative bonuses, not mechanical +1)
  effects JSONB DEFAULT '{}'::jsonb,  -- {"narrative_bonus": "Enhances STR training", "stat_bonus": {"STR": 1}}

  -- Inventory State
  quantity INTEGER DEFAULT 1,
  equipped BOOLEAN DEFAULT false,
  acquired_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  acquired_from TEXT                  -- "Reward from 'The Hermit's Challenge'"
);

CREATE INDEX idx_character_inventory_character ON character_inventory(character_id);
CREATE INDEX idx_character_inventory_equipped ON character_inventory(character_id, equipped) WHERE equipped = true;
CREATE INDEX idx_character_inventory_type ON character_inventory(item_type);

-- ============================================================================
-- INITIALIZE COMBAT STATS FOR EXISTING CHARACTERS
-- ============================================================================
-- Calculate initial values based on existing character stats
INSERT INTO character_combat_stats (
  character_id,
  armor_class,
  max_hit_points,
  current_hit_points,
  proficiency_bonus,
  passive_perception,
  magic_power_max
)
SELECT
  c.id,
  -- AC = 10 + DEX modifier
  10 + FLOOR((c.dex - 10) / 2.0),
  -- HP = 10 + (CON modifier * level)
  10 + (FLOOR((c.con - 10) / 2.0) * COALESCE(c.level, 1)),
  -- Current HP = Max HP initially
  10 + (FLOOR((c.con - 10) / 2.0) * COALESCE(c.level, 1)),
  -- Proficiency bonus = +2 at level 1-4, +3 at 5-8, etc.
  CASE
    WHEN COALESCE(c.level, 1) < 5 THEN 2
    WHEN COALESCE(c.level, 1) < 9 THEN 3
    WHEN COALESCE(c.level, 1) < 13 THEN 4
    WHEN COALESCE(c.level, 1) < 17 THEN 5
    ELSE 6
  END,
  -- Passive Perception = 10 + WIS modifier + proficiency (assume everyone proficient)
  10 + FLOOR((c.wis - 10) / 2.0) + CASE
    WHEN COALESCE(c.level, 1) < 5 THEN 2
    WHEN COALESCE(c.level, 1) < 9 THEN 3
    ELSE 4
  END,
  -- Magic Power = INT modifier + WIS modifier (min 0)
  GREATEST(0, FLOOR((c.int - 10) / 2.0) + FLOOR((c.wis - 10) / 2.0))
FROM character_stats c
WHERE NOT EXISTS (
  SELECT 1 FROM character_combat_stats WHERE character_id = c.id
);

-- ============================================================================
-- CLASS-BASED PROFICIENCIES
-- ============================================================================
-- Assign class-specific proficiencies based on D&D 5e standards
-- Fighter: Athletics, Intimidation, Perception
UPDATE character_combat_stats ccs
SET
  skill_proficiencies = '["Athletics", "Intimidation", "Perception"]'::jsonb,
  saving_throw_proficiencies = '["STR", "CON"]'::jsonb
FROM characters c
WHERE c.id = ccs.character_id AND LOWER(c.class) = 'fighter';

-- Mage: Arcana, History, Investigation
UPDATE character_combat_stats ccs
SET
  skill_proficiencies = '["Arcana", "History", "Investigation"]'::jsonb,
  saving_throw_proficiencies = '["INT", "WIS"]'::jsonb
FROM characters c
WHERE c.id = ccs.character_id AND LOWER(c.class) = 'mage';

-- Rogue: Stealth, Sleight of Hand, Acrobatics, Perception
UPDATE character_combat_stats ccs
SET
  skill_proficiencies = '["Stealth", "Sleight of Hand", "Acrobatics", "Perception"]'::jsonb,
  saving_throw_proficiencies = '["DEX", "INT"]'::jsonb
FROM characters c
WHERE c.id = ccs.character_id AND LOWER(c.class) = 'rogue';

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to get ability modifier from stat value
CREATE OR REPLACE FUNCTION get_ability_modifier(stat_value INTEGER)
RETURNS INTEGER AS $$
BEGIN
  RETURN FLOOR((stat_value - 10) / 2.0);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to roll d20 with advantage/disadvantage
CREATE OR REPLACE FUNCTION roll_d20(
  has_advantage BOOLEAN DEFAULT false,
  has_disadvantage BOOLEAN DEFAULT false
)
RETURNS INTEGER AS $$
DECLARE
  roll1 INTEGER;
  roll2 INTEGER;
BEGIN
  roll1 := 1 + floor(random() * 20)::INTEGER;

  -- Normal roll if no advantage/disadvantage or if both cancel out
  IF (NOT has_advantage AND NOT has_disadvantage) OR (has_advantage AND has_disadvantage) THEN
    RETURN roll1;
  END IF;

  -- Roll second die for advantage/disadvantage
  roll2 := 1 + floor(random() * 20)::INTEGER;

  -- Advantage: take higher
  IF has_advantage THEN
    RETURN GREATEST(roll1, roll2);
  END IF;

  -- Disadvantage: take lower
  RETURN LEAST(roll1, roll2);
END;
$$ LANGUAGE plpgsql VOLATILE;

-- Function to perform skill check and log result
CREATE OR REPLACE FUNCTION perform_skill_check(
  p_character_id INTEGER,
  p_skill_type VARCHAR(50),
  p_dc INTEGER,
  p_narrative_context TEXT DEFAULT NULL,
  p_advantage BOOLEAN DEFAULT false,
  p_disadvantage BOOLEAN DEFAULT false
)
RETURNS TABLE (
  roll INTEGER,
  total INTEGER,
  success BOOLEAN,
  modifiers_breakdown TEXT
) AS $$
DECLARE
  v_roll INTEGER;
  v_ability_mod INTEGER;
  v_prof_bonus INTEGER;
  v_is_proficient BOOLEAN;
  v_total INTEGER;
  v_success BOOLEAN;
  v_stat_value INTEGER;
  v_skill_stat VARCHAR(3);
BEGIN
  -- Determine which ability score the skill uses
  v_skill_stat := CASE p_skill_type
    WHEN 'Athletics' THEN 'STR'
    WHEN 'Acrobatics' THEN 'DEX'
    WHEN 'Sleight of Hand' THEN 'DEX'
    WHEN 'Stealth' THEN 'DEX'
    WHEN 'Arcana' THEN 'INT'
    WHEN 'History' THEN 'INT'
    WHEN 'Investigation' THEN 'INT'
    WHEN 'Nature' THEN 'INT'
    WHEN 'Religion' THEN 'INT'
    WHEN 'Animal Handling' THEN 'WIS'
    WHEN 'Insight' THEN 'WIS'
    WHEN 'Medicine' THEN 'WIS'
    WHEN 'Perception' THEN 'WIS'
    WHEN 'Survival' THEN 'WIS'
    WHEN 'Deception' THEN 'CHA'
    WHEN 'Intimidation' THEN 'CHA'
    WHEN 'Performance' THEN 'CHA'
    WHEN 'Persuasion' THEN 'CHA'
    ELSE 'STR' -- Default fallback
  END;

  -- Get character stats
  SELECT
    CASE v_skill_stat
      WHEN 'STR' THEN c.str
      WHEN 'DEX' THEN c.dex
      WHEN 'CON' THEN c.con
      WHEN 'INT' THEN c.int
      WHEN 'WIS' THEN c.wis
      WHEN 'CHA' THEN c.cha
    END,
    ccs.proficiency_bonus,
    p_skill_type = ANY(SELECT jsonb_array_elements_text(ccs.skill_proficiencies))
  INTO v_stat_value, v_prof_bonus, v_is_proficient
  FROM character_stats c
  JOIN character_combat_stats ccs ON c.id = ccs.character_id
  WHERE c.id = p_character_id;

  -- Calculate ability modifier
  v_ability_mod := get_ability_modifier(v_stat_value);

  -- Roll d20
  v_roll := roll_d20(p_advantage, p_disadvantage);

  -- Calculate total
  v_total := v_roll + v_ability_mod + (CASE WHEN v_is_proficient THEN v_prof_bonus ELSE 0 END);

  -- Determine success
  v_success := v_total >= p_dc;

  -- Log to history
  INSERT INTO skill_check_history (
    character_id, skill_type, dc, roll_result, total_result, success,
    ability_modifier, proficiency_bonus, advantage, disadvantage,
    narrative_context
  ) VALUES (
    p_character_id, p_skill_type, p_dc, v_roll, v_total, v_success,
    v_ability_mod, CASE WHEN v_is_proficient THEN v_prof_bonus ELSE 0 END,
    p_advantage, p_disadvantage, p_narrative_context
  );

  -- Return results
  RETURN QUERY SELECT
    v_roll,
    v_total,
    v_success,
    format('d20=%s + %s(%s)=%s%s = %s vs DC %s',
      v_roll,
      v_skill_stat,
      v_ability_mod,
      CASE WHEN v_is_proficient THEN ' + Prof=' || v_prof_bonus ELSE '' END,
      CASE
        WHEN p_advantage THEN ' (Adv)'
        WHEN p_disadvantage THEN ' (Dis)'
        ELSE ''
      END,
      v_total,
      p_dc
    )::TEXT;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VIEWS
-- ============================================================================

-- View for complete character sheet
CREATE OR REPLACE VIEW character_sheets AS
SELECT
  c.id,
  c.name,
  c.class,
  c.level,
  c.str, c.dex, c.con, c.int, c.wis, c.cha,
  ccs.armor_class,
  ccs.max_hit_points,
  ccs.current_hit_points,
  ccs.temporary_hit_points,
  ccs.proficiency_bonus,
  ccs.skill_proficiencies,
  ccs.saving_throw_proficiencies,
  ccs.passive_perception,
  ccs.passive_insight,
  ccs.passive_investigation,
  ccs.magic_power_current,
  ccs.magic_power_max,
  -- Active conditions count
  (SELECT COUNT(*) FROM character_conditions WHERE character_id = c.id AND is_active = true) as active_conditions_count,
  -- Equipped items count
  (SELECT COUNT(*) FROM character_inventory WHERE character_id = c.id AND equipped = true) as equipped_items_count
FROM characters c
LEFT JOIN character_combat_stats ccs ON c.id = ccs.character_id;

COMMENT ON VIEW character_sheets IS 'Complete D&D character sheet with combat stats and inventory summary';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
