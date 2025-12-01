-- Analytics Events Table
-- Stores all frontend analytics events for user behavior tracking

CREATE TABLE IF NOT EXISTS analytics_events (
    id SERIAL PRIMARY KEY,
    event_name VARCHAR(100) NOT NULL,
    event_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    session_id VARCHAR(100),
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    properties JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_analytics_event_name ON analytics_events(event_name);
CREATE INDEX idx_analytics_timestamp ON analytics_events(event_timestamp);
CREATE INDEX idx_analytics_session ON analytics_events(session_id);
CREATE INDEX idx_analytics_user ON analytics_events(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_analytics_properties ON analytics_events USING GIN(properties);

-- Composite index for time-range + event queries
CREATE INDEX idx_analytics_event_time ON analytics_events(event_name, event_timestamp DESC);

-- Comment for documentation
COMMENT ON TABLE analytics_events IS 'Client-side analytics events for tracking user behavior and feature usage';
COMMENT ON COLUMN analytics_events.properties IS 'JSON object containing event-specific data (page, feature, error details, etc.)';
