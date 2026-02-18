-- Fix embedding column to use VECTOR type instead of JSONB
-- This migration ensures the column is properly typed for pgvector similarity search

-- Drop the column if it exists (backup data first if needed)
-- Note: This is safe because we're in early development. In production, you'd want to migrate data.
ALTER TABLE knowledge_base DROP COLUMN IF EXISTS embedding;

-- Add embedding column with correct VECTOR type
ALTER TABLE knowledge_base
ADD COLUMN embedding VECTOR(1536);

-- Drop old index if it exists
DROP INDEX IF EXISTS idx_knowledge_base_embedding;

-- Create proper index for vector similarity search using cosine distance
CREATE INDEX idx_knowledge_base_embedding
ON knowledge_base USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Add helpful comment
COMMENT ON COLUMN knowledge_base.embedding IS 'OpenAI text-embedding-3-small (1536 dimensions)';
