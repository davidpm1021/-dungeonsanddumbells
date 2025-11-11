/**
 * Migration 004: Enable Vector Embeddings (Phase 6)
 *
 * IMPORTANT: This migration requires pgvector extension to be installed.
 * SKIPPED: pgvector not installed - system uses keyword-only RAG fallback
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

-- Skip vector extension installation (not available, using graceful fallback)
-- CREATE EXTENSION IF NOT EXISTS vector;

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
  RAISE NOTICE 'Migration 004 - pgvector SKIPPED (not installed)';
  RAISE NOTICE 'System will use keyword-only RAG retrieval';
  RAISE NOTICE 'Vector extension status: %', (SELECT is_vector_enabled());
END $$;
