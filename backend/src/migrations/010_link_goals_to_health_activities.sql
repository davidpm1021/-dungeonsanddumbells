-- Migration 010: Link Goals to Health Activities
-- Prevents double XP exploit and enables auto-completion

-- Add goal_id foreign key to health_activities
ALTER TABLE health_activities
ADD COLUMN IF NOT EXISTS goal_id INTEGER REFERENCES goals(id) ON DELETE SET NULL;

COMMENT ON COLUMN health_activities.goal_id IS 'Links health activity to a goal for auto-completion and XP deduction (prevents double rewards)';

-- Create index for querying activities by goal
CREATE INDEX IF NOT EXISTS idx_health_activities_goal ON health_activities(goal_id);

-- Add goal_progress_count to track how many activities contributed to goal
ALTER TABLE health_activities
ADD COLUMN IF NOT EXISTS contributes_to_goal BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN health_activities.contributes_to_goal IS 'Whether this activity counts toward linked goal completion';

-- Add adjusted_xp column to show XP after goal deduction
ALTER TABLE health_activities
ADD COLUMN IF NOT EXISTS adjusted_xp INTEGER;

COMMENT ON COLUMN health_activities.adjusted_xp IS 'XP after deducting goal reward (prevents double XP)';
