-- Migration 018: Adiciona tabela knowledge_files para agrupar chunks por arquivo
-- Antes: cada chunk do arquivo era uma linha visível na knowledge_base
-- Depois: knowledge_files tem 1 linha por arquivo; chunks ficam em knowledge_base (ocultos na UI)

-- 1. Criar tabela knowledge_files
CREATE TABLE IF NOT EXISTS knowledge_files (
  id              UUID         NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  agent_config_id UUID         NOT NULL REFERENCES agent_configs(id) ON DELETE CASCADE,
  title           VARCHAR(500) NOT NULL,
  file_name       VARCHAR(500) NOT NULL,
  file_size       INTEGER      NOT NULL,
  file_type       VARCHAR(100) NOT NULL,
  content_type    VARCHAR(50)  NOT NULL DEFAULT 'document',
  chunk_count     INTEGER      NOT NULL DEFAULT 0,
  metadata        JSONB        NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- 2. Índice na tabela knowledge_files
CREATE INDEX IF NOT EXISTS idx_knowledge_files_agent_config_id
  ON knowledge_files(agent_config_id);

-- 3. Adicionar FK knowledge_file_id em knowledge_base (nullable para compatibilidade)
--    NULL = entrada standalone de texto/FAQ visível na UI
--    Non-null = chunk pertencente a um registro knowledge_files
ALTER TABLE knowledge_base
  ADD COLUMN IF NOT EXISTS knowledge_file_id UUID
  REFERENCES knowledge_files(id) ON DELETE CASCADE;

-- 4. Índice parcial na FK (apenas para linhas que têm arquivo associado)
CREATE INDEX IF NOT EXISTS idx_knowledge_base_file_id
  ON knowledge_base(knowledge_file_id)
  WHERE knowledge_file_id IS NOT NULL;

-- 5. Registrar migration
INSERT INTO migrations (filename) VALUES ('018_add_knowledge_files.sql')
  ON CONFLICT (filename) DO NOTHING;
