-- Migration 002: Create goals and goal_completions tables

-- Goals table
CREATE TABLE goals (
  id SERIAL PRIMARY KEY,
  character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  stat_mapping VARCHAR(3) NOT NULL CHECK (stat_mapping IN ('STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA')),

  -- Goal type: binary (yes/no), quantitative (number), streak (consecutive days)
  goal_type VARCHAR(20) NOT NULL CHECK (goal_type IN ('binary', 'quantitative', 'streak')),

  -- Target value (e.g., 10000 for steps, 3 for workouts per week)
  target_value INTEGER,

  -- Frequency: daily, weekly, monthly
  frequency VARCHAR(20) DEFAULT 'daily' CHECK (frequency IN ('daily', 'weekly', 'monthly')),

  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_goals_character_id ON goals(character_id);
CREATE INDEX idx_goals_active ON goals(active);

-- Goal completions table
CREATE TABLE goal_completions (
  id SERIAL PRIMARY KEY,
  goal_id INTEGER NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  value INTEGER, -- For quantitative goals (e.g., 8000 steps)
  notes TEXT,
  xp_awarded INTEGER NOT NULL DEFAULT 0,

  CONSTRAINT positive_xp CHECK (xp_awarded >= 0)
);

CREATE INDEX idx_goal_completions_goal_id ON goal_completions(goal_id);
CREATE INDEX idx_goal_completions_date ON goal_completions(DATE(completed_at));

-- Function to get current streak for a goal
-- Checks consecutive days backward from today
CREATE OR REPLACE FUNCTION get_goal_streak(goal_id_param INTEGER)
RETURNS INTEGER AS $$
DECLARE
  streak INTEGER := 0;
  check_date DATE := CURRENT_DATE;
  has_completion BOOLEAN;
BEGIN
  LOOP
    SELECT EXISTS(
      SELECT 1 FROM goal_completions
      WHERE goal_id = goal_id_param
        AND DATE(completed_at) = check_date
    ) INTO has_completion;

    IF NOT has_completion THEN
      EXIT;
    END IF;

    streak := streak + 1;
    check_date := check_date - INTERVAL '1 day';

    -- Safety limit: don't check more than 365 days back
    IF streak >= 365 THEN
      EXIT;
    END IF;
  END LOOP;

  RETURN streak;
END;
$$ LANGUAGE plpgsql;

-- View for goals with current streak
CREATE VIEW goals_with_streaks AS
SELECT
  g.*,
  get_goal_streak(g.id) as current_streak
FROM goals g
WHERE g.active = true;

-- Comments for documentation
COMMENT ON TABLE goals IS 'User wellness goals mapped to character stats';
COMMENT ON TABLE goal_completions IS 'Log of goal completions with XP awarded';
COMMENT ON FUNCTION get_goal_streak IS 'Calculates current consecutive day streak for a goal';
COMMENT ON VIEW goals_with_streaks IS 'Active goals with current streak calculated';
