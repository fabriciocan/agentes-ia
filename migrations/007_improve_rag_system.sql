-- Improve RAG System with better metadata and search capabilities
-- This migration enhances the knowledge base for better RAG performance

-- 1. Add content_with_context column for debugging and analysis
ALTER TABLE knowledge_base
ADD COLUMN IF NOT EXISTS content_with_context TEXT;

-- 2. Add file_size and file_type if not exists (for backwards compatibility)
ALTER TABLE knowledge_base
ADD COLUMN IF NOT EXISTS file_size INTEGER,
ADD COLUMN IF NOT EXISTS file_type VARCHAR(100);

-- 3. Add chunk_index if not exists
ALTER TABLE knowledge_base
ADD COLUMN IF NOT EXISTS chunk_index INTEGER;

-- 4. Ensure metadata column exists and has proper default
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'knowledge_base' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE knowledge_base ADD COLUMN metadata JSONB DEFAULT '{}';
  END IF;
END $$;

-- 5. Create GIN index for full-text search on content (hybrid search)
CREATE INDEX IF NOT EXISTS idx_knowledge_content_fts
ON knowledge_base USING gin(to_tsvector('english', content));

-- 6. Create GIN index for metadata JSONB queries
CREATE INDEX IF NOT EXISTS idx_knowledge_metadata_gin
ON knowledge_base USING gin(metadata);

-- 7. Create index on agent_config_id and chunk_index for ordered retrieval
CREATE INDEX IF NOT EXISTS idx_knowledge_agent_chunk
ON knowledge_base(agent_config_id, chunk_index);

-- 8. Add helpful comments
COMMENT ON COLUMN knowledge_base.content_with_context IS 'Chunk with added context (document title, chunk position) for better embedding';
COMMENT ON COLUMN knowledge_base.metadata IS 'Rich metadata: keywords, language, file info, chunk stats';
COMMENT ON COLUMN knowledge_base.chunk_index IS 'Position of chunk in original document (0-based)';

-- 9. Create function for hybrid search (semantic + keyword)
CREATE OR REPLACE FUNCTION search_knowledge_hybrid(
  p_agent_config_id UUID,
  p_query_embedding VECTOR(1536),
  p_keywords TEXT[],
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  title VARCHAR(500),
  content TEXT,
  content_type VARCHAR(50),
  similarity FLOAT,
  keyword_matches INTEGER,
  metadata JSONB,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    kb.id,
    kb.title,
    kb.content,
    kb.content_type,
    (1 - (kb.embedding <=> p_query_embedding) / 2)::FLOAT as similarity,
    (
      SELECT COUNT(*)::INTEGER
      FROM unnest(p_keywords) kw
      WHERE kb.metadata->'keywords' ? kw
    ) as keyword_matches,
    kb.metadata,
    kb.created_at
  FROM knowledge_base kb
  WHERE kb.agent_config_id = p_agent_config_id
    AND kb.embedding IS NOT NULL
  ORDER BY
    -- Boost results with keyword matches
    (CASE
      WHEN EXISTS (
        SELECT 1 FROM unnest(p_keywords) kw
        WHERE kb.metadata->'keywords' ? kw
      ) THEN 0.2
      ELSE 0
    END + (1 - (kb.embedding <=> p_query_embedding) / 2)) DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION search_knowledge_hybrid IS 'Hybrid search combining vector similarity and keyword matching';

-- 10. Create function to search by keywords only (useful for exact matches)
CREATE OR REPLACE FUNCTION search_knowledge_by_keywords(
  p_agent_config_id UUID,
  p_keywords TEXT[]
)
RETURNS TABLE (
  id UUID,
  title VARCHAR(500),
  content TEXT,
  keyword_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    kb.id,
    kb.title,
    kb.content,
    (
      SELECT COUNT(*)::INTEGER
      FROM unnest(p_keywords) kw
      WHERE kb.metadata->'keywords' ? kw
    ) as keyword_count
  FROM knowledge_base kb
  WHERE kb.agent_config_id = p_agent_config_id
    AND EXISTS (
      SELECT 1 FROM unnest(p_keywords) kw
      WHERE kb.metadata->'keywords' ? kw
    )
  ORDER BY keyword_count DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION search_knowledge_by_keywords IS 'Search knowledge base by exact keyword matches in metadata';
