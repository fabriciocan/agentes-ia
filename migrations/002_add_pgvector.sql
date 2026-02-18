-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column to knowledge_base
ALTER TABLE knowledge_base
ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Create index for similarity search
CREATE INDEX IF NOT EXISTS idx_knowledge_base_embedding
ON knowledge_base USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Add metadata fields for better tracking
ALTER TABLE knowledge_base
ADD COLUMN IF NOT EXISTS file_size INTEGER,
ADD COLUMN IF NOT EXISTS file_type VARCHAR(100),
ADD COLUMN IF NOT EXISTS chunk_index INTEGER DEFAULT 0;

-- Create index for agent queries
CREATE INDEX IF NOT EXISTS idx_knowledge_base_agent_chunk
ON knowledge_base(agent_config_id, chunk_index);
