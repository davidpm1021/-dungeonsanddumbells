/**
 * Migration 004: Enable Vector Embeddings (Phase 6)
 *
 * IMPORTANT: This migration requires pgvector extension to be installed.
 *
 * To install pgvector on Windows with PostgreSQL 16:
 * 1. Download pgvector binary from: https://github.com/pgvector/pgvector/releases
 * 2. Extract vector.dll to: C:\Program Files\PostgreSQL\16\lib\
 * 3. Extract vector--*.sql files to: C:\Program Files\PostgreSQL\16\share\extension\
 * 4. Restart PostgreSQL service
 * 5. Run this migration
 *
 * Alternatively, install via pgAdmin or run:
 * CREATE EXTENSION IF NOT EXISTS vector;
 */

-- Enable vector extension (requires pgvector installation)
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding columns to narrative_events
ALTER TABLE narrative_events
ADD COLUMN IF NOT EXISTS event_embedding vector(1536);

-- Add embedding column to memory_hierarchy
ALTER TABLE memory_hierarchy
ADD COLUMN IF NOT EXISTS memory_embedding vector(1536);

-- Add embedding column to quest_templates
ALTER TABLE quest_templates
ADD COLUMN IF NOT EXISTS description_embedding vector(1536);

-- Create index for vector similarity search on narrative_events
CREATE INDEX IF NOT EXISTS narrative_events_embedding_idx
ON narrative_events
USING ivfflat (event_embedding vector_cosine_ops)
WITH (lists = 100);

-- Create index for vector similarity search on memory_hierarchy
CREATE INDEX IF NOT EXISTS memory_hierarchy_embedding_idx
ON memory_hierarchy
USING ivfflat (memory_embedding vector_cosine_ops)
WITH (lists = 100);

-- Create function to find similar narrative events
CREATE OR REPLACE FUNCTION find_similar_events(
  query_embedding vector(1536),
  character_id_filter integer,
  similarity_threshold float DEFAULT 0.85,
  result_limit integer DEFAULT 5
)
RETURNS TABLE (
  id integer,
  character_id integer,
  event_type varchar(50),
  event_data jsonb,
  created_at timestamp,
  similarity float
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ne.id,
    ne.character_id,
    ne.event_type,
    ne.event_data,
    ne.created_at,
    1 - (ne.event_embedding <=> query_embedding) as similarity
  FROM narrative_events ne
  WHERE ne.character_id = character_id_filter
    AND ne.event_embedding IS NOT NULL
    AND 1 - (ne.event_embedding <=> query_embedding) >= similarity_threshold
  ORDER BY ne.event_embedding <=> query_embedding
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql;

-- Create function to find similar memories
CREATE OR REPLACE FUNCTION find_similar_memories(
  query_embedding vector(1536),
  character_id_filter integer,
  similarity_threshold float DEFAULT 0.85,
  result_limit integer DEFAULT 5
)
RETURNS TABLE (
  id integer,
  character_id integer,
  memory_tier varchar(20),
  memory_content text,
  importance_score integer,
  created_at timestamp,
  similarity float
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    mh.id,
    mh.character_id,
    mh.memory_tier,
    mh.memory_content,
    mh.importance_score,
    mh.created_at,
    1 - (mh.memory_embedding <=> query_embedding) as similarity
  FROM memory_hierarchy mh
  WHERE mh.character_id = character_id_filter
    AND mh.memory_embedding IS NOT NULL
    AND 1 - (mh.memory_embedding <=> query_embedding) >= similarity_threshold
  ORDER BY mh.memory_embedding <=> query_embedding
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql;

-- Update response_cache to support semantic similarity (optional, for L2 cache)
ALTER TABLE response_cache
ADD COLUMN IF NOT EXISTS prompt_embedding vector(1536);

CREATE INDEX IF NOT EXISTS response_cache_embedding_idx
ON response_cache
USING ivfflat (prompt_embedding vector_cosine_ops)
WITH (lists = 100);

-- Function to check if vector extension is available
CREATE OR REPLACE FUNCTION is_vector_enabled()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'vector'
  );
END;
$$ LANGUAGE plpgsql;

-- Store installation status
COMMENT ON FUNCTION is_vector_enabled() IS 'Returns true if pgvector extension is installed and enabled';

-- Log completion
DO $$
BEGIN
  RAISE NOTICE '✅ Vector embeddings migration complete';
  RAISE NOTICE 'Vector extension status: %', (SELECT is_vector_enabled());
  RAISE NOTICE 'If vector extension is FALSE, install pgvector and re-run this migration';
END $$;
