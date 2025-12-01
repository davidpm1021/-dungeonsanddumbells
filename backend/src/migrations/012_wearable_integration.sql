-- Migration 012: Wearable Integration Infrastructure
-- Creates tables for connecting wearable devices and aggregating health data

-- ============================================
-- Connected Wearables Table
-- Stores user connections to health platforms
-- ============================================
CREATE TABLE IF NOT EXISTS connected_wearables (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Platform identification
  platform VARCHAR(50) NOT NULL, -- 'oura', 'apple_health', 'fitbit', 'garmin', 'google_fit', 'samsung_health'
  platform_user_id VARCHAR(255), -- External platform's user ID

  -- OAuth tokens (encrypted in production)
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,

  -- Connection status
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'active', 'expired', 'revoked', 'error'
  last_sync_at TIMESTAMPTZ,
  last_error TEXT,

  -- Permissions granted
  permissions JSONB DEFAULT '[]', -- ['sleep', 'activity', 'heart_rate', 'steps', 'workout']

  -- Sync preferences
  sync_enabled BOOLEAN DEFAULT true,
  sync_frequency_minutes INTEGER DEFAULT 60, -- How often to pull data

  -- Timestamps
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- One connection per platform per user
  UNIQUE(user_id, platform)
);

-- ============================================
-- Daily Health Data Table
-- Aggregated daily health metrics from all sources
-- ============================================
CREATE TABLE IF NOT EXISTS daily_health_data (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL, -- The day this data represents

  -- Sleep metrics
  sleep_duration_minutes INTEGER, -- Total sleep time
  sleep_quality_score DECIMAL(3,2), -- 0.00-1.00 normalized score
  sleep_deep_minutes INTEGER,
  sleep_rem_minutes INTEGER,
  sleep_light_minutes INTEGER,
  sleep_awake_minutes INTEGER,
  sleep_start_time TIME,
  sleep_end_time TIME,

  -- Activity metrics
  steps INTEGER,
  active_minutes INTEGER,
  calories_burned INTEGER,
  distance_meters INTEGER,
  floors_climbed INTEGER,

  -- Heart metrics
  resting_heart_rate INTEGER,
  avg_heart_rate INTEGER,
  max_heart_rate INTEGER,
  hrv_avg DECIMAL(5,2), -- Heart rate variability (ms)

  -- Workout summary
  workout_count INTEGER DEFAULT 0,
  workout_minutes INTEGER DEFAULT 0,
  workout_types JSONB DEFAULT '[]', -- ['strength', 'cardio', 'yoga']

  -- Mindfulness
  meditation_minutes INTEGER DEFAULT 0,

  -- Stress/Recovery (from Oura, Garmin, etc.)
  stress_score DECIMAL(3,2), -- 0.00-1.00 (higher = more stressed)
  recovery_score DECIMAL(3,2), -- 0.00-1.00 (higher = better recovered)
  readiness_score DECIMAL(3,2), -- 0.00-1.00 (Oura-style readiness)

  -- Data sources and quality
  data_sources JSONB DEFAULT '[]', -- Which platforms contributed data
  confidence_score DECIMAL(3,2) DEFAULT 1.00, -- How reliable is this aggregate

  -- Raw data for debugging
  raw_data JSONB, -- Original data from each source

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- One record per user per day
  UNIQUE(user_id, date)
);

-- ============================================
-- Data Source Priority Table
-- Configures which source to prefer for conflicts
-- ============================================
CREATE TABLE IF NOT EXISTS data_source_priority (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  metric_type VARCHAR(50) NOT NULL, -- 'sleep', 'steps', 'heart_rate', 'workout', etc.

  -- Priority order (lower = higher priority)
  priorities JSONB NOT NULL DEFAULT '["oura", "apple_health", "garmin", "fitbit", "google_fit", "samsung_health", "self_report"]',

  -- Conflict resolution strategy
  resolution_strategy VARCHAR(30) DEFAULT 'highest_priority', -- 'highest_priority', 'average', 'highest_value', 'most_recent'

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, metric_type)
);

-- ============================================
-- Sync Log Table
-- Track sync operations for debugging
-- ============================================
CREATE TABLE IF NOT EXISTS wearable_sync_log (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  wearable_id INTEGER REFERENCES connected_wearables(id) ON DELETE SET NULL,
  platform VARCHAR(50) NOT NULL,

  -- Sync details
  sync_type VARCHAR(30) NOT NULL, -- 'full', 'incremental', 'manual'
  status VARCHAR(20) NOT NULL, -- 'started', 'success', 'partial', 'failed'

  -- Data pulled
  date_range_start DATE,
  date_range_end DATE,
  records_fetched INTEGER DEFAULT 0,
  records_processed INTEGER DEFAULT 0,

  -- Error tracking
  error_message TEXT,
  error_details JSONB,

  -- Performance
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER
);

-- ============================================
-- Indexes for performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_connected_wearables_user ON connected_wearables(user_id);
CREATE INDEX IF NOT EXISTS idx_connected_wearables_status ON connected_wearables(status);
CREATE INDEX IF NOT EXISTS idx_connected_wearables_last_sync ON connected_wearables(last_sync_at);

CREATE INDEX IF NOT EXISTS idx_daily_health_data_user ON daily_health_data(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_health_data_date ON daily_health_data(date);
CREATE INDEX IF NOT EXISTS idx_daily_health_data_user_date ON daily_health_data(user_id, date);

CREATE INDEX IF NOT EXISTS idx_wearable_sync_log_user ON wearable_sync_log(user_id);
CREATE INDEX IF NOT EXISTS idx_wearable_sync_log_platform ON wearable_sync_log(platform);
CREATE INDEX IF NOT EXISTS idx_wearable_sync_log_started ON wearable_sync_log(started_at);

-- ============================================
-- Trigger to update timestamps
-- ============================================
CREATE OR REPLACE FUNCTION update_wearable_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS connected_wearables_updated ON connected_wearables;
CREATE TRIGGER connected_wearables_updated
  BEFORE UPDATE ON connected_wearables
  FOR EACH ROW EXECUTE FUNCTION update_wearable_timestamp();

DROP TRIGGER IF EXISTS daily_health_data_updated ON daily_health_data;
CREATE TRIGGER daily_health_data_updated
  BEFORE UPDATE ON daily_health_data
  FOR EACH ROW EXECUTE FUNCTION update_wearable_timestamp();

-- ============================================
-- Insert default source priorities
-- ============================================
-- Note: These are inserted per-user when they connect their first wearable
