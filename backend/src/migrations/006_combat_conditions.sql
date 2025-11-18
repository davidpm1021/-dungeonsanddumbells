-- Migration 006: Combat Conditions System
-- Tracks status conditions applied to characters during combat
-- (Grappled, Prone, Frightened, Stunned, etc.)

-- Drop existing tables if they exist (for clean migration)
DROP TABLE IF EXISTS character_conditions CASCADE;
DROP TABLE IF EXISTS condition_effects CASCADE;

-- ============================================================================
-- CHARACTER CONDITIONS TABLE
-- ============================================================================
CREATE TABLE character_conditions (
  id SERIAL PRIMARY KEY,
  character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  encounter_id INTEGER REFERENCES combat_encounters(id) ON DELETE CASCADE,

  -- Condition details
  condition_type VARCHAR(50) NOT NULL, -- 'grappled', 'prone', 'frightened', 'stunned', 'paralyzed', 'poisoned', 'blinded', 'deafened', 'restrained'
  source TEXT, -- What caused the condition (e.g., "Wolf's bite attack")
  duration_type VARCHAR(20) DEFAULT 'rounds', -- 'rounds', 'minutes', 'permanent', 'until_save'
  duration_remaining INTEGER DEFAULT 1, -- How many rounds/minutes left

  -- Save DC (if applicable)
  save_dc INTEGER, -- DC for saving throw to end condition
  save_ability VARCHAR(3), -- 'STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'

  -- Metadata
  applied_at TIMESTAMP DEFAULT NOW(),
  ended_at TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE
);

-- Prevent duplicate active conditions (partial unique index)
CREATE UNIQUE INDEX idx_character_conditions_unique_active
  ON character_conditions(character_id, condition_type)
  WHERE is_active = TRUE;

CREATE INDEX idx_character_conditions_character ON character_conditions(character_id);
CREATE INDEX idx_character_conditions_encounter ON character_conditions(encounter_id);
CREATE INDEX idx_character_conditions_active ON character_conditions(character_id, is_active);

-- ============================================================================
-- CONDITION EFFECTS REFERENCE TABLE
-- ============================================================================
-- This table defines the mechanical effects of each condition
CREATE TABLE condition_effects (
  condition_type VARCHAR(50) PRIMARY KEY,
  display_name VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,

  -- Mechanical effects (stored as JSONB for flexibility)
  effects JSONB NOT NULL,
  -- Example: {
  --   "attackRolls": "disadvantage",
  --   "abilityChecks": {"STR": "disadvantage", "DEX": "disadvantage"},
  --   "movement": "halved",
  --   "preventMovement": true,
  --   "grantAdvantage": {"melee_attacks_against": true}
  -- }

  emoji VARCHAR(10), -- For UI display
  severity VARCHAR(20) DEFAULT 'moderate' -- 'minor', 'moderate', 'severe', 'debilitating'
);

-- ============================================================================
-- SEED COMMON D&D 5e CONDITIONS
-- ============================================================================
INSERT INTO condition_effects (condition_type, display_name, description, effects, emoji, severity) VALUES
('grappled', 'Grappled', 'Speed becomes 0, cannot benefit from bonuses to speed. Ends if grappler is incapacitated or moved away.',
  '{"movement": 0, "preventMovement": true, "endConditions": ["grappler_incapacitated", "forced_movement"]}',
  '🔗', 'moderate'),

('prone', 'Prone', 'Disadvantage on attack rolls. Melee attacks against have advantage, ranged attacks against have disadvantage.',
  '{"attackRolls": "disadvantage", "grantAdvantage": {"melee_attacks_against": true}, "grantDisadvantage": {"ranged_attacks_against": true}, "movement": "halved"}',
  '🛡️', 'moderate'),

('frightened', 'Frightened', 'Disadvantage on ability checks and attack rolls while source of fear is within sight. Cannot willingly move closer to source.',
  '{"attackRolls": "disadvantage", "abilityChecks": "disadvantage", "movementRestriction": "cannot_approach_source"}',
  '😱', 'moderate'),

('stunned', 'Stunned', 'Incapacitated, cannot move, can speak only falteringly. Automatically fails STR and DEX saves. Attacks against have advantage.',
  '{"incapacitated": true, "preventMovement": true, "autoFailSaves": ["STR", "DEX"], "grantAdvantage": {"attacks_against": true}, "cannotTakeActions": true}',
  '💫', 'severe'),

('paralyzed', 'Paralyzed', 'Incapacitated, cannot move or speak. Automatically fails STR and DEX saves. Attacks against have advantage. Melee attacks within 5ft are critical hits.',
  '{"incapacitated": true, "preventMovement": true, "autoFailSaves": ["STR", "DEX"], "grantAdvantage": {"attacks_against": true}, "meleeCriticalHits": true, "cannotTakeActions": true}',
  '⚡', 'debilitating'),

('poisoned', 'Poisoned', 'Disadvantage on attack rolls and ability checks.',
  '{"attackRolls": "disadvantage", "abilityChecks": "disadvantage"}',
  '🤢', 'moderate'),

('blinded', 'Blinded', 'Cannot see, automatically fails sight-based checks. Attack rolls have disadvantage, attacks against have advantage.',
  '{"attackRolls": "disadvantage", "grantAdvantage": {"attacks_against": true}, "autoFailChecks": ["Perception_sight"]}',
  '🙈', 'severe'),

('restrained', 'Restrained', 'Speed becomes 0. Attack rolls have disadvantage. DEX saves have disadvantage. Attacks against have advantage.',
  '{"movement": 0, "preventMovement": true, "attackRolls": "disadvantage", "savingThrows": {"DEX": "disadvantage"}, "grantAdvantage": {"attacks_against": true}}',
  '⛓️', 'severe'),

('invisible', 'Invisible', 'Impossible to see without special senses. Attack rolls have advantage, attacks against have disadvantage.',
  '{"attackRolls": "advantage", "grantDisadvantage": {"attacks_against": true}}',
  '👻', 'minor'),

('exhaustion_1', 'Exhaustion (Level 1)', 'Disadvantage on ability checks.',
  '{"abilityChecks": "disadvantage"}',
  '😓', 'minor'),

('exhaustion_2', 'Exhaustion (Level 2)', 'Speed halved, disadvantage on ability checks.',
  '{"abilityChecks": "disadvantage", "movement": "halved"}',
  '😰', 'moderate'),

('exhaustion_3', 'Exhaustion (Level 3)', 'Disadvantage on attack rolls and saving throws, speed halved.',
  '{"attackRolls": "disadvantage", "savingThrows": "disadvantage", "movement": "halved"}',
  '🥵', 'severe');

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to apply a condition to a character
CREATE OR REPLACE FUNCTION apply_condition(
  p_character_id INTEGER,
  p_encounter_id INTEGER,
  p_condition_type VARCHAR(50),
  p_source TEXT DEFAULT NULL,
  p_duration INTEGER DEFAULT 1,
  p_save_dc INTEGER DEFAULT NULL,
  p_save_ability VARCHAR(3) DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
  v_condition_id INTEGER;
BEGIN
  -- Check if this condition already exists and is active
  SELECT id INTO v_condition_id
  FROM character_conditions
  WHERE character_id = p_character_id
    AND condition_type = p_condition_type
    AND is_active = TRUE;

  -- If condition already exists, extend duration instead of creating duplicate
  IF v_condition_id IS NOT NULL THEN
    UPDATE character_conditions
    SET duration_remaining = GREATEST(duration_remaining, p_duration),
        source = COALESCE(p_source, source)
    WHERE id = v_condition_id;

    RETURN v_condition_id;
  END IF;

  -- Insert new condition
  INSERT INTO character_conditions (
    character_id, encounter_id, condition_type, source,
    duration_remaining, save_dc, save_ability
  ) VALUES (
    p_character_id, p_encounter_id, p_condition_type, p_source,
    p_duration, p_save_dc, p_save_ability
  )
  RETURNING id INTO v_condition_id;

  RETURN v_condition_id;
END;
$$ LANGUAGE plpgsql;

-- Function to remove a condition
CREATE OR REPLACE FUNCTION remove_condition(
  p_character_id INTEGER,
  p_condition_type VARCHAR(50)
) RETURNS BOOLEAN AS $$
BEGIN
  UPDATE character_conditions
  SET is_active = FALSE,
      ended_at = NOW()
  WHERE character_id = p_character_id
    AND condition_type = p_condition_type
    AND is_active = TRUE;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function to get all active conditions for a character
CREATE OR REPLACE FUNCTION get_active_conditions(p_character_id INTEGER)
RETURNS TABLE (
  condition_id INTEGER,
  condition_type VARCHAR(50),
  display_name VARCHAR(100),
  description TEXT,
  effects JSONB,
  emoji VARCHAR(10),
  duration_remaining INTEGER,
  source TEXT,
  save_dc INTEGER,
  save_ability VARCHAR(3)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cc.id,
    cc.condition_type,
    ce.display_name,
    ce.description,
    ce.effects,
    ce.emoji,
    cc.duration_remaining,
    cc.source,
    cc.save_dc,
    cc.save_ability
  FROM character_conditions cc
  JOIN condition_effects ce ON cc.condition_type = ce.condition_type
  WHERE cc.character_id = p_character_id
    AND cc.is_active = TRUE
  ORDER BY ce.severity DESC, cc.applied_at ASC;
END;
$$ LANGUAGE plpgsql;

-- Function to decrement condition durations at end of turn
CREATE OR REPLACE FUNCTION tick_conditions(p_character_id INTEGER)
RETURNS INTEGER AS $$
DECLARE
  v_expired_count INTEGER := 0;
BEGIN
  -- Decrement duration for round-based conditions
  UPDATE character_conditions
  SET duration_remaining = duration_remaining - 1
  WHERE character_id = p_character_id
    AND is_active = TRUE
    AND duration_type = 'rounds'
    AND duration_remaining > 0;

  -- Expire conditions that reached 0 duration
  UPDATE character_conditions
  SET is_active = FALSE,
      ended_at = NOW()
  WHERE character_id = p_character_id
    AND is_active = TRUE
    AND duration_remaining <= 0;

  GET DIAGNOSTICS v_expired_count = ROW_COUNT;

  RETURN v_expired_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE character_conditions IS 'Tracks active status conditions on characters during combat';
COMMENT ON TABLE condition_effects IS 'Reference table defining mechanical effects of each D&D 5e condition';
COMMENT ON FUNCTION apply_condition IS 'Apply a status condition to a character, extending duration if already present';
COMMENT ON FUNCTION remove_condition IS 'Remove a specific condition from a character';
COMMENT ON FUNCTION get_active_conditions IS 'Get all active conditions for a character with their effects';
COMMENT ON FUNCTION tick_conditions IS 'Decrement condition durations at end of turn, return count of expired conditions';
