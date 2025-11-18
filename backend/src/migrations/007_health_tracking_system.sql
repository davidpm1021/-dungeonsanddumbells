-- Migration 007: Health Tracking and Gamification System
-- Integrates real-world health activities with D&D-style character progression
-- Based on research from "Gamification and Health Research.md"

-- ============================================================================
-- 1. HEALTH ACTIVITIES TABLE
-- Tracks all health-related activities (workouts, meditation, sleep, etc.)
-- ============================================================================

CREATE TABLE IF NOT EXISTS health_activities (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  character_id INTEGER REFERENCES characters(id) ON DELETE SET NULL,

  -- Activity classification
  activity_type VARCHAR(50) NOT NULL, -- 'strength', 'cardio', 'flexibility', 'meditation', 'sleep', 'nutrition', 'social', 'learning'
  activity_category VARCHAR(50) NOT NULL, -- 'physical', 'mental', 'social', 'learning'

  -- Stat mapping (which D&D stat does this improve?)
  primary_stat VARCHAR(3) NOT NULL CHECK (primary_stat IN ('STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA')),
  secondary_stat VARCHAR(3) CHECK (secondary_stat IN ('STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA')),

  -- Activity details
  title VARCHAR(255) NOT NULL,
  description TEXT,
  duration_minutes INTEGER, -- Null for non-time-based activities (e.g., "completed meal prep")
  intensity VARCHAR(20), -- 'low', 'moderate', 'high', 'max' (for XP calculation)

  -- Metrics
  quantity_value DECIMAL(10, 2), -- Steps, miles, reps, pages read, etc.
  quantity_unit VARCHAR(50), -- 'steps', 'miles', 'reps', 'pages', etc.

  -- Verification
  verification_method VARCHAR(50) DEFAULT 'self_report', -- 'self_report', 'wearable', 'community', 'photo'
  verification_data JSONB, -- API response from wearable, photo URLs, community votes
  verified_at TIMESTAMP WITH TIME ZONE,

  -- Gamification
  xp_earned INTEGER DEFAULT 0,
  difficulty_class INTEGER, -- DC 10-25 for skill checks
  success BOOLEAN, -- Did they complete the activity successfully?

  -- Timestamps
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_health_activities_user ON health_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_health_activities_character ON health_activities(character_id);
CREATE INDEX IF NOT EXISTS idx_health_activities_type ON health_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_health_activities_completed ON health_activities(completed_at);

COMMENT ON TABLE health_activities IS 'Tracks all health-related activities with stat mapping and verification';
COMMENT ON COLUMN health_activities.primary_stat IS 'STR=resistance training, DEX=yoga/coordination, CON=cardio/sleep, INT=learning, WIS=meditation/reflection, CHA=social activities';

-- ============================================================================
-- 2. WEARABLE INTEGRATIONS TABLE
-- Stores connections to wearable devices and API platforms (Terra, Thryve, ROOK)
-- ============================================================================

CREATE TABLE IF NOT EXISTS wearable_integrations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Platform details
  platform VARCHAR(50) NOT NULL, -- 'terra', 'thryve', 'rook', 'apple_health', 'fitbit', 'garmin', 'oura', 'whoop', 'strava'
  platform_user_id VARCHAR(255), -- User ID from the external platform

  -- OAuth tokens
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,

  -- Permissions
  scopes_granted TEXT[], -- Array of permissions: ['activity', 'sleep', 'nutrition', 'heart_rate']

  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  sync_error TEXT, -- Store last sync error for debugging

  -- Timestamps
  connected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(user_id, platform)
);

COMMENT ON TABLE wearable_integrations IS 'Manages connections to wearable device platforms via unified APIs';

-- ============================================================================
-- 3. HEALTH STREAKS TABLE
-- Tracks consistency with graduated success levels (Bronze/Silver/Gold)
-- ============================================================================

CREATE TABLE IF NOT EXISTS health_streaks (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  character_id INTEGER REFERENCES characters(id) ON DELETE SET NULL,

  -- Streak details
  activity_type VARCHAR(50) NOT NULL, -- Same as health_activities.activity_type
  category VARCHAR(50) NOT NULL, -- 'daily', 'weekly', 'monthly'

  -- Current streak
  current_streak INTEGER DEFAULT 0,
  current_level VARCHAR(20) DEFAULT 'bronze', -- 'bronze' (50%), 'silver' (75%), 'gold' (100%)

  -- Best streak
  best_streak INTEGER DEFAULT 0,
  best_streak_at TIMESTAMP WITH TIME ZONE,

  -- Goals
  minimum_frequency INTEGER DEFAULT 1, -- Minimum completions per period
  target_frequency INTEGER DEFAULT 3, -- Target for Silver
  stretch_frequency INTEGER DEFAULT 5, -- Target for Gold

  -- Last activity
  last_activity_at TIMESTAMP WITH TIME ZONE,
  last_completed_at TIMESTAMP WITH TIME ZONE,

  -- Timestamps
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(user_id, activity_type, category)
);

COMMENT ON TABLE health_streaks IS 'Tracks consistency streaks with graduated success levels (Bronze 50%, Silver 75%, Gold 100%)';

-- ============================================================================
-- 4. CHARACTER CONDITIONS TABLE (Health Buffs/Debuffs)
-- Real health state affects combat and narrative (Well-Rested +2, Fatigued -2)
-- ============================================================================

CREATE TABLE IF NOT EXISTS character_health_conditions (
  id SERIAL PRIMARY KEY,
  character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,

  -- Condition details
  condition_name VARCHAR(100) NOT NULL, -- 'Well-Rested', 'Fatigued', 'Energized', 'Injured', 'Sick'
  condition_type VARCHAR(50) NOT NULL, -- 'buff', 'debuff', 'neutral'
  source VARCHAR(100), -- 'sleep_quality', 'workout_consistency', 'nutrition', 'stress_level'

  -- Game effects
  stat_modifiers JSONB, -- {"STR": 2, "CON": 1} or {"all": -2}
  skill_check_modifier INTEGER DEFAULT 0, -- Applied to relevant skill checks
  description TEXT,

  -- Duration
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE, -- Null for permanent conditions
  duration_turns INTEGER, -- For combat conditions

  -- Status
  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_character_health_conditions_character ON character_health_conditions(character_id);
CREATE INDEX IF NOT EXISTS idx_character_health_conditions_active ON character_health_conditions(is_active);

COMMENT ON TABLE character_health_conditions IS 'Real-world health state affects character stats and combat (e.g., Well-Rested +2, Fatigued -2)';

-- ============================================================================
-- 5. HEALTH ACHIEVEMENTS TABLE
-- Milestone tracking for "Myth Points" and legendary accomplishments
-- ============================================================================

CREATE TABLE IF NOT EXISTS health_achievements (
  id SERIAL PRIMARY KEY,

  -- Achievement template
  achievement_key VARCHAR(100) UNIQUE NOT NULL, -- 'first_5k', 'bodyweight_goal', '100_day_streak', '1000_workouts'
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,

  -- Requirements
  requirement_type VARCHAR(50) NOT NULL, -- 'streak', 'milestone', 'quantity', 'consistency'
  requirement_value INTEGER NOT NULL, -- 100 days, 1000 workouts, etc.
  activity_type VARCHAR(50), -- Null for all activities

  -- Rewards
  myth_points INTEGER DEFAULT 1, -- Legendary achievement points
  xp_reward INTEGER DEFAULT 0,
  title_unlocked VARCHAR(100), -- "Marathon Runner", "Zen Master", "Iron Will"
  cosmetic_unlocks JSONB, -- Array of cosmetic items/avatars

  -- Rarity
  rarity VARCHAR(20) DEFAULT 'common', -- 'common', 'rare', 'epic', 'legendary'

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE health_achievements IS 'Defines milestone achievements that grant Myth Points and permanent character enhancements';

-- ============================================================================
-- 6. USER HEALTH ACHIEVEMENTS (Junction table)
-- Tracks which achievements users have earned
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_health_achievements (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  character_id INTEGER REFERENCES characters(id) ON DELETE SET NULL,
  achievement_id INTEGER NOT NULL REFERENCES health_achievements(id) ON DELETE CASCADE,

  -- Tracking
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  progress_snapshot JSONB, -- Store the activity data that triggered the achievement

  UNIQUE(user_id, achievement_id)
);

CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_health_achievements(user_id);

COMMENT ON TABLE user_health_achievements IS 'Tracks which achievements each user has earned';

-- ============================================================================
-- 7. HEALTH GOALS INTEGRATION (Extends existing goals table)
-- Links health activities to character progression goals
-- ============================================================================

-- Add columns to existing goals table to support health tracking
ALTER TABLE goals ADD COLUMN IF NOT EXISTS activity_type VARCHAR(50);
ALTER TABLE goals ADD COLUMN IF NOT EXISTS difficulty_class INTEGER DEFAULT 10;
ALTER TABLE goals ADD COLUMN IF NOT EXISTS verification_required BOOLEAN DEFAULT FALSE;
ALTER TABLE goals ADD COLUMN IF NOT EXISTS graduated_success JSONB; -- {"bronze": 50, "silver": 75, "gold": 100}

COMMENT ON COLUMN goals.activity_type IS 'Links goal to health_activities.activity_type for automatic tracking';
COMMENT ON COLUMN goals.difficulty_class IS 'D&D difficulty class (DC 10-25) for skill checks';
COMMENT ON COLUMN goals.graduated_success IS 'Graduated success levels: Bronze 50%, Silver 75%, Gold 100%';

-- ============================================================================
-- 8. STAT-TO-HEALTH MAPPING TABLE
-- Defines how activities improve specific stats (research-based mappings)
-- ============================================================================

CREATE TABLE IF NOT EXISTS stat_health_mappings (
  id SERIAL PRIMARY KEY,

  -- Stat
  stat_code VARCHAR(3) NOT NULL CHECK (stat_code IN ('STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA')),

  -- Activity mappings
  activity_types TEXT[] NOT NULL, -- Array of activity types that improve this stat
  example_activities TEXT[] NOT NULL, -- User-friendly examples: "push-ups", "running", "meditation"

  -- Description
  stat_name VARCHAR(50) NOT NULL, -- "Might", "Grace", "Endurance", "Clarity", "Serenity", "Radiance"
  description TEXT NOT NULL,
  narrative_flavor TEXT, -- "Your muscles grow stronger with each rep..."

  -- XP calculation
  base_xp_per_minute INTEGER DEFAULT 5, -- Base XP for activities (adjusted by intensity)
  intensity_multipliers JSONB, -- {"low": 1.0, "moderate": 1.5, "high": 2.0, "max": 3.0}

  UNIQUE(stat_code)
);

COMMENT ON TABLE stat_health_mappings IS 'Research-based mappings between D&D stats and health activities';

-- Insert research-based stat mappings
INSERT INTO stat_health_mappings (stat_code, stat_name, activity_types, example_activities, description, narrative_flavor, base_xp_per_minute, intensity_multipliers) VALUES
('STR', 'Might', ARRAY['strength', 'resistance'], ARRAY['push-ups', 'weightlifting', 'resistance bands', 'bodyweight exercises'], 'Physical strength and muscular power', 'Your muscles grow stronger with each rep, your warrior''s prowess increasing with every lift.', 5, '{"low": 1.0, "moderate": 1.5, "high": 2.0, "max": 3.0}'),
('DEX', 'Grace', ARRAY['flexibility', 'coordination', 'yoga'], ARRAY['yoga', 'stretching', 'dance', 'balance work', 'martial arts'], 'Agility, reflexes, and body coordination', 'Your movements become fluid and precise, a dancer''s grace merging with warrior discipline.', 5, '{"low": 1.0, "moderate": 1.5, "high": 2.0, "max": 3.0}'),
('CON', 'Endurance', ARRAY['cardio', 'endurance', 'sleep', 'nutrition'], ARRAY['running', 'cycling', 'swimming', 'HIIT', '7+ hours sleep', 'balanced meals'], 'Stamina, health, and physical resilience', 'Your endurance deepens, breath controlled, heart steady, ready for the long journey ahead.', 5, '{"low": 1.0, "moderate": 1.5, "high": 2.0, "max": 3.0}'),
('INT', 'Clarity', ARRAY['learning', 'reading', 'skill_development'], ARRAY['reading books', 'online courses', 'learning new skills', 'puzzles', 'problem-solving'], 'Mental acuity, reasoning, and learning', 'Knowledge flows into you like water into a vessel, each lesson sharpening your mind''s edge.', 5, '{"low": 1.0, "moderate": 1.5, "high": 2.0, "max": 3.0}'),
('WIS', 'Serenity', ARRAY['meditation', 'mindfulness', 'journaling', 'reflection'], ARRAY['meditation', 'journaling', 'mood tracking', 'breathing exercises', 'nature walks'], 'Awareness, insight, and emotional wisdom', 'Inner peace settles over you like morning mist, clarity emerging from the stillness within.', 5, '{"low": 1.0, "moderate": 1.5, "high": 2.0, "max": 3.0}'),
('CHA', 'Radiance', ARRAY['social', 'community', 'group_activities'], ARRAY['group workouts', 'team sports', 'community events', 'helping others', 'social gatherings'], 'Social connection, inspiration, and presence', 'Your spirit shines brighter, connections deepening, your presence uplifting those around you.', 5, '{"low": 1.0, "moderate": 1.5, "high": 2.0, "max": 3.0}');

-- ============================================================================
-- 9. ANTI-EXPLOIT TRACKING
-- Prevent unhealthy grinding with diminishing returns and time-gating
-- ============================================================================

CREATE TABLE IF NOT EXISTS daily_activity_caps (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_date DATE NOT NULL DEFAULT CURRENT_DATE,
  activity_type VARCHAR(50) NOT NULL,

  -- Tracking
  activity_count INTEGER DEFAULT 0,
  total_xp_earned INTEGER DEFAULT 0,
  total_duration_minutes INTEGER DEFAULT 0,

  -- Caps (from research: 1st activity = 100%, 2nd = 50%, 3rd = 10%)
  cap_reached BOOLEAN DEFAULT FALSE,
  diminishing_returns_applied BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(user_id, activity_date, activity_type)
);

COMMENT ON TABLE daily_activity_caps IS 'Prevents unhealthy grinding: 1st workout=100 XP, 2nd=50 XP, 3rd=10 XP';

-- ============================================================================
-- 10. HELPER FUNCTIONS
-- ============================================================================

-- Function: Calculate XP for health activity
CREATE OR REPLACE FUNCTION calculate_health_activity_xp(
  p_activity_type VARCHAR(50),
  p_duration_minutes INTEGER,
  p_intensity VARCHAR(20),
  p_user_id INTEGER,
  p_activity_date DATE DEFAULT CURRENT_DATE
) RETURNS INTEGER AS $$
DECLARE
  v_base_xp INTEGER;
  v_intensity_mult DECIMAL;
  v_activity_count INTEGER;
  v_diminishing_mult DECIMAL := 1.0;
  v_final_xp INTEGER;
BEGIN
  -- Get base XP from stat mapping
  SELECT base_xp_per_minute INTO v_base_xp
  FROM stat_health_mappings
  WHERE p_activity_type = ANY(activity_types)
  LIMIT 1;

  IF v_base_xp IS NULL THEN
    v_base_xp := 5; -- Default
  END IF;

  -- Get intensity multiplier
  v_intensity_mult := CASE p_intensity
    WHEN 'low' THEN 1.0
    WHEN 'moderate' THEN 1.5
    WHEN 'high' THEN 2.0
    WHEN 'max' THEN 3.0
    ELSE 1.0
  END;

  -- Check activity count for diminishing returns
  SELECT COALESCE(activity_count, 0) INTO v_activity_count
  FROM daily_activity_caps
  WHERE user_id = p_user_id
    AND activity_date = p_activity_date
    AND activity_type = p_activity_type;

  -- Apply diminishing returns: 1st=100%, 2nd=50%, 3rd=10%, 4th+=0%
  v_diminishing_mult := CASE
    WHEN v_activity_count = 0 THEN 1.0
    WHEN v_activity_count = 1 THEN 0.5
    WHEN v_activity_count = 2 THEN 0.1
    ELSE 0.0
  END;

  -- Calculate final XP
  v_final_xp := FLOOR(v_base_xp * p_duration_minutes * v_intensity_mult * v_diminishing_mult);

  RETURN GREATEST(v_final_xp, 0);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_health_activity_xp IS 'Calculates XP for health activities with diminishing returns (research-based anti-exploit)';

-- Function: Update health streak
CREATE OR REPLACE FUNCTION update_health_streak(
  p_user_id INTEGER,
  p_activity_type VARCHAR(50),
  p_category VARCHAR(50),
  p_completed_count INTEGER DEFAULT 1
) RETURNS VOID AS $$
DECLARE
  v_current_streak INTEGER;
BEGIN
  -- Upsert streak record
  INSERT INTO health_streaks (user_id, activity_type, category, current_streak, last_activity_at)
  VALUES (p_user_id, p_activity_type, p_category, p_completed_count, NOW())
  ON CONFLICT (user_id, activity_type, category) DO UPDATE
  SET current_streak = health_streaks.current_streak + p_completed_count,
      last_activity_at = NOW(),
      current_level = CASE
        WHEN (health_streaks.current_streak + p_completed_count) >= health_streaks.stretch_frequency THEN 'gold'
        WHEN (health_streaks.current_streak + p_completed_count) >= health_streaks.target_frequency THEN 'silver'
        ELSE 'bronze'
      END,
      best_streak = GREATEST(health_streaks.best_streak, health_streaks.current_streak + p_completed_count),
      best_streak_at = CASE
        WHEN health_streaks.current_streak + p_completed_count > health_streaks.best_streak THEN NOW()
        ELSE health_streaks.best_streak_at
      END;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_health_streak IS 'Updates streak with graduated success levels (Bronze/Silver/Gold)';

-- ============================================================================
-- 11. TRIGGERS
-- ============================================================================

-- Trigger: Auto-update daily_activity_caps when health_activity is inserted
CREATE OR REPLACE FUNCTION track_daily_activity_cap() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO daily_activity_caps (user_id, activity_date, activity_type, activity_count, total_xp_earned, total_duration_minutes)
  VALUES (NEW.user_id, DATE(NEW.completed_at), NEW.activity_type, 1, NEW.xp_earned, COALESCE(NEW.duration_minutes, 0))
  ON CONFLICT (user_id, activity_date, activity_type) DO UPDATE
  SET activity_count = daily_activity_caps.activity_count + 1,
      total_xp_earned = daily_activity_caps.total_xp_earned + NEW.xp_earned,
      total_duration_minutes = daily_activity_caps.total_duration_minutes + COALESCE(NEW.duration_minutes, 0),
      cap_reached = daily_activity_caps.activity_count >= 2, -- Cap after 3 activities
      diminishing_returns_applied = daily_activity_caps.activity_count >= 1,
      updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER health_activity_cap_tracker
AFTER INSERT ON health_activities
FOR EACH ROW
EXECUTE FUNCTION track_daily_activity_cap();

-- ============================================================================
-- END OF MIGRATION 007
-- ============================================================================
