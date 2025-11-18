-- Migration 008: Graduated Success for Goals
-- Adds completion_level tracking to goal_completions (Bronze/Silver/Gold)

-- Add completion_level column to goal_completions
ALTER TABLE goal_completions
ADD COLUMN IF NOT EXISTS completion_level VARCHAR(20) DEFAULT 'gold';

COMMENT ON COLUMN goal_completions.completion_level IS 'Graduated success level: gold (100%), silver (75%), bronze (50%), incomplete (<50%)';

-- Create index for querying by completion level
CREATE INDEX IF NOT EXISTS idx_goal_completions_level ON goal_completions(completion_level);

-- Add completion_percentage column for analytics
ALTER TABLE goal_completions
ADD COLUMN IF NOT EXISTS completion_percentage DECIMAL(5, 2);

COMMENT ON COLUMN goal_completions.completion_percentage IS 'Actual completion percentage (0-100) for graduated success calculation';
