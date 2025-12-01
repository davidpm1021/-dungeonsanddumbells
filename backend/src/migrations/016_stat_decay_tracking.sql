-- Migration 016: Stat Decay Tracking System
-- Implements realistic stat regression when inactive (like real fitness)
-- Based on research: activity builds stats, inactivity decays them

-- ============================================================================
-- 1. STAT ACTIVITY TRACKING TABLE
-- Tracks last activity date per stat category for decay calculation
-- ============================================================================

CREATE TABLE IF NOT EXISTS stat_activity_tracking (
  id SERIAL PRIMARY KEY,
  character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,

  -- Per-stat last activity tracking
  str_last_activity TIMESTAMP WITH TIME ZONE,
  dex_last_activity TIMESTAMP WITH TIME ZONE,
  con_last_activity TIMESTAMP WITH TIME ZONE,
  int_last_activity TIMESTAMP WITH TIME ZONE,
  wis_last_activity TIMESTAMP WITH TIME ZONE,
  cha_last_activity TIMESTAMP WITH TIME ZONE,

  -- Grace period tracking (1 free miss per week per stat)
  str_grace_used_this_week BOOLEAN DEFAULT FALSE,
  dex_grace_used_this_week BOOLEAN DEFAULT FALSE,
  con_grace_used_this_week BOOLEAN DEFAULT FALSE,
  int_grace_used_this_week BOOLEAN DEFAULT FALSE,
  wis_grace_used_this_week BOOLEAN DEFAULT FALSE,
  cha_grace_used_this_week BOOLEAN DEFAULT FALSE,

  -- Week tracking for grace period reset
  grace_week_start DATE DEFAULT CURRENT_DATE,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(character_id)
);

CREATE INDEX IF NOT EXISTS idx_stat_activity_character ON stat_activity_tracking(character_id);

COMMENT ON TABLE stat_activity_tracking IS 'Tracks last activity per stat for decay calculation with grace periods';

-- ============================================================================
-- 2. VACATION MODE TABLE
-- Allows users to pause decay during planned absences
-- ============================================================================

CREATE TABLE IF NOT EXISTS vacation_mode (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  character_id INTEGER REFERENCES characters(id) ON DELETE SET NULL,

  -- Vacation period
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  ends_at TIMESTAMP WITH TIME ZONE NOT NULL,

  -- Limits (max 14 days, 2 uses per month)
  duration_days INTEGER NOT NULL CHECK (duration_days <= 14),

  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  reason VARCHAR(255), -- Optional: "vacation", "illness", "life_event"

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vacation_mode_user ON vacation_mode(user_id);
CREATE INDEX IF NOT EXISTS idx_vacation_mode_active ON vacation_mode(is_active);

COMMENT ON TABLE vacation_mode IS 'Tracks vacation mode periods that pause stat decay (max 14 days, 2x/month)';

-- ============================================================================
-- 3. DECAY LOG TABLE
-- Tracks all decay events for transparency and debugging
-- ============================================================================

CREATE TABLE IF NOT EXISTS stat_decay_log (
  id SERIAL PRIMARY KEY,
  character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,

  -- Decay details
  stat_code VARCHAR(3) NOT NULL CHECK (stat_code IN ('STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA')),
  xp_before INTEGER NOT NULL,
  xp_after INTEGER NOT NULL,
  xp_decayed INTEGER NOT NULL,

  -- Context
  days_inactive INTEGER NOT NULL,
  grace_used BOOLEAN DEFAULT FALSE,
  vacation_protected BOOLEAN DEFAULT FALSE,

  -- Narrative notification
  notification_sent BOOLEAN DEFAULT FALSE,
  narrative_hint TEXT, -- "Your muscles feel stiff from disuse..."

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_decay_log_character ON stat_decay_log(character_id);
CREATE INDEX IF NOT EXISTS idx_decay_log_created ON stat_decay_log(created_at);

COMMENT ON TABLE stat_decay_log IS 'Audit log of all stat decay events for transparency';

-- ============================================================================
-- 4. DECAY CONFIGURATION
-- Configurable decay parameters (can be adjusted without code changes)
-- ============================================================================

CREATE TABLE IF NOT EXISTS decay_config (
  id SERIAL PRIMARY KEY,
  config_key VARCHAR(50) UNIQUE NOT NULL,
  config_value INTEGER NOT NULL,
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default decay configuration
INSERT INTO decay_config (config_key, config_value, description) VALUES
  ('xp_decay_per_day', 5, 'XP lost per day of inactivity after grace period'),
  ('grace_period_days', 1, 'Free misses allowed per week before decay starts'),
  ('vacation_max_days', 14, 'Maximum vacation mode duration in days'),
  ('vacation_uses_per_month', 2, 'Maximum vacation mode activations per month'),
  ('minimum_xp_floor', 0, 'XP cannot decay below this value (0 = base stat 10)'),
  ('absence_detection_days', 7, 'Days of zero activity before auto-detecting absence')
ON CONFLICT (config_key) DO NOTHING;

COMMENT ON TABLE decay_config IS 'Configurable parameters for stat decay system';

-- ============================================================================
-- 5. HELPER FUNCTIONS
-- ============================================================================

-- Function: Calculate days since last activity for a stat
CREATE OR REPLACE FUNCTION days_since_stat_activity(
  p_character_id INTEGER,
  p_stat_code VARCHAR(3)
) RETURNS INTEGER AS $$
DECLARE
  v_last_activity TIMESTAMP WITH TIME ZONE;
BEGIN
  SELECT
    CASE p_stat_code
      WHEN 'STR' THEN str_last_activity
      WHEN 'DEX' THEN dex_last_activity
      WHEN 'CON' THEN con_last_activity
      WHEN 'INT' THEN int_last_activity
      WHEN 'WIS' THEN wis_last_activity
      WHEN 'CHA' THEN cha_last_activity
    END INTO v_last_activity
  FROM stat_activity_tracking
  WHERE character_id = p_character_id;

  IF v_last_activity IS NULL THEN
    RETURN 0; -- No tracking yet, no decay
  END IF;

  RETURN EXTRACT(DAY FROM (NOW() - v_last_activity))::INTEGER;
END;
$$ LANGUAGE plpgsql;

-- Function: Check if character is in vacation mode
CREATE OR REPLACE FUNCTION is_vacation_mode_active(p_user_id INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM vacation_mode
    WHERE user_id = p_user_id
      AND is_active = TRUE
      AND NOW() BETWEEN started_at AND ends_at
  );
END;
$$ LANGUAGE plpgsql;

-- Function: Check if grace period is available for stat
CREATE OR REPLACE FUNCTION has_grace_available(
  p_character_id INTEGER,
  p_stat_code VARCHAR(3)
) RETURNS BOOLEAN AS $$
DECLARE
  v_grace_used BOOLEAN;
  v_week_start DATE;
BEGIN
  SELECT
    CASE p_stat_code
      WHEN 'STR' THEN str_grace_used_this_week
      WHEN 'DEX' THEN dex_grace_used_this_week
      WHEN 'CON' THEN con_grace_used_this_week
      WHEN 'INT' THEN int_grace_used_this_week
      WHEN 'WIS' THEN wis_grace_used_this_week
      WHEN 'CHA' THEN cha_grace_used_this_week
    END,
    grace_week_start
  INTO v_grace_used, v_week_start
  FROM stat_activity_tracking
  WHERE character_id = p_character_id;

  -- If no tracking exists, grace is available
  IF v_grace_used IS NULL THEN
    RETURN TRUE;
  END IF;

  -- If week has changed, reset grace
  IF v_week_start < date_trunc('week', CURRENT_DATE)::DATE THEN
    RETURN TRUE;
  END IF;

  RETURN NOT v_grace_used;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 6. DECAY NARRATIVE HINTS
-- Pre-defined narrative messages for decay notifications
-- ============================================================================

CREATE TABLE IF NOT EXISTS decay_narrative_hints (
  id SERIAL PRIMARY KEY,
  stat_code VARCHAR(3) NOT NULL CHECK (stat_code IN ('STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA')),
  severity VARCHAR(20) NOT NULL, -- 'warning', 'mild', 'moderate', 'severe'
  hint_text TEXT NOT NULL
);

INSERT INTO decay_narrative_hints (stat_code, severity, hint_text) VALUES
-- STR hints
('STR', 'warning', 'Your muscles feel stiff from disuse. Perhaps some training is in order?'),
('STR', 'mild', 'The weight of your sword feels heavier than you remember.'),
('STR', 'moderate', 'Your grip weakens. The warrior within yearns for the iron.'),
('STR', 'severe', 'Your once-mighty arms tremble under burdens that were once trivial.'),
-- DEX hints
('DEX', 'warning', 'Your joints creak slightly. Some stretching might help.'),
('DEX', 'mild', 'Your reflexes feel sluggish, your movements less fluid.'),
('DEX', 'moderate', 'Grace that once came naturally now requires conscious effort.'),
('DEX', 'severe', 'Your body feels rigid, unresponsive to your will.'),
-- CON hints
('CON', 'warning', 'A slight shortness of breath reminds you to keep moving.'),
('CON', 'mild', 'You tire more easily than before. Your endurance wanes.'),
('CON', 'moderate', 'Climbing stairs leaves you winded. Your stamina fades.'),
('CON', 'severe', 'Even simple tasks leave you exhausted. Your vitality ebbs.'),
-- INT hints
('INT', 'warning', 'Your mind feels foggy. Perhaps some mental exercise is needed.'),
('INT', 'mild', 'Details that once seemed clear now require more focus.'),
('INT', 'moderate', 'Knowledge slips away like sand through fingers.'),
('INT', 'severe', 'The sharpness of your mind has dulled considerably.'),
-- WIS hints
('WIS', 'warning', 'Inner peace feels distant. A moment of reflection awaits.'),
('WIS', 'mild', 'Your insight clouds. The still waters of your mind ripple.'),
('WIS', 'moderate', 'Clarity eludes you. The path forward seems uncertain.'),
('WIS', 'severe', 'Your inner compass spins wildly. Serenity has fled.'),
-- CHA hints
('CHA', 'warning', 'You feel disconnected. Perhaps reach out to a friend?'),
('CHA', 'mild', 'Your presence feels diminished, your light dimmed.'),
('CHA', 'moderate', 'Words that once inspired now fall flat.'),
('CHA', 'severe', 'You feel invisible, your spirit withdrawn from the world.');

COMMENT ON TABLE decay_narrative_hints IS 'Pre-defined narrative messages for stat decay notifications';

-- ============================================================================
-- END OF MIGRATION 016
-- ============================================================================
