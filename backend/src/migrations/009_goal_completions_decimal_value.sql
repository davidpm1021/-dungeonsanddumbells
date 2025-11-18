-- Migration 009: Change goal_completions.value to DECIMAL
-- Supports decimal values like 7.5 miles, 2.5 hours, etc.

ALTER TABLE goal_completions
ALTER COLUMN value TYPE DECIMAL(10, 2);

COMMENT ON COLUMN goal_completions.value IS 'Completed value for quantitative goals (supports decimals like 7.5 miles)';
