-- Migration 002: Memory & State Systems for AI Narrative Coherence
-- This migration implements the critical memory hierarchy and state tracking
-- needed to prevent narrative drift in AI-generated content

-- Character Qualities (Storylet/Progression State)
-- Tracks narrative state explicitly through boolean/numeric flags
-- Examples: "sage_mentor_unlocked", "betrayal_witnessed", "city_reputation"
CREATE TABLE IF NOT EXISTS character_qualities (
  id SERIAL PRIMARY KEY,
  character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  quality_name VARCHAR(100) NOT NULL,
  quality_value INTEGER DEFAULT 1, -- Can be boolean (0/1) or numeric (reputation level, etc.)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Ensure unique quality names per character
  UNIQUE(character_id, quality_name)
);

CREATE INDEX idx_character_qualities_character ON character_qualities(character_id);
CREATE INDEX idx_character_qualities_name ON character_qualities(quality_name);

-- World State (per character)
-- Maintains narrative summary and world context
CREATE TABLE IF NOT EXISTS world_state (
  id SERIAL PRIMARY KEY,
  character_id INTEGER NOT NULL UNIQUE REFERENCES characters(id) ON DELETE CASCADE,

  -- Rolling narrative summary (max 500 words)
  -- Updated after each quest completion
  narrative_summary TEXT,

  -- Compressed episode summaries (array of recent session summaries)
  -- Older episodes get compressed to preserve memory
  episode_summaries JSONB DEFAULT '[]'::jsonb,

  -- NPC relationships (name -> relationship level/description)
  -- Example: {"Elder Thorne": {"level": "friendly", "notes": "Grateful for help with bandits"}}
  npc_relationships JSONB DEFAULT '{}'::jsonb,

  -- Unlocked locations (array of location names)
  unlocked_locations TEXT[] DEFAULT ARRAY[]::TEXT[],

  -- Story flags (key-value pairs for world state)
  -- Example: {"malaise_level": "moderate", "guild_reputation": "rising"}
  story_flags JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_world_state_character ON world_state(character_id);

-- Memory Hierarchy (Three-tier system for AI context)
-- Implements working, episode, and long-term memory layers
CREATE TABLE IF NOT EXISTS memory_hierarchy (
  id SERIAL PRIMARY KEY,
  character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,

  -- Memory type: 'working', 'episode', 'long_term'
  memory_type VARCHAR(20) NOT NULL CHECK (memory_type IN ('working', 'episode', 'long_term')),

  -- The actual memory content (text description)
  content_text TEXT NOT NULL,

  -- For future: vector embedding for semantic retrieval
  -- embedding_vector VECTOR(1536), -- Uncomment when using pgvector extension

  -- Importance score (0.0-1.0) for reinforcement learning
  -- Higher scores = more likely to persist in long-term memory
  importance_score DECIMAL(3,2) DEFAULT 0.5 CHECK (importance_score >= 0 AND importance_score <= 1),

  -- Metadata about this memory
  metadata JSONB DEFAULT '{}'::jsonb, -- quest_id, npc_involved, location, etc.

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Memories can expire (working memory after 30 days, episodes after 90 days)
  expires_at TIMESTAMP
);

CREATE INDEX idx_memory_hierarchy_character ON memory_hierarchy(character_id);
CREATE INDEX idx_memory_hierarchy_type ON memory_hierarchy(memory_type);
CREATE INDEX idx_memory_hierarchy_importance ON memory_hierarchy(importance_score DESC);
CREATE INDEX idx_memory_hierarchy_last_accessed ON memory_hierarchy(last_accessed_at DESC);
-- CREATE INDEX idx_memory_hierarchy_embedding ON memory_hierarchy USING ivfflat (embedding_vector vector_cosine_ops); -- For pgvector

-- Narrative Events Log (Complete history of story events)
-- Enables debugging, memory building, and consistency checking
CREATE TABLE IF NOT EXISTS narrative_events (
  id SERIAL PRIMARY KEY,
  character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,

  -- Event type: 'goal_completion', 'quest_started', 'quest_completed', 'npc_interaction', etc.
  event_type VARCHAR(50) NOT NULL,

  -- Human-readable description of what happened
  event_description TEXT NOT NULL,

  -- NPCs involved in this event
  participants TEXT[] DEFAULT ARRAY[]::TEXT[],

  -- Stat changes from this event
  stat_changes JSONB DEFAULT '{}'::jsonb, -- {"STR": 10, "WIS": 25}

  -- Related quest ID if applicable (will add FK constraint when quests table exists)
  quest_id INTEGER,

  -- Related goal ID if applicable
  goal_id INTEGER REFERENCES goals(id) ON DELETE SET NULL,

  -- Full event context (for detailed lookup)
  event_context JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_narrative_events_character ON narrative_events(character_id);
CREATE INDEX idx_narrative_events_type ON narrative_events(event_type);
CREATE INDEX idx_narrative_events_quest ON narrative_events(quest_id);
CREATE INDEX idx_narrative_events_goal ON narrative_events(goal_id);
CREATE INDEX idx_narrative_events_created ON narrative_events(created_at DESC);

-- Agent Logs (for debugging and improvement)
-- Tracks AI agent performance and consistency
CREATE TABLE IF NOT EXISTS agent_logs (
  id SERIAL PRIMARY KEY,
  character_id INTEGER REFERENCES characters(id) ON DELETE CASCADE,

  -- Agent type: 'story_coordinator', 'quest_creator', 'lorekeeper', 'consequence_engine', 'memory_manager'
  agent_type VARCHAR(50) NOT NULL,

  -- Input provided to the agent
  input_data JSONB NOT NULL,

  -- Output generated by the agent
  output_data JSONB NOT NULL,

  -- Success/failure status
  success BOOLEAN DEFAULT true,

  -- Error message if failed
  error_message TEXT,

  -- Consistency score (0-100) if applicable (e.g., from Lorekeeper)
  consistency_score INTEGER CHECK (consistency_score >= 0 AND consistency_score <= 100),

  -- API call metadata
  model_used VARCHAR(50), -- 'claude-sonnet-4.5', 'claude-sonnet-3.5', etc.
  tokens_used INTEGER,
  latency_ms INTEGER,
  cost_usd DECIMAL(10,6),

  -- Whether this was served from cache
  cache_hit BOOLEAN DEFAULT false,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_agent_logs_character ON agent_logs(character_id);
CREATE INDEX idx_agent_logs_type ON agent_logs(agent_type);
CREATE INDEX idx_agent_logs_success ON agent_logs(success);
CREATE INDEX idx_agent_logs_created ON agent_logs(created_at DESC);

-- Response Cache (for cost optimization)
-- Implements L1 (exact match) caching layer
CREATE TABLE IF NOT EXISTS response_cache (
  id SERIAL PRIMARY KEY,

  -- Hash of the exact prompt (for L1 exact matching)
  cache_key_hash VARCHAR(64) NOT NULL UNIQUE,

  -- Fingerprint for semantic similarity (for future L2 caching)
  -- prompt_embedding VECTOR(1536), -- Uncomment when using pgvector

  -- The cached response
  response_data JSONB NOT NULL,

  -- Cache performance metrics
  hit_count INTEGER DEFAULT 0,
  last_hit_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- TTL for cache entries (24 hours default)
  expires_at TIMESTAMP NOT NULL
);

CREATE INDEX idx_response_cache_key ON response_cache(cache_key_hash);
CREATE INDEX idx_response_cache_expires ON response_cache(expires_at);
-- CREATE INDEX idx_response_cache_embedding ON response_cache USING ivfflat (prompt_embedding vector_cosine_ops); -- For pgvector

-- Initialize world_state for existing characters
INSERT INTO world_state (character_id, narrative_summary)
SELECT id, 'Your adventure in Vitalia is just beginning. The Six Pillars await discovery.'
FROM characters
WHERE NOT EXISTS (
  SELECT 1 FROM world_state WHERE world_state.character_id = characters.id
);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_character_qualities_updated_at
  BEFORE UPDATE ON character_qualities
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_world_state_updated_at
  BEFORE UPDATE ON world_state
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE character_qualities IS 'Tracks narrative progression state through explicit quality flags (storylet system)';
COMMENT ON TABLE world_state IS 'Maintains narrative summary and world context per character';
COMMENT ON TABLE memory_hierarchy IS 'Three-tier memory system (working, episode, long-term) for AI context';
COMMENT ON TABLE narrative_events IS 'Complete log of all narrative events for debugging and memory building';
COMMENT ON TABLE agent_logs IS 'Tracks AI agent performance, consistency scores, and costs';
COMMENT ON TABLE response_cache IS 'Caches AI responses for cost optimization';

COMMENT ON COLUMN memory_hierarchy.importance_score IS 'Higher scores persist longer in long-term memory (reinforcement learning)';
COMMENT ON COLUMN agent_logs.consistency_score IS 'Lorekeeper validation score (0-100), target 85+';
COMMENT ON COLUMN response_cache.hit_count IS 'Number of times this cached response was reused';
