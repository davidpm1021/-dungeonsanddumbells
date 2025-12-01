-- Migration 013: Goal Auto-Tracking Support
-- Adds column to support automatic goal completion from wearable data

-- Add auto_track_type column to goals
ALTER TABLE goals ADD COLUMN IF NOT EXISTS auto_track_type VARCHAR(50);

-- Add verification columns to goal_completions if they don't exist
ALTER TABLE goal_completions ADD COLUMN IF NOT EXISTS is_auto_completed BOOLEAN DEFAULT false;
ALTER TABLE goal_completions ADD COLUMN IF NOT EXISTS verification_source VARCHAR(50);

-- Index for finding trackable goals
CREATE INDEX IF NOT EXISTS idx_goals_auto_track ON goals(character_id, auto_track_type)
WHERE auto_track_type IS NOT NULL;

-- Comment
COMMENT ON COLUMN goals.auto_track_type IS 'Type of wearable data to auto-track: steps, sleep_hours, workout_minutes, etc.';
